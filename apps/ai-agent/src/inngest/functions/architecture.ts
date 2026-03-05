import { inngest } from "../client";
import { api } from "@workspace/backend/_generated/api";
import { getConvexClient } from "../../doc-agent/convex-client";
import { redis } from "../../lib/redis";
import { ChatGroq } from "@langchain/groq";
import { Id } from "@workspace/backend/_generated/dataModel";

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

Generate exactly 5 concise, targeted clarifying questions to understand this system better.
Focus on: actors/users, use cases, scale expectations, tech stack preferences, key integrations or constraints.

Return ONLY a valid JSON array of strings, no markdown fences:
["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"]
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
      const { allAnswered, nextQuestion, nextIndex, answeredCount, totalQuestions } =
        await client.mutation(
          api.requirements.architectureSessions.addAnswer,
          { docId, answer }
        );

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
          message: "✨ Great! Let me design the architecture plan based on your answers...",
        });

        // Fire the plan generation event (handled by phase 3)
        await inngest.send({
          name: "doc/architecture.plan_requested",
          data: { docId, sessionToken },
        });

        await pushToRedis(streamKey, { type: "done" });
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
// Reads all Q&A from Convex, generates the StructureOp[] plan, saves it,
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

    console.log("📐 [Phase 3] Generating plan for doc:", docId);

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

      // Fetch existing file tree so we don't duplicate
      const existingFiles = await client.query(
        api.requirements.textFiles.getFilesByDocumentId,
        { documentId: docId as Id<"documents"> }
      );
      const existingTitles = existingFiles.map((f) => f.title);

      // Build Q&A context block
      const qaContext = session.qa
        .map((item) => `Q: ${item.question}\nA: ${item.answer ?? "(not answered)"}`)
        .join("\n\n");

      const planPrompt = `
You are an expert software architect. Design a complete production-ready system architecture.

Original Request: "${session.userMessage}"

Requirements gathered from the user:
${qaContext}

Already existing files (do NOT create these): ${JSON.stringify(existingTitles)}

Output a flat JSON array of file/folder operations. Each item is ONLY structure — no content yet.

Rules:
- Use "FILE" or "FOLDER" for type.
- Assign a "tempId" (e.g. "temp_1") to every FOLDER.
- Set "parentId" to a tempId for nesting within a folder.
- For FILES, add a short "description" (1-2 sentences) describing what content it will have.
- Do NOT use file extensions in titles (no .md, .ts, .tsx).
- Cover: backend services, database schema, frontend pages, API contracts, infrastructure.

Return ONLY valid JSON array, no markdown fences:
[
  { "action": "create", "type": "FOLDER", "title": "Backend", "tempId": "temp_1" },
  { "action": "create", "type": "FILE", "title": "Database Schema", "parentId": "temp_1", "description": "PostgreSQL schema with tables for users, tracks, playlists." }
]
`;

      console.log("📐 [Phase 3] Calling LLM for structure plan...");
      const planRaw = await callLLMInvoke(planPrompt);
      const plan = parseJSON<StructureOp[]>(planRaw);

      if (!plan || !Array.isArray(plan)) {
        await pushToRedis(streamKey, { type: "error", error: "Failed to generate architecture plan. Please try again." });
        await pushToRedis(streamKey, { type: "done" });
        return;
      }

      console.log(`📋 [Phase 3] Plan generated: ${plan.length} items`);

      // Persist plan in Convex
      await client.mutation(api.requirements.architectureSessions.setPlan, {
        docId,
        planJson: JSON.stringify(plan),
      });

      // Push the plan to SSE — frontend renders a preview with Approve/Reject
      await pushToRedis(streamKey, {
        type: "architecture_plan",
        plan,
      });
      await pushToRedis(streamKey, { type: "done" });

    } catch (err) {
      console.error("❌ [Phase 3] Failed:", err);
      await pushToRedis(streamKey, { type: "error", error: "Plan generation failed. Please try again." });
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

File: "${op.title}"
Purpose: ${op.description || "No description provided."}

Write the complete, production-quality content for this document file in markdown.
Be thorough and specific — include detailed schemas, API specs, data flows, config values, or component designs as appropriate for this file's purpose.
Do NOT include a top-level H1 title (the file already has a title).
Return ONLY the markdown content, no extra explanation.
`;
            const contentRaw = await callLLMInvoke(contentPrompt);
            const content = typeof contentRaw === "string" ? contentRaw.trim() : "";

            if (content) {
              await client.mutation(api.requirements.textFileBlocks.createBlock, {
                externalId: crypto.randomUUID(),
                textFileId: newId,
                type: "paragraph",
                props: {},
                content: [{ type: "text", text: content }],
                rank: "a0",
                approvedByHuman: false,
              });
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

