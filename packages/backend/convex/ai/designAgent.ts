"use node";

import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import { BaseMessage } from "@langchain/core/messages";
import { GenericActionCtx } from "convex/server";
import { DataModel, Id } from "../_generated/dataModel";
import {
  analyzeInput,
  generic,
  outputRouter,
  shapeTools,
  toolRouter,
  uiTools,
  validateOutput,
} from "./nodes";

// ============================================
// AGENT STATE SCHEMA
// ============================================
const WorkflowState = Annotation.Root({
  canvasWidth: Annotation<number>({
    reducer: (x) => x,
  }),
  canvasHeight: Annotation<number>({
    reducer: (x) => x,
  }),
  frameId: Annotation<Id<"layers">>({
    reducer: (x) => x,
  }),
  messageId: Annotation<Id<"messages">>({
    reducer: (x) => x,
  }),
  conversationId: Annotation<Id<"conversations">>({
    reducer: (x) => x,
  }),
  pageId: Annotation<Id<"pages">>({
    reducer: (x) => x,
  }),
  userInput: Annotation<string>({
    reducer: (x, y) => y ?? x ?? "",
    default: () => "",
  }),
  decision: Annotation<string>({
    reducer: (x, y) => y ?? x ?? "",
    default: () => "",
  }),
  result: Annotation<string>({
    reducer: (x, y) => y ?? x ?? "",
    default: () => "",
  }),
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => {
      try {
        // Ensure both are arrays
        const current = Array.isArray(x) ? x : [];
        const updates = Array.isArray(y) ? y : [];

        console.log(
          `[REDUCER] messages - current length: ${current.length}, updates length: ${updates.length}`
        );

        return [...current, ...updates];
      } catch (error) {
        console.error(`[REDUCER ERROR] messages:`, error);
        return [];
      }
    },
    default: () => [],
  }),
  retryCount: Annotation<number>({
    reducer: (x, y) => {
      try {
        // If y is explicitly provided, use it (for reset scenarios)
        if (y !== undefined && y !== null) {
          return y;
        }
        // Otherwise increment
        const current = typeof x === "number" ? x : 0;
        return current + 1;
      } catch (error) {
        console.error(`[REDUCER ERROR] retryCount:`, error);
        return 0;
      }
    },
    default: () => 0,
  }),
  errors: Annotation<string[]>({
    reducer: (x, y) => {
      try {
        const current = Array.isArray(x) ? x : [];
        const updates = Array.isArray(y) ? y : [];

        console.log(
          `[REDUCER] errors - current length: ${current.length}, updates length: ${updates.length}`
        );

        return [...current, ...updates];
      } catch (error) {
        console.error(`[REDUCER ERROR] errors:`, error);
        return [];
      }
    },
    default: () => [],
  }),
  convexState: Annotation<GenericActionCtx<DataModel>>({
    reducer: (x, y) => y ?? x,
  }),
});

export type WorkflowStateType = typeof WorkflowState.State;

export const groqModel = new ChatGroq({
  apiKey: "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",
  model: "openai/gpt-oss-120b",
  temperature: 0,
});

// ============================================
// CREATE WORKFLOW GRAPH
// ============================================
export function createWorkflow() {
  const workflow = new StateGraph(WorkflowState)
    // Add all nodes
    .addNode("analyze", analyzeInput)
    .addNode("generic", generic)
    .addNode("ui_tools", uiTools)
    .addNode("shape_tools", shapeTools)
    .addNode("validate_output", validateOutput)

    // Start → Analyze
    .addEdge(START, "analyze")

    // Analyze → Tool category routing
    .addConditionalEdges("analyze", toolRouter, {
      shape_tools: "shape_tools",
      ui_tools: "ui_tools",
      generic: "generic",
    })

    // Generic → END (no validation needed)
    .addEdge("generic", END)

    // All tool outputs → Validation
    .addEdge("ui_tools", "validate_output")
    .addEdge("shape_tools", "validate_output")

    // Validation → Retry or End
    .addConditionalEdges("validate_output", outputRouter, {
      redo: "analyze",
      end: END,
    });

  return workflow.compile();
}
