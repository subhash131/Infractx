"use node";
import { Annotation } from "@langchain/langgraph";
import {
  Component,
  DesignSystem,
  FramePlan,
  Intent,
  Layer,
  ProjectRequirements,
  ValidationResults,
} from "./types";
import { DataModel, Id } from "../../_generated/dataModel";
import { GenericActionCtx } from "convex/server";

export const WorkflowState = Annotation.Root({
  userMessage: Annotation<string>({ reducer: (_, y) => y }),
  pageId: Annotation<Id<"pages">>({ reducer: (_, y) => y }),
  selectedFrameId: Annotation<string | null>({ reducer: (_, y) => y }),
  selectedObjectId: Annotation<string | null>({ reducer: (_, y) => y }),
  verbose: Annotation<boolean>({ reducer: (_, y) => y }),
  convex: Annotation<GenericActionCtx<DataModel>>({
    reducer: (x, y) => y ?? x,
  }),
  availableFrames: Annotation<Layer[]>({ reducer: (_, y) => y }),
  requirements: Annotation<ProjectRequirements | null>({
    reducer: (_, y) => y,
  }),
  intent: Annotation<Intent | null>({ reducer: (_, y) => y }),
  framePlan: Annotation<FramePlan | null>({ reducer: (_, y) => y }),
  componentsToGenerate: Annotation<Component[]>({ reducer: (_, y) => y }),
  designSystem: Annotation<DesignSystem | null>({ reducer: (_, y) => y }),
  layerIdMap: Annotation<Map<string, Id<"layers">>>({ reducer: (_, y) => y }),
  insertedLayerIds: Annotation<Id<"layers">[]>({ reducer: (_, y) => y }),
  hierarchy: Annotation<Record<string, string[]>>({ reducer: (_, y) => y }),
  validationResults: Annotation<ValidationResults | null>({
    reducer: (_, y) => y,
  }),
  warnings: Annotation<string[]>({ reducer: (_, y) => y }),
  errors: Annotation<string[]>({ reducer: (_, y) => y }),
  sectionsCreated: Annotation<string[]>({ reducer: (_, y) => y }),
  sectionsFailed: Annotation<string[]>({ reducer: (_, y) => y }),
  llmCalls: Annotation<number>({ reducer: (_, y) => y }),
  retryAttempts: Annotation<number>({ reducer: (_, y) => y }),
  startTime: Annotation<number>({ reducer: (_, y) => y }),
});
export type AgentState = typeof WorkflowState.State;
