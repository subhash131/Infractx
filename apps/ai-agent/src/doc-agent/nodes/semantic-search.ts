import { AgentStateAnnotation } from "../index";
import { RunnableConfig } from "@langchain/core/runnables";
import { getConvexClient } from "../convex-client";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";

/**
 * Semantic search node (RAG step).
 *
 * Embeds the user's message via the embeddings server and runs a vector
 * similarity search against the `blocks` table. The top matching blocks are
 * formatted as a context string and stored in `fetchedContext` so that
 * downstream nodes (e.g. generateOperations) can inject them into LLM prompts.
 */
export async function semanticSearch(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig
) {
  console.log("🔍 Running semantic search on blocks...");

  if (!state.userMessage?.trim()) {
    return { fetchedContext: "" };
  }

  const token = config.configurable?.token as string | undefined;
  const client = getConvexClient(token);

  try {
    const results = await client.action(api.requirements.embeddings.searchBlocks, {
      query: state.userMessage,
      // Scope to the current document so cross-file mentions work
      ...(state.docId ? { documentId: state.docId as Id<"documents"> } : {}),
      limit: 3,
    });

    if (!results || results.length === 0) {
      console.log("🔍 No semantic matches found.");
      return { fetchedContext: "" };
    }

    // Format matched blocks as readable context for the LLM
    const fetchedContext = results
      .map((r, i) => {
        const text = extractText(r.block?.["content"]);
        const score = r.score.toFixed(2);
        const fileName = (r.block as any)?.fileName;
        const sbTitle = (r.block as any)?.smartBlockTitle;
        const fileId = (r.block as any)?.textFileId;
        const blockId = (r.block as any)?.smartBlockExternalId || (r.block as any)?.externalId;

        let header = `[Relevant Context ${i + 1} | similarity: ${score}]`;
        if (fileName && sbTitle) {
          header += `\nLocation: File "${fileName}", Smart Block: "${sbTitle}"`;
          const mentionData = {
            fileId: fileId || null,
            blockId: blockId || null,
            fileName: fileName,
            label: sbTitle
          };
          header += `\n[MENTION_METADATA: ${JSON.stringify(mentionData)}]`;
        }
        return `${header}\n${text}`;
      })
      .filter((s) => s.trim().length > 0)
      .join("\n\n");

    console.log(`✅ Semantic search: ${results.length} matches found.`);
    return { fetchedContext };
  } catch (err) {
    // Non-fatal — if search fails we just proceed without extra context
    console.error("❌ semanticSearch failed:", err);
    return { fetchedContext: "" };
  }
}

/** Recursively extract plain text from a BlockNote content array. */
function extractText(content: unknown): string {
  if (!content || !Array.isArray(content)) return "";
  return (content as any[])
    .map((node: any) => {
      if (typeof node?.text === "string") return node.text;
      if (Array.isArray(node?.content)) return extractText(node.content);
      return "";
    })
    .join(" ")
    .trim();
}
