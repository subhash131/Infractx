"use node";
import { AgentState } from "../state";

export async function validateFrame(
  state: AgentState
): Promise<Partial<AgentState>> {
  console.log("[validateFrame] Validating Frame");

  return {
    ...state,
  };
}
