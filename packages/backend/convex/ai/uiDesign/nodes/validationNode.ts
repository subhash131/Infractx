"use node";
import { AgentState } from "../types";

export async function validationNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  console.log("[validation] Running quality checks...");

  const warnings: string[] = [];
  const errors: string[] = [];
  const validations: any[] = [];

  const generatedSections = new Set(
    state
      .generatedLayers!.filter((l) => l.parentLayerRef === null)
      .map((l) =>
        l.layerRef?.replace("_section_container", "").replace("_section", "")
      )
  );

  state.requirements!.requiredSections.forEach((section) => {
    if (generatedSections.has(section)) {
      validations.push({ check: `Section: ${section}`, status: "pass" });
    } else {
      warnings.push(`Missing section: ${section}`);
    }
  });

  if (state.orphanedLayers && state.orphanedLayers.length > 0) {
    errors.push(`Found ${state.orphanedLayers.length} orphaned layers`);
  } else {
    validations.push({ check: "No orphaned layers", status: "pass" });
  }

  const layerRefs = state.generatedLayers!.map((l) => l.layerRef);
  const uniqueRefs = new Set(layerRefs);

  if (layerRefs.length !== uniqueRefs.size) {
    errors.push("Duplicate layerRefs found");
  } else {
    validations.push({ check: "All layerRefs unique", status: "pass" });
  }

  const passedChecks = validations.filter((v) => v.status === "pass").length;
  const totalChecks = validations.length;

  console.log(
    `[validation] ✓ Completed: ${passedChecks}/${totalChecks} checks passed`
  );

  return {
    validationResults: {
      passed: passedChecks,
      total: totalChecks,
      validations,
      warnings,
      errors,
    },
    warnings,
    errors: errors.length > 0 ? errors : undefined,
  };
}
