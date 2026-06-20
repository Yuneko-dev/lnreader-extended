import type { AIProvider } from '@hooks/persisted/useAIProviders';
import * as cheerio from 'cheerio';
import { isAlphanumeric } from 'unicode-segmenter/general';

import { AIManager } from '../ai/AIManager';
import { GoogleTranslateFreeEngine } from './GoogleTranslateFreeEngine';
import { LLMTranslateEngine } from './LLMTranslateEngine';
import { TranslateEngine } from './TranslateEngine';

export interface TranslateConfig {
  engine: string;
  sourceLang: string;
  targetLang: string;
  llmSystemPrompts?: { id: string; title: string; content: string }[];
  activeSystemPromptId?: string;
  activeAIProvider?: AIProvider;
  llmChunkingEnabled?: boolean;
  llmChunkWordLimit?: number;
  llmRetryEnabled?: boolean;
  llmRetryMaxAttempts?: number;
  llmDisableStructuredOutput?: boolean;
}

/** Hermes doesn't have DOMException — create a plain Error with name='AbortError' */
const createAbortError = (): Error => {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
};

export class TranslateManager {
  private static async getEngine(
    config: TranslateConfig,
  ): Promise<TranslateEngine> {
    if (config.engine === 'llm') {
      if (!config.activeAIProvider) {
        throw new Error(
          'AI Provider is not configured. Please select an AI Provider in settings.',
        );
      }

      const coreClient = await AIManager.getClient(config.activeAIProvider);

      let finalSystemPrompt = '';
      if (config.llmSystemPrompts && config.activeSystemPromptId) {
        const active = config.llmSystemPrompts.find(
          p => p.id === config.activeSystemPromptId,
        );
        if (active) {
          finalSystemPrompt = active.content;
        }
      }

      return new LLMTranslateEngine(coreClient, {
        systemPrompt: finalSystemPrompt,
        disableStructuredOutput: config.llmDisableStructuredOutput,
      });
    }
    return new GoogleTranslateFreeEngine();
  }

  static async translateChapterHTML(
    html: string,
    config: TranslateConfig,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    const $ = cheerio.load(html, null, false);
    // Select elements that typically contain text we want to translate.
    const translatableElements = $(
      'p, div, span, h1, h2, h3, h4, h5, h6, li, td, th',
    );
    const textsToTranslate: string[] = [];
    const elementRefs: cheerio.Cheerio<cheerio.AnyNode>[] = [];
    const elementTypes: ('html' | 'text')[] = [];

    const blockSelectors = [
      'p',
      'div',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'li',
      'td',
      'th',
      'ul',
      'ol',
      'blockquote',
      'pre',
      'table',
    ].join(', ');

    translatableElements.each((_, el) => {
      const $el = $(el);

      if ($el.parents('[data-translatable-block="true"]').length > 0) return;

      const hasBlockChildren = $el.children(blockSelectors).length > 0;

      if (!hasBlockChildren) {
        const elHtml = $el.html()?.trim();
        if (elHtml && elHtml.length > 0 && $el.text().trim().length > 0) {
          textsToTranslate.push(elHtml);
          elementRefs.push($el);
          elementTypes.push('html');
          $el.attr('data-translatable-block', 'true');
        }
      } else {
        $el.contents().each((__, child) => {
          if (child.type === 'text') {
            const childText = $(child).text().trim();
            if (childText.length > 0) {
              textsToTranslate.push(childText);
              elementRefs.push($(child));
              elementTypes.push('text');
            }
          }
        });
      }
    });

    console.log('textsToTranslate:', textsToTranslate.length);

    if (textsToTranslate.length === 0) {
      if (onProgress) onProgress(100);
      return '<h2>Error: Unable to translate text due to invalid HTML format. The plugin returned content without standard wrapping tags.</h2>';
    }

    const engine = await this.getEngine(config);

    const shouldChunk =
      config.engine === 'llm' &&
      config.llmChunkingEnabled &&
      config.llmChunkWordLimit &&
      config.llmChunkWordLimit > 0;

    const shouldRetry =
      config.engine === 'llm' &&
      config.llmRetryEnabled &&
      config.llmRetryMaxAttempts &&
      config.llmRetryMaxAttempts > 1;

    let translatedTexts: string[];

    if (shouldChunk) {
      const chunks = this.chunkParagraphsByWordCount(
        textsToTranslate,
        config.llmChunkWordLimit!,
      );

      translatedTexts = new Array(textsToTranslate.length).fill('');
      let completedChunks = 0;

      for (const chunk of chunks) {
        if (signal?.aborted) {
          throw createAbortError();
        }

        const chunkProgress = (progress: number) => {
          if (onProgress) {
            const baseProgress = (completedChunks / chunks.length) * 100;
            const chunkContribution = (progress / 100) * (100 / chunks.length);
            onProgress(Math.min(baseProgress + chunkContribution, 99));
          }
        };

        const chunkResults = shouldRetry
          ? await this.translateWithRetry(
              engine,
              chunk.texts,
              config.sourceLang,
              config.targetLang,
              config.llmRetryMaxAttempts!,
              chunkProgress,
              signal,
            )
          : await engine.translate(
              chunk.texts,
              config.sourceLang,
              config.targetLang,
              chunkProgress,
              signal,
            );

        for (let j = 0; j < chunkResults.length; j++) {
          translatedTexts[chunk.startIndex + j] = chunkResults[j];
        }

        completedChunks++;
      }
    } else {
      translatedTexts = shouldRetry
        ? await this.translateWithRetry(
            engine,
            textsToTranslate,
            config.sourceLang,
            config.targetLang,
            config.llmRetryMaxAttempts!,
            onProgress,
            signal,
          )
        : await engine.translate(
            textsToTranslate,
            config.sourceLang,
            config.targetLang,
            onProgress,
            signal,
          );
    }

    console.log('translatedTexts:', translatedTexts.length);

    // Replace properties back
    for (let i = 0; i < elementRefs.length; i++) {
      const $ref = elementRefs[i];
      if (elementTypes[i] === 'html') {
        $ref.removeAttr('data-translatable-block');
      }

      if (translatedTexts[i] && translatedTexts[i].trim().length > 0) {
        if (elementTypes[i] === 'html') {
          $ref.html(translatedTexts[i]);
        } else if ($ref[0] && $ref[0].type === 'text') {
          ($ref[0] as any).data = translatedTexts[i];
        } else {
          $ref.text(translatedTexts[i]);
        }
      } else {
        console.warn(
          'Translated text is empty, removing element',
          __DEV__ ? $ref : i,
        );
        $ref.remove();
      }
    }

    console.log('Stop translate service');

    // Clean up any remaining data attributes just in case
    $('[data-translatable-block]').removeAttr('data-translatable-block');

    return $.html();
  }

  /**
   * Returns true if the codepoint is a CJK ideograph, Hiragana, Katakana, or Hangul syllable.
   * Each such character is counted as an individual word.
   */
  static isCJK(cp: number): boolean {
    return (
      (cp >= 0x4e00 && cp <= 0x9fff) || // CJK Unified Ideographs
      (cp >= 0x3400 && cp <= 0x4dbf) || // CJK Extension A
      (cp >= 0x20000 && cp <= 0x2a6df) || // CJK Extension B
      (cp >= 0xf900 && cp <= 0xfaff) || // CJK Compatibility Ideographs
      (cp >= 0x3040 && cp <= 0x309f) || // Hiragana
      (cp >= 0x30a0 && cp <= 0x30ff) || // Katakana
      (cp >= 0xac00 && cp <= 0xd7af) // Hangul Syllables
    );
  }

  /**
   * Counts words using unicode-segmenter for Unicode-aware classification.
   * - Latin/space-separated text: counts word boundaries (non-word → word transition)
   * - CJK/Hiragana/Katakana/Hangul: each character counts as 1 word
   */
  static countWords(text: string): number {
    let count = 0;
    let inWord = false;

    for (let i = 0; i < text.length; ) {
      const cp = text.codePointAt(i)!;
      const charLen = cp > 0xffff ? 2 : 1;

      if (isAlphanumeric(cp)) {
        if (this.isCJK(cp)) {
          count++;
          inWord = false;
        } else if (!inWord) {
          count++;
          inWord = true;
        }
      } else {
        inWord = false;
      }

      i += charLen;
    }

    return count;
  }

  /**
   * Groups paragraphs into chunks where each chunk's total word count
   * approximates the given limit. Never splits a single paragraph.
   * Uses unicode-segmenter for Unicode-aware word counting.
   */
  static chunkParagraphsByWordCount(
    texts: string[],
    wordLimit: number,
  ): { texts: string[]; startIndex: number }[] {
    const chunks: { texts: string[]; startIndex: number }[] = [];
    let currentChunk: string[] = [];
    let currentWordCount = 0;
    let startIndex = 0;

    for (let i = 0; i < texts.length; i++) {
      const wordCount = this.countWords(texts[i]);

      if (currentChunk.length > 0 && currentWordCount + wordCount > wordLimit) {
        chunks.push({ texts: currentChunk, startIndex });
        currentChunk = [texts[i]];
        currentWordCount = wordCount;
        startIndex = i;
      } else {
        currentChunk.push(texts[i]);
        currentWordCount += wordCount;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push({ texts: currentChunk, startIndex });
    }

    return chunks;
  }

  private static readonly FIBONACCI_DELAYS = [
    1_000, 2_000, 3_000, 5_000, 8_000,
  ];

  /**
   * Translates with automatic retry using Fibonacci backoff delays.
   * AbortError is never retried.
   */
  static async translateWithRetry(
    engine: TranslateEngine,
    texts: string[],
    sourceLang: string,
    targetLang: string,
    maxAttempts: number,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal,
  ): Promise<string[]> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        if (signal?.aborted) {
          throw createAbortError();
        }
        return await engine.translate(
          texts,
          sourceLang,
          targetLang,
          onProgress,
          signal,
        );
      } catch (e: any) {
        // Don't retry on user-initiated abort
        if (e?.name === 'AbortError') {
          throw e;
        }

        lastError = e;
        console.warn(
          `Translation attempt ${attempt + 1}/${maxAttempts} failed:`,
          e?.message,
        );

        // If this was the last attempt, don't wait
        if (attempt < maxAttempts - 1) {
          const delay =
            this.FIBONACCI_DELAYS[attempt] ??
            this.FIBONACCI_DELAYS[this.FIBONACCI_DELAYS.length - 1];

          await new Promise<void>((resolve, reject) => {
            const onAbort = () => {
              clearTimeout(timer);
              reject(createAbortError());
            };
            const timer = setTimeout(() => {
              signal?.removeEventListener('abort', onAbort);
              resolve();
            }, delay);
            signal?.addEventListener('abort', onAbort, { once: true });
          });
        }
      }
    }

    throw lastError ?? new Error('Translation failed after retries');
  }
}
