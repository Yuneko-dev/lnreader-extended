/* eslint-disable no-console */

import { TranslateEngine } from './TranslateEngine';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class GoogleTranslateFreeEngine implements TranslateEngine {
  id = 'google-free';
  name = 'Google Translate (Free)';

  private MAX_CHUNK_LENGTH = 1500;
  private SEPARATOR = '\n\n~|||~\n\n';

  private chunkTexts(texts: string[]): { text: string; indices: number[] }[] {
    const chunks: { text: string; indices: number[] }[] = [];
    let currentChunkText = '';
    let currentIndices: number[] = [];

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      if (!text || !text.trim()) {
        continue; // Skip empties during network fetch
      }

      const newChunk =
        currentChunkText + (currentChunkText ? this.SEPARATOR : '') + text;
      if (newChunk.length > this.MAX_CHUNK_LENGTH && currentChunkText) {
        chunks.push({ text: currentChunkText, indices: currentIndices });
        currentChunkText = text;
        currentIndices = [i];
      } else {
        currentChunkText = newChunk;
        currentIndices.push(i);
      }
    }

    if (currentChunkText) {
      chunks.push({ text: currentChunkText, indices: currentIndices });
    }
    return chunks;
  }

  async translate(
    texts: string[],
    source: string,
    target: string,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal,
  ): Promise<string[]> {
    const results: string[] = [...texts];
    const chunks = this.chunkTexts(texts);
    const MAX_RETRIES = 5;

    for (
      let currentChunkIdx = 0;
      currentChunkIdx < chunks.length;
      currentChunkIdx++
    ) {
      const chunk = chunks[currentChunkIdx];
      const encodedText = encodeURIComponent(chunk.text);
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodedText}`;

      let retryCount = 0;

      try {
        const res = await fetch(url, { signal });
        if (res.status === 429) {
          if (retryCount >= MAX_RETRIES) {
            console.warn(
              'Google Translate rate limit exceeded after max retries',
            );
            continue;
          }
          retryCount++;
          await sleep(1000 * retryCount);
          currentChunkIdx--;
          continue;
        }

        // Reset retry count on success
        retryCount = 0;

        if (!res.ok) {
          continue;
        }

        const data = await res.json();

        let translatedChunk = '';
        if (Array.isArray(data) && Array.isArray(data[0])) {
          data[0].forEach((item: any[]) => {
            if (item[0]) {
              translatedChunk += item[0];
            }
          });
        }

        // Sometimes Google might add spaces around the separator
        const translatedSegments = translatedChunk.split(/\s*~\|\|\|~\s*/);

        // If split perfectly aligns
        if (translatedSegments.length === chunk.indices.length) {
          chunk.indices.forEach((originalIndex, innerIdx) => {
            results[originalIndex] = translatedSegments[innerIdx].trim();
          });
        } else {
          // Fallback parsing or leave original if heavily mutated
          console.warn('Google chunk mismatch length');
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') throw e;
        console.warn('Google Translate Error:', e);
      }

      await sleep(200);
      if (onProgress) {
        onProgress(((currentChunkIdx + 1) / chunks.length) * 100);
      }
    }

    if (onProgress) {
      onProgress(100);
    }

    return results;
  }
}
