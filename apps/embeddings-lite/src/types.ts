// ─── Shared request / response types ─────────────────────────────────────────

export interface EmbedRequest {
  input: string | string[];
}

export interface EmbedResponse {
  object: "list";
  model: string;
  embeddings: number[][];
  usage: { prompt_tokens: number; total_tokens: number };
}

export interface StoreRequest {
  /** Unique document identifier (optional, will be generated if missing) */
  id?: string;
  /** Full document text — will be auto-chunked */
  text: string;
  /** Override chunk size in words (default 250) */
  chunk_words?: number;
  /** Override overlap in words (default 50) */
  overlap_words?: number;
}

export interface StoreResponse {
  doc_id: string;
  chunks_added: number;
  total_chunks: number;
  total_docs: number;
}

export interface MatchRequest {
  query: string;
  /** Number of top chunks to return (default 3) */
  top_k?: number;
  /** Include surrounding chunk context (default true) */
  include_context?: boolean;
}

export interface MatchResult {
  score: number;
  doc_id: string;
  chunk_index: number;
  text: string;
  context?: { before?: string; after?: string };
}

export interface MatchResponse {
  query: string;
  results: MatchResult[];
}

export interface HealthResponse {
  status: "ok" | "loading" | "error";
  model_loaded: boolean;
  model: string;
  store: { docs: number; chunks: number };
}

export interface ErrorResponse {
  error: string;
  details?: string;
}
