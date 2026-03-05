import { serve } from "inngest/express";
import { inngest } from "../inngest/client";
import { helloWorld } from "@/inngest/functions/add";
import {
  architectureRequestedHandler,
  architectureAnsweredHandler,
  architecturePlanRequestedHandler,
  architectureApprovedHandler,
} from "@/inngest/functions/architecture";

export const inngestRouter = serve({
  client: inngest,
  functions: [
    helloWorld,
    architectureRequestedHandler,
    architectureAnsweredHandler,
    architecturePlanRequestedHandler,
    architectureApprovedHandler,
  ],
});
