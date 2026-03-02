import { Router } from "express";
import { docAgentHandler } from "../doc-agent/route";
import { docAgentPollHandler } from "../doc-agent/poll/route";

export const aiRouter = Router();

aiRouter.post("/doc-agent", docAgentHandler);
aiRouter.get("/doc-agent/poll", docAgentPollHandler);
