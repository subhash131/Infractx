// "use node";
// import { Id } from "../../../_generated/dataModel";
// import { Layer } from "../types";

// export async function generateFromTemplate(
//   componentType: string,
//   position: { top: number; left: number },
//   pageId: Id<"pages">
// ): Promise<Layer[]> {
//   console.log(
//     `[generateFromTemplate] Using fallback template for ${componentType}`
//   );

//   const baseLayerRef = `${componentType}_section`;

//   return [
//     {
//       pageId,
//       layerRef: `${baseLayerRef}_container`,
//       type: "GROUP",
//       name: `${componentType} Section`,
//       parentLayerRef: undefined,
//       left: position.left,
//       top: position.top,
//       width: 1440,
//       height: 400,
//       fill: "transparent",
//       stroke: "transparent",
//       strokeWidth: 0,
//       opacity: 1,
//       angle: 0,
//       scaleX: 1,
//       scaleY: 1,
//       zIndex: 1,
//       locked: false,
//       visible: true,
//       createdAt: Date.now(),
//       updatedAt: Date.now(),
//     },
//     {
//       pageId,
//       layerRef: `${baseLayerRef}_background`,
//       type: "RECT",
//       name: "Background",
//       parentLayerRef: `${baseLayerRef}_container`,
//       left: 0,
//       top: 0,
//       width: 1440,
//       height: 400,
//       fill: "#F3F4F6",
//       stroke: "transparent",
//       strokeWidth: 0,
//       opacity: 1,
//       angle: 0,
//       scaleX: 1,
//       scaleY: 1,
//       rx: 0,
//       ry: 0,
//       zIndex: 1,
//       locked: false,
//       visible: true,
//       createdAt: Date.now(),
//       updatedAt: Date.now(),
//     },
//     {
//       pageId,
//       layerRef: `${baseLayerRef}_title`,
//       type: "TEXT",
//       name: "Section Title",
//       parentLayerRef: `${baseLayerRef}_container`,
//       left: 120,
//       top: 180,
//       width: 400,
//       height: 40,
//       fill: "#1F2937",
//       stroke: "transparent",
//       strokeWidth: 0,
//       opacity: 1,
//       angle: 0,
//       scaleX: 1,
//       scaleY: 1,
//       text: `${componentType} Section`,
//       fontSize: 32,
//       fontFamily: "Poppins",
//       fontWeight: "700",
//       textAlign: "left",
//       linethrough: false,
//       underline: false,
//       overline: false,
//       zIndex: 2,
//       locked: false,
//       visible: true,
//       createdAt: Date.now(),
//       updatedAt: Date.now(),
//     },
//   ];
// }
