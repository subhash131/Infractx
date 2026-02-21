import { RunnableConfig } from "@langchain/core/runnables";
import { AgentStateAnnotation, EditOperation, callAI, ChatMessage } from "../index";

export async function generateOperations(state: typeof AgentStateAnnotation.State, config: RunnableConfig) {
  console.log("⚙️ Generating edit operations...");

  // Helper to get chat history messages
  const historyMessages: ChatMessage[] = state.chatHistory?.length > 0 
    ? state.chatHistory.slice(-5).map((m: any) => ({
        role: m.role?.toLowerCase() === 'user' ? 'user' : 'assistant',
        content: m.content || ""
    }))
    : [];

  // EDIT BLOCKING FOR EXTERNAL SOURCES
  if (state.source === 'mcp') {
      console.log("🚫 Blocking edit op from MCP source");
      return {
          operations: [{
              type: 'chat_response',
              position: state.cursorPosition,
              content: "I cannot edit documents directly from this interface. I am in read-only mode."
          }]
      };
  }
  
  const operations: EditOperation[] = [];

  if (state.intent === 'schema' && state.extractedData) {
    const { tableName, fields } = state.extractedData;
    
    operations.push({
      type: 'insert_smartblock',
      position: state.cursorPosition,
      content: {
        title: `Schema: ${tableName.charAt(0).toUpperCase() + tableName.slice(1)}`,
        table: {
          headers: ['Field', 'Type', 'Description (optional)'],
          rows: fields.map((field: any) => [
            field.name,
            field.type,
            field.description || ''
          ])
        }
      }
    });
  } 
  else if (state.intent === 'table' && state.extractedData) {
    operations.push({
      type: 'insert_smartblock',
      position: state.cursorPosition,
      content: {
        title: state.extractedData.title || 'Table',
        table: {
          headers: state.extractedData.headers,
          rows: state.extractedData.rows
        }
      }
    });
  }
  else if (state.intent === 'list') {
    // Handle list generation
    const prompt = `Generate a markdown list for the following request: "${state.userMessage}".\nReturn ONLY the markdown list content.`;
    const messages: ChatMessage[] = [...historyMessages, { role: "user" as const, content: prompt }];
    const text = await callAI(messages, { tags: ['streamable'], config });
    
    operations.push({
      type: 'replace',
      position: state.cursorPosition,
      content: text
    });
  }
  else if (state.intent === 'code') {
    // 1. Generate Title
    const titlePrompt = `Generate a concise title (1-4 words) for this code snippet.
    Request: "${state.userMessage}"
    Format: "Type: Name" (e.g., "Func: Multiply", "Class: Router", "Script: Setup").
    Return ONLY the title text.`;

    const titleMessages: ChatMessage[] = [...historyMessages, { role: "user" as const, content: titlePrompt }];
    const title = await callAI(titleMessages, { tags: ['generate_title'], config });

    // 2. Generate Code
    const prompt = `Generate the pseudo-code/logic for the following request:
    "${state.userMessage}"

    Context:
    - Document Context: "${state.docContext}"
    - Selected Text: "${state.selectedText}"
    
    If the request implies editing the selected text or using the document context, ensure the generated logic reflects that.
    
    CRITICAL RULES:
    - The title of this block already contains the function/class name (e.g. "Func: Login"). Do NOT repeat the function signature like "function login(username, password):" in the body.
    - Instead, start with: INPUT: list the parameters, then OUTPUT: describe the return value, then the step-by-step logic.
    - Generate ONLY what was specifically requested. If the user asks for a "login function", output ONLY the login function — do NOT add logout, helpers, utilities, or any other related functions.
    - Do NOT include any title, heading, or bold text.
    - Do NOT wrap output in triple backticks or any code fences (\`\`\`). The output is ALREADY inside a code block.
    - Write plain-text pseudo-code directly, using simple indentation for nesting.
    - Keep it concise, focused, and well-structured. Less is more.
    
  Example output format:
    INPUT: username (string), password (string)
    OUTPUT: session_token, user_id or error

    validate username and password are not empty
    query user record from database by username
    if user not found, return error
    verify password hash matches
    generate session token
    store session and return token with user id`;
    
    try {
        const codeMessages: ChatMessage[] = [...historyMessages, { role: "user" as const, content: prompt }];
        const text = await callAI(codeMessages, { tags: ['streamable'], config });
         operations.push({
            type: 'insert_smartblock',
            position: state.cursorPosition,
            content: {
                title: title || "Smart Block",
                content: text
            }
        });
    } catch (e) {
        console.error("Failed to generate code logic:", e);
    }
  }
  else if (state.intent === 'text') {
    const prompt = `You are an AI editor.
User Request: "${state.userMessage}"
Context (Selected Text): "${state.selectedText}"
Document Context: "${state.docContext}"

Perform the requested text generation, rewriting, or editing on the 'Selected Text'.
Return ONLY the replacement text for the 'Selected Text'.
- Do NOT include any conversational text.
- Do NOT repeat the Document Context unless it is part of the replacement.
- If the request is a simple fix (typo, grammar), return only the corrected text.`;

    const txtMessages: ChatMessage[] = [...historyMessages, { role: "user" as const, content: prompt }];
    const text = await callAI(txtMessages, { tags: ['streamable'], config });
    operations.push({
      type: 'replace',
      position: state.cursorPosition,
      content: text
    });
  }
  else if (state.intent === 'delete') {
      operations.push({
          type: 'delete',
          position: state.cursorPosition,
          content: null
      });
  }
  else if (state.intent === 'general') {
      const prompt = `You are a helpful AI assistant.
User Message: "${state.userMessage}"

Context:
- Document Content: "${state.docContext}"
- Selected Text: "${state.selectedText}"

Provide a helpful, concise response to the user.
If the user asks about the document, use the provided Context.`;
      const genMessages: ChatMessage[] = [...historyMessages, { role: "user" as const, content: prompt }];
      const response = await callAI(genMessages, { tags: ['chat_stream'], config });
      operations.push({
          type: 'chat_response',
          position: state.cursorPosition,
          content: response
      });
  }

  if (state.source === 'ui' && state.intent !== 'general' && operations.length > 0) {
    const chatPrompt = `You are a helpful AI assistant. You just updated the document based on the user's request: "${state.userMessage}".\n\nProvide a very brief (1-2 sentences), friendly confirmation that you've made the requested changes. Do not include the content of the changes, just the confirmation.`;
    
    try {
        const chatResponse = await callAI([{ role: 'user' as const, content: chatPrompt }], { tags: ['chat_stream'], config });
        operations.push({
            type: 'chat_response',
            position: state.cursorPosition,
            content: chatResponse
        });
    } catch (e) {
        console.error("Failed to generate chat response:", e);
        operations.push({
            type: 'chat_response',
            position: state.cursorPosition,
            content: "I have updated the document based on your request."
        });
    }
  }

  return { operations };
}
