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
import { allShapeTools, groqWithShapeTools } from "./tools/primitiveLayerTools";
import { UIDesignAgent } from "./uiDesign/graph";

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
      message: messages?.[messages.length - 1]?.content ?? "",
    };
  },
});

export const testAgents = action({
  args: {
    // prompt: v.string(),
    // pageId: v.id("pages"),
    // canvasWidth: v.number(),
    // canvasHeight: v.number(),
    // frameId: v.optional(v.id("layers")),
  },
  handler: async (ctx, args) => {
    // const { prompt, pageId, canvasWidth, canvasHeight, frameId } = args;

    const agent = new UIDesignAgent();

    // Generate a new design
    const result = await agent.generateDesign(
      `
Build a modern SaaS landing page using Next.js (App Router) and Shadcn UI, replicating the layout, spacing, and visual hierarchy of the provided screenshot, but using the content and branding described below.

Website Description
Create a landing page for ClipFlow, a video commerce platform that enables brands to create interactive, shoppable videos and live shopping experiences. The page should feel clean, fast, premium, and conversion-focused, like top-tier startup SaaS products.

Page Structure
- Top navigation bar with CTAs
- Hero section with headline, subheadline, and CTA buttons
- Central mobile phone mockup showing a video
- Floating stat cards and product cards around the phone
- Social proof section with brand logos

Brand & Content (Use Exactly This Text)

Brand Name: ClipFlow

Navigation Bar
- Platform
- Use Cases
- Learn
- Pricing
- Request Demo (secondary button, outlined)
- Start Free Trial (primary button, filled)

Hero Section
Headline: Power Your Store With Interactive Video Commerce
Subheadline: Create, host, and monetize high-performance product videos, live shopping streams, and interactive experiences — all optimized for speed, scale, and conversions.
Primary CTA: Start Free Trial
Secondary CTA: Request a Demo

Floating Stat Cards
- 42.7 Min Average Session Duration
- 3.1B+ Video Views Delivered Worldwide

Left Bottom Info Card
Turn videos into instant shopping experiences
Button: Copy Share Link

Right Product Card
Performance Runner Pro
$149.00

Video Overlay Labels on Phone Mockup
- Tap to Shop
- View Details
- Add to Cart

Social Proof Section
Text: Trusted by modern commerce brands worldwide
Brand logos (text placeholders or simple logo components):
VELORA, NORTHWAVE, BLUMER, SKINNIFY, PUREDROP, LUXORA, THREADLINE, URBAN PEAK

Color Palette
- Primary Black: #111111
- White Background: #FFFFFF
- Secondary Text Gray: #6B7280
- Light Gray Backgrounds: #F5F5F5
- Yellow Accent Card: #FFD84D
- Orange Accent Card: #FF8A4C
- Soft Purple Gradient Shapes: #E9D5FF → #F5E9FF

Design Principles
- Large bold typography for hero headline
- Generous white space and padding
- Center-aligned hero content
- Rounded cards with subtle shadows
- Floating UI cards layered around the phone mockup
- Clean grid alignment and consistent spacing
- Mobile-first responsiveness with desktop enhancements

UI & Component Details
- Sticky top navigation bar
- Shadcn Button, Card, Badge, and Avatar components
- Primary CTA button: solid black with white text
- Secondary CTA button: white with black border
- Phone mockup centered with layered background gradients
- Floating cards positioned absolutely relative to hero container
- Logos displayed in grayscale with equal spacing

Technical Requirements
- Use Next.js App Router
- Use Shadcn UI + Tailwind CSS
- Fully responsive (mobile, tablet, desktop)
- Use reusable components
- Clean semantic HTML structure
`
    );

    // Access the generated layers
    console.log("Layers:", result.design.layers);
    console.log("Hierarchy:", result.design.hierarchy);
    console.log("Requirements:", result.requirements);

    return result;
  },
});
