import { ChatGroq } from "@langchain/groq";
import { AgentState } from "../state";


const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0.4,
});

export const extractSchema = async (state: AgentState) => {
  if (state.intent !== 'schema') return state;

  const prompt = `Extract database schema from requirements:
${state.userMessage}

Return JSON array of fields:
[{
  "name": "field_name",
  "type": "VARCHAR(255) | UUID | TIMESTAMP | etc",
  "description": "what this field does"
}]

Include ALL requirements: constraints, indexes, etc.`;

  const response = await llm.invoke(prompt);
  console.log({extractSchemaResponse:JSON.stringify(response)})

  return { 
    ...state, 
    extractedData: JSON.parse(response.content.toString()) 
  };
};