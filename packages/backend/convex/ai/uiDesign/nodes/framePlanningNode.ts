// "use node";
// import { LayoutRules } from "../layoutRules";
// import { model } from "../model";
// import { AgentState } from "../state";
// import { Component, DesignSystem, FramePlan } from "../types";
// import { parseJSON, log } from "../utils";

// export async function framePlanningNode(
//   state: AgentState,
// ): Promise<Partial<AgentState>> {
//   log(state, "info", "[planning] Creating plan...");

//   const prompt = `Plan ${state.requirements!.projectType}.

// Requirements: ${JSON.stringify(state.requirements)}
// Message: "${state.userMessage}"

// JSON only:
// {
//   "frameName": "name",
//   "sections": [{"type":"hero|features|footer","description":"what","estimatedLayers":12,"height":600,"priority":1}],
//   "designSystem": {"spacing":{"xs":4,"sm":8,"md":16,"lg":24,"xl":32,"xxl":64},"typography":{"h1":56,"h2":40,"h3":32,"h4":24,"body":18,"small":14},"borderRadius":{"sm":4,"md":8,"lg":12,"full":9999},"grid":{"columns":12,"columnWidth":${Math.floor(state.requirements!.viewportWidth / 12)},"gutter":24}}
// }`;

//   try {
//     const response = await model.invoke(prompt);
//     const plan = parseJSON(response.content.toString()) as {
//       frameName: string;
//       sections: {
//         type: string;
//         description: string;
//         height: number;
//         priority: number;
//       }[];
//       designSystem: DesignSystem;
//     };

//     const existingFrames = state.availableFrames.filter(
//       (f) => f.type === "FRAME",
//     );
//     const frameLeft =
//       existingFrames.length > 0
//         ? Math.max(...existingFrames.map((f) => f.left + f.width)) + 10
//         : 0;

//     const totalHeight = plan.sections.reduce(
//       (sum: number, s: any) => sum + s.height + LayoutRules.SPACING.xxl,
//       0,
//     );

//     const framePlan: FramePlan = {
//       layerRef: `${plan.frameName.toLowerCase().replace(/\s+/g, "_")}_frame`,
//       name: plan.frameName,
//       width: state.requirements!.viewportWidth,
//       height: totalHeight,
//       left: frameLeft,
//       top: 0,
//       fill: state.requirements!.colorScheme.background,
//     };

//     let currentTop = 0;
//     const componentsToGenerate: Component[] = plan.sections.map(
//       (section: any) => {
//         const component = {
//           type: section.type,
//           description: section.description,
//           estimatedLayers: section.estimatedLayers,
//           priority: section.priority,
//           position: { top: currentTop, left: 0 },
//           width: state.requirements!.viewportWidth,
//           height: section.height,
//         };
//         currentTop += section.height + LayoutRules.SPACING.xxl;
//         console.log({ component }, "\n");
//         return component;
//       },
//     );

//     log(state, "info", `[planning] ${plan.sections.length} sections`);
//     console.log({
//       framePlan,
//       componentsToGenerate,
//       designSystem: plan.designSystem,
//       llmCalls: (state.llmCalls || 0) + 1,
//     });
//     return {
//       framePlan,
//       componentsToGenerate,
//       designSystem: plan.designSystem,
//       llmCalls: (state.llmCalls || 0) + 1,
//     };
//   } catch (error) {
//     log(state, "error", `[planning] Failed: ${JSON.stringify(error)}`);
//     throw error;
//   }
// }
