import { TranslateEngine } from './TranslateEngine';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function decodeHTMLEntities(str: string) {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '=',
  };

  return str.replace(
    /&amp;|&lt;|&gt;|&quot;|&#39;|&#x2F;|&#x60;|&#x3D;/g,
    match => entities[match as keyof typeof entities],
  );
}

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

      if (Array.isArray(data) && Array.isArray(data[0])) {
        // If split perfectly aligns
        if (data[0].length === chunk.indices.length) {
          chunk.indices.forEach((originalIndex, innerIdx) => {
            results[originalIndex] = decodeHTMLEntities(
              data[0][innerIdx] || '',
            ).trim();
          });
        } else {
          console.warn('Google chunk mismatch length');
        }
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
