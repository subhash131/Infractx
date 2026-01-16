"use node";
export function parseJSON(text: string): any {
  try {
    let cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Ensure it starts with [ or {
    if (!cleaned.startsWith("[") && !cleaned.startsWith("{")) {
      // Try to find JSON in the text
      const jsonMatch = cleaned.match(/(\[[\s\S]*\])|(\{[\s\S]*\})/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      } else {
        throw new Error("No valid JSON found in response");
      }
    }

    return JSON.parse(cleaned);
  } catch (error) {
    console.error("[parseJSON] Failed to parse:", text.substring(0, 500));
    console.error("[parseJSON] Error:", error);
    throw new Error(`JSON parsing failed: ${error}`);
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateUniqueId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
