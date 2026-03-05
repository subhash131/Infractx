import { serve } from "inngest/express";
import { inngest } from "../inngest/client";
import { helloWorld } from "@/inngest/functions/add";
import { architectureHandler } from "@/inngest/functions/architecture";

export const inngestRouter = serve({
  client: inngest,
  functions: [helloWorld, architectureHandler],
});
