// "use node";
// import { AgentState } from "../state";
// import { log, parseJSON } from "../utils";
// import { LayoutRules } from "../layoutRules";
// import { ProjectRequirements } from "../types";
// import { model } from "../model";

// export async function requirementsNode(
//   state: AgentState,
// ): Promise<Partial<AgentState>> {
//   log(state, "info", "[requirements] Extracting...");

//   const prompt = `Extract from: "${state.userMessage}"

// JSON only:
// {
//   "projectType": "landing_page|dashboard|portfolio|e-commerce|<any>",
//   "targetAudience": "who",
//   "purpose": "what",
//   "style": "modern|playful|professional|minimal",
//   "requiredSections": ["hero","features"],
//   "colorScheme": {"primary":"#hex","secondary":"#hex","accent":"#hex","text":"#hex","background":"#hex"},
//   "mustHave": ["feature1"]
// }`;

//   try {
//     const response = await model.invoke(prompt);
//     const requirements = parseJSON(
//       response.content.toString(),
//     ) as ProjectRequirements;
//     const viewport = LayoutRules.determineViewport(requirements);
//     requirements.viewportType = viewport.type;
//     requirements.viewportWidth = viewport.width;

//     log(
//       state,
//       "info",
//       `[requirements] ${requirements.projectType}, ${viewport.width}px`,
//     );
//     console.log({ requirements });
//     return { requirements, llmCalls: (state.llmCalls || 0) + 1 };
//   } catch (error) {
//     log(state, "error", `[requirements] Failed: ${JSON.stringify(error)}`);
//     throw new Error("Failed to extract requirements");
//   }
// }
