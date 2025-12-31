"use node";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { groqModel, WorkflowStateType } from "../designAgent";

export const analyzeInput = async (state: WorkflowStateType) => {
  const messages = [
    new SystemMessage(
      "You are a router. Analyze if the user wants to use shape_tools(Frame, Rect(angle), Circle), ui_tools(Navbar, buttons,landing page) or edit_tools for information or CALCULATE something. " +
        "Reply with ONLY one word: 'shape_tools' or 'ui_tools'. Nothing else."
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
};

export const shapeTools = async (state: WorkflowStateType) => {
  return state;
};
export const uiTools = async (state: WorkflowStateType) => {
  return state;
};
export const toolRouter = async (state: WorkflowStateType) => {
  return "shape_tools";
};
export const finalOutput = async (state: WorkflowStateType) => {
  return state;
};
