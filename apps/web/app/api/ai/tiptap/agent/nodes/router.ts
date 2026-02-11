import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { DocumentAgentStateType, AgentIntent } from "../state";

const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0,
});

// Structured output schema for intent classification
const IntentSchema = z.object({
  intent: z
    .enum([
      "general_question",
      "doc_query",
      "doc_draft",
      "doc_edit",
      "needs_clarification",
    ])
    .describe("The classified intent of the user query"),
  reasoning: z
    .string()
    .describe("Brief reasoning for why this intent was chosen"),
  clarificationQuestion: z
    .string()
    .optional()
    .describe(
      "If intent is needs_clarification, what question to ask the user"
    ),
});

const structuredLlm = llm.withStructuredOutput(IntentSchema);

/**
 * Router Node — Classifies the user's intent and routes to the appropriate sub-agent.
 */
export async function routerNode(
  state: DocumentAgentStateType
): Promise<Partial<DocumentAgentStateType>> {
  console.log(`[ROUTER] Classifying query: "${state.userQuery}"`);

  const systemPrompt = `You are an intent classifier for a document management AI assistant.
The assistant is integrated with a project management tool that has:
- Projects containing multiple documents
- Documents with text files organized in a tree structure  
- Blocks within text files (paragraphs, headings, smartBlocks, lists, code blocks)
- SmartBlocks are special collapsible/nestable blocks with a header and children

Classify the user's query into EXACTLY one of these intents:
- "general_question": Greetings, general questions about the project, its purpose, general knowledge, or ANY question that can be answered. This is the DEFAULT for most queries.
- "doc_query": User explicitly wants to search for, read, view, or get an explanation of an existing document
- "doc_draft": User explicitly wants to create, draft, or write a NEW document (requirements doc, spec, guide, etc.) AND has specified what to create
- "doc_edit": User explicitly wants to modify or update an existing document
- "needs_clarification": ONLY use this when the user's message is so vague that you literally cannot determine ANY intent. Examples: "help", "do something", "draft" (with zero context)

CRITICAL RULES:
- "hi", "hello", "hey" → "general_question" (NOT needs_clarification)
- "what is this project about?" → "general_question" (NOT needs_clarification)  
- "tell me about X" → "general_question"
- "show me the docs" → "doc_query"
- "draft a tech spec for X" → "doc_draft" (has specific topic)
- "draft a doc" (no topic) → "needs_clarification"
- When in doubt, prefer "general_question" over "needs_clarification"`;

  try {
    const result = await structuredLlm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(state.userQuery),
    ]);

    console.log(`[ROUTER] Intent: ${result.intent} — ${result.reasoning}`);

    return {
      intent: result.intent as AgentIntent,
      needsHumanInput: result.intent === "needs_clarification",
      humanInputRequest: result.clarificationQuestion,
      messages: [
        new SystemMessage(
          `[Router] Classified intent as: ${result.intent}. Reasoning: ${result.reasoning}`
        ),
      ],
    };
  } catch (error: any) {
    console.error("[ROUTER] Classification error:", error?.message || error);
    console.error("[ROUTER] Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    // Fallback to general_question on error
    return {
      intent: "general_question" as AgentIntent,
      errors: [`Router classification failed: ${error}`],
    };
  }
}

/**
 * Routing function — determines which sub-agent to invoke based on classified intent.
 */
export function routeByIntent(
  state: DocumentAgentStateType
): string {
  if (state.needsHumanInput) {
    return "humanInput";
  }

  switch (state.intent) {
    case "doc_query":
      return "docQuery";
    case "doc_draft":
      return "docDraft";
    case "doc_edit":
      return "docQuery"; // For now, doc_edit routes through doc_query
    case "general_question":
    default:
      return "qa";
  }
}
