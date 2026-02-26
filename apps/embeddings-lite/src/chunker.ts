/**
 * Sentence-aware text chunker with overlap.
 *
 * Strategy:
 *  1. Split text on paragraph breaks (`\n\n+`) first, then on sentence
 *     boundaries (`.  !  ?`) within each paragraph.
 *  2. Accumulate sentences until the chunk reaches `chunkWords` words.
 *  3. Slide forward by `chunkWords - overlapWords` words, keeping the tail
 *     sentences as the leading context of the next chunk.
 *
 * This guarantees no sentence is cut mid-way and key boundary sentences
 * appear in both adjacent chunks.
 */

export interface Chunk {
  index: number;
  text: string;
  /** Character offset in the original document where this chunk starts */
  startChar: number;
  /** Character offset where this chunk ends (exclusive) */
  endChar: number;
}

const SENTENCE_BOUNDARY = /(?<=[.!?])\s+/;

/** Returns 0 for empty/whitespace-only strings (fixes `"".split() → [""]` bug). */
function wordCount(s: string): number {
  const t = s.trim();
  return t === "" ? 0 : t.split(/\s+/).length;
}

/**
 * Split `text` into overlapping chunks.
 *
 * @param text        Full document text
 * @param chunkWords  Target size of each chunk in words (default 250)
 * @param overlapWords Words of overlap between adjacent chunks (default 50)
 */
export function chunkText(
  text: string,
  chunkWords = 250,
  overlapWords = 50
): Chunk[] {
  // Normalise line endings, then split on paragraph breaks first,
  // then on sentence boundaries within each paragraph.
  const normalised = text.replace(/\r\n/g, "\n");

  const rawSentences = normalised
    .split(/\n{2,}/)                              // paragraph splits
    .flatMap((para) =>
      para.split(SENTENCE_BOUNDARY).map((s) => s.trim()).filter(Boolean)
    )
    .filter(Boolean);

  if (rawSentences.length === 0) return [];

  const chunks: Chunk[] = [];
  let sentenceIdx = 0;
  let charCursor = 0;

  while (sentenceIdx < rawSentences.length) {
    // Remember where this chunk's sliding window started so the infinite-loop
    // guard can compare against the correct sentence index.
    const windowStart = sentenceIdx;

    const bucket: string[] = [];
    let bucketWords = 0;
    let i = sentenceIdx;

    // Fill bucket up to chunkWords
    while (i < rawSentences.length && bucketWords < chunkWords) {
      bucket.push(rawSentences[i]);
      bucketWords += wordCount(rawSentences[i]);
      i++;
    }

    const chunkStr = bucket.join(" ");

    // Track character offsets in the original (normalised) text
    const startChar = normalised.indexOf(bucket[0], charCursor);
    const endChar = startChar + chunkStr.length;

    chunks.push({
      index: chunks.length,
      text: chunkStr,
      startChar: Math.max(0, startChar),
      endChar,
    });

    // Slide forward: drop leading sentences until we've shed `chunkWords - overlapWords` words
    let wordsDropped = 0;
    const targetDrop = chunkWords - overlapWords;
    while (sentenceIdx < i && wordsDropped < targetDrop) {
      wordsDropped += wordCount(rawSentences[sentenceIdx]);
      sentenceIdx++;
    }

    // Prevent infinite loop when a single sentence exceeds chunkWords.
    // Compare against windowStart (the sentence index at the start of this
    // iteration), NOT the chunk's array index.
    if (sentenceIdx === windowStart && sentenceIdx < rawSentences.length) {
      sentenceIdx++;
    }

    // Advance charCursor past the end of this chunk so indexOf() on the next
    // iteration doesn't accidentally match an earlier repeated sentence.
    charCursor = endChar;
  }

  return chunks;
}
