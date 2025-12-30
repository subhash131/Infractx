"use node";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { groqModel, WorkflowStateType } from "../designAgent";

export const analyzeInput = async (state: WorkflowStateType) => {
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
};
