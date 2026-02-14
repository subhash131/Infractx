import { AgentState } from "../state";
import { ChatGroq } from "@langchain/groq";

const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0.4,
});

export const classifyIntent = async (state: AgentState) => {
  const prompt = `Analyze this user message and classify the intent:
    Message: "${state.userMessage}"
    Selected text: "${state.selectedText}"

    Is this asking for:
    - database schema (mentions: fields, types, UUID, primary key, etc.)
    - table/comparison
    - list
    - code block
    - general text edit

    Return JSON: {"intent": "schema|table|list|code|text", "confidence": 0-1}`;

    const response = await llm.invoke(prompt);

    console.log({classifyIntentResponse:JSON.stringify(response)});
  
    return { ...state, intent: response.content };
};