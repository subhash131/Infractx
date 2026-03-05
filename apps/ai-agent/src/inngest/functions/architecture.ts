import { inngest } from "../client";
import { api } from "@workspace/backend/_generated/api";
import { getConvexClient } from "../../doc-agent/convex-client";
import { redis } from "../../lib/redis";
import { ChatGroq } from "@langchain/groq";
import { Id } from "@workspace/backend/_generated/dataModel";

// ─── Dedicated LLM caller for architecture (uses invoke, not stream) ───────────
// Reasoning models spend all stream tokens on thinking — invoke() returns the 
// final answer after reasoning is complete, with no token budget conflict.
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

// ─── Helper: parse JSON from LLM output (strips markdown fences) ─────────────
function parseJSON<T>(raw: string): T | null {
  let cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
  // Repair truncated arrays
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

// ─── Helper: push an event to Redis (consumed by SSE poller in route.ts) ─────
async function pushToRedis(streamKey: string, payload: object) {
  await redis.rpush(streamKey, JSON.stringify(payload));
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface StructureOp {
  action: "create";
  type: "FILE" | "FOLDER";
  title: string;
  description?: string;
  tempId?: string;
  parentId?: string;
}

// ─── Inngest function ─────────────────────────────────────────────────────────
export const architectureHandler = inngest.createFunction(
  { id: "doc-architecture-requested" },
  { event: "doc/architecture.requested" },

  async ({ event }) => {
    const { docId, userMessage, sessionToken, cursorPosition } = event.data as {
      docId: string;
      userMessage: string;
      sessionToken: string;
      cursorPosition: number;
    };

    const streamKey = `agent:stream:${docId}`;
    console.log("🏛️ Architecture job started for doc:", docId);

    try {
      const client = getConvexClient(sessionToken);

      // ── Fetch existing file tree ─────────────────────────────────────────────
      const existingFiles = await client.query(
        api.requirements.textFiles.getFilesByDocumentId,
        { documentId: docId as Id<"documents"> }
      );
      const existingTitles = existingFiles.map((f) => f.title);

      // ═══════════════════════════════════════════════════════════════════════
      // PHASE 1: Generate the file/folder structure (titles + descriptions only)
      //          Small output → won't hit token limits.
      // ═══════════════════════════════════════════════════════════════════════
      const structurePrompt = `
You are an expert software architect. Design a complete production-ready system architecture for the following request.

User Request: "${userMessage}"

Already existing files (do NOT create these): ${JSON.stringify(existingTitles)}

Output a flat JSON array of file/folder operations. Each item is ONLY structure — no file content yet.

Rules:
- Use "FILE" or "FOLDER" for type.
- Assign a "tempId" (e.g. "temp_1") to every FOLDER.
- Set "parentId" to a tempId or an existing real file ID for nesting.
- For FILES, add a short "description" (1-2 sentences) describing what content it will have.
- Do NOT use file extensions in titles (no .md, .ts, .tsx).
- Cover: backend services, database schema, frontend pages, API contracts, infrastructure.

Return ONLY valid JSON array, no markdown fences:
[
  { "action": "create", "type": "FOLDER", "title": "Backend", "tempId": "temp_1" },
  { "action": "create", "type": "FILE", "title": "Database Schema", "parentId": "temp_1", "description": "PostgreSQL schema with tables for users, tracks, playlists, and subscriptions." }
]
`;

      console.log("📐 Phase 1: Generating structure...");
      const structureRaw = await callLLMInvoke(structurePrompt);
      console.log("📐 Phase 1 raw (first 300 chars):", structureRaw.slice(0, 300));

      const structureOps = parseJSON<StructureOp[]>(structureRaw);
      if (!structureOps || !Array.isArray(structureOps)) {
        await pushToRedis(streamKey, { type: "error", error: "AI failed to generate architecture structure." });
        await pushToRedis(streamKey, { type: "done" });
        return;
      }

      console.log(`📋 Structure plan: ${structureOps.length} items`);

      // ═══════════════════════════════════════════════════════════════════════
      // PHASE 2: Create each item in Convex, then generate content per FILE
      //          individually (one LLM call per file → small, reliable output)
      // ═══════════════════════════════════════════════════════════════════════
      const tempIdMap = new Map<string, string>(); // temp_X → real Convex ID
      let filesCreated = 0;
      let foldersCreated = 0;

      for (const op of structureOps) {
        if (op.action !== "create") continue;

        // Resolve parent ID
        let parentId: string | undefined;
        if (op.parentId) {
          parentId = op.parentId.startsWith("temp_")
            ? tempIdMap.get(op.parentId)
            : op.parentId;
        }

        try {
          // Create the file or folder in Convex
          const newId = await client.mutation(api.requirements.textFiles.create, {
            title: op.title,
            documentId: docId as Id<"documents">,
            type: op.type,
            parentId: parentId ? (parentId as Id<"text_files">) : undefined,
          });

          if (op.tempId) tempIdMap.set(op.tempId, newId);

          if (op.type === "FOLDER") {
            foldersCreated++;
            console.log(`📁 Created FOLDER: "${op.title}"`);
          }

          if (op.type === "FILE") {
            filesCreated++;
            console.log(`📄 Created FILE: "${op.title}" — generating content...`);

            // ── Per-file content generation ──────────────────────────────────
            const contentPrompt = `
You are a senior software architect writing detailed documentation for a software system.

System: "${userMessage}"
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

          // Push live progress to SSE poller after each item
          await pushToRedis(streamKey, {
            type: "architecture_progress",
            item: {
              id: newId,
              title: op.title,
              itemType: op.type,
              parentId: parentId ?? null,
            },
          });

        } catch (opErr) {
          console.error(`❌ Failed on "${op.title}":`, opErr);
          // Keep going — don't abort the whole job for one item
        }
      }

      // ── Done ─────────────────────────────────────────────────────────────────
      await pushToRedis(streamKey, {
        type: "response",
        response: {
          operations: [{
            type: "chat_response",
            position: cursorPosition ?? 0,
            content: `✅ Architecture scaffolded! Created ${foldersCreated} folder(s) and ${filesCreated} file(s) with full content. Check the file tree on the left.`,
          }],
        },
      });
      await pushToRedis(streamKey, { type: "done" });

      console.log(`🏛️ Architecture job complete: ${foldersCreated} folders, ${filesCreated} files.`);

    } catch (err) {
      console.error("❌ Architecture job failed:", err);
      await pushToRedis(streamKey, {
        type: "error",
        error: "Architecture generation failed. Please try again.",
      });
      await pushToRedis(streamKey, { type: "done" });
    }
  }
);
