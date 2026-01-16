"use node";
import { model } from "../graph";
import { AgentState } from "../types";
import { parseJSON } from "../utils";

export async function requirementsNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  console.log("[requirements] Analyzing user message for requirements...");

  if (!state.requirements) {
    const prompt = `
Analyze this user request and extract project requirements:

User: "${state.userMessage}"

Extract and return as JSON:
{
  "projectType": "landing_page" | "dashboard" | "e-commerce" | "portfolio",
  "targetAudience": "who is this for?",
  "purpose": "what should this achieve?",
  "style": "design aesthetic (e.g., modern, playful, professional)",
  "requiredSections": ["array", "of", "section", "names"],
  "colorScheme": {
    "primary": "#hexcolor",
    "secondary": "#hexcolor",
    "accent": "#hexcolor",
    "text": "#hexcolor",
    "background": "#hexcolor"
  },
  "mustHave": ["critical", "features"],
  "niceToHave": ["optional", "features"]
}

Return ONLY valid JSON, no explanations.`;

    try {
      const response = await model.invoke(prompt);
      const text = response.content.toString();
      const requirements = parseJSON(text);

      console.log("[requirements] ✓ Extracted project requirements");
      console.log(`  - Type: ${requirements.projectType}`);
      console.log(`  - Sections: ${requirements.requiredSections.join(", ")}`);

      return { requirements };
    } catch (error) {
      console.error("[requirements] ✗ Failed to extract requirements:", error);

      return {
        requirements: {
          projectType: "landing_page",
          targetAudience: "general audience",
          purpose: "showcase product/service",
          style: "modern, clean",
          requiredSections: ["hero", "features", "cta", "footer"],
          colorScheme: {
            primary: "#3B82F6",
            secondary: "#EFF6FF",
            accent: "#10B981",
            text: "#1F2937",
            background: "#FFFFFF",
          },
          mustHave: ["clear CTA", "responsive design"],
          niceToHave: [],
        },
      };
    }
  }

  console.log("[requirements] No requirement updates needed");
  return {};
}
