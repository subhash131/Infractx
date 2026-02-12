// "use node";
// import { AgentState } from "../state";
// import { log } from "../utils";

// export async function hierarchyResolutionNode(
//   state: AgentState,
// ): Promise<Partial<AgentState>> {
//   log(state, "info", "[hierarchy] Building...");
//   const hierarchy: Record<string, string[]> = {};
//   state.layerIdMap!.forEach((id, layerRef) => {
//     hierarchy[layerRef] = [];
//   });
//   log(state, "info", `[hierarchy] Tracked ${state.layerIdMap!.size} refs`);
//   return { hierarchy };
// }
