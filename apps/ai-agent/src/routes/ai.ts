import { Router } from "express";
import { docAgentHandler } from "../doc-agent/route";

export const aiRouter = Router();

aiRouter.post("/doc-agent", docAgentHandler);
