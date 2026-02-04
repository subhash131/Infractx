import { createGroq  } from "@ai-sdk/groq";
import { convertToModelMessages, streamText } from "ai";
import {
  aiDocumentFormats,
  injectDocumentStateMessages,
  toolDefinitionsToToolSet,
} from "@blocknote/xl-ai/server";
import { NextRequest } from "next/server";


const groq = createGroq({
  apiKey: "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",
});

export async function POST(req: NextRequest) {
  const { messages, toolDefinitions } = await req.json();
  console.log({messages});

  const result = streamText({
    model: groq("openai/gpt-oss-120b"), 
    system: aiDocumentFormats.html.systemPrompt,
    messages: await convertToModelMessages(
      injectDocumentStateMessages(messages),
    ),
    tools: toolDefinitionsToToolSet(toolDefinitions),
    toolChoice: "required",
  });

  return result.toUIMessageStreamResponse();
}