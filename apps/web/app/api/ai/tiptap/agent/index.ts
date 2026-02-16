import { StateGraph, END } from "@langchain/langgraph";
import { JsonFileSaver } from "./json-file-saver";
import { DocumentAgentState } from "./state";
import {
  routerNode,
  routeByIntent,
  qaNode,
  docQueryNode,
  docDraftNode,
  humanInputNode,
} from "./nodes";

// ============================================
// GRAPH CONSTRUCTION
// ============================================

/**
 * Creates the multi-agent document graph.
 *
 * Flow:
 *   __start__ → router → (conditional) → qa | docQuery | docDraft | humanInput
 *   humanInput → router  (re-classify after user responds)
 *   qa / docQuery / docDraft → END
 */
export function createDocumentAgentGraph() {
  const workflow = new StateGraph(DocumentAgentState)
    // --- Nodes ---
    .addNode("router", routerNode)
    .addNode("qa", qaNode)
    .addNode("docQuery", docQueryNode)
    .addNode("docDraft", docDraftNode)
    .addNode("humanInput", humanInputNode)

    // --- Edges ---
    .addEdge("__start__", "router")

    // Router → sub-agents (conditional)
    .addConditionalEdges("router", routeByIntent, {
      qa: "qa",
      docQuery: "docQuery",
      docDraft: "docDraft",
      humanInput: "humanInput",
    })

    // Human input loops back to router for re-classification
    .addEdge("humanInput", "router")

    // All sub-agents terminate
    .addEdge("qa", END)
    .addEdge("docQuery", END)
    .addEdge("docDraft", END);

  return workflow;
}

// ============================================
// CHECKPOINTER (JSON file – persistent across restarts)
// ============================================

const checkpointer = new JsonFileSaver("./agent-checkpoints.json");

/**
 * Compile and return the graph with checkpointer attached.
 */
export function getCompiledGraph() {
  const workflow = createDocumentAgentGraph();
  return workflow.compile({ checkpointer });
}

// ============================================
// PUBLIC API
// ============================================

export type AgentResponse = {
  status: "completed" | "needs_input" | "error";
  response?: string;
  draftBlocks?: any[];
  documentResults?: any[];
  question?: string;
  threadId: string;
  intent?: string;
};

/**
 * Invoke the document agent with a new query.
 * For new queries, we always start fresh — if the thread has a stale interrupt
 * from a previous session, we append a version suffix to force a clean run.
 */
export async function invokeAgent(params: {
  query: string;
  projectId: string;
  threadId: string;
}): Promise<AgentResponse> {
  const { query, projectId, threadId } = params;
  const graph = getCompiledGraph();

  // Check if thread has a stale interrupt from a previous run
  // If so, use a versioned thread ID to start fresh
  let activeThreadId = threadId;
  try {
    const existingState = await graph.getState({
      configurable: { thread_id: threadId },
    });
    const hasStaleInterrupt = existingState.tasks?.some(
      (t: any) => t.interrupts && t.interrupts.length > 0
    );
    if (hasStaleInterrupt) {
      // Append timestamp to create a fresh sub-thread
      activeThreadId = `${threadId}_${Date.now()}`;
      console.log(`[AGENT] Stale interrupt detected on thread ${threadId}, using fresh thread: ${activeThreadId}`);
    }
  } catch {
    // No existing state — this is a brand new thread, proceed normally
  }

  const config = {
    configurable: { thread_id: activeThreadId },
  };

  try {
    const result = await graph.invoke(
      {
        userQuery: query,
        projectId,
      },
      config
    );

    // After invoke, check if the graph is paused at an interrupt
    const currentState = await graph.getState(config);
    const pendingInterrupts = currentState.tasks?.flatMap(
      (t: any) => t.interrupts ?? []
    );

    if (pendingInterrupts && pendingInterrupts.length > 0) {
      const interruptValue = pendingInterrupts[0]?.value ?? "Could you provide more details?";
      console.log(`[AGENT] Interrupt detected: "${interruptValue}"`);

      return {
        status: "needs_input",
        question: String(interruptValue),
        threadId: activeThreadId,
        intent: "needs_clarification",
      };
    }

    return {
      status: "completed",
      response: result.response,
      draftBlocks: result.draftBlocks?.length ? result.draftBlocks : undefined,
      documentResults: result.documentResults?.length
        ? result.documentResults
        : undefined,
      threadId: activeThreadId,
      intent: result.intent,
    };
  } catch (error: any) {
    console.error("[AGENT] Invocation error:", error?.message || error);
    return {
      status: "error",
      response: `Agent error: ${error.message || "Unknown error"}`,
      threadId: activeThreadId,
    };
  }
}

/**
 * Resume the agent after a human-in-the-loop interrupt.
 */
export async function resumeAgent(params: {
  userResponse: string;
  threadId: string;
}): Promise<AgentResponse> {
  const { userResponse, threadId } = params;
  const graph = getCompiledGraph();

  const config = {
    configurable: { thread_id: threadId },
  };

  try {
    // Resume from the interrupt with the user's response
    const { Command } = await import("@langchain/langgraph");
    const result = await graph.invoke(
      new Command({ resume: userResponse }),
      config
    );

    // Check for another interrupt in the resumed flow
    const currentState = await graph.getState(config);
    const pendingInterrupts = currentState.tasks?.flatMap(
      (t: any) => t.interrupts ?? []
    );

    if (pendingInterrupts && pendingInterrupts.length > 0) {
      const interruptValue = pendingInterrupts[0]?.value ?? "Could you provide more details?";
      console.log(`[AGENT] Interrupt after resume: "${interruptValue}"`);

      return {
        status: "needs_input",
        question: String(interruptValue),
        threadId,
        intent: "needs_clarification",
      };
    }

    return {
      status: "completed",
      response: result.response,
      draftBlocks: result.draftBlocks?.length ? result.draftBlocks : undefined,
      documentResults: result.documentResults?.length
        ? result.documentResults
        : undefined,
      threadId,
      intent: result.intent,
    };
  } catch (error: any) {
    console.error("[AGENT] Resume error:", error?.message || error);
    return {
      status: "error",
      response: `Agent resume error: ${error.message || "Unknown error"}`,
      threadId,
    };
  }
}