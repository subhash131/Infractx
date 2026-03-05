import { Request, Response } from "express";
import { docEditAgent } from "./index";
import { inngest } from "../inngest/client";
import { redis } from "../lib/redis"; // Used for publishing, need a new instance for subscribing
import { Redis } from '@upstash/redis';

// Create a dedicated Redis subscriber client Since Upstash REST is stateless,
// we just poll it natively or use their specialized subscriber if available.
// However, Upstash REST does NOT natively support long-lived Pub/Sub connections. 
// We will simulate it via an expiring key polling loop, OR we can just use normal Upstash 
// polling but keep the HTTP connection alive and pipe it to SSE.

export const docAgentHandler = async (req: Request, res: Response) => {
    const {selectedText, userMessage, docContext, cursorPosition, projectId, conversationId, source, docId, fileId, sessionToken} = req.body;
    console.log({docContext,cursorPosition, projectId, conversationId, source, docId, sessionToken})
    
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

                    // ── Architecture intent: offload to Inngest ──
                    if (intent === "architecture") {
                        await inngest.send({
                            name: "doc/architecture.requested",
                            data: { docId, userMessage, sessionToken, cursorPosition: cursorPosition ?? 0 },
                        });
                        pushToStream({
                            type: "response",
                            response: {
                                operations: [{
                                    type: "chat_response",
                                    position: cursorPosition ?? 0,
                                    content: "🏛️ Scaffolding your architecture in the background. Files and content will appear automatically as they're created!"
                                }]
                            }
                        });

                        // Start piping the background stream to the open SSE connection
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
                        }, 1000); // Check Redis every second

                        // Clean up if the user closes the connection early
                        req.on('close', () => {
                            clearInterval(pollInterval);
                        });

                        return; // Exit the loop, leaving the SSE stream open
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
