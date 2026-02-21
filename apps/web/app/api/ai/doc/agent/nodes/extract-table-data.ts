import { AgentStateAnnotation, callAI, ChatMessage } from "../index";

export async function extractTableData(state: typeof AgentStateAnnotation.State) {
  console.log("📋 Extracting table data...");
  const prompt = `Create a comparison table from this request:

${state.userMessage}
Selected context: ${state.selectedText}

Return ONLY valid JSON:
{
  "title": "Short descriptive title for this table",
  "headers": ["Column1", "Column2", "Column3"],
  "rows": [
    ["Row1Col1", "Row1Col2", "Row1Col3"],
    ["Row2Col1", "Row2Col2", "Row2Col3"]
  ]
}`;

  try {
    const messages: ChatMessage[] = state.chatHistory?.length > 0 
      ? state.chatHistory.slice(-5).map((m: any) => ({
          role: m.role?.toLowerCase() === 'user' ? 'user' : 'assistant',
          content: m.content || ""
      }))
      : [];

    messages.push({ role: "user" as const, content: prompt });

    const result = await callAI(messages, { returnJson: true });
    return { extractedData: result };
  } catch (error) {
    return { error: "Failed to extract table data" };
  }
}
