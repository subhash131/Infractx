import { Request, Response } from "express";
import { docEditAgent } from "./index";
import { inngest } from "../inngest/client";

export const docAgentHandler = async (req: Request, res: Response) => {
    const {selectedText, userMessage, docContext, cursorPosition, projectId, conversationId, source, docId, fileId, sessionToken} = req.body;
    console.log({docContext,cursorPosition, projectId, conversationId, source, docId, sessionToken})

    // Set headers for Server-Sent Events (SSE)
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Helper to send SSE chunks
    const sendSSE = (payload: any) => {
        try {
            res.write(`data: ${JSON.stringify(payload)}\n\n`);
        } catch (e) {
            console.error("SSE write error:", e);
        }
    };

    try {
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
            if (event.event === "on_chain_end") {
                 if (event.name === "classifyIntent" && event.data?.output?.intent) {
                    const intent = event.data.output.intent;
                    console.log("Sending Intent:", intent);
                    sendSSE({ type: "intent", intent });

                    // ── Architecture intent: offload to Inngest ──
                    if (intent === "architecture") {
                        await inngest.send({
                            name: "doc/architecture.requested",
                            data: { docId, userMessage, sessionToken, cursorPosition: cursorPosition ?? 0 },
                        });
                        sendSSE({
                            type: "response",
                            response: {
                                operations: [{
                                    type: "chat_response",
                                    position: cursorPosition ?? 0,
                                    content: "🏛️ Scaffolding your architecture in the background. Files and content will appear automatically as they're created!"
                                }]
                            }
                        });
                        sendSSE({ type: "done" });
                        res.end();
                        return;
                    }
                 }
            }
            if (event.event === "on_chat_model_stream") {
                const chunk = event.data?.chunk;
                const token = chunk?.content;
                
                if (event.tags?.includes("generate_title")) {
                    if (token) sendSSE({ type: "title", content: token });
                }
                else if (event.tags?.includes("chat_stream")) {
                    if (token) sendSSE({ type: "chat_token", content: token });
                }
                else if (event.tags?.includes("doc_stream") || event.tags?.includes("streamable")) {
                    if (token) sendSSE({ type: "doc_token", content: token });
                }
            }
            else if (event.event === "on_chain_end" && event.name === "LangGraph") {
                if (event.data?.output) {
                    if (event.data.output.__interrupt__) {
                         sendSSE({
                             type: "interrupt",
                             payload: event.data.output.__interrupt__
                         });
                    }
                    else if (event.data.output.operations) {
                        sendSSE({ 
                            type: "response",
                            response: { operations: event.data.output.operations } 
                        });
                    }
                }
            }
        }
        
        // Signal the frontend that the stream is complete
        sendSSE({ type: "done" });
        res.end();

    } catch (e: any) {
        if (e.name === "GraphInterrupt") {
             console.log("Graph interrupted");
             sendSSE({
                 type: "interrupt",
                 payload: e.interrupts[0].value
             });
             sendSSE({ type: "done" });
             res.end();
             return;
        }
        
        console.error("Streaming error:", e);
        sendSSE({ type: "error", error: String(e) });
        sendSSE({ type: "done" });
        res.end();
        return;
    }
}
