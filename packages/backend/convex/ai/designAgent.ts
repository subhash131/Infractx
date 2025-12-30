"use node";

import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import {
  HumanMessage,
  SystemMessage,
  BaseMessage,
} from "@langchain/core/messages";
import { GenericActionCtx } from "convex/server";
import { api } from "../_generated/api";
import { DataModel, Id } from "../_generated/dataModel";

// Step 1: Define Your State Schema
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

// Step 2: Initialize Groq Model
export const groqModel = new ChatGroq({
  apiKey: "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",
  model: "llama-3.3-70b-versatile",
  temperature: 0.7,
});

// Step 3: Define Tools (Functions)
async function searchTool(query: string): Promise<string> {
  // Simulates a search tool
  console.log(`🔍 Searching for: ${query}`);
  return `Search results for "${query}": Found relevant information about ${query}!`;
}

async function calculatorTool(expression: string): Promise<string> {
  // Simulates a calculator tool
  console.log(`🧮 Calculating: ${expression}`);
  try {
    // Simple evaluation (be careful with eval in production!)
    const result = Function(`"use strict"; return (${expression})`)();
    return `Calculation result: ${expression} = ${result}`;
  } catch (error) {
    return `Error: Invalid calculation expression`;
  }
}

// Step 4: Define Node Functions
async function analyzeInput(
  state: WorkflowStateType
): Promise<Partial<WorkflowStateType>> {
  console.log("\n📊 Analyzing input...");

  const messages = [
    new SystemMessage(
      "You are a router. Analyze if the user wants to SEARCH for information or CALCULATE something. " +
        "Reply with ONLY one word: 'search' or 'calculate'. Nothing else."
    ),
    new HumanMessage(state.userInput),
  ];

  const response = await groqModel.invoke(messages);
  const decision = response.content.toString().toLowerCase().trim();

  console.log(`Decision: ${decision}`);

  // Map to yes/no (search = yes, calculate = no)
  const finalDecision = decision.includes("search") ? "yes" : "no";

  return {
    decision: finalDecision,
    messages: [...messages, response],
  };
}

async function yesBranch(
  state: WorkflowStateType
): Promise<Partial<WorkflowStateType>> {
  console.log("\n✅ Taking YES branch (Search Tool)...");

  // Use search tool
  const searchResult = await searchTool(state.userInput);

  // Use Groq to generate a friendly response
  const messages = [
    new SystemMessage(
      "You are a helpful assistant. Create a friendly, concise response based on the search results."
    ),
    new HumanMessage(
      `User query: ${state.userInput}\n\nSearch results: ${searchResult}`
    ),
  ];

  const response = await groqModel.invoke(messages);

  return {
    result: response.content.toString(),
    messages: [...messages, response],
  };
}

async function noBranch(
  state: WorkflowStateType
): Promise<Partial<WorkflowStateType>> {
  console.log("\n❌ Taking NO branch (Calculator Tool)...");

  // Use calculator tool
  const calcResult = await calculatorTool(state.userInput);

  // Use Groq to generate a friendly response
  const messages = [
    new SystemMessage(
      "You are a helpful assistant. Create a friendly, concise response based on the calculation."
    ),
    new HumanMessage(
      `User query: ${state.userInput}\n\nCalculation: ${calcResult}`
    ),
  ];

  const response = await groqModel.invoke(messages);

  return {
    result: response.content.toString(),
    messages: [...messages, response],
  };
}

async function finalOutput(
  state: WorkflowStateType
): Promise<Partial<WorkflowStateType>> {
  console.log("\n" + "=".repeat(60));
  console.log("📤 FINAL OUTPUT");
  console.log("=".repeat(60));
  console.log(`User Input: ${state.userInput}`);
  console.log(
    `Decision Path: ${state.decision === "yes" ? "Search (YES)" : "Calculate (NO)"}`
  );
  console.log(`Result: ${state.result}`);
  console.log("=".repeat(60) + "\n");

  return {};
}

// Step 5: Define Router Function for Conditional Edges
function routeDecision(state: WorkflowStateType): "yes_path" | "no_path" {
  console.log(`🔀 Routing based on decision: ${state.decision}`);
  return state.decision === "yes" ? "yes_path" : "no_path";
}

// Step 6: Build the Graph
function createWorkflow() {
  console.log("🏗️  Building workflow graph...");

  const workflow = new StateGraph(WorkflowState)
    // Add all nodes
    .addNode("analyze", analyzeInput)
    .addNode("yes_branch", yesBranch)
    .addNode("no_branch", noBranch)
    .addNode("output", finalOutput)

    // Set entry point
    .addEdge(START, "analyze")

    // Add conditional edges (YES/NO branching)
    .addConditionalEdges(
      "analyze", // Source node
      routeDecision, // Router function
      {
        yes_path: "yes_branch", // If yes, go to yes_branch
        no_path: "no_branch", // If no, go to no_branch
      }
    )

    // Add regular edges to final output
    .addEdge("yes_branch", "output")
    .addEdge("no_branch", "output")
    .addEdge("output", END);

  return workflow.compile();
}

export const designAgent = createWorkflow();

// Step 7: Run the Workflow
async function main() {
  console.log("🚀 Starting LangGraph Workflow with Groq\n");

  // Test 1: Search query (YES branch)
  console.log("=".repeat(60));
  console.log("TEST 1: Search Query");
  console.log("=".repeat(60));
  const app = createWorkflow();

  await app.invoke({
    userInput: "What is the capital of France?",
    decision: "",
    result: "",
    messages: [],
  });

  // Test 2: Calculation (NO branch)
  console.log("\n" + "=".repeat(60));
  console.log("TEST 2: Calculation");
  console.log("=".repeat(60));

  await app.invoke({
    userInput: "(25 * 4) + 100",
    decision: "",
    result: "",
    messages: [],
  });
}

// Run the workflow
main().catch(console.error);
