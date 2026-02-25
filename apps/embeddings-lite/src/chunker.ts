/**
 * Sentence-aware text chunker with overlap.
 *
 * Strategy:
 *  1. Split text into sentences on `.  !  ?  \n\n`
 *  2. Accumulate sentences until the chunk reaches `chunkSize` words
 *  3. Slide forward by `chunkSize - overlap` words, keeping the tail sentences
 *     as the leading context of the next chunk
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

function wordCount(s: string): number {
  return s.trim().split(/\s+/).length;
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
  // Split into sentences, keeping the delimiter attached to the sentence
  const rawSentences = text
    .replace(/\r\n/g, "\n")
    .split(SENTENCE_BOUNDARY)
    .map((s) => s.trim())
    .filter(Boolean);

  if (rawSentences.length === 0) return [];

  const chunks: Chunk[] = [];
  let sentenceIdx = 0;
  let charCursor = 0;

  while (sentenceIdx < rawSentences.length) {
    const bucket: string[] = [];
    let bucketWords = 0;
    let i = sentenceIdx;

    // Fill bucket up to chunkWords
    while (i < rawSentences.length && bucketWords < chunkWords) {
      bucket.push(rawSentences[i]);
      bucketWords += wordCount(rawSentences[i]);
      i++;
    }

    const chunkText = bucket.join(" ");

    // Track character offsets in the original text
    const startChar = text.indexOf(bucket[0], charCursor);
    const endChar = startChar + chunkText.length;

    chunks.push({
      index: chunks.length,
      text: chunkText,
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

    // Prevent infinite loop on a single massive sentence
    if (sentenceIdx === chunks[chunks.length - 1].index && sentenceIdx < rawSentences.length) {
      sentenceIdx++;
    }

    charCursor = startChar;
  }

  return chunks;
}
