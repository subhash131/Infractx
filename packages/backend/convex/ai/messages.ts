import { v } from "convex/values";
import { action, query } from "../_generated/server";
import { components } from "../_generated/api";
import { paginationOptsValidator } from "convex/server";
import { saveMessage } from "@convex-dev/agent";
import { designAgent } from "./designAgent";

export const create = action({
  args: {
    prompt: v.string(),
    threadId: v.string(),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const shouldTriggerAgent = true;

    if (shouldTriggerAgent) {
      await designAgent.generateText(
        ctx,
        { threadId: args.threadId },
        {
          prompt: args.prompt,
          //   tools: { resolveConversation, escalateConversation, search },
        }
      );
    } else {
      await saveMessage(ctx, components.agent, {
        threadId: args.threadId,
        prompt: args.prompt,
      });
    }
  },
});

export const getMany = query({
  args: {
    threadId: v.string(),
    contactSessionId: v.id("contactSessions"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const paginated = await designAgent.listMessages(ctx, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
    });

    return paginated;
  },
});
