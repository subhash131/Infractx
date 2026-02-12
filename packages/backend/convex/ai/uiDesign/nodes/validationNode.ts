// "use node";
// import { AgentState } from "../state";
// import { ValidationResults } from "../types";
// import { log } from "../utils";

// export async function validationNode(
//   state: AgentState,
// ): Promise<Partial<AgentState>> {
//   log(state, "info", "[validation] Checking...");

//   const warnings: string[] = [];
//   const errors: string[] = [];
//   const checks: Array<{
//     name: string;
//     status: "pass" | "warn" | "fail";
//     message?: string;
//   }> = [];

//   const frameCreated = state.layerIdMap!.has(state.framePlan!.layerRef);
//   if (frameCreated) {
//     checks.push({ name: "Frame created", status: "pass" });
//   } else {
//     checks.push({
//       name: "Frame created",
//       status: "fail",
//       message: "Frame not inserted",
//     });
//     errors.push("Frame was not created");
//   }

//   const totalSections = state.componentsToGenerate!.length;
//   const completedSections = state.sectionsCreated!.length;
//   const failedSections = state.sectionsFailed!.length;

//   if (failedSections === 0) {
//     checks.push({ name: "All sections created", status: "pass" });
//   } else if (completedSections > 0) {
//     checks.push({
//       name: "Partial completion",
//       status: "warn",
//       message: `${failedSections}/${totalSections} failed`,
//     });
//     warnings.push(
//       `${failedSections} sections failed: ${state.sectionsFailed!.join(", ")}`,
//     );
//   } else {
//     checks.push({
//       name: "Section creation",
//       status: "fail",
//       message: "All failed",
//     });
//     errors.push("All sections failed");
//   }

//   const minLayersExpected = totalSections * 3;
//   if (state.insertedLayerIds!.length >= minLayersExpected) {
//     checks.push({ name: "Sufficient layers", status: "pass" });
//   } else {
//     checks.push({
//       name: "Layer count",
//       status: "warn",
//       message: `Only ${state.insertedLayerIds!.length} created`,
//     });
//     warnings.push("Fewer layers than expected");
//   }

//   if (state.retryAttempts! > 10) {
//     warnings.push(`High retry count: ${state.retryAttempts} retries`);
//   }

//   const validationResults: ValidationResults = {
//     passed: errors.length === 0,
//     checks,
//     warnings,
//     errors,
//   };
//   log(
//     state,
//     "info",
//     `[validation] ${checks.filter((c) => c.status === "pass").length}/${checks.length} passed`,
//   );
//   warnings.forEach((w) => log(state, "warn", `[validation] ${w}`));
//   errors.forEach((e) => log(state, "error", `[validation] ${e}`));

//   return { validationResults, warnings, errors };
// }
