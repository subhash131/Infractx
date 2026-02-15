import { NextRequest, NextResponse } from "next/server"
import { docEditAgent } from "./index";

export const POST = async (req:NextRequest) => {
    const {selectedText, userMessage, docContext, cursorPosition} = await req.json();

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
        async start(controller) {
            try {
                const events = await docEditAgent.streamEvents({
                    selectedText,
                    userMessage,
                    docContext,
                    cursorPosition,
                    intent: null,
                    extractedData: null,
                    confidence: 0,
                    operations: [],
                    error: undefined
                }, { version: "v2" });

                for await (const event of events) {
                    console.log("Event:", event.event, event.name);

                    if (event.event === "on_chain_end") {
                         if (event.name === "classifyIntent" && event.data?.output?.intent) {
                            console.log("Sending Intent:", event.data.output.intent);
                            console.log("Sending Intent Payload...");
                            controller.enqueue(encoder.encode(JSON.stringify({ 
                                type: "intent", 
                                intent: event.data.output.intent 
                            }) + "\n"));
                         }
                    }
                    if (event.event === "on_chat_model_stream" && event.tags?.includes("streamable")) {
                        const chunk = event.data?.chunk;
                        // console.log("Stream Chunk:", JSON.stringify(chunk, null, 2));
                        const token = chunk?.content;
                        if (token) {
                            console.log("Sending Token:", token);
                            controller.enqueue(encoder.encode(JSON.stringify({ type: "token", content: token }) + "\n"));
                        }
                    }
                    else if (event.event === "on_chain_end" && event.name === "LangGraph") {
                        if (event.data?.output && event.data.output.operations) {
                            const payload = JSON.stringify({ 
                                type: "response",
                                response: { operations: event.data.output.operations } 
                            }) + "\n";
                            console.log("Sending Final Response Payload...");
                            controller.enqueue(encoder.encode(payload));
                        }
                    }
                }
                controller.close();
            } catch (e) {
                console.error("Streaming error:", e);
                controller.error(e);
            }
        }
    });

    return new NextResponse(stream, {
        headers: {
            "Content-Type": "application/x-ndjson",
            "Transfer-Encoding": "chunked"
        }
    })
}
