// "use node";

// import { StateGraph, END, START } from "@langchain/langgraph";

// import { requirementsNode } from "./nodes/requirementsNode";
// import { intentUnderstandingNode } from "./nodes/intentUnderstandingNode";
// import { componentGenerationNode } from "./nodes/componentGenerationNode";
// import { hierarchyResolutionNode } from "./nodes/hierarchyResolutionNode";
// import { validationNode } from "./nodes/validationNode";
// import { AgentState, WorkflowState } from "./state";
// import { framePlanningNode } from "./nodes/framePlanningNode";

// function shouldProceed(state: AgentState): string {
//   if (state.intent?.action === "needs_clarification") return "end";
//   if (state.intent?.action === "create_new") return "framePlanning";
//   return "end";
// }

// export function buildUIDesignGraph() {
//   const workflow = new StateGraph(WorkflowState)
//     .addNode("requirementsNode", requirementsNode)
//     .addNode("intentUnderstanding", intentUnderstandingNode)
//     .addNode("framePlanning", framePlanningNode)
//     .addNode("componentGeneration", componentGenerationNode)
//     .addNode("hierarchyResolution", hierarchyResolutionNode)
//     .addNode("validation", validationNode)
//     .addEdge(START, "requirementsNode")
//     .addEdge("requirementsNode", "intentUnderstanding")
//     .addConditionalEdges("intentUnderstanding", shouldProceed, {
//       framePlanning: "framePlanning",
//       end: END,
//     })
//     .addEdge("framePlanning", "componentGeneration")
//     .addEdge("componentGeneration", "hierarchyResolution")
//     .addEdge("hierarchyResolution", "validation")
//     .addEdge("validation", END);
//   return workflow;
// }
