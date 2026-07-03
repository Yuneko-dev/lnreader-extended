import { decode } from 'html-entities';

import { abortableDelay, throwIfAborted } from './abort';
import { TranslateEngine } from './TranslateEngine';

export class GoogleTranslateFreeEngine implements TranslateEngine {
  id = 'google-free';
  name = 'Google Translate (Free)';

  private MAX_CHUNK_LENGTH = 10_000;

  private chunkTexts(
    texts: string[],
  ): { textArray: string[]; indices: number[] }[] {
    const chunks: { textArray: string[]; indices: number[] }[] = [];
    let currentChunkTexts: string[] = [];
    let currentIndices: number[] = [];
    let currentLength = 0;

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      if (!text || !text.trim()) {
        continue; // Skip empties during network fetch
      }

      if (
        currentLength + text.length > this.MAX_CHUNK_LENGTH &&
        currentChunkTexts.length > 0
      ) {
        chunks.push({ textArray: currentChunkTexts, indices: currentIndices });
        currentChunkTexts = [text];
        currentIndices = [i];
        currentLength = text.length;
      } else {
        currentChunkTexts.push(text);
        currentIndices.push(i);
        currentLength += text.length;
      }
    }

    if (currentChunkTexts.length > 0) {
      chunks.push({ textArray: currentChunkTexts, indices: currentIndices });
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
      let retryCount = 0;
      let completed = false;

      while (!completed) {
        throwIfAborted(signal);
        const bodyJSON = [[chunk.textArray, source, target], 'te'];
        const res = await fetch(
          'https://translate-pa.googleapis.com/v1/translateHtml',
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json+protobuf',
              'x-client-data': 'CIH/ygE=',
              'x-goog-api-key': 'AIzaSyATBXajvzQLTDHEQbcpq0Ihe0vWDHmO520',
            },
            body: JSON.stringify(bodyJSON),
            signal,
          },
        );

        if (res.status === 429) {
          if (retryCount >= MAX_RETRIES) {
            console.warn(
              'Google Translate rate limit exceeded after max retries',
            );
            break;
          }
          retryCount++;
          await abortableDelay(1000 * retryCount, signal);
          continue;
        }

        completed = true;
        if (!res.ok) break;

        const data = await res.json();
        if (Array.isArray(data) && Array.isArray(data[0])) {
          if (data[0].length === chunk.indices.length) {
            chunk.indices.forEach((originalIndex, innerIdx) => {
              results[originalIndex] = decode(data[0][innerIdx] || '').trim();
            });
          } else {
            console.warn('Google chunk mismatch length');
          }
        }
      }

      await abortableDelay(200, signal);
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
