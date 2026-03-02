import { Request, Response } from "express";
import { docEditAgent } from "./index";
import { inngest } from "../inngest/client";
import { redis } from "../lib/redis";

export const docAgentHandler = async (req: Request, res: Response) => {
    const {selectedText, userMessage, docContext, cursorPosition, projectId, conversationId, source, docId, fileId, sessionToken} = req.body;
    console.log({docContext,cursorPosition, projectId, conversationId, source, docId, sessionToken})
    
    // Establish a Redis key for this conversation's stream
    const streamKey = `agent:stream:${conversationId || docId}`;

    // Helper to push to Redis
    const pushToRedis = async (payload: any) => {
        try {
            await redis.rpush(streamKey, JSON.stringify(payload));
            // Extend expiry to 1 hour so the frontend has plenty of time to read it
            await redis.expire(streamKey, 3600);
        } catch (e) {
            console.error("Redis push error:", e);
        }
    };

    // We do NOT return a stream. We just run the process and await it.
    // The frontend will fire-and-forget this POST request (or wait for it to just finish)
    // and simultaneously poll the Redis endpoint.
    
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
                    await pushToRedis({ type: "intent", intent });

                    // ── Architecture intent: offload to Inngest ──
                    if (intent === "architecture") {
                        await inngest.send({
                            name: "doc/architecture.requested",
                            data: { docId, userMessage, sessionToken, cursorPosition: cursorPosition ?? 0 },
                        });
                        await pushToRedis({
                            type: "response",
                            response: {
                                operations: [{
                                    type: "chat_response",
                                    position: cursorPosition ?? 0,
                                    content: "🏛️ Scaffolding your architecture in the background. Files and content will appear automatically as they're created!"
                                }]
                            }
                        });
                        await pushToRedis({ type: "done" });
                        res.status(200).json({ success: true, message: "Architecture task initiated" });
                        return;
                    }
                 }
            }
            if (event.event === "on_chat_model_stream") {
                const chunk = event.data?.chunk;
                const token = chunk?.content;
                
                if (event.tags?.includes("generate_title")) {
                    if (token) await pushToRedis({ type: "title", content: token });
                }
                else if (event.tags?.includes("chat_stream")) {
                    if (token) await pushToRedis({ type: "chat_token", content: token });
                }
                else if (event.tags?.includes("doc_stream") || event.tags?.includes("streamable")) {
                    if (token) await pushToRedis({ type: "doc_token", content: token });
                }
            }
            else if (event.event === "on_chain_end" && event.name === "LangGraph") {
                if (event.data?.output) {
                    if (event.data.output.__interrupt__) {
                         await pushToRedis({
                             type: "interrupt",
                             payload: event.data.output.__interrupt__
                         });
                    }
                    else if (event.data.output.operations) {
                        await pushToRedis({ 
                            type: "response",
                            response: { operations: event.data.output.operations } 
                        });
                    }
                }
            }
        }
        
        // Signal the frontend that the stream is complete
        await pushToRedis({ type: "done" });

    } catch (e: any) {
        if (e.name === "GraphInterrupt") {
             console.log("Graph interrupted");
             await pushToRedis({
                 type: "interrupt",
                 payload: e.interrupts[0].value
             });
             await pushToRedis({ type: "done" });
             res.status(200).json({ success: true, message: "Interrupted" });
             return;
        }
        
        console.error("Streaming error:", e);
        await pushToRedis({ type: "error", error: String(e) });
        await pushToRedis({ type: "done" });
        res.status(500).json({ success: false, error: String(e) });
        return;
    }

    res.status(200).json({ success: true });
}
