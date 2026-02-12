// "use node";
// import { model } from "../model";
// import { Component, DesignSystem, Layer, ProjectRequirements } from "../types";
// import { parseJSON, sleep } from "../utils";

// export async function generateComponentLayers(params: {
//   component: Component;
//   requirements: ProjectRequirements;
//   designSystem: DesignSystem;
//   frameRef: string;
//   attempt: number;
// }): Promise<Layer[]> {
//   const prompt = `Generate ${params.component.type} layers.

// Width: ${params.component.width}px, Height: ${params.component.height}px
// Position: top=${params.component.position.top}, left=0
// Center: left = (${params.component.width} - width) / 2
// Stack: nextTop = prevTop + height + gap

// Spacing: ${JSON.stringify(params.designSystem.spacing)}
// Typography: ${JSON.stringify(params.designSystem.typography)}
// Colors: ${JSON.stringify(params.requirements.colorScheme)}

// Description: ${params.component.description}

// LayerRef: ${params.component.type}_section_{element}
// ParentLayerRef: "${params.frameRef}"

// JSON array only:
// [{"layerRef":"ref","type":"TEXT|RECT|GROUP|IMAGE|CIRCLE","name":"name","parentLayerRef":"${params.frameRef}","left":0,"top":0,"width":100,"height":100,"fill":"#hex","stroke":"#hex","strokeWidth":0,"opacity":1,"angle":0,"scaleX":1,"scaleY":1,"zIndex":1,"visible":true,"locked":false,"text":"content","fontSize":18,"fontFamily":"Poppins","fontWeight":"700","textAlign":"center","linethrough":false,"underline":false,"overline":false,"rx":8,"ry":8,"radius":50,"imageUrl":"url","createdAt":${Date.now()},"updatedAt":${Date.now()}}]`;

//   try {
//     const response = await model.invoke(prompt);
//     const layers = parseJSON(response.content.toString());
//     if (!Array.isArray(layers)) throw new Error("Not array");
//     layers.forEach((l: any, i: number) => {
//       if (!l.layerRef || !l.type || !l.name)
//         throw new Error(`Layer ${i} missing fields`);
//     });
//     return layers as Layer[];
//   } catch (error) {
//     if (params.attempt < 3) {
//       await sleep(1000);
//       return generateComponentLayers({
//         ...params,
//         attempt: params.attempt + 1,
//       });
//     }
//     throw error;
//   }
// }
