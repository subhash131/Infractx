import { Doc, Id } from "../../_generated/dataModel";

export type Layer = Omit<Doc<"layers">, "_id" | "_creationTime">;

export interface ProjectRequirements {
  projectType: string;
  targetAudience: string;
  purpose: string;
  style: string;
  requiredSections: string[];
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
  mustHave: string[];
  niceToHave: string[];
}

export interface Intent {
  action:
    | "create_new"
    | "modify_existing"
    | "add_component"
    | "remove_component"
    | "style_change";
  target: string | null;
  specificChange: string | null;
  scope: "entire_design" | "single_component" | "multiple_components";
}

export interface DesignSystem {
  spacing: { small: number; medium: number; large: number; xlarge: number };
  typography: {
    h1: number;
    h2: number;
    h3: number;
    body: number;
    small: number;
  };
  borderRadius: number;
}

export interface Component {
  type: string;
  description: string;
  estimatedLayers: number;
  priority: number;
  position: { top: number; left: number };
  width: number;
  height: number;
}

export interface AgentState {
  userMessage: string;
  conversationHistory: any[];
  requirements: ProjectRequirements | null;
  intent: Intent | null;
  existingDesign: Layer[];
  designPlan: any;
  modificationPlan: any;
  componentsToGenerate: Component[];
  designSystem: DesignSystem | null;
  generatedLayers: Layer[];
  generationLog: string[];
  hierarchy: Record<string, string[]>;
  rootLayers: string[];
  orphanedLayers: string[];
  hierarchyDepth: number;
  validationResults: any;
  errors: string[];
  warnings: string[];
  executionStats: any;
  pageId: Id<"pages">;
}