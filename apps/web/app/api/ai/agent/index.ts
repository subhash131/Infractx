import { ChatGroq } from "@langchain/groq";

export const groqModel = new ChatGroq({
  apiKey: "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",
  model: "openai/gpt-oss-120b",
  temperature: 0,
});


