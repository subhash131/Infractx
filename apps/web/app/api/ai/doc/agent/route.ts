import { NextRequest } from "next/server"
import executeDocAgent from "./index";

export const POST = async (req:NextRequest) => {
    const {selectedText, userMessage, docContext, cursorPosition} = await req.json();

   const stream = await executeDocAgent({
        selectedText,
        userMessage,
        docContext,
        cursorPosition,
    })

    const encoder = new TextEncoder();
    
    const responseStream = new ReadableStream({
        async start(controller) {
            try {
                for await (const chunk of stream) {
                    controller.enqueue(encoder.encode(JSON.stringify(chunk) + "\n"));
                }
            } catch (error) {
                console.error("Stream error:", error);
                controller.enqueue(encoder.encode(JSON.stringify({ error: String(error) }) + "\n"));
            } finally {
                controller.close();
            }
        }
    });

    return new Response(responseStream, {
        headers: {
            "Content-Type": "application/x-ndjson",
            "Transfer-Encoding": "chunked"
        },
        duplex: "half"
    } as any)
}