import { Request, Response } from "express";
import { redis } from "@/lib/redis";

export const docAgentPollHandler = async (req: Request, res: Response) => {
    const conversationId = req.query.conversationId as string;
    const docId = req.query.docId as string;
    const offsetParam = req.query.offset as string;

    const targetId = conversationId || docId;

    if (!targetId) {
        res.status(400).json({ error: "Missing conversationId or docId" });
        return;
    }

    const offset = parseInt(offsetParam || "0", 10);
    const streamKey = `agent:stream:${targetId}`;

    try {
        // Read new items from the list
        // LRANGE is inclusive. If offset is 5, and there are 5 elements (0-4), 
        // lrange(5, -1) returns [] in Redis.
        const items = await redis.lrange(streamKey, offset, -1);
        
        let parsedItems = items;
        // Ensure they are objects (Upstash sometimes auto-parses, but if we stringified explicitly we might need to parse)
        if (items.length > 0 && typeof items[0] === 'string') {
            parsedItems = items.map((item: any) => {
                try {
                    return JSON.parse(item);
                } catch {
                    return item;
                }
            });
        }

        res.status(200).json({
            items: parsedItems,
            nextOffset: offset + items.length
        });
    } catch (e) {
        console.error("Poll error:", e);
        res.status(500).json({ error: "Failed to poll stream" });
    }
}
