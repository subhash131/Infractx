
import { NextRequest, NextResponse } from "next/server"
import { docEditAgent } from "./index";

export const POST = async (req:NextRequest) => {
    const {selectedText, userMessage, docContext, cursorPosition, projectId, source, token} = await req.json();
    console.log({docContext,cursorPosition, projectId, source})
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
        async start(controller) {
            try {
                // If this is a resume from interrupt (e.g. valid input for project selection), 
                // we might need a different entry point or state update.
                // For now assuming simplified single-shot or handled via different route if doing true resume.
                // But `docEditAgent` execution with interrupt support usually needs a thread/checkpoint.
                // Since this is stateless request/response, we're doing a lightweight version where `identifyProject` 
                // *returns* the options and ends. The frontend re-submits with the selected ID.
                
                const events = await docEditAgent.streamEvents({
                    selectedText,
                    userMessage,
                    docContext,
                    projectId: projectId || "",
                    source: source || 'ui',
                    intent: null,
                    extractedData: null,
                    confidence: 0,
                    operations: [],
                    targetFileIds: [],
                    fetchedContext: "",
                    error: undefined
                }, { 
                    version: "v2",
                    configurable: { token }
                });

                for await (const event of events) {
                    if (event.event === "on_chain_end") {
                         if (event.name === "classifyIntent" && event.data?.output?.intent) {
                            console.log("Sending Intent:", event.data.output.intent);
                            controller.enqueue(encoder.encode(JSON.stringify({ 
                                type: "intent", 
                                intent: event.data.output.intent 
                            }) + "\n"));
                         }
                    }
                    if (event.event === "on_chat_model_stream") {
                        const chunk = event.data?.chunk;
                        const token = chunk?.content;
                        
                        if (event.tags?.includes("generate_title")) {
                            if (token) {
                                controller.enqueue(encoder.encode(JSON.stringify({ type: "title", content: token }) + "\n"));
                            }
                        }
                        else if (event.tags?.includes("chat_stream")) {
                            if (token) {
                                controller.enqueue(encoder.encode(JSON.stringify({ type: "chat_token", content: token }) + "\n"));
                            }
                        }
                        else if (event.tags?.includes("doc_stream") || event.tags?.includes("streamable")) {
                            if (token) {
                                controller.enqueue(encoder.encode(JSON.stringify({ type: "doc_token", content: token }) + "\n"));
                            }
                        }
                    }
                    // Handle Interrupts (if we were using checkpointers, but here we just catch the return value)
                    // Since this is a simple graph run, the interrupt function throws a special exception 
                    // that suspends the graph. 
                    // However, `interrupt` function from LangGraph is designed for persistent checkpointers.
                    // For this stateless HTTP route, we should probably modify `identifyProject` 
                    // to just RETURN a special operation type "request_user_input" instead of using `interrupt()`.
                    // But if we want to stick to the plan of using `interrupt`, we need checkpointers.
                    // Given the constraint of the current stateless setup, I'll assume we catch the output if it ends early.
                    
                    else if (event.event === "on_chain_end" && event.name === "LangGraph") {
                        if (event.data?.output) {
                            // Detect interrupt signal if we returned it as a special object/error
                            if (event.data.output.__interrupt__) {
                                 const payload = JSON.stringify({
                                     type: "interrupt",
                                     payload: event.data.output.__interrupt__
                                 }) + "\n";
                                 controller.enqueue(encoder.encode(payload));
                            }
                            else if (event.data.output.operations) {
                                const payload = JSON.stringify({ 
                                    type: "response",
                                    response: { operations: event.data.output.operations } 
                                }) + "\n";
                                controller.enqueue(encoder.encode(payload));
                            }
                        }
                    }
                }
                controller.close();
            } catch (e: any) {
                // If using actual LangGraph interrupt, it might throw a GraphInterrupt error
                if (e.name === "GraphInterrupt") {
                     // Checkpointer needed for true interrupt.
                     // Fallback: Use manual return in the nodes for now.
                     console.log("Graph interrupted");
                     const payload = JSON.stringify({
                         type: "interrupt",
                         payload: e.interrupts[0].value
                     }) + "\n";
                     controller.enqueue(encoder.encode(payload));
                     controller.close();
                     return;
                }
                
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
