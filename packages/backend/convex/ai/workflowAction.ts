"use node";
import { ConvexError, v } from "convex/values";
import { action } from "../_generated/server";
import { createWorkflow } from "./designAgent";
import { api } from "../_generated/api";
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";

export const create = action({
  args: {
    prompt: v.string(),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const { prompt, conversationId } = args;
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return new ConvexError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }

    await ctx.runMutation(api.ai.messages.insertMessage, {
      conversationId,
      prompt,
      role: "USER",
    });
    const workflow = createWorkflow();
    const messages = await ctx.runQuery(api.ai.messages.listMessages, {
      conversationId,
    });

    const baseMessages: BaseMessage[] = messages.map((msg) => {
      const content = msg.message.content;
      switch (msg.message.role) {
        case "USER":
          return new HumanMessage(content);
        case "AI":
          return new AIMessage(content);
        case "SYSTEM":
          return new SystemMessage(content);
        default:
          throw new Error(`Unknown role: ${msg.message.role}`);
      }
    });
    const res = await workflow.invoke({
      convexState: ctx,
      messages: [],
      userInput: prompt,
    });
    return res.messages;
  },
});

export const workflowMermaid = action({
  handler: async () => {
    const workflow = createWorkflow();
    return (await workflow.getGraphAsync()).drawMermaid();
  },
});
