import { inngest } from "@/inngest/client";
import { streamBus } from "@/inngest/function";

// api/inngest/stream/trigger/route.ts
export async function POST(req: Request) {
  const { sessionId } = await req.json();
  
  // Wait for SSE listener to be ready (with timeout)
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, 100); // Fallback after 100ms
    
    const readyHandler = () => {
      clearTimeout(timeout);
      streamBus.off(`stream:${sessionId}:ready`, readyHandler);
      resolve();
    };
    
    streamBus.once(`stream:${sessionId}:ready`, readyHandler);
  });

  console.log("triggering inngest", sessionId);
  await inngest.send({
    name: 'test/invoke.ai.demo',
    data: { sessionId },
  });

  return Response.json({ ok: true });
}