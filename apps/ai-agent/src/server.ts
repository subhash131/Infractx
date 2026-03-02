import "dotenv/config";
import express from "express";
import cors from "cors";
import { port, CORS_ALLOWED_ORIGINS } from "./config";
import { routes } from "./routes";

const app = express();

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(null, CORS_ALLOWED_ORIGINS.has(origin));
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "mcp-session-id",
      "mcp-protocol-version",
      "Accept",
      "Cache-Control",
    ],
    exposedHeaders: ["mcp-session-id"],
  }),
);

app.use(express.json());

/* =========================
   Routes
========================= */

app.use("/", routes);

/* =========================
   Start Server
========================= */

app.listen(port, () => {
  console.log(`🚀 AI Agent server running at http://localhost:${port}`);
});
