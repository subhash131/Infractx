import { Chunk } from "./chunker.js";

// ─── Store types ──────────────────────────────────────────────────────────────

export interface ChunkRecord extends Chunk {
  doc_id: string;
  embedding: number[];
}

export interface DocumentRecord {
  id: string;
  chunk_count: number;
  added_at: string;
}

// ─── In-memory store ──────────────────────────────────────────────────────────

export const docStore = new Map<string, DocumentRecord>();
export const chunkStore: ChunkRecord[] = [];

/** Cosine similarity via dot product (vectors are L2-normalised, so dot = cosine). */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

/**
 * Upsert chunks for a document.
 * Removes any existing chunks for `docId` before inserting the new ones.
 */
export function upsertChunks(docId: string, chunks: ChunkRecord[]): void {
  // Remove stale chunks for this doc
  const keepIndices: number[] = [];
  for (let i = 0; i < chunkStore.length; i++) {
    if (chunkStore[i].doc_id !== docId) keepIndices.push(i);
  }
  chunkStore.splice(0, chunkStore.length, ...keepIndices.map((i) => chunkStore[i]));

  // Append new chunks
  chunkStore.push(...chunks);
}
