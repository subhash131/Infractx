import { pipeline, env, FeatureExtractionPipeline } from "@xenova/transformers";
import path from "path";
import { fileURLToPath } from "url";

// ─── Resolve model path ───────────────────────────────────────────────────────
// Files live in src/ (dev) or dist/ (prod). Two dirname-ups reach the model parent:
//   .../all-MiniLM-L6-v2/src  →  .../all-MiniLM-L6-v2  →  .../subhash
// @xenova/transformers appends the model name automatically:
//   .../subhash/all-MiniLM-L6-v2/tokenizer.json ✓
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Model assets moved to root/model/
env.localModelPath = path.dirname(__dirname);
env.allowRemoteModels = false;

export const MODEL_NAME = "model";

let extractor: FeatureExtractionPipeline | null = null;
let modelLoaded = false;

export function isModelLoaded(): boolean {
  return modelLoaded;
}

export async function loadModel(): Promise<void> {
  console.log(`[model] Loading ${MODEL_NAME}…`);
  extractor = (await pipeline("feature-extraction", MODEL_NAME, {
    quantized: true, // uses onnx/model_quantized.onnx (~23 MB)
  })) as FeatureExtractionPipeline;
  modelLoaded = true;
  console.log("[model] Loaded ✓");
}

/** Embed one or more texts. Returns one 384-dim L2-normalised vector per input. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!extractor) throw new Error("Model not loaded yet.");
  const out = await extractor(texts, { pooling: "mean", normalize: true });
  return out.tolist() as number[][];
}
