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

// ─── Request Logger ───────────────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, url, ip } = req;

  console.log(`[req]  --> ${method} ${url}  (ip: ${ip})`);

  res.on("finish", () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    if (status >= 500) {
      console.error(`[res]  ✗  ${method} ${url}  ${status}  ${ms}ms`);
    } else if (status >= 400) {
      console.warn(`[res]  ⚠  ${method} ${url}  ${status}  ${ms}ms`);
    } else {
      console.log(`[res]  <-- ${method} ${url}  ${status}  ${ms}ms`);
    }
  });

  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
console.debug("[server] Registering routes...");
app.use("/health", healthRouter);
app.use("/embed", embedRouter);
app.use("/store", storeRouter);
app.use("/match", matchRouter);
console.debug("[server] Routes registered: /health, /embed, /store, /match");

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  console.warn(`[server] 404 – unknown route: ${req.method} ${req.url}`);
  res.status(404).json({
    error: "Not found.",
    routes: ["GET /health", "POST /embed", "POST /store", "GET /store", "POST /match"],
  });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[server] Unhandled error:", err.message);
  console.error("[server] Stack:", err.stack);
  res.status(500).json({ error: "Internal server error.", details: err.message });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? "8000", 10);
const NODE_ENV = process.env.NODE_ENV ?? "development";

console.debug(`[server] NODE_ENV=${NODE_ENV}, PORT=${PORT}`);
console.log("[server] Loading model...");

loadModel()
  .then(() => {
    console.debug("[server] Model loaded successfully.");
    app.listen(PORT, () => {
      console.log(`[server] ✓ Listening on port ${PORT}`);
      console.log(`[server] Routes: GET /health | POST /embed | POST /store | GET /store | POST /match`);
      console.debug(`[server] Environment: ${NODE_ENV}`);
    });
  })
  .catch((err: Error) => {
    console.error("[model] Failed to load:", err.message);
    console.error("[model] Stack:", err.stack);
    process.exit(1);
  });

export default app;
