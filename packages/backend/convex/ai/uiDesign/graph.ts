"use node";

import { StateGraph, END, START } from "@langchain/langgraph";
import { groqModel } from "../designAgent";
import { Component, Layer } from "./types";
import { requirementsNode } from "./nodes/requirementsNode";
import { intentUnderstandingNode } from "./nodes/intentUnderstandingNode";
import { designPlanningNode } from "./nodes/designPlanningNode";
import { componentGenerationNode } from "./nodes/componentGenerationNode";
import { hierarchyResolutionNode } from "./nodes/hierarchyResolutionNode";
import { validationNode } from "./nodes/validationNode";
import { shouldRunDesignPlanning } from "./nodes/shouldRunDesignPlanning";
import { WorkflowState } from "./state";

// const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
// const model = genAI.getGenerativeModel({
//   model: "gemini-pro",
//   generationConfig: {
//     maxOutputTokens: 2048,
//   },
// });
export const model = groqModel;

const COMPONENT_TEMPLATES: Record<string, any> = {
  hero: {
    description: "Hero section with title, subtitle, CTA button, and image",
    structure: {
      container: true,
      elements: ["background", "title", "subtitle", "cta_button", "image"],
    },
  },
  features: {
    description: "Feature cards in a grid layout",
    structure: {
      container: true,
      elements: ["title", "card_1", "card_2", "card_3"],
    },
  },
  testimonials: {
    description: "Customer testimonials with photos and quotes",
    structure: {
      container: true,
      elements: ["title", "testimonial_1", "testimonial_2", "testimonial_3"],
    },
  },
  cta: {
    description: "Call-to-action banner with button",
    structure: {
      container: true,
      elements: ["background", "title", "button"],
    },
  },
  footer: {
    description: "Footer with links and information",
    structure: {
      container: true,
      elements: ["background", "logo", "links", "social", "copyright"],
    },
  },
};

export function getTemplateReference(componentType: string): any {
  return COMPONENT_TEMPLATES[componentType] || COMPONENT_TEMPLATES.hero;
}

function buildUIDesignGraph() {
  const workflow = new StateGraph(WorkflowState)
    .addNode("requirementsNode", requirementsNode)
    .addNode("intentUnderstanding", intentUnderstandingNode)
    .addNode("designPlanning", designPlanningNode)
    .addNode("componentGeneration", componentGenerationNode)
    .addNode("hierarchyResolution", hierarchyResolutionNode)
    .addNode("validation", validationNode)
    .addEdge(START, "requirementsNode")
    .addEdge("requirementsNode", "intentUnderstanding")
    .addConditionalEdges("intentUnderstanding", shouldRunDesignPlanning, {
      designPlanning: "designPlanning",
      componentGeneration: "componentGeneration",
    })
    .addEdge("designPlanning", "componentGeneration")
    .addEdge("componentGeneration", "hierarchyResolution")
    .addEdge("hierarchyResolution", "validation")
    .addEdge("validation", END);

  return workflow;
}

// ============================================================================
// MAIN AGENT CLASS
// ============================================================================

export class UIDesignAgent {
  private graph: any;

  constructor() {
    this.graph = buildUIDesignGraph().compile();
  }

  async generateDesign(
    userMessage: string,
    existingDesign?: Layer[]
  ): Promise<any> {
    const startTime = Date.now();

    console.log("\n" + "=".repeat(80));
    console.log("UI DESIGN AGENT - STARTING");
    console.log("=".repeat(80));
    console.log(`User: "${userMessage}"`);
    console.log("=".repeat(80) + "\n");

    try {
      const result = await this.graph.invoke({
        userMessage,
        existingDesign: existingDesign || [],
        conversationHistory: [],
      });

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      console.log("\n" + "=".repeat(80));
      console.log("UI DESIGN AGENT - COMPLETED");
      console.log("=".repeat(80));
      console.log(`Execution time: ${executionTime}ms`);
      console.log(`Total layers: ${result.generatedLayers?.length || 0}`);
      console.log("=".repeat(80) + "\n");

      // Build final output
      const output = {
        success: !result.errors || result.errors.length === 0,

        design: {
          layers: result.generatedLayers || [],
          hierarchy: result.hierarchy || {},
          metadata: {
            projectType: result.requirements?.projectType || "unknown",
            totalLayers: result.generatedLayers?.length || 0,
            rootLayers: result.rootLayers || [],
            sections:
              result.rootLayers?.map((ref: string) =>
                ref.replace("_section_container", "").replace("_section", "")
              ) || [],
            designSystem: result.designSystem || {},
            colorPalette: result.requirements?.colorScheme
              ? Object.values(result.requirements.colorScheme)
              : [],
          },
        },

        requirements: result.requirements || {},

        reasoning: {
          userIntent: userMessage,
          componentsGenerated: result.generationLog || [],
          designDecisions: [],
          templateReferences:
            result.componentsToGenerate?.map((c: Component) => c.type) || [],
        },

        validation: {
          passed: result.validationResults?.passed || 0,
          total: result.validationResults?.total || 0,
          warnings: result.warnings || [],
          errors: result.errors || [],
        },

        stats: {
          executionTimeMs: executionTime,
          nodesExecuted: [
            "requirements",
            "intentUnderstanding",
            "designPlanning",
            "componentGeneration",
            "hierarchyResolution",
            "validation",
          ],
          llmCallsMade: result.componentsToGenerate?.length || 0,
          totalLayers: result.generatedLayers?.length || 0,
        },
      };

      // Console log the layers
      console.log("\n" + "=".repeat(80));
      console.log("GENERATED LAYERS (JSON):");
      console.log("=".repeat(80));
      console.log(JSON.stringify(output.design.layers, null, 2));
      console.log("=".repeat(80) + "\n");

      return output;
    } catch (error) {
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      console.error("\n" + "=".repeat(80));
      console.error("UI DESIGN AGENT - FAILED");
      console.error("=".repeat(80));
      console.error(`Error: ${error}`);
      console.error(`Execution time: ${executionTime}ms`);
      console.error("=".repeat(80) + "\n");

      return {
        success: false,
        design: { layers: [], hierarchy: {}, metadata: {} },
        requirements: {},
        reasoning: {
          userIntent: userMessage,
          componentsGenerated: [],
          designDecisions: [],
          templateReferences: [],
        },
        validation: {
          passed: 0,
          total: 0,
          warnings: [],
          errors: [String(error)],
        },
        stats: {
          executionTimeMs: executionTime,
          nodesExecuted: [],
          llmCallsMade: 0,
          totalLayers: 0,
        },
      };
    }
  }
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/*
// Initialize the agent
const agent = new UIDesignAgent();

// Generate a new design
const result = await agent.generateDesign(
  "Build a landing page for a kids learning app with playful colors"
);

// Access the generated layers
console.log('Layers:', result.design.layers);
console.log('Hierarchy:', result.design.hierarchy);
console.log('Requirements:', result.requirements);

// The layers are ready to be inserted into your Convex database
// Example integration:

for (const layer of result.design.layers) {
  // Map layerRef to actual Convex ID after insertion
  const convexId = await ctx.db.insert("layers", {
    type: layer.type,
    name: layer.name,
    parentLayerId: layer.parentLayerRef ? 
      tempIdToConvexId.get(layer.parentLayerRef) : undefined,
    left: layer.left,
    top: layer.top,
    width: layer.width,
    height: layer.height,
    fill: layer.fill,
    stroke: layer.stroke,
    strokeWidth: layer.strokeWidth,
    opacity: layer.opacity,
    angle: layer.angle,
    scaleX: layer.scaleX,
    scaleY: layer.scaleY,
    text: layer.text,
    fontSize: layer.fontSize,
    fontFamily: layer.fontFamily,
    fontWeight: layer.fontWeight,
    textAlign: layer.textAlign,
    radius: layer.radius,
    rx: layer.rx,
    ry: layer.ry,
    imageUrl: layer.imageUrl,
    zIndex: layer.zIndex,
    locked: layer.locked,
    visible: layer.visible,
  });
  
  tempIdToConvexId.set(layer.layerRef, convexId);
}
*/
