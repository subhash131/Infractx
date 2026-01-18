"use node";

import { AgentState } from "./state";

export function parseJSON(text: string): unknown {
  const original = text;

  try {
    // Remove code fences
    const cleaned = text
      .replace(/```(?:json)?/gi, "")
      .replace(/```/g, "")
      .trim();

    const start = cleaned.search(/[\[{]/);
    if (start === -1) throw new Error("No JSON start found");

    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = start; i < cleaned.length; i++) {
      const char = cleaned[i];

      if (inString) {
        if (escape) {
          escape = false;
        } else if (char === "\\") {
          escape = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
      } else if (char === "{" || char === "[") {
        depth++;
      } else if (char === "}" || char === "]") {
        depth--;
        if (depth === 0) {
          const jsonStr = cleaned.slice(start, i + 1);
          return JSON.parse(jsonStr);
        }
      }
    }

    throw new Error("Unbalanced JSON structure");
  } catch (err) {
    console.error("[parseJSON] Failed");
    console.error("Raw:", original.slice(0, 500));
    throw err;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateUniqueId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function log(
  state: AgentState,
  level: "info" | "warn" | "error",
  message: string,
) {
  const prefix = level === "error" ? "✗" : level === "warn" ? "⚠" : "✓";
  if (state.verbose || level !== "info") {
    console.log(`${prefix} ${message}`);
  }
}
