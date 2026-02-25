import { inngest } from "../client";
import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { createFileTool, deleteFileTool, renameFileTool } from "@/app/api/ai/doc/agent/tools/file-tools";
import { addDatabaseSmartBlockTool } from "@/app/api/ai/doc/agent/tools/add-database-smart-block";
import { addSmartBlockMentionTool } from "@/app/api/ai/doc/agent/tools/add-smart-block-mention";
import { listFiles } from "@/app/api/ai/doc/agent/context-tools";
import { StructuredToolInterface } from "@langchain/core/tools";
import { getAIModelWithTools } from "@/lib/ai-model";

const tools = [
    createFileTool,
    deleteFileTool,
    renameFileTool,
    addDatabaseSmartBlockTool,
    addSmartBlockMentionTool,
];

export const architectureFunction = inngest.createFunction(
    {
        id: "architecture-agent",
        name: "Architecture Agent",
        timeouts: { finish: "30m" },
        retries: 0,
    },
    { event: "doc/architecture.requested" },
    async ({ event, step }) => {
        const { docId, userMessage, sessionToken, chatHistory, cursorPosition } = event.data as {
            docId: string;
            userMessage: string;
            sessionToken: string;
            chatHistory: Array<{ role: string; content: string }>;
            cursorPosition: number;
        };

        // ── Step 1: Fetch the current file tree ──
        const existingFiles = await step.run("fetch-file-tree", async () => {
            return await listFiles(docId, sessionToken);
        });

        const prompt = `You are a Senior Systems Architecture Agent. Your ONLY job is to scaffold a system design using the provided tools.

User Request: "${userMessage}"

Active Document ID: "${docId}"

Current Document File Tree:
${JSON.stringify(existingFiles, null, 2)}

## STRICT EXECUTION RULES

### Step 1 — Create root folders
Call \`create_file\` (type: "FOLDER") for each top-level folder. Wait for results.

### Step 2 — Create files inside folders
Using the EXACT \`fileId\` values returned in Step 1 as \`parentId\`, create the specific files (type: "FILE"). Wait for results.

### Step 3 — Populate EVERY file with content (MANDATORY)
For EVERY file created in Step 2, call \`add_database_smart_block\` using the EXACT \`fileId\` returned by that file's \`create_file\` call.
- **DO NOT skip this step for any file.**
- **DO NOT use placeholder IDs.**
- Provide a descriptive \`title\` and a rich \`content\` array.

### Step 4 — Insert inline mentions
Call \`add_smart_block_mention\` for the key files so the user has quick links.

## add_database_smart_block — content schema

The \`content\` field is a structured array, NOT a markdown string. Use these block kinds:

\`\`\`
{ kind: "paragraph", text: "..." }
{ kind: "heading", level: 1|2|3, text: "..." }
{ kind: "bulletList", items: ["item1", "item2", ...] }
{ kind: "table", headers: ["Field","Type","Description"], rows: [["id","UUID","Primary key"], ...] }
\`\`\`

## IMPORTANT
- The fileId you use in \`add_database_smart_block\` MUST be the exact string returned by the \`create_file\` call.
- Do NOT use raw markdown strings — always use the typed content array.
- Do NOT stop after creating folders or files — you MUST populate every file.`;

        // 👇 To switch models, edit apps/web/lib/ai-model.ts
        const aiModel = getAIModelWithTools(tools);

        const historyMessages = (chatHistory ?? []).slice(-5).map((m: any) => {
            if (m.role?.toLowerCase() === "user") return new HumanMessage(m.content || "");
            return new AIMessage(m.content || "");
        });

        // Shared config so tools can access docId and sessionToken
        const toolConfig = {
            configurable: {
                token: sessionToken,
                documentId: docId,
            },
        };

        // We maintain message history across steps via closures
        const finalMessages: any[] = [...historyMessages, new HumanMessage(prompt)];

        const createdFiles: Array<{ fileId: string; title: string }> = [];
        const populatedFileIds = new Set<string>();
        const maxLoops = 15;
        let cumulativeTokens = 0;

        // Keep the first message (main prompt) + the last N messages to avoid context overflow.
        // After 14 loops the context grows so large that the model returns "" → 400 parse error.
        const trimMessages = (msgs: any[], keepRecent = 30) =>
            msgs.length <= keepRecent + 1 ? msgs : [msgs[0], ...msgs.slice(-keepRecent)];

        // ── Main agentic loop — each iteration is a durable Inngest step ──
        for (let loopCount = 0; loopCount < maxLoops; loopCount++) {
            const { toolCalls, shouldBreak, aiMessage, tokensUsed } = await step.run(`arch-loop-${loopCount}`, async () => {
                const res = await aiModel.invoke(trimMessages(finalMessages), toolConfig);
                const usage = (res as any).usage_metadata;
                const total = (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0);
                return {
                    aiMessage: res.toDict(),
                    toolCalls: (res.tool_calls ?? []) as Array<{ id: string; name: string; args: Record<string, any> }>,
                    shouldBreak: !res.tool_calls || res.tool_calls.length === 0,
                    tokensUsed: total,
                };
            });

            finalMessages.push(new AIMessage({ content: (aiMessage as any).kwargs?.content ?? "", tool_calls: toolCalls }));

            if (shouldBreak) break;

            // ── Rate-limit guard for main loop ──
            cumulativeTokens += tokensUsed;
            if (cumulativeTokens >= 600_000) {
                console.log(`[Tokens] Main loop cumulative ${cumulativeTokens} tokens → pausing 60s to avoid TPM limit`);
                // await step.sleep(`rate-limit-main-${loopCount}`, "60s");
                cumulativeTokens = 0;
            } else if (tokensUsed > 0) {
                const delaySec = Math.ceil(tokensUsed / 1000) * 10;
                console.log(`[Tokens] Main loop ${loopCount + 1} used ${tokensUsed} tokens → pausing ${delaySec}s`);
                // await step.sleep(`rate-limit-main-${loopCount}`, `${delaySec}s`);
            }

            console.log(`Executing ${toolCalls.length} arch tool calls (Loop ${loopCount + 1})...`);

            for (const toolCall of toolCalls) {
                const { toolName, toolArgs } = { toolName: toolCall.name, toolArgs: toolCall.args };
                const toolObj = tools.find((t) => t.name === toolName);

                if (!toolObj) {
                    finalMessages.push(new ToolMessage({
                        content: `Error: Tool ${toolName} not found.`,
                        tool_call_id: toolCall.id!,
                        name: toolName,
                    }));
                    continue;
                }

                const result = await step.run(`tool-${loopCount}-${toolCall.id}`, async () => {
                    return await (toolObj as StructuredToolInterface).invoke(toolArgs, toolConfig);
                });

                // Track created files for failsafe
                if (toolName === "create_file" && result && typeof result === "object") {
                    const r = result as any;
                    if (r.success && r.fileId && r.type === "FILE") {
                        createdFiles.push({ fileId: r.fileId, title: toolArgs.title || "Untitled" });
                    }
                }
                if (toolName === "add_database_smart_block" && toolArgs?.fileId) {
                    populatedFileIds.add(toolArgs.fileId);
                }

                // Build explicit ToolMessage so the LLM knows the exact IDs to use next
                let toolResultContent: string;
                if (toolName === "create_file" && result && typeof result === "object") {
                    const r = result as any;
                    if (r.success && r.type === "FILE") {
                        toolResultContent =
                            `✅ File "${r.title}" created successfully.\n` +
                            `fileId = "${r.fileId}"\n` +
                            `⚠️ You MUST now call add_database_smart_block with fileId="${r.fileId}" to populate this file with content.`;
                    } else if (r.success && r.type === "FOLDER") {
                        toolResultContent = `✅ Folder "${r.title}" created successfully.\nfileId = "${r.fileId}"\nUse this as parentId when creating files inside it.`;
                    } else {
                        toolResultContent = `❌ create_file failed: ${r.error}`;
                    }
                } else {
                    toolResultContent = typeof result === "string" ? result : JSON.stringify(result);
                }

                finalMessages.push(new ToolMessage({
                    content: toolResultContent,
                    tool_call_id: toolCall.id!,
                    name: toolName,
                }));
            }
        }

        // ── FAILSAFE: populate any files the LLM forgot ──
        const unpopulatedFiles = createdFiles.filter((f) => !populatedFileIds.has(f.fileId));
        if (unpopulatedFiles.length > 0) {
            console.log(`⚠️ Failsafe: ${unpopulatedFiles.length} file(s) not populated. Running failsafe pass...`);

            const fallbackPrompt = `The following files were created but NOT yet populated with content.
For EACH file below, call add_database_smart_block using the EXACT fileId shown.

Files to populate:
${unpopulatedFiles.map((f) => `- fileId: "${f.fileId}" (file name: "${f.title}")`).join("\n")}

Do NOT skip any of them. Do NOT use raw markdown strings.`;

            finalMessages.push(new HumanMessage(fallbackPrompt));

            for (let fallbackLoop = 0; fallbackLoop < 5; fallbackLoop++) {
                const { fallbackToolCalls, shouldBreak, fallbackAiMessage, fallbackTokensUsed } = await step.run(`arch-failsafe-${fallbackLoop}`, async () => {
                    const res = await aiModel.invoke(trimMessages(finalMessages), toolConfig);
                    const usage = (res as any).usage_metadata;
                    const total = (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0);
                    return {
                        fallbackAiMessage: res.toDict(),
                        fallbackToolCalls: (res.tool_calls ?? []) as Array<{ id: string; name: string; args: Record<string, any> }>,
                        shouldBreak: !res.tool_calls || res.tool_calls.length === 0,
                        fallbackTokensUsed: total,
                    };
                });

                finalMessages.push(new AIMessage({ content: (fallbackAiMessage as any).kwargs?.content ?? "", tool_calls: fallbackToolCalls }));
                if (shouldBreak) break;

                for (const toolCall of fallbackToolCalls) {
                    const { toolName, toolArgs } = { toolName: toolCall.name, toolArgs: toolCall.args as Record<string, any> };
                    const toolObj = tools.find((t) => t.name === toolName);
                    if (!toolObj) continue;

                    const result = await step.run(`tool-failsafe-${fallbackLoop}-${toolCall.id}`, async () => {
                        return await (toolObj as StructuredToolInterface).invoke(toolArgs, toolConfig);
                    });

                    if (toolName === "add_database_smart_block" && toolArgs?.fileId) {
                        populatedFileIds.add(toolArgs.fileId);
                    }

                    finalMessages.push(new ToolMessage({
                        content: typeof result === "string" ? result : JSON.stringify(result),
                        tool_call_id: toolCall.id!,
                        name: toolName,
                    }));
                }

                // ── Rate-limit guard: sleep AFTER tool calls complete ──
                if (fallbackTokensUsed > 0) {
                    const delaySec = Math.ceil(fallbackTokensUsed / 1000) * 10;
                    console.log(`[Tokens] Failsafe ${fallbackLoop + 1} used ${fallbackTokensUsed} tokens → pausing ${delaySec}s to avoid TPM limit`);
                    // await step.sleep(`rate-limit-failsafe-${fallbackLoop}`, `${delaySec}s`);
                }
            }
        }

        console.log(
            `✅ Architecture scaffolded: ${createdFiles.length} file(s) created, ${populatedFileIds.size} populated.`
        );

        return {
            filesCreated: createdFiles.length,
            filesPopulated: populatedFileIds.size,
        };
    }
);
