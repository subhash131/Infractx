// "use node";
// import { GenericActionCtx } from "convex/server";
// import { DataModel, Id } from "../../_generated/dataModel";
// import { buildUIDesignGraph } from "./graph";
// import { Layer } from "./types";

// type BuilderType = ReturnType<typeof buildUIDesignGraph>;
// type UIDesignGraph = ReturnType<BuilderType["compile"]>;

// export class UIDesignAgent {
//   private graph: UIDesignGraph;
//   constructor() {
//     this.graph = buildUIDesignGraph().compile();
//   }

//   async getGraphMermaid() {
//     const mermaid = (await this.graph.getGraphAsync()).drawMermaid();
//     return mermaid;
//   }

//   async generateDesign(input: {
//     userMessage: string;
//     pageId: Id<"pages">;
//     convex: GenericActionCtx<DataModel>;
//     selectedFrameId?: string | null;
//     selectedObjectId?: string | null;
//     availableFrames?: Layer[];
//     verbose?: boolean;
//   }): Promise<any> {
//     const startTime = Date.now();
//     if (input.verbose) {
//       console.log("\n" + "=".repeat(80));
//       console.log("UI DESIGN AGENT - STARTING");
//       console.log("=".repeat(80));
//     }

//     try {
//       const result = await this.graph.invoke({
//         userMessage: input.userMessage,
//         pageId: input.pageId,
//         convex: input.convex,
//         selectedFrameId: input.selectedFrameId || null,
//         selectedObjectId: input.selectedObjectId || null,
//         availableFrames: input.availableFrames || [],
//         verbose: input.verbose || false,
//         llmCalls: 0,
//         retryAttempts: 0,
//         startTime,
//         sectionsCreated: [],
//         sectionsFailed: [],
//         warnings: [],
//         errors: [],
//       });

//       const executionTime = Date.now() - startTime;

//       // Handle clarification needed
//       if (result.intent?.action === "needs_clarification") {
//         console.log("\n" + "=".repeat(80));
//         console.log("CLARIFICATION NEEDED");
//         console.log("=".repeat(80));
//         console.log(result.intent.question);
//         if (result.intent.suggestions) {
//           console.log("\nSuggestions:");
//           result.intent.suggestions.forEach((s: any) => {
//             console.log(`  - ${s.name} (${s.frameRef})`);
//           });
//         }
//         console.log("=".repeat(80) + "\n");

//         return {
//           success: false,
//           needsClarification: true,
//           question: result.intent.question,
//           suggestions: result.intent.suggestions,
//           executionTimeMs: executionTime,
//         };
//       }

//       // Build success message
//       const totalSections =
//         result.sectionsCreated.length + result.sectionsFailed.length;
//       let message = `Created ${result.framePlan?.name || "design"} with ${result.sectionsCreated.length} sections`;
//       if (result.sectionsFailed.length > 0) {
//         message += `. ${result.sectionsFailed.length} sections failed.`;
//       }

//       if (input.verbose) {
//         console.log("\n" + "=".repeat(80));
//         console.log("UI DESIGN AGENT - COMPLETED");
//         console.log("=".repeat(80));
//         console.log(
//           `Success: ${result.validationResults?.passed ? "YES" : "PARTIAL"}`,
//         );
//         console.log(`Execution time: ${executionTime}ms`);
//         console.log(`Total layers: ${result.insertedLayerIds?.length || 0}`);
//         console.log(`LLM calls: ${result.llmCalls}`);
//         console.log(`Retries: ${result.retryAttempts}`);
//         console.log("=".repeat(80) + "\n");
//       }

//       const output: any = {
//         success: result.validationResults?.passed || false,
//         message,
//         details: {
//           totalLayers: result.insertedLayerIds?.length || 0,
//           sectionsCreated: result.sectionsCreated || [],
//           sectionsFailed: result.sectionsFailed || [],
//         },
//         warnings: result.warnings || [],
//         errors: result.errors || [],
//       };

//       // Add debug info if verbose
//       if (input.verbose) {
//         output.debugInfo = {
//           insertedLayerIds: result.insertedLayerIds || [],
//           layerRefToIdMap: Object.fromEntries(result.layerIdMap || new Map()),
//           hierarchy: result.hierarchy || {},
//           executionTimeMs: executionTime,
//           llmCalls: result.llmCalls || 0,
//           retryAttempts: result.retryAttempts || 0,
//           framePlan: result.framePlan,
//           validationResults: result.validationResults,
//         };
//       }

//       return output;
//     } catch (error) {
//       const executionTime = Date.now() - startTime;

//       console.error("\n" + "=".repeat(80));
//       console.error("UI DESIGN AGENT - FAILED");
//       console.error("=".repeat(80));
//       console.error(error);
//       console.error("=".repeat(80) + "\n");

//       return {
//         success: false,
//         message: `Failed: ${JSON.stringify(error)}`,
//         details: {
//           totalLayers: 0,
//           sectionsCreated: [],
//           sectionsFailed: [],
//         },
//         warnings: [],
//         errors: [JSON.stringify(error)],
//         executionTimeMs: executionTime,
//       };
//     }
//   }
// }
