import * as cheerio from 'cheerio';
import { TranslateEngine } from './TranslateEngine';
import { GoogleTranslateFreeEngine } from './GoogleTranslateFreeEngine';
import { LLMTranslateEngine } from './LLMTranslateEngine';
import { AIManager } from '../ai/AIManager';
import type { AIProvider } from '@hooks/persisted/useAIProviders';

export interface TranslateConfig {
  engine: string;
  sourceLang: string;
  targetLang: string;
  llmSystemPrompts?: { id: string; title: string; content: string }[];
  activeSystemPromptId?: string;
  activeAIProvider?: AIProvider;
}

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
    const translatedTexts = await engine.translate(
      textsToTranslate,
      config.sourceLang,
      config.targetLang,
      onProgress,
      signal,
    );

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
}
