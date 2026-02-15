import { NextRequest, NextResponse } from "next/server";

const wait =() =>{
    return new Promise(r => setTimeout(r, 100));
}

export const POST = async (req: NextRequest) => {
  const { content } = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // First block - send immediately
      const firstBlock = JSON.stringify({ type: "smartBlock", text: content }) + "\n";
      controller.enqueue(encoder.encode(firstBlock));

      // Wait 1 second, then send second block
      await wait()
      const secondBlock = JSON.stringify({ type: "paragraph", text: "this " }) + "\n";
      controller.enqueue(encoder.encode(secondBlock));
      await wait()
      const thridBlock = JSON.stringify({ type: "paragraph", text: "is " }) + "\n";
      controller.enqueue(encoder.encode(thridBlock));
      await wait()
      const fourthBlock = JSON.stringify({ type: "paragraph", text: "a " }) + "\n";
      controller.enqueue(encoder.encode(fourthBlock));
      await wait()
      const fifthBlock = JSON.stringify({ type: "paragraph", text: "demo." }) + "\n";
      controller.enqueue(encoder.encode(fifthBlock));
      const newLine = JSON.stringify({ type: "paragraph", text: "\n" }) + "\n";
      controller.enqueue(encoder.encode(newLine));
      const endSmartBlock = JSON.stringify({ type: "smartBlock", text: "end", status:"done" }) + "\n";
      controller.enqueue(encoder.encode(endSmartBlock));
      
      controller.close();
    }
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/x-ndjson"
    }
  });
};