"use node";
import { model } from "../graph";
import { AgentState, Component } from "../types";
import { parseJSON } from "../utils";

export async function designPlanningNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  console.log("[designPlanning] Creating execution plan...");

  const prompt = `
You are a UI/UX designer planning a ${state.requirements!.projectType}.

Requirements:
${JSON.stringify(state.requirements, null, 2)}

User's request: "${state.userMessage}"

Create a detailed execution plan and return as JSON:
{
  "sections": [
    {
      "type": "hero" | "features" | "testimonials" | "cta" | "footer",
      "description": "what this section contains",
      "estimatedLayers": 10,
      "height": 600,
      "priority": 1
    }
  ],
  "layoutStructure": "single_column" | "multi_column",
  "designSystem": {
    "spacing": { "small": 8, "medium": 16, "large": 32, "xlarge": 64 },
    "typography": { "h1": 56, "h2": 40, "h3": 32, "body": 18, "small": 14 },
    "borderRadius": 12
  },
  "totalEstimatedLayers": 80
}

Return ONLY valid JSON.`;

  try {
    const response = await model.invoke(prompt);
    const text = response.content.toString();
    const plan = parseJSON(text);

    console.log(
      `[designPlanning] ✓ Plan created: ${plan.sections.length} sections, ~${plan.totalEstimatedLayers} layers`
    );

    let currentTop = 0;
    const componentsToGenerate: Component[] = plan.sections.map(
      (section: any) => {
        const component = {
          type: section.type,
          description: section.description,
          estimatedLayers: section.estimatedLayers,
          priority: section.priority,
          position: { top: currentTop, left: 0 },
          width: 1440,
          height: section.height,
        };

        currentTop += section.height + 80;
        return component;
      }
    );

    return {
      designPlan: plan,
      componentsToGenerate,
      designSystem: plan.designSystem,
    };
  } catch (error) {
    console.error("[designPlanning] ✗ Planning failed:", error);
    throw error;
  }
}
