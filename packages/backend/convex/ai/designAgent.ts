import { Agent } from "@convex-dev/agent";
import { groq } from "@ai-sdk/groq";
import { google } from "@ai-sdk/google";
import { EmbeddingModel, LanguageModel } from "ai";
import { components } from "../_generated/api";

export const languageModelGroq: LanguageModel = groq("openai/gpt-oss-120b");
export const embeddingModelGoogle: EmbeddingModel = google.textEmbedding(
  "gemini-embedding-001"
);

export const designAgent = new Agent(components.agent, {
  name: "Design Agent",
  languageModel: languageModelGroq,
  instructions: `You are a design agent that helps users to build UI designs. Use "resolveConversation" tool when user expresses finalization of the conversation. Use "escalateConversation" when user expresses a frustration or requests an escalation. Use "search" to answer the FAQ's. If user asks something which you do not know, Just say you dont know. DO NOT HALLUCINATE`,
});
