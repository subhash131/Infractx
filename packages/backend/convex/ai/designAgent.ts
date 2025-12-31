"use node";

import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import {
  HumanMessage,
  SystemMessage,
  BaseMessage,
} from "@langchain/core/messages";
import { GenericActionCtx } from "convex/server";
import { DataModel, Id } from "../_generated/dataModel";
import {
  analyzeInput,
  finalOutput,
  shapeTools,
  toolRouter,
  uiTools,
} from "./nodes";

//Agent State Schema
const WorkflowState = Annotation.Root({
  userInput: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
  decision: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
  result: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  convexState: Annotation<GenericActionCtx<DataModel>>({
    reducer: (x, y) => y ?? x,
  }),
});

export type WorkflowStateType = typeof WorkflowState.State;

export const groqModel = new ChatGroq({
  apiKey: "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",
  model: "llama-3.3-70b-versatile",
  temperature: 0.7,
});

export function createWorkflow() {
  const workflow = new StateGraph(WorkflowState)
    .addNode("analyze", analyzeInput)
    .addNode("tool_router", toolRouter)
    .addNode("ui_tools", uiTools)
    .addNode("shape_tools", shapeTools)
    .addNode("output", finalOutput)
    .addEdge(START, "analyze")
    .addConditionalEdges(
      "analyze", // Source node
      toolRouter, // Router function
      {
        shape_tools: "shape_tools", // If yes, go to yes_branch
        uiTools: "ui_tools", // If no, go to no_branch
      }
    )
    .addEdge("shape_tools", "output")
    .addEdge("ui_tools", "output")
    .addEdge("output", END);

  return workflow.compile();
}
