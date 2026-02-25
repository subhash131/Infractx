import { ChatGroq } from "@langchain/groq";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// ============================================================
// 🔀 SWITCH MODELS HERE — one place, affects the entire app
// ============================================================
export const AI_PROVIDER = "groq" as "gemini" | "groq";

const MODEL_CONFIG = {
  gemini: {
    model: "gemini-3-flash-preview",
    apiKey: process.env.GOOGLE_API_KEY,
  },
  groq: {
    model: "openai/gpt-oss-20b",
    maxTokens: 8192,
    maxRetries: 2,
  },
};

/** Returns a plain (no tools) AI model instance. */
export function getAIModel() {
  if (AI_PROVIDER === "groq") {
    return new ChatGroq({
      model: MODEL_CONFIG.groq.model,
      apiKey: process.env.GROQ_API_KEY,
    });
  }
  return new ChatGoogleGenerativeAI({
    model: MODEL_CONFIG.gemini.model,
    apiKey: process.env.GOOGLE_API_KEY,
  });
}

/** Returns an AI model instance pre-bound with the given tools. */
export function getAIModelWithTools(tools: any[]) {
  return getAIModel().bindTools(tools);
}
