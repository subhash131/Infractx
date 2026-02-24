import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { helloWorld, invokeAiDemo } from "@/inngest/function";
import { architectureFunction } from "@/inngest/functions/architecture";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    helloWorld,
    invokeAiDemo,
    architectureFunction,
  ],
});