import { Router } from "express";
import { mcpRouter } from "./mcp";
import { aiRouter } from "./ai";
import { healthRouter } from "./health";
import { inngestRouter } from "./inngest";

export const routes = Router();

routes.use("/ai", aiRouter);
routes.use("/mcp", mcpRouter);
routes.use("/inngest", inngestRouter);


routes.use("/health", healthRouter);
routes.use("/", healthRouter);
