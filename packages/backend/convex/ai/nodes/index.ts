//node.ts
"use node";
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { groqModel, WorkflowStateType } from "../designAgent";
import { api } from "../../_generated/api";
import { Doc, Id } from "../../_generated/dataModel";
import { insertLayer, validateFrame } from "./utils";
import {
  allShapeTools,
  groqWithShapeTools,
} from "../tools/premitiveLayerTools";

// ============================================
// ANALYZE INPUT - Main Router
// ============================================
export const analyzeInput = async (state: WorkflowStateType) => {
  const systemPrompt =
    "You are a router. Analyze if the user wants to have a general conversation (Greeting, FAQ, etc.) or use shape_tools (Frame, Rectangle, Circle, text) or ui_tools (Navbar, buttons, landing page, dashboard). " +
    "Reply with ONLY one word: 'generic', 'shape_tools' or 'ui_tools'. Nothing else.";
  const messages = [
    new SystemMessage(systemPrompt),
    new HumanMessage(state.userInput),
  ];

  const response = await groqModel.invoke(messages);
  const decision = response.content.toString().toLowerCase().trim();

  let messageId = state.messageId;
  if (!messageId) {
    messageId = await state.convexState.runMutation(
      api.ai.messages.insertMessage,
      {
        conversationId: state.conversationId,
        content: JSON.stringify({
          stage: "analyzing",
          message: `Analyzed user intent ${decision}`,
        }),
        role: "AI",
      }
    );
  }

  return {
    decision,
    messages: [...messages, response],
    messageId,
  };
};

// ============================================
// TOOL ROUTER - Routes from analyze to tool categories
// ============================================
export const toolRouter = async (state: WorkflowStateType) => {
  return state.decision;
};

// ============================================
// GENERIC NODE - Handles conversations
// ============================================
export const generic = async (state: WorkflowStateType) => {
  const systemPrompt =
    "You are a helpful assistant. Respond to the user's message in a friendly and helpful way.";
  const messages = [
    new SystemMessage(systemPrompt),
    new HumanMessage(state.userInput),
  ];

  const response = await groqModel.invoke(messages);

  await state.convexState.runMutation(api.ai.messages.updateMessage, {
    messageId: state.messageId,
    content: JSON.stringify({
      stage: "GENERIC",
      message: `${response.content.toString()}`,
    }),
    role: "AI",
  });

  return {
    result: "generic_response",
    messages: [...messages, response],
  };
};

// ============================================
// SHAPE TOOLS NODE - Detects shape type
// ============================================
export const shapeTools = async (state: WorkflowStateType) => {
  const systemMessage =
    new SystemMessage(`You are a design assistant that creates visual elements using tools.

When calling tools, you MUST provide ALL required parameters:
- name: descriptive name for the element
- fill: color as hex code (e.g., "#3b82f6" for blue)
- width, height: dimensions in pixels
- left, top: position values (can be negative)

Always provide complete parameters for each tool call.`);

  const internalMessages: BaseMessage[] = [
    systemMessage,
    new HumanMessage(state.userInput),
  ];

  const { frameId } = await validateFrame(state);

  let iterations = 0;
  const maxIterations = 5;

  await state.convexState.runMutation(api.ai.messages.updateMessage, {
    messageId: state.messageId,
    content: JSON.stringify({
      stage: "tool_execution",
      message: "Analyzing request and preparing tools...",
    }),
    role: "AI",
  });

  let finalResponse: AIMessage | null = null;

  while (iterations < maxIterations) {
    const response = await groqWithShapeTools.invoke(internalMessages);
    internalMessages.push(response);
    finalResponse = response;

    if (response.tool_calls && response.tool_calls.length > 0) {
      console.log(
        `Iteration ${iterations + 1}: ${response.tool_calls.length} tool(s) called`
      );

      await state.convexState.runMutation(api.ai.messages.updateMessage, {
        messageId: state.messageId,
        content: JSON.stringify({
          stage: "tool_execution",
          message: `Executing ${response.tool_calls.length} tool(s): ${response.tool_calls.map((t) => t.name).join(", ")}`,
        }),
        role: "AI",
      });

      // Execute tools and collect results
      for (const toolCall of response.tool_calls) {
        const tool = allShapeTools.find((t) => t.name === toolCall.name);

        if (tool) {
          const result = await (tool as any).invoke(toolCall.args);
          console.log(`${toolCall.name} result:`, result);

          // Use the actual tool result (not args)
          const layer = {
            ...result,
            parentLayerId: frameId,
            pageId: state.pageId,
          } as Doc<"layers">;

          console.log("Inserting layer:", layer);
          await insertLayer(layer, state);

          // Add tool result to internal messages
          internalMessages.push(
            new ToolMessage({
              content:
                typeof result === "string" ? result : JSON.stringify(result),
              tool_call_id: toolCall.id!,
            })
          );
        }
      }

      iterations++;
    } else {
      console.log("Finished. Final message:", response.content);
      break;
    }
  }

  await state.convexState.runMutation(api.ai.messages.updateMessage, {
    messageId: state.messageId,
    content: JSON.stringify({
      stage: "completed",
      message: "Tool execution completed",
    }),
    role: "AI",
  });

  return {
    messages: finalResponse
      ? [...state.messages, finalResponse]
      : state.messages,
    frameId,
  };
};

// ============================================
// UI TOOLS NODE - Sub-router for UI components
// ============================================
export const uiTools = async (state: WorkflowStateType) => {
  const messages = [
    new SystemMessage(
      "Analyze the user's request and identify which UI component they want to create. " +
        "Reply with ONLY one word: 'dashboard' or 'navbar'. Nothing else. " +
        "Examples: 'add dashboard' → dashboard, 'create navbar' → navbar, 'add navigation bar' → navbar"
    ),
    new HumanMessage(state.userInput),
  ];

  const { frameId } = await validateFrame(state);
  const response = await groqModel.invoke(messages);
  const decision = response.content.toString().toLowerCase().trim();

  await state.convexState.runMutation(api.ai.messages.updateMessage, {
    messageId: state.messageId,
    content: JSON.stringify({
      stage: "ui_tools_routing",
      message: `executing ui_tools: ${decision}`,
    }),
    role: "AI",
  });

  return {
    decision,
    messages: [...messages, response],
    frameId,
  };
};

// ============================================
// SUB TOOL ROUTER - Routes UI tools to specific components
// ============================================
export const subToolRouter = async (state: WorkflowStateType) => {
  return state.decision;
};

// ============================================
// ADD DASHBOARD NODE
// ============================================
export const addDashboard = async (state: WorkflowStateType) => {
  await state.convexState.runMutation(api.ai.messages.updateMessage, {
    messageId: state.messageId,
    content: JSON.stringify({
      stage: "tool_execution",
      message: `adding dashboard: `,
    }),
    role: "AI",
  });

  return {
    result: "dashboard",
  };
};

// ============================================
// ADD NAVBAR NODE
// ============================================
export const addNavbar = async (state: WorkflowStateType) => {
  await state.convexState.runMutation(api.ai.messages.updateMessage, {
    messageId: state.messageId,
    content: JSON.stringify({
      stage: "tool_execution",
      message: `adding Navbar: `,
    }),
    role: "AI",
  });

  return {
    result: "navbar",
  };
};

// ============================================
// VALIDATE OUTPUT - Checks if result matches intent
// ============================================
export const validateOutput = async (state: WorkflowStateType) => {
  // Skip validation for generic responses
  if (state.result === "generic_response") {
    console.log(`[validateOutput] Skipping validation for generic response`);
    return {
      decision: "end",
    };
  }

  const messages = [
    new SystemMessage(
      `You are a validation checker. The user requested: "${state.userInput}". ` +
        `The system produced result: "${state.result}". ` +
        `Does the result match what the user asked for? ` +
        `Reply with ONLY 'valid' if it matches, or 'invalid' if it doesn't. Nothing else. ` +
        `Examples: ` +
        `- User: "add dashboard", Result: "dashboard" → valid ` +
        `- User: "add navbar", Result: "dashboard" → invalid ` +
        `- User: "create rectangle", Result: "rectangle" → valid ` +
        `- User: "create circle", Result: "rectangle" → invalid`
    ),
    new HumanMessage(
      `User request: ${state.userInput}\nSystem result: ${state.result}`
    ),
  ];

  const response = await groqModel.invoke(messages);
  const validationResult = response.content.toString().toLowerCase().trim();

  const isValid = validationResult === "valid";

  if (!isValid) {
    return {
      errors: [
        `Mismatch: Expected something related to "${state.userInput}", got "${state.result}"`,
      ],
      decision: "invalid",
      messages: [...messages, response],
      retryCount: state.retryCount + 1,
    };
  }

  await state.convexState.runMutation(api.ai.messages.updateMessage, {
    messageId: state.messageId,
    content: JSON.stringify({
      stage: "done",
      message: `Task complete`,
    }),
    role: "AI",
  });

  return {
    decision: "valid",
    messages: [...messages, response],
  };
};

// ============================================
// OUTPUT ROUTER - Decides to retry or end
// ============================================
export const outputRouter = async (state: WorkflowStateType) => {
  const MAX_RETRIES = 0;

  // If valid, end the workflow
  if (state.decision === "valid" || state.decision === "end") {
    console.log(
      `[outputRouter] Ending workflow - Valid result or generic response`
    );
    return "end";
  }

  // If invalid and under retry limit, redo
  if (state.decision === "invalid" && state.retryCount < MAX_RETRIES) {
    await state.convexState.runMutation(api.ai.messages.updateMessage, {
      messageId: state.messageId,
      content: JSON.stringify({
        stage: "validation",
        message: `Failed... Retrying... Attempt ${state.retryCount + 1}/${MAX_RETRIES}`,
      }),
      role: "AI",
    });
    return "redo";
  }

  // Max retries reached, force end
  console.log(
    `[outputRouter] Max retries reached (${MAX_RETRIES}), forcing end`
  );
  await state.convexState.runMutation(api.ai.messages.updateMessage, {
    messageId: state.messageId,
    content: JSON.stringify({
      stage: "done",
      message: `Failed... Max retries reached (${MAX_RETRIES}), forcing end`,
    }),
    role: "AI",
  });
  return "end";
};
