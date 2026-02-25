import { Router, Request, Response } from "express";
import { isModelLoaded, MODEL_NAME } from "../model.js";
import { docStore, chunkStore } from "../store.js";
import { HealthResponse } from "../types.js";

const router = Router();

router.get("/", (_req: Request, res: Response<HealthResponse>) => {
  res.json({
    status: isModelLoaded() ? "ok" : "loading",
    model_loaded: isModelLoaded(),
    model: MODEL_NAME,
    store: { docs: docStore.size, chunks: chunkStore.length },
  });
});

export default router;
