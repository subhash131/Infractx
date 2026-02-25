import { Router, Request, Response } from "express";
import { isModelLoaded, embedTexts, MODEL_NAME } from "../model.js";
import { EmbedRequest, EmbedResponse, ErrorResponse } from "../types.js";

const router = Router();

router.post(
  "/",
  async (
    req: Request<unknown, EmbedResponse | ErrorResponse, EmbedRequest>,
    res: Response<EmbedResponse | ErrorResponse>
  ) => {
    if (!isModelLoaded()) {
      res.status(503).json({ error: "Model is still loading." });
      return;
    }

    const { input } = req.body;
    if (!input || (typeof input !== "string" && !Array.isArray(input))) {
      res.status(400).json({ error: '"input" must be a string or string[].' });
      return;
    }

    const texts = Array.isArray(input) ? input : [input];

    try {
      const embeddings = await embedTexts(texts);
      const tokens = texts.reduce((s, t) => s + t.split(/\s+/).length, 0);
      res.json({
        object: "list",
        model: MODEL_NAME,
        embeddings,
        usage: { prompt_tokens: tokens, total_tokens: tokens },
      });
    } catch (err) {
      const details = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "Embedding failed.", details });
    }
  }
);

export default router;
