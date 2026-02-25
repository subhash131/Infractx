import { Router, Request, Response } from "express";
import { isModelLoaded, embedTexts } from "../model.js";
import { chunkStore, cosineSimilarity } from "../store.js";
import { MatchRequest, MatchResponse, MatchResult, ErrorResponse } from "../types.js";

const router = Router();

router.post(
  "/",
  async (
    req: Request<unknown, MatchResponse | ErrorResponse, MatchRequest>,
    res: Response<MatchResponse | ErrorResponse>
  ) => {
    if (!isModelLoaded()) {
      res.status(503).json({ error: "Model is still loading." });
      return;
    }

    const { query, top_k = 3, include_context = true } = req.body;

    if (!query || typeof query !== "string") {
      res.status(400).json({ error: '"query" must be a non-empty string.' });
      return;
    }
    if (chunkStore.length === 0) {
      res.status(404).json({ error: "Store is empty. Add documents via POST /store first." });
      return;
    }

    try {
      const [queryEmbedding] = await embedTexts([query]);

      const scored = chunkStore
        .map((chunk) => ({
          score: cosineSimilarity(queryEmbedding, chunk.embedding),
          doc_id: chunk.doc_id,
          chunk_index: chunk.index,
          text: chunk.text,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.max(1, top_k));

      const results: MatchResult[] = scored.map((hit) => {
        const result: MatchResult = { ...hit };

        if (include_context) {
          const docChunks = chunkStore.filter((c) => c.doc_id === hit.doc_id);
          const prev = docChunks.find((c) => c.index === hit.chunk_index - 1);
          const next = docChunks.find((c) => c.index === hit.chunk_index + 1);
          result.context = {
            ...(prev ? { before: prev.text } : {}),
            ...(next ? { after: next.text } : {}),
          };
        }

        return result;
      });

      res.json({ query, results });
    } catch (err) {
      const details = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "Match failed.", details });
    }
  }
);

export default router;
