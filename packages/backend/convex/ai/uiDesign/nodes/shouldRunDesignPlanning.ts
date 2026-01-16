"use node";
import { AgentState } from "../types";

export function shouldRunDesignPlanning(state: AgentState): string {
  return state.intent?.action === "create_new"
    ? "designPlanning"
    : "componentGeneration";
}
