import { AgentStateAnnotation, callAI, ChatMessage } from "../index";

export async function classifyIntent(state: typeof AgentStateAnnotation.State) {
  console.log("🔍 Classifying intent...");
  
  const prompt = `You are analyzing a user's request to edit a document or chat.
User Message: "${state.userMessage}"
Selected Text: "${state.selectedText}"

Classify the intent into ONE of these categories:

1. **context**: Request to EXPLAIN, SEARCH, or QUERY project data (schema, files, structure, definitions).
   - "Explain user schema"
   - "What documents exist?"
   - "How does the auth flow work?"
   - "Show me the blocks in file X"
2. **schema**: Request to GENERATE/DESIGN a NEW database schema (not explain an existing one).
   - "Design a schema for a notification system"
3. **table**: Request to create a comparison or data table.
4. **list**: Request to create a list (bullet points, checklist).
5. **text**: Request to GENERATE, WRITE, REPHRASE, REWRITE, or SUMMARIZE text that should appear IN THE DOCUMENT.
6. **delete**: Request to remove, delete, or omit the selected text.
7. **code**: Request to generate pseudo-code, algorithms, functions, classes, or system logic.
8. **general**: A conversational query (e.g., "Hi", "Thanks") that doesn't need project context.

Return ONLY valid JSON:
{
  "intent": "context" | "schema" | "table" | "list" | "text" | "delete" | "code" | "general",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}
`;

  try {
    const messages: ChatMessage[] = state.chatHistory?.length > 0 
      ? state.chatHistory.slice(-5).map((m: any) => ({
          role: m.role?.toLowerCase() === 'user' ? 'user' : 'assistant',
          content: m.content || ""
      }))
      : [];

    messages.push({ role: "user" as const, content: prompt });

    const result = await callAI(messages, { returnJson: true });
    console.log("Intent classification result:", result);
    return {
      intent: result.intent,
      confidence: result.confidence
    };
  } catch (error) {
    console.error("Intent classification failed:", error);
    return { 
      intent: null,
      confidence: 0.5,
      error: "Failed to classify intent"
    };
  }
}
