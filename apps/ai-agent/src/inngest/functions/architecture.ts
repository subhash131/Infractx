import { inngest } from "../client";
import { api } from "@workspace/backend/_generated/api";
import { getConvexClient } from "../../doc-agent/convex-client";
import { redis } from "../../lib/redis";
import { ChatGroq } from "@langchain/groq";
import { Id } from "@workspace/backend/_generated/dataModel";
import { generateKeyBetween } from "fractional-indexing";
import { ContentBlock, buildChildBlocks, uid } from "../../doc-agent/tools/add-database-smart-block";

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
      conversationId?: Id<"conversations">;
      streamKey: string;
    };

    console.log("🏛️ [Phase 1] Generating questions for doc:", docId);

    try {
      const client = getConvexClient(sessionToken);

      // Generate targeted Q&A questions via LLM
      const questionsPrompt = `
You are a senior software architect starting to design a system based on a user's request.
Before building anything, you need to gather structured requirements.

User Request: "${userMessage}"

Generate targeted clarifying questions to understand this system better. 
Limit the number of questions based on what you think is necessary to establish best practices for a good design (ask up to 5 questions).
Focus on: actors/users, use cases, scale expectations, tech stack preferences, key integrations or constraints.

Return ONLY a valid JSON array of strings, no markdown fences. For example:
["Question 1?", "Question 2?"]
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
    const { docId, answer, sessionToken } = event.data as {
      docId: string;
      answer: string;
      sessionToken: string;
    };

    const client = getConvexClient(sessionToken);

    // Load session first to get the streamKey route.ts computed
    const session = await client.query(
      api.requirements.architectureSessions.getSession,
      { docId }
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
          { docId, answer }
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
          data: { docId, sessionToken },
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
    const { docId, sessionToken } = event.data as {
      docId: string;
      sessionToken: string;
    };

    console.log("📐 [Phase 3] Generating Tech Plan for doc:", docId);

    const client = getConvexClient(sessionToken);

    // Load session with all Q&A
    const session = await client.query(
      api.requirements.architectureSessions.getSession,
      { docId }
    );

    if (!session) {
      // n.b. we don't have streamKey yet — log only
      console.error("❌ [Phase 3] Session not found for doc:", docId);
      return;
    }
    const streamKey = session.streamKey;

    try {

      // Build Q&A context block
      const qaContext = session.qa
        .map((item) => `Q: ${item.question}\nA: ${item.answer ?? "(not answered)"}`)
        .join("\n\n");

      const planPrompt = `
You are an expert software architect designing a system. Before creating any files, you must outline the core technologies and components you plan to implement.

Original Request: "${session.userMessage}"

Requirements gathered from the user:
${qaContext}

Design a "Technology Plan". This plan should NOT contain folders or files yet. Instead, you must specify the core components to be implemented, along with the programming languages and frameworks you recommend.

Output a flat JSON array of objects. 
Each item must have:
- title: (e.g. "React + Next.js", "Users Table", "Stripe Webhook Route")
- type: Must be exactly one of: "Database Schema", "Backend Route/Function", "Frontend Page/Component", or "Config/Infrastructure".
- description: A short description of what it is.
- reasoning: Explain *why* you chose this technology or approach based on the user's requirements.

Return ONLY a valid JSON array, no markdown fences:
[
  { "title": "React + Vite", "type": "Config/Infrastructure", "description": "Frontend framework", "reasoning": "User requested a fast SPA without SSR." }
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
        docId,
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
    const { docId, sessionToken } = event.data as {
      docId: string;
      sessionToken: string;
    };

    console.log("📐 [Phase 3.5] Generating Folder Structure for doc:", docId);

    const client = getConvexClient(sessionToken);

    // Load session with all Q&A and Tech Plan
    const session = await client.query(
      api.requirements.architectureSessions.getSession,
      { docId }
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

Already existing files (do NOT create these): ${JSON.stringify(existingTitles)}

Based strictly on the Approved Technology Plan, design the file/folder structure.
Output a flat JSON array of file/folder operations to build a hierarchical tree. Each item is ONLY structure — no content yet.

Rules:
- Use "FILE" or "FOLDER" for type.
- Assign a unique "tempId" (e.g. "temp_1", "temp_2") to EVERY FOLDER.
- Set "parentId" to a folder's "tempId" to nest items inside that folder.
- CRITICAL: ABSOLUTELY NO FILES AT THE ROOT LEVEL. Every single FILE must have a "parentId" pointing to a valid FOLDER's tempId.
- Group related items deeply (e.g., Folder "Backend" -> Folder "Routes" -> File "Music Streaming Route").
- For FILES, add a short "description" (1-2 sentences) describing what content it will have.
- Do NOT use file extensions in titles (no .md, .ts, .tsx).
- Ensure all items from the Technology Plan have a logical home in this structure.
- CRITICAL: DO NOT INCLUDE a "content" field in the JSON output. Output ONLY the structure properties (action, type, title, description, tempId, parentId). The content will be generated in a later phase.

Return ONLY valid JSON array, no markdown fences. Example of a deeply nested structure:
[
  { "action": "create", "type": "FOLDER", "title": "Backend", "tempId": "backend_root" },
  { "action": "create", "type": "FOLDER", "title": "Database", "parentId": "backend_root", "tempId": "db_folder" },
  { "action": "create", "type": "FILE", "title": "Database Schema", "parentId": "db_folder", "description": "PostgreSQL schema" },
  { "action": "create", "type": "FOLDER", "title": "Frontend", "tempId": "frontend_root" },
  { "action": "create", "type": "FILE", "title": "Home Page", "parentId": "frontend_root", "description": "The main landing page" }
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
        docId,
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
    const { docId, sessionToken } = event.data as {
      docId: string;
      sessionToken: string;
    };

    const client = getConvexClient(sessionToken);

    // Load session to get the streamKey and plan
    const session = await client.query(
      api.requirements.architectureSessions.getSession,
      { docId }
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
        docId,
        phase: "executing",
      });

      // ── Create all items, generate per-file content ─────────────────────────
      const tempIdMap = new Map<string, string>(); // temp_X → real Convex ID
      let filesCreated = 0;
      let foldersCreated = 0;

      for (const op of plan) {
        if (op.action !== "create") continue;

        let parentId: string | undefined;
        if (op.parentId) {
          parentId = op.parentId.startsWith("temp_")
            ? tempIdMap.get(op.parentId)
            : op.parentId;
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
      { "kind": "paragraph", "text": "A descriptive paragraph." },
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

Create as many Smart Blocks as necessary to fully cover the file's purpose.
Return ONLY the valid JSON array. No markdown fences, no explanation.
`;
            const contentRaw = await callLLMInvoke(contentPrompt);
            const smartBlocks = parseJSON<{ title: string; content: ContentBlock[] }[]>(contentRaw);

            if (smartBlocks && Array.isArray(smartBlocks) && smartBlocks.length > 0) {
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

        } catch (opErr) {
          console.error(`❌ [Phase 4] Failed on "${op.title}":`, opErr);
        }
      }

      await client.mutation(api.requirements.architectureSessions.setPhase, { docId, phase: "done" });

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

