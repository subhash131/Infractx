import { streamBus } from "@/inngest/function";

// api/inngest/stream/[sessionId]/route.ts
export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      const listener = (data: any) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
          
          if (data.type === 'done' || data.type === 'error') {
            cleanup();
          }
        } catch (err) {
          cleanup();
        }
      };

      const cleanup = () => {
        streamBus.off(`stream:${sessionId}`, listener);
        try {
          controller.close();
        } catch (e) {
          // Already closed
        }
      };

      // Register listener
      streamBus.on(`stream:${sessionId}`, listener);

      // Send ready signal so trigger knows listener is ready
      streamBus.emit(`stream:${sessionId}:ready`, {});

      // Cleanup on abort
      req.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}