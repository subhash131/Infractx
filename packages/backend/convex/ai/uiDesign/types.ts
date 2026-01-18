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
  viewportType: "desktop" | "tablet" | "mobile";
  viewportWidth: number;
}

export interface Intent {
  action: "create_new" | "modify_existing" | "needs_clarification";
  target: string | null;
  targetType: "frame" | "object" | null;
  modification?: string;
  confidence: number;
  warning?: string;
  question?: string;
  suggestions?: Array<{ frameRef: string; name: string }>;
}

export interface DesignSystem {
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  typography: {
    h1: number;
    h2: number;
    h3: number;
    h4: number;
    body: number;
    small: number;
  };
  borderRadius: { sm: number; md: number; lg: number; full: number };
  grid: { columns: number; columnWidth: number; gutter: number };
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
export interface FramePlan {
  layerRef: string;
  name: string;
  width: number;
  height: number;
  left: number;
  top: number;
  fill: string;
}

export interface ValidationResults {
  passed: boolean;
  checks: Array<{
    name: string;
    status: "pass" | "warn" | "fail";
    message?: string;
  }>;
  warnings: string[];
  errors: string[];
}
