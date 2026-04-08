import * as cheerio from 'cheerio';
import { TranslateEngine } from './TranslateEngine';
import { GoogleTranslateFreeEngine } from './GoogleTranslateFreeEngine';
import { LLMTranslateEngine } from './LLMTranslateEngine';

export interface TranslateConfig {
  engine: string;
  sourceLang: string;
  targetLang: string;
  llmEndpoint?: string;
  llmApiKey?: string;
  llmModel?: string;
  llmSystemPrompt?: string;
}

export class TranslateManager {
  private static getEngine(config: TranslateConfig): TranslateEngine {
    if (config.engine === 'llm') {
      return new LLMTranslateEngine({
        endpoint: config.llmEndpoint || '',
        apiKey: config.llmApiKey || '',
        model: config.llmModel || '',
        systemPrompt: config.llmSystemPrompt,
      });
    }
    return new GoogleTranslateFreeEngine();
  }

  static async translateChapterHTML(
    html: string,
    config: TranslateConfig,
    onProgress?: (progress: number) => void,
  ): Promise<string> {
    const $ = cheerio.load(html, null, false);
    
    // Select elements that typically contain text we want to translate.
    // Avoid translating attributes directly, just text nodes inside elements.
    const translatableElements = $('p, div, span, h1, h2, h3, h4, h5, h6, li, td, th');
    const textsToTranslate: string[] = [];
    const elementRefs: cheerio.Cheerio<cheerio.AnyNode>[] = [];

    translatableElements.each((_, el) => {
      const $el = $(el);
      // Ensure we only grab direct text to avoid duplicating translation of nested tags like <span> inside <p>.
      // For simplicity in novels, we can get outer text if no nested structures, or we just translate the inner HTML.
      // However, translating innerHTML can break formatting tags like <b>, <i> if the engine doesn't support them.
      // A common approach for reading apps is getting the inner text, translating it, and replacing the inner html,
      // losing complex inline formats OR strictly translating the HTML string itself.
      // Here we choose to translate text as inner strings carefully.
      
      const text = $el.text().trim();
      if (text.length > 0 && $el.children().length === 0) {
        textsToTranslate.push(text);
        elementRefs.push($el);
      } else if (text.length > 0 && $el.children().length > 0) {
        // If there are children, maybe just translate the text nodes
        $el.contents().each((__, child) => {
          if (child.type === 'text') {
            const childText = $(child).text().trim();
            if (childText.length > 0) {
              textsToTranslate.push(childText);
              elementRefs.push($(child));
            }
          }
        });
      }
    });

    if (textsToTranslate.length === 0) {
        if (onProgress) onProgress(100);
        return html;
    }

    const engine = this.getEngine(config);
    const translatedTexts = await engine.translate(
      textsToTranslate,
      config.sourceLang,
      config.targetLang,
      onProgress
    );

    // Replace text nodes back
    for (let i = 0; i < elementRefs.length; i++) {
        if (translatedTexts[i] && translatedTexts[i].trim().length > 0) {
            // Replace text node content
            if (elementRefs[i][0].type === 'text') {
                 (elementRefs[i][0] as any).data = translatedTexts[i];
            } else {
                 elementRefs[i].text(translatedTexts[i]);
            }
        }
    }

    return $.html();
  }
}
