//node.ts
"use node";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { groqModel, WorkflowStateType } from "../designAgent";

// ============================================
// ANALYZE INPUT - Main Router
// ============================================
export const analyzeInput = async (state: WorkflowStateType) => {
  const messages = [
    new SystemMessage(
      "You are a router. Analyze if the user wants to have a general conversation (Greeting, FAQ, etc.) or use shape_tools (Frame, Rectangle, Circle) or ui_tools (Navbar, buttons, landing page, dashboard). " +
        "Reply with ONLY one word: 'generic', 'shape_tools' or 'ui_tools'. Nothing else."
    ),
    new HumanMessage(state.userInput),
  ];

  const response = await groqModel.invoke(messages);
  const decision = response.content.toString().toLowerCase().trim();

  console.log(`[analyzeInput] Decision:`, decision);
  console.log(`[analyzeInput] Returning ${messages.length + 1} messages`);

  return {
    decision,
    messages: [...messages, response],
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
  const messages = [
    new SystemMessage(
      "You are a helpful assistant. Respond to the user's message in a friendly and helpful way."
    ),
    new HumanMessage(state.userInput),
  ];

  const response = await groqModel.invoke(messages);

  console.log(`[generic] Response generated`);
  console.log(`[generic] Returning ${messages.length + 1} messages`);

  return {
    result: "generic_response",
    messages: [...messages, response],
  };
};

// ============================================
// SHAPE TOOLS NODE - Detects shape type
// ============================================
export const shapeTools = async (state: WorkflowStateType) => {
  const messages = [
    new SystemMessage(
      "Analyze the user's request and identify which shape they want to create. " +
        "Reply with ONLY one word: 'rectangle', 'circle', or 'frame'. Nothing else. " +
        "Examples: 'add rectangle' → rectangle, 'create circle' → circle, 'make a frame' → frame"
    ),
    new HumanMessage(state.userInput),
  ];

  const response = await groqModel.invoke(messages);
  const result = response.content.toString().toLowerCase().trim();

  console.log(`[shapeTools] Detected shape: ${result}`);
  console.log(`[shapeTools] Returning ${messages.length + 1} messages`);

  return {
    result,
    messages: [...messages, response],
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

  const response = await groqModel.invoke(messages);
  const decision = response.content.toString().toLowerCase().trim();

  console.log(`[uiTools] UI component detected: ${decision}`);
  console.log(`[uiTools] Returning ${messages.length + 1} messages`);

  return {
    decision,
    messages: [...messages, response],
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
  console.log(`[addDashboard] Processing dashboard request`);

  return {
    result: "dashboard",
  };
};

// ============================================
// ADD NAVBAR NODE
// ============================================
export const addNavbar = async (state: WorkflowStateType) => {
  console.log(`[addNavbar] Processing navbar request`);

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

  console.log(
    `[validateOutput] Validation: ${validationResult}, Retry count: ${state.retryCount}`
  );
  console.log(`[validateOutput] Returning ${messages.length + 1} messages`);

  const isValid = validationResult === "valid";

  if (!isValid) {
    return {
      errors: [
        `Mismatch: Expected something related to "${state.userInput}", got "${state.result}"`,
      ],
      decision: "invalid",
      messages: [...messages, response],
    };
  }

  return {
    decision: "valid",
    messages: [...messages, response],
  };
};

// ============================================
// OUTPUT ROUTER - Decides to retry or end
// ============================================
export const outputRouter = async (state: WorkflowStateType) => {
  const MAX_RETRIES = 3;

  // If valid, end the workflow
  if (state.decision === "valid" || state.decision === "end") {
    console.log(
      `[outputRouter] Ending workflow - Valid result or generic response`
    );
    return "end";
  }

  // If invalid and under retry limit, redo
  if (state.decision === "invalid" && state.retryCount < MAX_RETRIES) {
    console.log(
      `[outputRouter] Retrying... Attempt ${state.retryCount + 1}/${MAX_RETRIES}`
    );
    return "redo";
  }

  // Max retries reached, force end
  console.log(
    `[outputRouter] Max retries reached (${MAX_RETRIES}), forcing end`
  );
  return "end";
};
