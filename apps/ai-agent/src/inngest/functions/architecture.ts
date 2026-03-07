import { inngest } from "../client";
import { api } from "@workspace/backend/_generated/api";
import { getConvexClient } from "../../doc-agent/convex-client";
import { redis } from "../../lib/redis";
import { ChatGroq } from "@langchain/groq";
import { Id } from "@workspace/backend/_generated/dataModel";
import { generateKeyBetween } from "fractional-indexing";
import { ContentBlock, buildChildBlocks, uid } from "../../doc-agent/tools/add-database-smart-block";
import { getFileContent, listFiles } from "../../doc-agent/context-tools";

// ─────────────────────────────────────────────────────────────────────────────
// LLM Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function callLLMInvoke(prompt: string): Promise<string> {
  const model = new ChatGroq({
    model: process.env.ARCHITECTURE_MODEL ?? "llama-3.3-70b-versatile",
    apiKey: process.env.GROQ_API_KEY,
    maxTokens: 32768,
  });
  const result = await model.invoke([{ role: "user", content: prompt }] as any);
  if (typeof result.content === "string") return result.content;
  if (Array.isArray(result.content)) {
    return result.content
      .map((p: any) => (typeof p === "string" ? p : (p?.text ?? "")))
      .join("");
  }
  return "";
}

function parseJSON<T>(raw: string): T | null {
  let cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
  if (cleaned.startsWith("[") && !cleaned.endsWith("]")) {
    const lastBrace = cleaned.lastIndexOf("}");
    if (lastBrace !== -1) cleaned = cleaned.substring(0, lastBrace + 1) + "]";
  }
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    console.error("❌ JSON parse failed. Raw snippet:", cleaned.slice(0, 300));
    return null;
  }
}

async function pushToRedis(streamKey: string, payload: object) {
  await redis.rpush(streamKey, JSON.stringify(payload));
}

// ─────────────────────────────────────────────────────────────────────────────
// Context Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function buildArchitectureContext(docId: string, sessionToken: string): Promise<string> {
  const files = await listFiles(docId, sessionToken);
  
  if (!files || files.length === 0) return "No existing files in this document.";

  // Build a tree structure string
  const fileMap = new Map();
  const roots: any[] = [];
  
  for (const f of files) {
    fileMap.set(f.id, { ...f, children: [] });
  }

  for (const f of files) {
    if (f.parentId && fileMap.has(f.parentId)) {
      fileMap.get(f.parentId).children.push(fileMap.get(f.id));
    } else {
      roots.push(fileMap.get(f.id));
    }
  }

  let treeStr = "Current Directory Structure:\n";
  const printTree = (nodes: any[], indent = "") => {
    for (const node of nodes) {
      treeStr += `${indent}- [${node.type}] ${node.title} (ID: ${node.id})\n`;
      printTree(node.children, indent + "  ");
    }
  };
  printTree(roots);

  // Fetch content for files
  let contentStr = "\n\nExisting File Contents (Truncated):\n";
  const MAX_FILES = 20; // limit number of files to prevent blowing up context
  const MAX_FILE_CHARS = 2000; 

  let filesProcessed = 0;
  for (const f of files) {
    if (f.type === "FILE") {
      if (filesProcessed >= MAX_FILES) {
        contentStr += `\n... (More files exist but were omitted for brevity)\n`;
        break;
      }
      filesProcessed++;
      const { parsedContent } = await getFileContent(f.id, sessionToken);
      if (parsedContent && parsedContent.trim()) {
         contentStr += `\n--- File: ${f.title} ---\n`;
         if (parsedContent.length > MAX_FILE_CHARS) {
            contentStr += parsedContent.substring(0, MAX_FILE_CHARS) + "\n... [TRUNCATED]";
         } else {
            contentStr += parsedContent;
         }
      }
    }
  }

  return treeStr + contentStr;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface StructureOp {
  action: "create";
  type: "FILE" | "FOLDER";
  title: string;
  description?: string;
  tempId?: string;
  parentId?: string;
}

interface TechOp {
  title: string;
  type: "Database Schema" | "Backend Route/Function" | "Frontend Page/Component" | "Config/Infrastructure";
  description: string;
  reasoning: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — doc/architecture.requested
// Generates clarifying questions about the system, stores them in Convex,
// and immediately pushes the first question to the SSE stream.
// ─────────────────────────────────────────────────────────────────────────────

export const architectureRequestedHandler = inngest.createFunction(
  { id: "doc-architecture-requested" },
  { event: "doc/architecture.requested" },

  async ({ event }) => {
    const { docId, userMessage, sessionToken, conversationId, streamKey } = event.data as {
      docId: string;
      userMessage: string;
      sessionToken: string;
      conversationId: Id<"conversations">;
      streamKey: string;
    };

    console.log("🏛️ [Phase 1] Generating questions for doc:", docId);

    try {
      const client = getConvexClient(sessionToken);
      
      const archContext = await buildArchitectureContext(docId, sessionToken);

      // Generate targeted Q&A questions via LLM
      const questionsPrompt = `
You are a senior software architect starting to design or extend a system based on a user's request.
Before building anything, you need to gather structured requirements.

User Request: "${userMessage}"

Existing Architecture Context:
${archContext}

Generate targeted, highly specific clarifying questions to understand this system better. 
CRITICAL: ONLY ask questions that are absolutely necessary to make architectural decisions. If the user's request is already detailed, ask fewer questions or even 0-1 questions. NEVER just ask 5 questions to fill a quota. Typically, 1 to 3 well-thought-out questions are better than a rigid number of generic ones.
Focus on missing critical information regarding: actors/users, use cases, scale expectations, tech stack preferences, key integrations, or constraints. Avoid generic questions if the user has already provided the context.

Return ONLY a valid JSON array of strings, no markdown fences. For example:
["What specific payment gateway do you intend to use?", "Are there any expected spikes in traffic, or is the load generally consistent?"]
`;

      const questionsRaw = await callLLMInvoke(questionsPrompt);
      const questions = parseJSON<string[]>(questionsRaw);

      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        await pushToRedis(streamKey, { type: "error", error: "Failed to generate questions. Please try again." });
        await pushToRedis(streamKey, { type: "done" });
        return;
      }

      // Persist session in Convex (permanent — no TTL)
      await client.mutation(api.requirements.architectureSessions.upsertSession, {
        docId,
        conversationId,
        userMessage,
        sessionToken,
        streamKey,
        questions,
      });

      console.log(`❓ [Phase 1] ${questions.length} questions generated, pushing Q #1`);

      // Push the first question to the SSE stream
      await pushToRedis(streamKey, {
        type: "architecture_question",
        question: questions[0],
        questionIndex: 0,
        totalQuestions: questions.length,
      });
      await pushToRedis(streamKey, { type: "done" });

    } catch (err) {
      console.error("❌ [Phase 1] Failed:", err);
      await pushToRedis(streamKey, { type: "error", error: "Architecture setup failed. Please try again." });
      await pushToRedis(streamKey, { type: "done" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 — doc/architecture.answered
// Stores the user's answer in Convex. If more questions remain, pushes the next
// one. If all answered, triggers plan generation.
// ─────────────────────────────────────────────────────────────────────────────

export const architectureAnsweredHandler = inngest.createFunction(
  { id: "doc-architecture-answered" },
  { event: "doc/architecture.answered" },

  async ({ event }) => {
    const { docId, conversationId, answer, sessionToken } = event.data as {
      docId: string;
      conversationId: Id<"conversations">;
      answer: string;
      sessionToken: string;
    };

    const client = getConvexClient(sessionToken);

    // Load session first to get the streamKey route.ts computed
    const session = await client.query(
      api.requirements.architectureSessions.getSession,
      { conversationId }
    );
    if (!session) {
      console.error("❌ [Phase 2] No session for doc:", docId);
      return;
    }
    console.log("💬 [Phase 2] Answer received for doc:", docId);
    const streamKey = session.streamKey;

    try {
      // Store the answer and get updated state
      const { allAnswered, nextQuestion, nextIndex, answeredCount, totalQuestions, alreadyAnswered } =
        await client.mutation(
          api.requirements.architectureSessions.addAnswer,
          { conversationId, answer }
        );

      if (alreadyAnswered) {
         console.log("⚠️ [Phase 2] Answer ignored because all questions are already answered (possibly duplicate request).");
         return;
      }

      if (!allAnswered && nextQuestion) {
        // More questions remain — push the next one
        console.log(`❓ [Phase 2] Pushing Q #${answeredCount + 1}`);
        await pushToRedis(streamKey, {
          type: "architecture_question",
          question: nextQuestion,
          questionIndex: nextIndex,
          totalQuestions,
        });
        await pushToRedis(streamKey, { type: "done" });

      } else {
        // All questions answered — trigger plan generation
        console.log("📋 [Phase 2] All questions answered — triggering plan generation");
        await pushToRedis(streamKey, {
          type: "architecture_status",
          message: "✨ Great! Let me design the technology plan based on your answers...",
        });

        // Fire the plan generation event (handled by phase 3)
        await inngest.send({
          name: "doc/architecture.plan_requested",
          data: { docId, conversationId, sessionToken },
        });

        // Do NOT push "done" here. We want to keep the SSE connection open
        // so Phase 3 can stream the generated plan!
      }

    } catch (err) {
      console.error("❌ [Phase 2] Failed:", err);
      await pushToRedis(streamKey, { type: "error", error: "Failed to process answer. Please try again." });
      await pushToRedis(streamKey, { type: "done" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3 — doc/architecture.plan_requested
// Reads all Q&A from Convex, generates the Technology Plan (TechOp[]), saves it,
// and pushes it to the SSE stream for the frontend to render with Approve/Reject.
// ─────────────────────────────────────────────────────────────────────────────

export const architecturePlanRequestedHandler = inngest.createFunction(
  { id: "doc-architecture-plan-requested" },
  { event: "doc/architecture.plan_requested" },

  async ({ event }) => {
    const { docId, conversationId, sessionToken } = event.data as {
      docId: string;
      conversationId: Id<"conversations">;
      sessionToken: string;
    };

    console.log("📐 [Phase 3] Generating Tech Plan for doc:", docId);

    const client = getConvexClient(sessionToken);

    // Load session with all Q&A
    const session = await client.query(
      api.requirements.architectureSessions.getSession,
      { conversationId }
    );

    if (!session) {
      // n.b. we don't have streamKey yet — log only
      console.error("❌ [Phase 3] Session not found for doc:", docId);
      return;
    }
    const streamKey = session.streamKey;

    try {
      const archContext = await buildArchitectureContext(docId, sessionToken);

      // Build Q&A context block
      const qaContext = session.qa
        .map((item) => `Q: ${item.question}\nA: ${item.answer ?? "(not answered)"}`)
        .join("\n\n");

      const planPrompt = `
You are an expert software architect designing or extending a system. Before creating any files, you must outline the core technologies and components you plan to implement.

Original Request: "${session.userMessage}"

Requirements gathered from the user:
${qaContext}

Existing Architecture Context:
${archContext}

Your task is to draft a "Technology Plan" to fulfill the Original Request.
CRITICAL RULE: If the "Existing Architecture Context" shows that the project already has a backend, database, or frontend, DO NOT recommend establishing new core infrastructure (e.g., Node.js, Express, React, PostgreSQL) unless explicitly requested. 
If the user's request is small (like adding a single schema or a single route), ONLY return that specific new component in your plan. DO NOT generate a full-stack architecture plan for a small feature request.

Specify the new core components to be implemented. Be highly specific to the domain of the request. DO NOT use generic names like "Backend API" or "Frontend UI". Instead, name the specific services, tables, and components (e.g., "School Schema", "Payment Processing Worker").

Output a flat JSON array of objects. 
Each item must have:
- title: (e.g. "School Schema", "Teacher API Route")
- type: Must be exactly one of: "Database Schema", "Backend Route/Function", "Frontend Page/Component", or "Config/Infrastructure".
- description: A short description of what it handles.
- reasoning: Explain *why* you chose this technology or approach based on the user's requirements.

Return ONLY a valid JSON array, no markdown fences:
[
  { "title": "School Schema", "type": "Database Schema", "description": "Stores school metadata", "reasoning": "User requested to add a school schema." }
]
`;

      console.log("📐 [Phase 3] Calling LLM for Tech Plan...");
      const planRaw = await callLLMInvoke(planPrompt);
      const plan = parseJSON<TechOp[]>(planRaw);

      if (!plan || !Array.isArray(plan)) {
        await pushToRedis(streamKey, { type: "error", error: "Failed to generate technology plan. Please try again." });
        await pushToRedis(streamKey, { type: "done" });
        return;
      }

      console.log(`📋 [Phase 3] Tech Plan generated: ${plan.length} items`);

      // Persist tech plan in Convex
      await client.mutation(api.requirements.architectureSessions.setTechPlan, {
        conversationId,
        techPlanJson: JSON.stringify(plan),
      });

      // Push the plan to SSE — frontend renders a preview with Approve/Reject
      await pushToRedis(streamKey, {
        type: "architecture_tech_plan",
        plan,
      });
      await pushToRedis(streamKey, { type: "done" });

    } catch (err) {
      console.error("❌ [Phase 3] Failed:", err);
      await pushToRedis(streamKey, { type: "error", error: "Tech Plan generation failed. Please try again." });
      await pushToRedis(streamKey, { type: "done" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3.5 — doc/architecture.structure_requested
// Reads the approved Tech Plan, generates the Folder Structure (StructureOp[]),
// saves it, and pushes it to the SSE stream.
// ─────────────────────────────────────────────────────────────────────────────

export const architectureStructureRequestedHandler = inngest.createFunction(
  { id: "doc-architecture-structure-requested" },
  { event: "doc/architecture.structure_requested" },

  async ({ event }) => {
    const { docId, conversationId, sessionToken } = event.data as {
      docId: string;
      conversationId: Id<"conversations">;
      sessionToken: string;
    };

    console.log("📐 [Phase 3.5] Generating Folder Structure for doc:", docId);

    const client = getConvexClient(sessionToken);

    // Load session with all Q&A and Tech Plan
    const session = await client.query(
      api.requirements.architectureSessions.getSession,
      { conversationId }
    );

    if (!session || !session.techPlan) {
      console.error("❌ [Phase 3.5] Session or Tech Plan not found for doc:", docId);
      return;
    }
    const streamKey = session.streamKey;

    try {
      // Fetch existing file tree so we don't duplicate
      const existingFiles = await client.query(
        api.requirements.textFiles.getFilesByDocumentId,
        { documentId: docId as Id<"documents"> }
      );
      const existingTitles = existingFiles.map((f) => f.title);

      const archContext = await buildArchitectureContext(docId, sessionToken);

      const qaContext = session.qa
        .map((item) => `Q: ${item.question}\nA: ${item.answer ?? "(not answered)"}`)
        .join("\n\n");

      // We inject the approved tech plan so the LLM knows what to build
      const planPrompt = `
You are an expert software architect mapping an approved technology plan to a concrete file/folder structure.

Original Request: "${session.userMessage}"

User Q&A:
${qaContext}

Approved Technology Plan:
${session.techPlan}

Existing Architecture Context:
${archContext}

Already existing files: ${JSON.stringify(existingTitles)}

Based strictly on the Approved Technology Plan, design the file/folder structure of ONLY the NEW items that need to be created.
Output a flat JSON array of file/folder operations. Each item is ONLY structure — no content yet.

Rules:
- You are ONLY creating NEW files and folders. DO NOT recreate anything present in the "Existing Architecture Context".
- FOLDERS: For NEW folders you create, assign a unique "tempId" starting with "temp_" (e.g., "temp_models_folder").
- FILES: For NEW files, assign a short "description" (1-2 sentences) describing what content it will have. Be highly specific. Do NOT use file extensions in titles.
- NESTING (CRITICAL):
  - NO FILES AT THE ROOT LEVEL. Every single FILE must have a "parentId".
  - If a new file belongs inside an EXISTING folder shown in the "Existing Architecture Context", set its "parentId" to the exact ID of that existing folder (e.g., "j576abc123...").
  - If a new file belongs inside a NEW folder you are creating, set its "parentId" to that folder's "tempId".
- Make sure to map every item from the Technology Plan into actual FOLDERs and FILEs.
- DO NOT INCLUDE a "content" field in the JSON output for FILES. Output ONLY the structure properties (action, type, title, description, tempId, parentId).

Return ONLY valid JSON array, no markdown fences. Example:
[
  { "action": "create", "type": "FOLDER", "title": "Payment_Server", "tempId": "temp_payments_root" },
  { "action": "create", "type": "FILE", "title": "Transaction_Schema", "parentId": "temp_payments_root", "description": "PostgreSQL schema" },
  { "action": "create", "type": "FILE", "title": "Already_Existing_Folder_File", "parentId": "j57abc...", "description": "Inside an existing folder" }
]
`;

      console.log("📐 [Phase 3.5] Calling LLM for folder structure plan...");
      const planRaw = await callLLMInvoke(planPrompt);
      const plan = parseJSON<StructureOp[]>(planRaw);

      if (!plan || !Array.isArray(plan)) {
        await pushToRedis(streamKey, { type: "error", error: "Failed to generate structure plan. Please try again." });
        await pushToRedis(streamKey, { type: "done" });
        return;
      }

      // Force-strip any hallucinated `content` fields so phase 4 doesn't break
      const safePlan = plan.map((op: any) => {
        const { content, ...safeOp } = op;
        return safeOp as StructureOp;
      });

      console.log(`📋 [Phase 3.5] Structure Plan generated: ${safePlan.length} items (cleaned)`);

      // Persist plan in Convex
      await client.mutation(api.requirements.architectureSessions.setPlan, {
        conversationId,
        planJson: JSON.stringify(safePlan),
      });

      // Push the plan to SSE — frontend renders a preview with Approve/Reject
      await pushToRedis(streamKey, {
        type: "architecture_plan",
        plan: safePlan,
      });
      await pushToRedis(streamKey, { type: "done" });

    } catch (err) {
      console.error("❌ [Phase 3.5] Failed:", err);
      await pushToRedis(streamKey, { type: "error", error: "Structure Plan generation failed. Please try again." });
      await pushToRedis(streamKey, { type: "done" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 4 — doc/architecture.approved
// Reads the approved plan from Convex, creates all folders and files, generates
// per-file content, and streams progress back via Redis.
// ─────────────────────────────────────────────────────────────────────────────

export const architectureApprovedHandler = inngest.createFunction(
  { id: "doc-architecture-approved" },
  { event: "doc/architecture.approved" },

  async ({ event }) => {
    const { docId, conversationId, sessionToken } = event.data as {
      docId: string;
      conversationId: Id<"conversations">;
      sessionToken: string;
    };

    const client = getConvexClient(sessionToken);

    // Load session to get the streamKey and plan
    const session = await client.query(
      api.requirements.architectureSessions.getSession,
      { conversationId }
    );
    if (!session || !session.plan) {
      console.error("❌ [Phase 4] No session/plan for doc:", docId);
      return;
    }
    console.log("🚀 [Phase 4] Executing approved plan for doc:", docId);

    const streamKey = session.streamKey;

    try {
      const plan = parseJSON<StructureOp[]>(session.plan);
      if (!plan) {
        await pushToRedis(streamKey, { type: "error", error: "Corrupted plan data. Please start over." });
        await pushToRedis(streamKey, { type: "done" });
        return;
      }

      // Mark session as executing
      await client.mutation(api.requirements.architectureSessions.setPhase, {
        conversationId,
        phase: "executing",
      });

      // ── Create all items, generate per-file content ─────────────────────────
      const tempIdMap = new Map<string, string>(); // temp_X → real Convex ID
      let filesCreated = 0;
      let foldersCreated = 0;

      // Topological Sort: Ensure parent folders are built before their children
      const sortedPlan: StructureOp[] = [];
      const pendingOps = [...plan];
      let madeProgress = true;
      let passes = 0;

      while (pendingOps.length > 0 && madeProgress && passes < 20) {
        madeProgress = false;
        passes++;
        for (let i = 0; i < pendingOps.length; i++) {
          const op = pendingOps[i];
          if (op.action !== "create") {
             pendingOps.splice(i, 1);
             i--;
             continue;
          }
          // If no parent, or its parent is already in sortedPlan, it's ready.
          if (!op.parentId || sortedPlan.some((so) => so.tempId === op.parentId)) {
            sortedPlan.push(op);
            pendingOps.splice(i, 1);
            i--;
            madeProgress = true;
          }
        }
      }
      // Any remainder likely has a cyclic dependency or an invalid parentId (push at the end; will likely be skipped)
      sortedPlan.push(...pendingOps);

      for (const op of sortedPlan) {
        if (op.action !== "create") continue;

        let parentId: string | undefined;
        if (op.parentId) {
          // It could be a tempId (new folder) or a real Convex ID (existing folder).
          parentId = tempIdMap.get(op.parentId) || op.parentId;
          if (!parentId) {
             console.warn(`⚠️ [Phase 4] Skipping "${op.title}" due to unresolved parentId: ${op.parentId}`);
             continue; // We absolutely cannot create an orphan file if it requires a parent
          }
        }

        try {
          const newId = await client.mutation(api.requirements.textFiles.create, {
            title: op.title,
            documentId: docId as Id<"documents">,
            type: op.type,
            parentId: parentId ? (parentId as Id<"text_files">) : undefined,
          });

          if (op.tempId) tempIdMap.set(op.tempId, newId);

          if (op.type === "FOLDER") {
            foldersCreated++;
            console.log(`📁 [Phase 4] Created FOLDER: "${op.title}"`);
          }

          if (op.type === "FILE") {
            filesCreated++;
            console.log(`📄 [Phase 4] Created FILE: "${op.title}" — generating content...`);

            const qaContext = session.qa
              .map((item) => `Q: ${item.question}\nA: ${item.answer ?? "(not answered)"}`)
              .join("\n\n");

            const contentPrompt = `
You are a senior software architect writing detailed documentation for a software system.

System: "${session.userMessage}"

User Requirements:
${qaContext}

Approved Technology Plan:
${session.techPlan || "Not provided."}

File: "${op.title}"
Purpose: ${op.description || "No description provided."}

Write the complete, production-quality content for this document file.
Instead of markdown, output your response as a JSON array of "Smart Blocks".
Each Smart Block represents a major section of the document and contains an array of content items.

Output format must strictly be a JSON array of objects:
[
  {
    "title": "Section Title (e.g. Database Schema, API Endpoints)",
    "content": [
      { "kind": "paragraph", "text": "A descriptive paragraph. Use \\n for newlines, NEVER use literal hard returns inside strings." },
      { "kind": "heading", "level": 2, "text": "Sub-section heading" },
      { "kind": "bulletList", "items": ["Item 1", "Item 2"] },
      { "kind": "table", "headers": ["Col 1", "Col 2"], "rows": [["Val 1", "Val 2"]] }
    ]
  }
]

Rules for content items:
- 'kind' MUST be exactly one of: 'paragraph', 'heading', 'bulletList', 'table'.
- For 'paragraph', provide 'text' (string).
- For 'heading', provide 'level' (1, 2, or 3) and 'text' (string).
- For 'bulletList', provide 'items' (array of strings).
- For 'table', provide 'headers' (array of strings) and 'rows' (2D array of strings).
- CRITICAL: NO literal newlines inside JSON string values. Use \\n instead.

Create as many Smart Blocks as necessary to fully cover the file's purpose.
Return ONLY the valid JSON array. No markdown fences, no explanation.
`;
            const contentRaw = await callLLMInvoke(contentPrompt);
            const smartBlocks = parseJSON<{ title: string; content: ContentBlock[] }[]>(contentRaw);

            if (!smartBlocks || !Array.isArray(smartBlocks) || smartBlocks.length === 0) {
              console.error(`❌ [Phase 4] Failed to generate valid content JSON for "${op.title}".`);
              await pushToRedis(streamKey, {
                type: "response",
                response: {
                  operations: [{
                    type: "chat_response",
                    content: `⚠️ Note: The content for **${op.title}** could not be generated properly due to a formatting error. You can ask me to write its contents by selecting the file.`
                  }]
                }
              });
            } else {
              let currentRank = generateKeyBetween(null, null);

              const allBlocks = [];
              for (const sb of smartBlocks) {
                const smartBlockId = uid();
                
                const smartBlockRecord = {
                   externalId: smartBlockId,
                   type: "smartBlock",
                   props: {},
                   content: [{ type: "text", text: sb.title }],
                   rank: currentRank,
                   parentId: null,
                   approvedByHuman: false,
                };
                
                const childStartRank = generateKeyBetween(null, null);
                const childBlocks = buildChildBlocks(sb.content, smartBlockId, childStartRank);
                
                const trailingParagraph = {
                   externalId: uid(),
                   type: "paragraph",
                   props: { textAlign: null },
                   content: [],
                   rank: generateKeyBetween(childBlocks.at(-1)?.rank ?? childStartRank, null),
                   parentId: smartBlockId,
                   approvedByHuman: false,
                };
                
                allBlocks.push(smartBlockRecord, ...childBlocks, trailingParagraph);
                currentRank = generateKeyBetween(currentRank, null);
              }
              
              if (allBlocks.length > 0) {
                 console.log("📝 [Phase 4] Inserting Blocks into DB:", JSON.stringify(allBlocks, null, 2));
                 await client.mutation(api.requirements.textFileBlocks.bulkCreate, {
                    textFileId: newId,
                    blocks: allBlocks,
                 });
              }
            }
          }

          await pushToRedis(streamKey, {
            type: "architecture_progress",
            item: { id: newId, title: op.title, itemType: op.type, parentId: parentId ?? null },
          });

        } catch (opErr: any) {
          console.error(`❌ [Phase 4] Failed on "${op.title}":`, opErr);
          await pushToRedis(streamKey, {
            type: "response",
            response: {
               operations: [{
                  type: "chat_response",
                  content: `⚠️ Failed to create **${op.title}**: ${opErr.message || "Unknown error"}`,
               }]
            }
          });
        }
      }

      await client.mutation(api.requirements.architectureSessions.setPhase, { conversationId, phase: "done" });

      await pushToRedis(streamKey, {
        type: "response",
        response: {
          operations: [{
            type: "chat_response",
            content: `✅ Architecture scaffolded! Created ${foldersCreated} folder(s) and ${filesCreated} file(s) with full content. Check the file tree on the left.`,
          }],
        },
      });
      await pushToRedis(streamKey, { type: "done" });

      console.log(`🏛️ [Phase 4] Complete: ${foldersCreated} folders, ${filesCreated} files.`);

    } catch (err) {
      console.error("❌ [Phase 4] Architecture execution failed:", err);
      await pushToRedis(streamKey, { type: "error", error: "Architecture execution failed. Please try again." });
      await pushToRedis(streamKey, { type: "done" });
    }
  }
);

