import { MemorySaver } from "@langchain/langgraph";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";

// ── Helpers for Uint8Array ↔ Base64 round-tripping through JSON ──

const UINT8_TAG = "__uint8array__";

/** JSON.stringify replacer: encodes Uint8Array as base64 with a tag. */
function jsonReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Uint8Array) {
    return { [UINT8_TAG]: Buffer.from(value).toString("base64") };
  }
  return value;
}

/** JSON.parse reviver: restores tagged base64 strings back to Uint8Array. */
function jsonReviver(_key: string, value: unknown): unknown {
  if (
    value !== null &&
    typeof value === "object" &&
    UINT8_TAG in (value as Record<string, unknown>)
  ) {
    const b64 = (value as Record<string, string>)[UINT8_TAG]!;
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  return value;
}

/**
 * A persistent checkpointer that extends MemorySaver with JSON file storage.
 *
 * Uses MemorySaver's in-memory logic for fast reads, and flushes to a JSON
 * file after every write (`put` / `putWrites`) so state survives restarts.
 *
 * This avoids native C++ modules (better-sqlite3) that break with Turbopack.
 */
export class JsonFileSaver extends MemorySaver {
  private filePath: string;

  constructor(filePath: string) {
    super();
    this.filePath = filePath;
    this._loadFromDisk();
  }

  /** Override put to persist after writes */
  async put(...args: Parameters<MemorySaver["put"]>) {
    const result = await super.put(...args);
    this._saveToDisk();
    return result;
  }

  /** Override putWrites to persist after writes */
  async putWrites(...args: Parameters<MemorySaver["putWrites"]>) {
    const result = await super.putWrites(...args);
    this._saveToDisk();
    return result;
  }

  async deleteThread(threadId: string) {
    await super.deleteThread(threadId);
    this._saveToDisk();
  }

  private _loadFromDisk(): void {
    try {
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, "utf-8");
        const data = JSON.parse(raw, jsonReviver);

        // Restore MemorySaver's internal storage
        if (data.storage) {
          (this as any).storage = data.storage;
        }
        if (data.writes) {
          (this as any).writes = data.writes;
        }
        console.log("[CHECKPOINTER] Loaded checkpoint state from", this.filePath);
      }
    } catch (err) {
      console.warn("[CHECKPOINTER] Could not load checkpoint file, starting fresh:", err);
    }
  }

  private _saveToDisk(): void {
    try {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      const data = {
        storage: (this as any).storage,
        writes: (this as any).writes,
      };

      writeFileSync(this.filePath, JSON.stringify(data, jsonReplacer), "utf-8");
    } catch (err) {
      console.error("[CHECKPOINTER] Failed to save checkpoint file:", err);
    }
  }
}
