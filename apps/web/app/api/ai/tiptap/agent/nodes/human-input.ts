import { DocumentAgentStateType } from "../state";
import { interrupt } from "@langchain/langgraph";

/**
 * Human Input Node — Pauses the graph and asks the user for clarification or approval.
 * Uses LangGraph's interrupt() to pause execution.
 * The graph can be resumed by passing the user's response via the Command API.
 */
export async function humanInputNode(
  state: DocumentAgentStateType
): Promise<Partial<DocumentAgentStateType>> {
  const question =
    state.humanInputRequest ||
    "Could you provide more details about what you'd like me to help with?";

  console.log(`[HUMAN_INPUT] Requesting input: "${question}"`);

  // This will pause the graph execution and return control to the caller.
  // The caller (API route) will detect this interrupt and return the question to the user.
  // When the user responds, the graph is resumed with the user's answer.
  const userResponse = interrupt(question);

  console.log(`[HUMAN_INPUT] Received response: "${userResponse}"`);

  // After interrupt resumes, update the state with the user's response
  return {
    userQuery: userResponse as string,
    needsHumanInput: false,
    humanInputRequest: undefined,
  };
}
