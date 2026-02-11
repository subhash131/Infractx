import { v4 as uuidv4 } from "uuid";
import { createGroq } from "@ai-sdk/groq";
import { invokeAgent, resumeAgent, AgentResponse } from "./agent";

// Re-export for backward compatibility (used by inngest/function.ts)
export const groqModel = createGroq({
  apiKey: process.env.GROQ_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { query, projectId, threadId, resumeInput } = body;

    let result: AgentResponse;

    // --- Resume from human-in-the-loop interrupt ---
    if (resumeInput && threadId) {
      console.log(`[API] Resuming thread ${threadId} with: "${resumeInput}"`);

      result = await resumeAgent({
        userResponse: resumeInput,
        threadId,
      });

      return Response.json(result);
    }

    // --- New query ---
    if (!query) {
      return Response.json(
        { error: "Missing 'query' in request body" },
        { status: 400 }
      );
    }

    if (!projectId) {
      return Response.json(
        { error: "Missing 'projectId' in request body" },
        { status: 400 }
      );
    }

    const activeThreadId = threadId || uuidv4();
    console.log(`[API] New query on thread ${activeThreadId}: "${query}"`);

    result = await invokeAgent({
      query,
      projectId,
      threadId: activeThreadId,
    });

    return Response.json(result);
  } catch (error: any) {
    console.error("[API] Unhandled error:", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
