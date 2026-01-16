"use node";
import { Annotation } from "@langchain/langgraph";
import {
  Component,
  DesignSystem,
  Intent,
  Layer,
  ProjectRequirements,
} from "./types";
import { Id } from "../../_generated/dataModel";

export const WorkflowState = Annotation.Root({
  userMessage: Annotation<string>({
    reducer: (_, y) => y,
  }),
  conversationHistory: Annotation<any[]>({
    reducer: (x = [], y) => [...x, y],
  }),
  requirements: Annotation<ProjectRequirements>({
    reducer: (_, y) => y,
  }),
  pageId: Annotation<Id<"pages">>({
    reducer: (_, y) => y,
  }),
  intent: Annotation<Intent>({
    reducer: (_, y) => y,
  }),
  existingDesign: Annotation<Layer[]>({
    reducer: (_, y) => y,
  }),
  designPlan: Annotation<any>({
    reducer: (_, y) => y,
  }),
  modificationPlan: Annotation<any>({
    reducer: (_, y) => y,
  }),
  componentsToGenerate: Annotation<Component[]>({
    reducer: (_, y) => y,
  }),
  designSystem: Annotation<DesignSystem>({
    reducer: (_, y) => y,
  }),
  generatedLayers: Annotation<Layer[]>({
    reducer: (_, y) => y,
  }),
  generationLog: Annotation<string[]>({
    reducer: (_, y) => y,
  }),
  hierarchy: Annotation<Record<string, string[]>>({
    reducer: (_, y) => y,
  }),
  rootLayers: Annotation<string[]>({
    reducer: (_, y) => y,
  }),
  orphanedLayers: Annotation<string[]>({
    reducer: (_, y) => y,
  }),
  hierarchyDepth: Annotation<number>({
    reducer: (_, y) => y,
  }),
  validationResults: Annotation<any>({
    reducer: (_, y) => y,
  }),
  errors: Annotation<string[]>({
    reducer: (_, y) => y,
  }),
  warnings: Annotation<string[]>({
    reducer: (_, y) => y,
  }),
  executionStats: Annotation<any>({
    reducer: (_, y) => y,
  }),
});
