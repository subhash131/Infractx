import { randomUUID } from "node:crypto";
import { Router, Request, Response } from "express";
import { isModelLoaded, embedTexts } from "../model.js";
import { docStore, chunkStore, upsertChunks } from "../store.js";
import { chunkText } from "../chunker.js";
import { StoreRequest, StoreResponse, ErrorResponse } from "../types.js";

const router = Router();

// POST /store — ingest a document, auto-chunk, embed, and save
router.post(
  "/",
  async (
    req: Request<unknown, StoreResponse | ErrorResponse, StoreRequest>,
    res: Response<StoreResponse | ErrorResponse>
  ) => {
    if (!isModelLoaded()) {
      res.status(503).json({ error: "Model is still loading." });
      return;
    }

    const { text, chunk_words = 250, overlap_words = 50 } = req.body;
    const id = req.body.id || randomUUID();

    if (!text || typeof text !== "string") {
      res.status(400).json({ error: '"text" must be a non-empty string.' });
      return;
    }

    try {
      const chunks = chunkText(text, chunk_words, overlap_words);
      const embeddings = await embedTexts(chunks.map((c) => c.text));

      upsertChunks(
        id,
        chunks.map((chunk, i) => ({ ...chunk, doc_id: id, embedding: embeddings[i] }))
      );

      docStore.set(id, {
        id,
        chunk_count: chunks.length,
        added_at: new Date().toISOString(),
      });

      console.log(`[store] doc="${id}" → ${chunks.length} chunks`);

      res.json({
        doc_id: id,
        chunks_added: chunks.length,
        total_chunks: chunkStore.length,
        total_docs: docStore.size,
      });
    } catch (err) {
      const details = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "Failed to store document.", details });
    }
  }
);

// GET /store — list all documents with their chunks (no embeddings returned)
router.get("/", (_req: Request, res: Response) => {
  const docs = [...docStore.values()].map(({ id, chunk_count, added_at }) => ({
    id,
    chunk_count,
    added_at,
    chunks: chunkStore
      .filter((c) => c.doc_id === id)
      .map(({ text, index }) => ({ index, text })),
  }));
  res.json({ total_docs: docStore.size, total_chunks: chunkStore.length, docs });
});

export default router;
