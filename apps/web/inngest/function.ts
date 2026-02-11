import { groqModel } from "@/app/api/ai/tiptap/route";
import { inngest } from "./client";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    await step.sleep("wait-a-moment", "1s");
    return { message: `Hello ${event.data.email}!` };
  },
);

import { EventEmitter } from 'events';

class StreamEventBus extends EventEmitter {
  private static instance: StreamEventBus;

  private constructor() {
    super();
    this.setMaxListeners(0); // unlimited listeners
  }

  static getInstance(): StreamEventBus {
    if (!StreamEventBus.instance) {
      StreamEventBus.instance = new StreamEventBus();
    }
    return StreamEventBus.instance;
  }
}

export const streamBus = StreamEventBus.getInstance();


export const invokeAiDemo = inngest.createFunction(
  { id: "invoke-ai-demo" },
  { event: "test/invoke.ai.demo" },
  async ({ step, event }): Promise<any> => {
    const { sessionId } = event.data;
    
    return await step.run("stream-ai", async () => {
      console.log("streaming ai")
      const {stream} = await groqModel("openai/gpt-oss-120b").doStream({
        prompt: [{
          content: [{ text: "write a poem on ai", type: "text" }],
          role: "user",
        }]
      });

      const reader = stream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          // Emit to event bus
          streamBus.emit(`stream:${sessionId}`, {
            type: 'chunk',
            data: value,
          });
        }
      } finally {
        reader.releaseLock();
      }

      // Done
      streamBus.emit(`stream:${sessionId}`, {
        type: 'done',
      });
    });
  },
);