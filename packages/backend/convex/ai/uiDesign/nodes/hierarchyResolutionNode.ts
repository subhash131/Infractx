"use node";
import { AgentState, Layer } from "../types";
import { calculateHierarchyDepth } from "./calculateHierarchyDepth";

export async function hierarchyResolutionNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  console.log("[hierarchyResolution] Building hierarchy map...");

  const hierarchy: Record<string, string[]> = {};
  const layersByRef: Record<string, Layer> = {};
  const rootLayers: string[] = [];
  const orphanedLayers: string[] = [];

  state.generatedLayers!.forEach((layer) => {
    if (layer.layerRef) layersByRef[layer.layerRef] = layer;
  });

  state.generatedLayers!.forEach((layer) => {
    if (layer.parentLayerRef === null && layer.layerRef) {
      rootLayers.push(layer.layerRef);
      hierarchy[layer.layerRef] = [];
    } else {
      if (layer.parentLayerRef) {
        const parent = layersByRef[layer.parentLayerRef];

        if (!parent && layer.layerRef) {
          console.warn(
            `[hierarchyResolution] ⚠ Orphaned layer: ${layer.layerRef} (parent ${layer.parentLayerRef} not found)`
          );
          orphanedLayers.push(layer.layerRef);
          return;
        }

        if (!hierarchy[layer.parentLayerRef]) {
          hierarchy[layer.parentLayerRef] = [];
        }

        if (layer.layerRef)
          hierarchy[layer.parentLayerRef].push(layer.layerRef);
      }
    }
  });

  const maxDepth =
    rootLayers.length > 0
      ? calculateHierarchyDepth(rootLayers[0], hierarchy)
      : 0;

  const groupCount = state.generatedLayers!.filter(
    (l) => l.type === "GROUP"
  ).length;

  console.log(`[hierarchyResolution] ✓ Hierarchy built:`);
  console.log(`  - Root layers: ${rootLayers.length}`);
  console.log(`  - Groups: ${groupCount}`);
  console.log(`  - Max depth: ${maxDepth}`);
  console.log(`  - Orphaned: ${orphanedLayers.length}`);

  return {
    hierarchy,
    rootLayers,
    orphanedLayers: orphanedLayers.length > 0 ? orphanedLayers : undefined,
    hierarchyDepth: maxDepth,
  };
}
