// "use node";
// import { model } from "../model";
// import { Layer } from "../types";

// export async function matchFrameFromMessage(
//   userMessage: string,
//   availableFrames: Layer[],
// ): Promise<string | null> {
//   if (availableFrames.length === 0) return null;

//   const framesList = availableFrames
//     .map((f) => `- ${f.name} (layerRef: ${f.layerRef})`)
//     .join("\n");

//   const prompt = `User message: "${userMessage}"

// Available frames:
// ${framesList}

// Which frame is the user referring to? Return ONLY the layerRef, or "NONE" if not mentioned.`;

//   const response = await model.invoke(prompt);
//   const matchedRef = response.content.toString().trim();

//   if (
//     matchedRef === "NONE" ||
//     !availableFrames.find((f) => f.layerRef === matchedRef)
//   ) {
//     return null;
//   }

//   return matchedRef;
// }
