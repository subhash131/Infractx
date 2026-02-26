import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

import { loadModel } from "./model.js";
import healthRouter from "./routes/health.js";
import embedRouter from "./routes/embed.js";
import storeRouter from "./routes/store.js";
import matchRouter from "./routes/match.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/health", healthRouter);
app.use("/embed", embedRouter);
app.use("/store", storeRouter);
app.use("/match", matchRouter);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: "Not found.",
    routes: ["GET /health", "POST /embed", "POST /store", "GET /store", "POST /match"],
  });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[server] Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error.", details: err.message });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? "8000", 10);

loadModel()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[server] http://localhost:${PORT}`);
      console.log(`[server] GET /health | POST /embed | POST /store | GET /store | POST /match`);
    });
  })
  .catch((err: Error) => {
    console.error("[model] Failed to load:", err.message);
    process.exit(1);
  });

export default app;
