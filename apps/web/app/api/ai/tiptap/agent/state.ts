import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

// ============================================
// TYPES
// ============================================

export type DocumentResult = {
  documentId: string;
  title: string;
  description?: string;
  type: "TEXT" | "CANVAS";
  files?: TextFileResult[];
};

export type TextFileResult = {
  fileId: string;
  title: string;
  type: "FILE" | "FOLDER";
  blocks?: BlockResult[];
};

export type BlockResult = {
  externalId: string;
  type: string;
  content: any;
  props: any;
  rank: string;
  parentId: string | null;
};

export type DraftBlock = {
  type: string;
  content: any;
  props: Record<string, any>;
  parentId: string | null;
  rank: string;
};

export type AgentIntent =
  | "general_question"
  | "doc_query"
  | "doc_draft"
  | "doc_edit"
  | "needs_clarification";

// ============================================
// AGENT STATE ANNOTATION
// ============================================

export const DocumentAgentState = Annotation.Root({
  // --- Input context ---
  projectId: Annotation<string>({
    reducer: (_prev, next) => next ?? _prev ?? "",
    default: () => "",
  }),

  documentId: Annotation<string | undefined>({
    reducer: (_prev, next) => next ?? _prev,
    default: () => undefined,
  }),

  userQuery: Annotation<string>({
    reducer: (_prev, next) => next ?? _prev ?? "",
    default: () => "",
  }),

  // --- Agent reasoning ---
  intent: Annotation<AgentIntent>({
    reducer: (_prev, next) => next ?? _prev ?? "general_question",
    default: () => "general_question",
  }),

  messages: Annotation<BaseMessage[]>({
    reducer: (prev, next) => {
      const current = Array.isArray(prev) ? prev : [];
      const updates = Array.isArray(next) ? next : [];
      return [...current, ...updates];
    },
    default: () => [],
  }),

  // --- Data retrieved by tools ---
  documentResults: Annotation<DocumentResult[]>({
    reducer: (_prev, next) => next ?? _prev ?? [],
    default: () => [],
  }),

  // --- Drafting output ---
  draftBlocks: Annotation<DraftBlock[]>({
    reducer: (_prev, next) => next ?? _prev ?? [],
    default: () => [],
  }),

  // --- Response ---
  response: Annotation<string>({
    reducer: (_prev, next) => next ?? _prev ?? "",
    default: () => "",
  }),

  // --- Human-in-the-loop ---
  needsHumanInput: Annotation<boolean>({
    reducer: (_prev, next) => next ?? _prev ?? false,
    default: () => false,
  }),

  humanInputRequest: Annotation<string | undefined>({
    reducer: (_prev, next) => next ?? _prev,
    default: () => undefined,
  }),

  // --- Error tracking ---
  errors: Annotation<string[]>({
    reducer: (prev, next) => {
      const current = Array.isArray(prev) ? prev : [];
      const updates = Array.isArray(next) ? next : [];
      return [...current, ...updates];
    },
    default: () => [],
  }),
});

export type DocumentAgentStateType = typeof DocumentAgentState.State;
