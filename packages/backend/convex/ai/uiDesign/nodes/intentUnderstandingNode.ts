// "use node";
// import { AgentState } from "../state";
// import { matchFrameFromMessage } from "./matchFrameFromMessage";
// import { model } from "../model";
// import { log } from "../utils";

// export async function intentUnderstandingNode(
//   state: AgentState,
// ): Promise<Partial<AgentState>> {
//   log(state, "info", "[intent] Analyzing...");

//   if (state.selectedObjectId) {
//     const prompt = `Message: "${state.userMessage}". What to modify? (10 words max)`;
//     const response = await model.invoke(prompt);
//     const modification = response.content.toString().trim();

//     console.log({
//       intent: {
//         action: "modify_existing",
//         target: state.selectedObjectId,
//         targetType: "object",
//         modification,
//         confidence: 1.0,
//       },
//       llmCalls: (state.llmCalls || 0) + 1,
//     });

//     return {
//       intent: {
//         action: "modify_existing",
//         target: state.selectedObjectId,
//         targetType: "object",
//         modification,
//         confidence: 1.0,
//       },
//       llmCalls: (state.llmCalls || 0) + 1,
//     };
//   }

//   const createKeywords = [
//     "build",
//     "create",
//     "make",
//     "design",
//     "new",
//     "generate",
//   ];
//   const isCreate = createKeywords.some((kw) =>
//     state.userMessage.toLowerCase().includes(kw),
//   );

//   if (isCreate) {
//     log(state, "info", "[intent] create_new");
//     console.log({
//       intent: {
//         action: "create_new",
//         target: null,
//         targetType: "frame",
//         confidence: 0.9,
//       },
//     });
//     return {
//       intent: {
//         action: "create_new",
//         target: null,
//         targetType: "frame",
//         confidence: 0.9,
//       },
//     };
//   }

//   if (state.availableFrames.length > 0) {
//     const matchedFrame = await matchFrameFromMessage(
//       state.userMessage,
//       state.availableFrames,
//     );

//     if (!matchedFrame) {
//       console.log({
//         intent: {
//           action: "needs_clarification",
//           target: null,
//           targetType: null,
//           confidence: 0,
//           question: "I couldn't find that frame. Please be more specific.",
//           suggestions: state.availableFrames.map((f) => ({
//             frameRef: f.layerRef!,
//             name: f.name,
//           })),
//         },
//         llmCalls: (state.llmCalls || 0) + 1,
//       });
//       return {
//         intent: {
//           action: "needs_clarification",
//           target: null,
//           targetType: null,
//           confidence: 0,
//           question: "I couldn't find that frame. Please be more specific.",
//           suggestions: state.availableFrames.map((f) => ({
//             frameRef: f.layerRef!,
//             name: f.name,
//           })),
//         },
//         llmCalls: (state.llmCalls || 0) + 1,
//       };
//     }

//     const prompt = `Message: "${state.userMessage}". Frame: ${matchedFrame}. What to modify?`;
//     const response = await model.invoke(prompt);
//     const modification = response.content.toString().trim();

//     console.log({
//       intent: {
//         action: "modify_existing",
//         target: matchedFrame,
//         targetType: "frame",
//         modification,
//         confidence: 0.85,
//       },
//       llmCalls: (state.llmCalls || 0) + 2,
//     });

//     return {
//       intent: {
//         action: "modify_existing",
//         target: matchedFrame,
//         targetType: "frame",
//         modification,
//         confidence: 0.85,
//       },
//       llmCalls: (state.llmCalls || 0) + 2,
//     };
//   }

//   console.log({
//     intent: {
//       action: "create_new",
//       target: null,
//       targetType: "frame",
//       confidence: 0.7,
//     },
//   });

//   return {
//     intent: {
//       action: "create_new",
//       target: null,
//       targetType: "frame",
//       confidence: 0.7,
//     },
//   };
// }
