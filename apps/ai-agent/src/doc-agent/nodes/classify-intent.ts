import { AgentStateAnnotation, callAI, ChatMessage } from "../index";

export async function classifyIntent(state: typeof AgentStateAnnotation.State) {
  console.log("🔍 Classifying intent...");
  
  const chatHistoryContext = state.chatHistory?.length > 0 
    ? state.chatHistory.slice(-5).map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")
    : "No recent history.";

  const prompt = `You are analyzing a user's request to edit a document or chat.

User Message: "${state.userMessage}"
Selected Text: "${state.selectedText}"

Recent Conversation History:
${chatHistoryContext}

Classify the intent into ONE of these categories based BOTH on the User Message and the Context provided in the Recent Conversation History:

1. **context**: Request to EXPLAIN, SEARCH, or QUERY project data (schema, files, structure, definitions).
   - "Explain user schema"
   - "What documents exist?"
   - "How does the auth flow work?"
   - "Show me the blocks in file X"
2. **table**: Request to create a comparison or data table.
3. **list**: Request to create a list (bullet points, checklist).
4. **text**: Request to GENERATE, WRITE, REPHRASE, REWRITE, or SUMMARIZE text that should appear IN THE DOCUMENT.
5. **delete**: Request to remove, delete, or omit the selected text.
6. **code**: Request to generate pseudo-code, algorithms, functions, classes, or system logic.
7. **file_management**: Request to CREATE, RENAME, DELETE, or MOVE files and folders, OR high-level generative requests like "design a system architecture" that require creating structured file hierarchies and adding initial content or smartblocks.
   - "Create a new folder for components"
   - "Rename the utils file"
8. **architecture**: Request to DESIGN a system architecture, or GENERATE/DESIGN a NEW database schema. Creating scalable structures and files.
   - "Design a system design for a spotify clone"
   - "Create a microservice architecture for e-commerce"
   - "Add a school schema"
9. **mention**: Request to MENTION, REFERENCE, or LINK a specific smartblock or file.
    - "Mention the user schema block from the auth file"
    - "Add a smartblock mention to the login flow"
10. **general**: A generic conversational query that doesn't fit other categories.
    - "try again" (if history does NOT imply a specific category)
11. **greet**: Simple conversational greetings or questions about the AI (e.g., "Hi", "Hello", "Who are you?", "Thanks").

Remember: If the user says something ambiguous like "try again" or "do it", look at the Recent Conversation History. If the history is about generating an architecture, classify as 'architecture'. If it's about explaining a file, classify as 'context'.

Return ONLY valid JSON:
{
  "intent": "context" | "table" | "list" | "text" | "delete" | "code" | "file_management" | "architecture" | "mention" | "general" | "greet",
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
