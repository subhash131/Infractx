import { Request, Response } from "express";
import { docEditAgent } from "./index";
import { inngest } from "../inngest/client";
import { redis } from "../lib/redis";

// ─── Shared Redis polling helper ────────────────────────────────────────────
// Polls `streamKey` every second, piping each message to the SSE response.
// Stops (and ends the response) when a "done" or "error" message arrives.
function pipeRedisToSSE(
    streamKey: string,
    res: Response,
    req: Request,
    pushToStream: (payload: any) => void,
) {
    let lastOffset = 0;
    const pollInterval = setInterval(async () => {
        try {
            const items = await redis.lrange(streamKey, lastOffset, -1);
            if (items && items.length > 0) {
                for (const item of items) {
                    const parsed = typeof item === "string" ? JSON.parse(item) : item;
                    pushToStream(parsed);

                    if (parsed.type === "done" || parsed.type === "error") {
                        clearInterval(pollInterval);
                        await redis.del(streamKey);
                        res.end();
                        return;
                    }
                }
                lastOffset += items.length;
            }
        } catch (err) {
            console.error("Error polling background stream:", err);
            clearInterval(pollInterval);
            pushToStream({ type: "error", error: "Lost connection to background process." });
            pushToStream({ type: "done" });
            res.end();
        }
    }, 1000);

    req.on('close', () => { clearInterval(pollInterval); });
}

export const docAgentHandler = async (req: Request, res: Response) => {
    const {selectedText, userMessage, docContext, cursorPosition, projectId, conversationId, source, docId, fileId, sessionToken} = req.body;
    console.log({docContext,cursorPosition, projectId, conversationId, source, docId, sessionToken});
    
    // Establish a Redis key for this conversation's background stream
    const streamKey = `agent:stream:${conversationId || docId}`;

    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Helper to push to SSE directly
    const pushToStream = (payload: any) => {
        res.write(`${JSON.stringify(payload)}\n`);
    };

    // ── Architecture reply types bypass LangGraph entirely ───────────────────
    // These are follow-up messages in an ongoing architecture session.
    // We don't need to re-run the agent — just fire the right Inngest event
    // and poll Redis for the Inngest function's response.
    const replyType = req.body.replyType as string | undefined;

    if (replyType === "answer") {
        const { answer } = req.body as { answer: string };
        await redis.del(streamKey);
        await inngest.send({
            name: "doc/architecture.answered",
            data: { docId, answer, sessionToken },
        });
        pipeRedisToSSE(streamKey, res, req, pushToStream);
        return;
    }

    if (replyType === "approve") {
        await redis.del(streamKey);
        await inngest.send({
            name: "doc/architecture.approved",
            data: { docId, sessionToken },
        });
        pushToStream({
            type: "response",
            response: {
                operations: [{
                    type: "chat_response",
                    content: "🚀 Plan approved! Creating all files and content now. This may take a minute...",
                }]
            }
        });
        pipeRedisToSSE(streamKey, res, req, pushToStream);
        return;
    }

    if (replyType === "reject") {
        const { getConvexClient } = await import("./convex-client");
        const { api } = await import("@workspace/backend/_generated/api");
        const client = getConvexClient(sessionToken);
        await client.mutation(
            api.requirements.architectureSessions.deleteSession,
            { docId }
        );
        pushToStream({
            type: "response",
            response: {
                operations: [{
                    type: "chat_response",
                    content: "Got it! The plan has been cleared. Feel free to describe your system again and I'll ask better questions.",
                }]
            }
        });
        pushToStream({ type: "done" });
        res.end();
        return;
    }

    // ── Normal LangGraph agent flow ──────────────────────────────────────────
    try {
        // Clear old stream if any
        await redis.del(streamKey);

        const events = await docEditAgent.streamEvents({
            selectedText,
            userMessage,
            docContext: docContext ?? "",
            cursorPosition: cursorPosition ?? 0,
            projectId: projectId || "",
            conversationId: conversationId || undefined,
            source: source || 'ui',
            docId,
            fileId: fileId || "",
            sessionToken,
            intent: null,
            extractedData: null,
            confidence: 0,
            operations: [],
            targetFileIds: [],
            fetchedContext: "",
            error: undefined
        }, { 
            version: "v2",
            configurable: { 
                token: sessionToken,
                thread_id: conversationId || docId || "default"
            }
        });

        for await (const event of events) {
            // Log tool and agent activity
            if (["on_tool_start", "on_tool_end"].includes(event.event)) {
                console.log(`🔨 [${event.event}] ${event.name}`);
            }
            if (["on_chain_start", "on_chain_end"].includes(event.event) && event.name !== "LangGraph" && !event.name.startsWith("__")) {
                console.log(`🤖 [${event.event}] ${event.name}`);
            }

            if (event.event === "on_chain_end") {
                if (event.name === "classifyIntent" && event.data?.output?.intent) {
                    const intent = event.data.output.intent;
                    console.log("Sending Intent:", intent);
                    pushToStream({ type: "intent", intent });

                    // ── Architecture intent: start the Q&A flow ──
                    if (intent === "architecture") {
                        await inngest.send({
                            name: "doc/architecture.requested",
                            data: { docId, userMessage, sessionToken, conversationId, streamKey },
                        });
                        pushToStream({
                            type: "response",
                            response: {
                                operations: [{
                                    type: "chat_response",
                                    content: "🏛️ Let me ask you a few questions to design the perfect architecture for you!",
                                }]
                            }
                        });

                        // Pipe the Inngest background response back to the SSE stream
                        pipeRedisToSSE(streamKey, res, req, pushToStream);
                        return; // Stop iterating the LangGraph event loop
                    }
                }
            }

            if (event.event === "on_chat_model_stream") {
                const chunk = event.data?.chunk;
                const token = chunk?.content;
                
                // Only stream chat responses to the frontend.
                if (event.tags?.includes("chat_stream")) {
                    if (token) pushToStream({ type: "chat_token", content: token });
                }
            }
            else if (event.event === "on_chain_end" && event.name === "LangGraph") {
                if (event.data?.output) {
                    if (event.data.output.__interrupt__) {
                        pushToStream({
                            type: "interrupt",
                            payload: event.data.output.__interrupt__
                        });
                    }
                    else if (event.data.output.operations) {
                        pushToStream({ 
                            type: "response",
                            response: { operations: event.data.output.operations } 
                        });
                    }
                }
            }
        }
        
        // Signal the frontend that the regular stream is complete
        pushToStream({ type: "done" });
        res.end();

    } catch (e: any) {
        if (e.name === "GraphInterrupt") {
            console.log("Graph interrupted");
            pushToStream({
                type: "interrupt",
                payload: e.interrupts[0].value
            });
            pushToStream({ type: "done" });
            res.end();
            return;
        }
        
        console.error("Streaming error:", e);
        pushToStream({ type: "error", error: String(e) });
        pushToStream({ type: "done" });
        res.end();
        return;
    }
}
