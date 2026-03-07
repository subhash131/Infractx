import { RunnableConfig } from "@langchain/core/runnables";
import { AgentStateAnnotation, EditOperation, callAI, ChatMessage } from "../index";

export async function generateOperations(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig
) {

  console.log("======================================");
  console.log("⚙️ GENERATE OPERATIONS START");
  console.log("Intent:", state.intent);
  console.log("Source:", state.source);
  console.log("Cursor:", state.cursorPosition);
  console.log("User Message:", state.userMessage);
  console.log("Selected Text:", state.selectedText);
  console.log("Doc Context length:", state.docContext?.length || 0);
  console.log("Fetched Context length:", state.fetchedContext?.length || 0);
  console.log("======================================");

  // Helper to get chat history messages
  const historyMessages: ChatMessage[] =
    state.chatHistory?.length > 0
      ? state.chatHistory.slice(-5).map((m: any) => ({
          role: m.role?.toLowerCase() === "user" ? "user" : "assistant",
          content: m.content || "",
        }))
      : [];

  console.log("🧠 Chat history used:", historyMessages.length);

  // EDIT BLOCKING FOR EXTERNAL SOURCES
  if (state.source === "mcp") {
    console.log("🚫 Blocking edit op from MCP source");

    return {
      operations: [
        {
          type: "chat_response",
          position: state.cursorPosition,
          content:
            "I cannot edit documents directly from this interface. I am in read-only mode.",
        },
      ],
    };
  }

  const operations: EditOperation[] = [];

  /* =========================
     TABLE
  ========================= */

  if (state.intent === "table" && state.extractedData) {
    console.log("📋 Generating table smartblock");

    operations.push({
      type: "insert_smartblock",
      position: state.cursorPosition,
      content: {
        title: state.extractedData.title || "Table",
        table: {
          headers: state.extractedData.headers,
          rows: state.extractedData.rows,
        },
      },
    });

    console.log("✅ Table operation created");
  }

  /* =========================
     LIST
  ========================= */

  else if (state.intent === "list") {
    console.log("📃 Generating markdown list");

    const prompt = `Generate a list for the following request: "${state.userMessage}". Return ONLY the list content. Do NOT use markdown formatting (no bolding, no asterisks, no headers). Separate items by simple newlines.

${state.fetchedContext ? `Before generating, look at the Relevant Context below. If a requested component ALREADY EXISTS in the Context, DO NOT recreate it. Instead, you MUST mention it by outputting EXACTLY this format on its own new line:
[[MENTION: {JSON object copied exactly from MENTION_METADATA}]]

Relevant Context:
${state.fetchedContext}` : ""}
`;

    console.log("🧾 Prompt:", prompt);

    const messages: ChatMessage[] = [
      ...historyMessages,
      { role: "user", content: prompt },
    ];

    const text = await callAI(messages, { tags: ["streamable"], config });

    console.log("🤖 AI Response:", text);

    operations.push({
      type: "replace",
      position: state.cursorPosition,
      content: text,
    });

    console.log("✅ List replace operation created");
  }

  /* =========================
     CODE
  ========================= */

  else if (state.intent === "code") {
    console.log("💻 Generating code block");

    const titlePrompt = `Generate a concise title (1-4 words) for this code snippet.
Request: "${state.userMessage}"
Format: "Type: Name".
Return ONLY the title text.`;

    console.log("🧾 Title Prompt:", titlePrompt);

    const titleMessages: ChatMessage[] = [
      ...historyMessages,
      { role: "user", content: titlePrompt },
    ];

    const title = await callAI(titleMessages, { tags: ["generate_title"], config });

    console.log("🏷 Generated Title:", title);

    const prompt = `Generate the pseudo-code/logic for:
"${state.userMessage}"

IMPORTANT: Do not use any Markdown formatting at all (no bolding, no headers, no code blocks like \`\`\`). Output plain text paragraphs separated by new lines only.

${state.fetchedContext ? `Before generating, look at the Relevant Context below. If a required component (like a model, database action, or logic) ALREADY EXISTS in the Context, DO NOT recreate or write pseudo-code for it. Instead, you MUST mention it by outputting EXACTLY this format on its own new line:
[[MENTION: {JSON object copied exactly from MENTION_METADATA}]]

Relevant Context:
${state.fetchedContext}` : ""}
`;

    console.log("🧾 Code Prompt:", prompt);

    try {
      const codeMessages: ChatMessage[] = [
        ...historyMessages,
        { role: "user", content: prompt },
      ];

      const text = await callAI(codeMessages, { tags: ["streamable"], config });

      console.log("🤖 Code Response:", text?.slice(0, 300));

      operations.push({
        type: "insert_smartblock",
        position: state.cursorPosition,
        content: {
          title: title || "Smart Block",
          content: text,
        },
      });

      console.log("✅ Code smartblock operation created");
    } catch (e) {
      console.error("❌ Failed to generate code logic:", e);
    }
  }

  /* =========================
     TEXT EDIT
  ========================= */

  else if (state.intent === "text") {
    console.log("✏️ Editing text");

    const prompt = `You are an AI editor.
User Request: "${state.userMessage}"
Selected Text: "${state.selectedText}"

IMPORTANT: Do not use any Markdown formatting at all (no bolding, no headers, no code blocks like \`\`\`). Output plain text paragraphs separated by new lines only.

${state.fetchedContext ? `Before editing, look at the Relevant Context below. If a requested component ALREADY EXISTS in the Context, DO NOT recreate it. Instead, you MUST mention it by outputting EXACTLY this format on its own new line:
[[MENTION: {JSON object copied exactly from MENTION_METADATA}]]

Relevant Context:
${state.fetchedContext}` : ""}
`;

    console.log("🧾 Text Prompt:", prompt);

    const txtMessages: ChatMessage[] = [
      ...historyMessages,
      { role: "user", content: prompt },
    ];

    const text = await callAI(txtMessages, { tags: ["streamable"], config });

    console.log("🤖 Edited Text:", text);

    operations.push({
      type: "replace",
      position: state.cursorPosition,
      content: text,
    });

    console.log("✅ Text replace operation created");
  }

  /* =========================
     MENTION
  ========================= */

  else if (state.intent === "mention") {
    console.log("🔗 Generating smart block mention");

    const prompt = `You need to create a smart block mention. The user wants to reference a specific smartblock or file.
User Request: "${state.userMessage}"

Based on the available context (if any), provide the EXACT title of the smartblock to mention, and optionally the file name it belongs to.

Return ONLY valid JSON:
{
  "blockTitle": "Name of the block to mention",
  "fileName": "Optional name of the file it belongs to (leave null if unknown)"
}`;

    const txtMessages: ChatMessage[] = [
      ...historyMessages,
      { role: "user", content: prompt },
    ];

    try {
      const mentionData = await callAI(txtMessages, { returnJson: true, config });

      operations.push({
        type: "insert_smartblock_mention",
        position: state.cursorPosition,
        content: {
          label: mentionData.blockTitle || "Untitled",
          fileName: mentionData.fileName || null,
        },
      });

      console.log("✅ Mention operation created:", mentionData);
    } catch (e) {
      console.error("❌ Failed to generate mention:", e);
    }
  }

  /* =========================
     DELETE
  ========================= */

  else if (state.intent === "delete") {
    console.log("🗑 Deleting content at cursor");

    operations.push({
      type: "delete",
      position: state.cursorPosition,
      content: null,
    });
  }

  /* =========================
     GENERAL CHAT
  ========================= */

  else if (state.intent === "general" || state.intent === "greet") {
    console.log("💬 Generating chat response");

    const prompt = `User Message: "${state.userMessage}"`;

    const genMessages: ChatMessage[] = [
      ...historyMessages,
      { role: "user", content: prompt },
    ];

    const response = await callAI(genMessages, { tags: ["chat_stream"], config });

    console.log("🤖 Chat Response:", response);

    operations.push({
      type: "chat_response",
      position: state.cursorPosition,
      content: response,
    });
  }

  /* =========================
     CONFIRMATION MESSAGE
  ========================= */

  if (
    state.source === "ui" &&
    state.intent !== "general" &&
    state.intent !== "greet" &&
    operations.length > 0
  ) {
    console.log("💬 Generating confirmation message");

    const chatPrompt = `Confirm the edit for: "${state.userMessage}"`;

    try {
      const chatResponse = await callAI(
        [{ role: "user", content: chatPrompt }],
        { tags: ["chat_stream"], config }
      );

      console.log("🤖 Confirmation:", chatResponse);

      operations.push({
        type: "chat_response",
        position: state.cursorPosition,
        content: chatResponse,
      });
    } catch (e) {
      console.error("❌ Failed confirmation generation:", e);

      operations.push({
        type: "chat_response",
        position: state.cursorPosition,
        content: "I have updated the document based on your request.",
      });
    }
  }

  console.log("======================================");
  console.log("📦 FINAL OPERATIONS:", JSON.stringify(operations, null, 2));
  console.log("⚙️ GENERATE OPERATIONS END");
  console.log("======================================");

  return { operations };
}