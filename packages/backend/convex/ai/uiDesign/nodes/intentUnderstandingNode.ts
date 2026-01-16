"use node";
import { model } from "../graph";
import { AgentState } from "../types";
import { parseJSON } from "../utils";

export async function intentUnderstandingNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  console.log("[intentUnderstanding] Analyzing user intent...");

  const hasExistingDesign =
    state.existingDesign && state.existingDesign.length > 0;

  const prompt = `
User message: "${state.userMessage}"
Has existing design: ${hasExistingDesign}

Determine the user's intent and return as JSON:
{
  "action": "create_new" | "modify_existing" | "add_component",
  "target": "which component/section or null for entire page",
  "specificChange": "what specifically should change (for modifications)",
  "scope": "entire_design" | "single_component" | "multiple_components"
}

Return ONLY valid JSON.`;

  try {
    const response = await model.invoke(prompt);
    const text = response.content.toString();
    const intent = parseJSON(text);

    console.log("[intentUnderstanding] ✓ Detected intent:", intent.action);
    if (intent.target) {
      console.log(`  - Target: ${intent.target}`);
    }

    return { intent };
  } catch (error) {
    console.error("[intentUnderstanding] ✗ Failed to determine intent");

    return {
      intent: {
        action: "create_new",
        target: null,
        specificChange: null,
        scope: "entire_design",
      },
    };
  }
}
