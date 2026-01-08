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
  ToolMessage,
} from "@langchain/core/messages";
import { allShapeTools, groqWithShapeTools } from "./tools/premitiveLayerTools";

export const create = action({
  args: {
    prompt: v.string(),
    conversationId: v.id("conversations"),
    pageId: v.id("pages"),
    canvasWidth: v.number(),
    canvasHeight: v.number(),
    frameId: v.optional(v.id("layers")),
  },
  handler: async (ctx, args) => {
    const {
      prompt,
      conversationId,
      pageId,
      canvasWidth,
      canvasHeight,
      frameId,
    } = args;
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return new ConvexError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }

    await ctx.runMutation(api.ai.messages.insertMessage, {
      conversationId,
      content: prompt,
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
    await workflow.invoke({
      convexState: ctx,
      messages: [],
      userInput: prompt,
      conversationId,
      pageId,
      frameId,
      canvasWidth,
      canvasHeight,
    });
  },
});

export const workflowMermaid = action({
  args: {},
  handler: async () => {
    const workflow = createWorkflow();
    return (await workflow.getGraphAsync()).drawMermaid();
  },
});

export const testWorkflowTools = action({
  args: {
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const systemMessage =
      new SystemMessage(`You are a design assistant that creates visual elements using tools.

When calling tools, you MUST provide ALL required parameters:
- name: descriptive name for the element
- fill: color as hex code (e.g., "#3b82f6" for blue)
- width, height: dimensions in pixels
- left, top: position values (can be negative)

Example requests and correct tool calls:
User: "Add a blue rectangle at the top left"
Tool call: addRectangle with {name: "Blue Rectangle", fill: "#3b82f6", width: 200, height: 100, left: -400, top: -600}

User: "Add a red circle at the bottom"

Always provide complete parameters for each tool call.`);
    const messages: BaseMessage[] = [
      systemMessage,
      new HumanMessage(args.message),
    ];
    const allResults = [];
    let iterations = 0;
    const maxIterations = 1; // Prevent infinite loops

    while (iterations < maxIterations) {
      const response = await groqWithShapeTools.invoke(messages);

      // Add AI response to history
      messages.push(response);

      // Check if there are tool calls
      if (response.tool_calls && response.tool_calls.length > 0) {
        console.log(
          `Iteration ${iterations + 1}: ${response.tool_calls.length} tool(s) called`
        );

        // Execute all tool calls
        for (const toolCall of response.tool_calls) {
          const tool = allShapeTools.find((t) => t.name === toolCall.name);

          if (tool) {
            const result = await (tool as any).invoke(toolCall.args);
            allResults.push({
              tool: toolCall.name,
              result: JSON.parse(result),
            });

            // Add tool result to conversation
            messages.push(
              new ToolMessage({
                content: result,
                tool_call_id: toolCall.id!,
              })
            );
          }
        }

        iterations++;
      } else {
        // No more tool calls, we're done
        console.log("Finished. Final message:", response.content);
        break;
      }
    }

    return {
      results: allResults,
      message:
        messages?.length > 0 ? messages[messages.length - 1].content : "",
    };
  },
});
