"use node";
import { getTemplateReference, model } from "../graph";
import { Component, DesignSystem, Layer, ProjectRequirements } from "../types";
import { parseJSON, sleep } from "../utils";

export async function generateComponentLayers(params: {
  component: Component;
  requirements: ProjectRequirements;
  designSystem: DesignSystem;
  previousLayers: Layer[];
  attempt: number;
  maxAttempts: number;
}): Promise<Layer[]> {
  const templateRef = getTemplateReference(params.component.type);

  const prompt = `
You are generating layers for a ${params.component.type} component.

PROJECT CONTEXT:
Type: ${params.requirements.projectType}
Audience: ${params.requirements.targetAudience}
Style: ${params.requirements.style}
Colors: ${JSON.stringify(params.requirements.colorScheme)}

COMPONENT REQUIREMENTS:
Type: ${params.component.type}
Description: ${params.component.description}
Position: top=${params.component.position.top}px, left=${params.component.position.left}px
Dimensions: ${params.component.width}px × ${params.component.height}px

DESIGN SYSTEM:
${JSON.stringify(params.designSystem, null, 2)}

REFERENCE TEMPLATE STRUCTURE:
${JSON.stringify(templateRef, null, 2)}

CRITICAL RULES - EVERY LAYER MUST HAVE THESE EXACT FIELDS:

Required for ALL layers:
- layerRef: string (format: ${params.component.type}_section_elementname)
- type: "TEXT" | "RECT" | "GROUP" | "IMAGE" | "CIRCLE"
- name: string (descriptive name)
- parentLayerRef: string | null (reference to parent layer or null for root)
- left: number (x position)
- top: number (y position)
- width: number
- height: number
- fill: string (hex color or "transparent")
- stroke: string (hex color or "transparent")
- strokeWidth: number
- opacity: number (0 to 1)
- angle: number (rotation, usually 0)
- scaleX: number (usually 1)
- scaleY: number (usually 1)
- zIndex: number
- locked: boolean (usually false)
- visible: boolean (usually true)
- createdAt: number (use ${Date.now()})
- updatedAt: number (use ${Date.now()})

Additional fields for TEXT type:
- text: string (actual content, NO Lorem Ipsum)
- fontSize: number
- fontFamily: string (use "Poppins")
- fontWeight: "normal" | "600" | "700" | "800"
- textAlign: "left" | "center" | "right"
- linethrough: boolean (false)
- underline: boolean (false)
- overline: boolean (false)

Additional fields for RECT type:
- rx: number (border radius x)
- ry: number (border radius y)

Additional fields for CIRCLE type:
- radius: number

Additional fields for IMAGE type:
- imageUrl: string (use placeholder URL)

EXAMPLE LAYER:
{
  "layerRef": "hero_section_container",
  "type": "GROUP",
  "name": "Hero Container",
  "parentLayerRef": null,
  "left": 0,
  "top": 0,
  "width": 1440,
  "height": 600,
  "fill": "transparent",
  "stroke": "transparent",
  "strokeWidth": 0,
  "opacity": 1,
  "angle": 0,
  "scaleX": 1,
  "scaleY": 1,
  "zIndex": 1,
  "locked": false,
  "visible": true,
  "createdAt": ${Date.now()},
  "updatedAt": ${Date.now()}
}

Generate approximately ${params.component.estimatedLayers} layers.
Return ONLY a valid JSON array of layer objects. NO markdown, NO explanations, NO extra text.
Start your response with [ and end with ]`;

  try {
    const response = await model.invoke(prompt);
    const text = response.content.toString();

    console.log(
      `[generateComponent] Raw response length: ${text.length} chars`
    );
    console.log(
      `[generateComponent] First 200 chars: ${text.substring(0, 200)}`
    );

    const layers = parseJSON(text);

    if (!Array.isArray(layers)) {
      console.error(
        `[generateComponent] Response is not an array, got: ${typeof layers}`
      );
      throw new Error("Response is not an array");
    }

    console.log(
      `[generateComponent] Parsed ${layers.length} layers, validating...`
    );

    // Validate and fix each layer
    const validatedLayers = layers.map((layer: any, index: number) => {
      // Check required fields
      if (!layer.layerRef || !layer.type || !layer.name) {
        console.error(
          `[generateComponent] Layer ${index} invalid:`,
          JSON.stringify(layer, null, 2)
        );
        throw new Error(
          `Layer ${index} missing required fields: layerRef=${!!layer.layerRef}, type=${!!layer.type}, name=${!!layer.name}`
        );
      }

      // Ensure all required properties exist with defaults
      return {
        layerRef: layer.layerRef,
        type: layer.type,
        name: layer.name,
        parentLayerRef: layer.parentLayerRef || null,
        left: typeof layer.left === "number" ? layer.left : 0,
        top: typeof layer.top === "number" ? layer.top : 0,
        width: typeof layer.width === "number" ? layer.width : 100,
        height: typeof layer.height === "number" ? layer.height : 100,
        angle: typeof layer.angle === "number" ? layer.angle : 0,
        scaleX: typeof layer.scaleX === "number" ? layer.scaleX : 1,
        scaleY: typeof layer.scaleY === "number" ? layer.scaleY : 1,
        fill: layer.fill || "transparent",
        stroke: layer.stroke || "transparent",
        strokeWidth:
          typeof layer.strokeWidth === "number" ? layer.strokeWidth : 0,
        opacity: typeof layer.opacity === "number" ? layer.opacity : 1,
        zIndex: typeof layer.zIndex === "number" ? layer.zIndex : 1,
        locked: typeof layer.locked === "boolean" ? layer.locked : false,
        visible: typeof layer.visible === "boolean" ? layer.visible : true,
        createdAt: layer.createdAt || Date.now(),
        updatedAt: layer.updatedAt || Date.now(),
        // Optional properties based on type
        ...(layer.type === "TEXT" && {
          text: layer.text || "",
          fontSize: layer.fontSize || 16,
          fontFamily: layer.fontFamily || "Poppins",
          fontWeight: layer.fontWeight || "normal",
          textAlign: layer.textAlign || "left",
          linethrough: layer.linethrough || false,
          underline: layer.underline || false,
          overline: layer.overline || false,
        }),
        ...(layer.type === "RECT" && {
          rx: layer.rx || 0,
          ry: layer.ry || 0,
        }),
        ...(layer.type === "CIRCLE" && {
          radius: layer.radius || 50,
        }),
        ...(layer.type === "IMAGE" && {
          imageUrl: layer.imageUrl || "https://via.placeholder.com/150",
        }),
      } as Layer;
    });

    console.log(
      `[generateComponent] ✓ Successfully validated ${validatedLayers.length} layers`
    );
    return validatedLayers;
  } catch (error) {
    if (params.attempt < params.maxAttempts) {
      console.log(
        `[generateComponent] Retry ${params.attempt + 1}/${params.maxAttempts} for ${params.component.type}`
      );
      console.log(`[generateComponent] Error was: ${error}`);
      await sleep(2000); // Increased delay
      return generateComponentLayers({
        ...params,
        attempt: params.attempt + 1,
      });
    }
    console.error(
      `[generateComponent] All retries exhausted for ${params.component.type}`
    );
    throw error;
  }
}
