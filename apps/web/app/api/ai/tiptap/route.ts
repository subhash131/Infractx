import { createGroq } from "@ai-sdk/groq";
import { streamText } from "ai";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    const result = streamText({
      model: groq("openai/gpt-oss-120b"),
      messages,
    });

    const stream = result.textStream
      .pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            controller.enqueue(JSON.stringify({ content: chunk }) + "\n");
          },
        })
      )
      .pipeThrough(new TextEncoderStream());

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("API Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate content" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}