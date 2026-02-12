// "use node";
// import { Id } from "../../../_generated/dataModel";
// import { AgentState } from "../state";
// import { Layer } from "../types";
// import { generateComponentLayers } from "./generateComponentsLayer";
// import { api } from "../../../_generated/api";
// import { log, sleep } from "../utils";
// import { generateProgrammaticFallback } from "./generateProgrammaticFallback";

// export async function componentGenerationNode(
//   state: AgentState,
// ): Promise<Partial<AgentState>> {
//   log(state, "info", "[generation] Starting...");

//   const layerIdMap = new Map<string, Id<"layers">>();
//   const insertedLayerIds: Id<"layers">[] = [];
//   const sectionsCreated: string[] = [];
//   const sectionsFailed: string[] = [];
//   let retryAttempts = state.retryAttempts || 0;
//   let llmCalls = state.llmCalls || 0;

//   // Create frame
//   try {
//     const frameResult = await state.convex.runMutation(
//       api.design.layers.createObject,
//       {
//         layerObject: {
//           layerRef: state.framePlan!.layerRef,
//           type: "FRAME",
//           name: state.framePlan!.name,
//           pageId: state.pageId,
//           left: state.framePlan!.left,
//           top: state.framePlan!.top,
//           width: state.framePlan!.width,
//           height: state.framePlan!.height,
//           fill: state.framePlan!.fill || "#ffffff00",
//           stroke: "#ffffff00",
//           strokeWidth: 0,
//           opacity: 1,
//           angle: 0,
//           scaleX: 1,
//           scaleY: 1,
//         },
//       },
//     );

//     if (frameResult.success) {
//       layerIdMap.set(state.framePlan!.layerRef, frameResult._id);
//       insertedLayerIds.push(frameResult._id);
//       log(state, "info", "[generation] Frame created");
//     } else {
//       throw new Error("Frame creation failed");
//     }
//   } catch (error) {
//     log(state, "error", `[generation] Frame failed: ${JSON.stringify(error)}`);
//     throw error;
//   }

//   // Generate components
//   for (let i = 0; i < state.componentsToGenerate!.length; i++) {
//     const component = state.componentsToGenerate![i];
//     log(
//       state,
//       "info",
//       `[generation] [${i + 1}/${state.componentsToGenerate!.length}] ${component?.type}`,
//     );

//     try {
//       if (component) {
//         const componentLayers = await generateComponentLayers({
//           component,
//           requirements: state.requirements!,
//           designSystem: state.designSystem!,
//           frameRef: state.framePlan!.layerRef,
//           attempt: 1,
//         });

//         llmCalls++;

//         // Group by hierarchy level
//         const layersByLevel = new Map<number, Layer[]>();
//         componentLayers.forEach((layer) => {
//           let level = 0;
//           let currentParent = layer.parentLayerRef;
//           while (currentParent && currentParent !== state.framePlan!.layerRef) {
//             level++;
//             const parentLayer = componentLayers.find(
//               (l) => l.layerRef === currentParent,
//             );
//             currentParent = parentLayer?.parentLayerRef;
//           }
//           if (!layersByLevel.has(level)) layersByLevel.set(level, []);
//           layersByLevel.get(level)!.push(layer);
//         });

//         // Insert level by level
//         const sortedLevels = Array.from(layersByLevel.keys()).sort(
//           (a, b) => a - b,
//         );
//         for (const level of sortedLevels) {
//           const layersAtLevel = layersByLevel.get(level)!;
//           for (const layer of layersAtLevel) {
//             let insertSuccess = false;
//             for (let attempt = 1; attempt <= 3; attempt++) {
//               try {
//                 const parentId = layer.parentLayerRef
//                   ? layerIdMap.get(layer.parentLayerRef) || null
//                   : null;
//                 const result = await state.convex.runMutation(
//                   api.design.layers.createObject,
//                   {
//                     layerObject: {
//                       pageId: state.pageId,
//                       parentLayerId: parentId as Id<"layers">,
//                       height: layer.height,
//                       top: layer.top,
//                       type: layer.type,
//                       width: layer.width,
//                       angle: layer.angle,
//                       fill: layer?.fill || "#ffffff",
//                       layerRef: layer.layerRef,
//                       name: layer.name,
//                       fontFamily: layer?.fontFamily || "Poppins",
//                       fontSize: layer?.fontSize || 20,
//                       fontStyle: layer.fontStyle,
//                       fontWeight: layer.fontWeight,
//                       opacity: layer.opacity,
//                       points: layer.points,
//                       radius: layer.radius,
//                       rx: layer.rx,
//                       ry: layer.ry,
//                       stroke: layer.stroke,
//                       textAlign: layer.textAlign || "center",
//                       imageUrl: layer?.imageUrl || " ",
//                       left: layer.left,
//                       linethrough: layer.linethrough,
//                       padding: layer.padding,
//                       text: layer.text,
//                       borderScaleFactor: layer.borderScaleFactor,
//                       shadow: layer.shadow,
//                       underline: layer.underline,
//                       data: layer.data,
//                       overline: layer.overline,
//                       scaleX: layer.scaleX,
//                       scaleY: layer.scaleY,
//                       strokeUniform: layer.strokeUniform,
//                       strokeWidth: layer.strokeWidth,
//                     },
//                   },
//                 );
//                 if (result.success) {
//                   layerIdMap.set(layer.layerRef!, result._id);
//                   insertedLayerIds.push(result._id);
//                   insertSuccess = true;
//                   break;
//                 }
//               } catch (error) {
//                 retryAttempts++;
//                 if (attempt < 3) await sleep(500);
//               }
//             }
//             if (!insertSuccess) {
//               log(
//                 state,
//                 "warn",
//                 `[generation] Failed ${layer.layerRef} after 3 attempts`,
//               );
//             }
//           }
//         }

//         sectionsCreated.push(component.type);
//         log(
//           state,
//           "info",
//           `[generation] ✓ ${component.type}: ${componentLayers.length} layers`,
//         );
//       }
//     } catch (error) {
//       log(
//         state,
//         "error",
//         `[generation] ${component?.type} failed: ${JSON.stringify(error)}`,
//       );
//       try {
//         if (component) {
//           log(state, "info", `[generation] Fallback for ${component?.type}`);
//           const fallbackLayers = generateProgrammaticFallback(
//             component.type,
//             component.position,
//             component.width,
//             component.height,
//             state.framePlan!.layerRef,
//             state.requirements!.colorScheme,
//           );
//           for (const layer of fallbackLayers) {
//             const parentId = layerIdMap.get(layer.parentLayerRef!) || null;
//             const result = await state.convex.runMutation(
//               api.design.layers.createObject,
//               {
//                 layerObject: {
//                   ...layer,
//                   pageId: state.pageId,
//                   parentLayerId: parentId as Id<"layers">,
//                 },
//               },
//             );
//             if (result.success) {
//               layerIdMap.set(layer.layerRef!, result._id);
//               insertedLayerIds.push(result._id);
//             }
//           }
//           sectionsCreated.push(`${component.type} (fallback)`);
//           log(state, "info", `[generation] ⚠ ${component.type}: Fallback used`);
//         }
//       } catch (fallbackError) {
//         if (component) sectionsFailed.push(component.type);
//         log(state, "error", `[generation] ${component?.type}: Fallback failed`);
//       }
//     }
//   }

//   log(
//     state,
//     "info",
//     `[generation] Complete: ${insertedLayerIds.length} layers`,
//   );
//   console.log({
//     layerIdMap,
//     insertedLayerIds,
//     sectionsCreated,
//     sectionsFailed,
//     llmCalls,
//     retryAttempts,
//   });
//   return {
//     layerIdMap,
//     insertedLayerIds,
//     sectionsCreated,
//     sectionsFailed,
//     llmCalls,
//     retryAttempts,
//   };
// }
