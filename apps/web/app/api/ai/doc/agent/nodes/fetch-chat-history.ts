import { RunnableConfig } from "@langchain/core/runnables";
import { AgentStateAnnotation } from "../index";
import { getConvexClient } from "../convex-client";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { ChatHistoryItem } from "../index";

export async function fetchChatHistory(
  state: typeof AgentStateAnnotation.State,
  config?: RunnableConfig
) {
  console.log("🔍 Fetching chat history...");
  
  if (!state.conversationId) {
    console.log("⏭️ No conversationId provided, skipping chat history fetch");
    return { chatHistory: [] };
  }

  try {
    const token = config?.configurable?.token;
    const client = getConvexClient(token);
    
    // Set initial fetch to 30, but allow the state to override it 
    // if the user has paginated further back in the UI.
    const limit = 30; 

    // Using standard convex client query
    const messages = await client.query(api.ai.messages.getLastNMessages, {
      conversationId: state.conversationId as Id<"conversations">,
      n: limit
    });

    // Flatten the Convex objects so LangChain nodes can read m.role and m.content
    const flatMessages: ChatHistoryItem[] = (messages || []).map((m: any) => ({
      ...m,
      role: m.message?.role,
      content: m.message?.content
    }));

    console.log(`✅ Fetched ${flatMessages.length} messages for conversation`);
    return { chatHistory: flatMessages };
  } catch (error) {
    console.error("❌ Failed to fetch chat history:", error);
    // Don't fail the whole graph if chat history fails, just return empty
    return { chatHistory: [] };
  }
}