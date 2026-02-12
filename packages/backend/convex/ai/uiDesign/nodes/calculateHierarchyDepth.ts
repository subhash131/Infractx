// "use node";
// export function calculateHierarchyDepth(
//   layerRef: string,
//   hierarchy: Record<string, string[]>,
//   currentDepth: number = 0
// ): number {
//   const children = hierarchy[layerRef] || [];

//   if (children.length === 0) {
//     return currentDepth;
//   }

//   const childDepths = children.map((childRef) =>
//     calculateHierarchyDepth(childRef, hierarchy, currentDepth + 1)
//   );

//   return Math.max(...childDepths);
// }
