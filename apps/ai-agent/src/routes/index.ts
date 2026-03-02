import { Router } from "express";
import { mcpRouter } from "./mcp";
import { aiRouter } from "./ai";
import { healthRouter } from "./health";

export const routes = Router();

routes.use("/mcp", mcpRouter);
routes.use("/ai", aiRouter);
routes.use("/health", healthRouter);
routes.use("/", healthRouter);
