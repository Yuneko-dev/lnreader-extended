import OpenAI from 'openai';
import { TranslateEngine } from './TranslateEngine';

export interface LLMConfig {
  provider?: 'openai' | 'openrouter' | 'deepseek' | 'gemini' | 'custom';
  endpoint: string;
  apiKey: string;
  model: string;
  systemPrompt?: string;
}

export class LLMTranslateEngine implements TranslateEngine {
  id = 'llm';
  name = 'LLM (OpenAI Compatible)';
  
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  private adjustCount(translatedParagraphs: string[], expectedCount: number): string[] {
    if (translatedParagraphs.length === expectedCount) {
      return translatedParagraphs;
    }
    const result = [...translatedParagraphs];
    while (result.length < expectedCount) {
      result.push('');
    }
    return result.slice(0, expectedCount);
  }

  private getClient() {
    return new OpenAI({
      baseURL: this.config.endpoint || 'https://api.openai.com/v1',
      apiKey: this.config.apiKey || 'anonymous',
      dangerouslyAllowBrowser: true, // required for React Native client-side
    });
  }

  async fetchModels(): Promise<string[]> {
    try {
      const client = this.getClient();
      const models = await client.models.list();
      return models.data.map(model => model.id);
    } catch (e: any) {
      throw new Error(`Failed to fetch models: ${e.message}`);
    }
  }

  async translate(
    texts: string[],
    source: string,
    target: string,
    onProgress?: (progress: number) => void,
  ): Promise<string[]> {
    if (!texts.length) return [];
    
    const MARKER = '\\n---PARAGRAPH_BREAK---\\n';
    const combinedText = texts.join(MARKER);

    const defaultSystemPrompt = 'You are a professional translator. Do NOT add any extra notes or conversational text. Maintain paragraph structural integrity by keeping the exact same ---PARAGRAPH_BREAK--- markers between translated paragraphs.';
    const systemPrompt = this.config.systemPrompt || defaultSystemPrompt;
    const userPrompt = `Translate the following text from ${source} to ${target}:\n\n${combinedText}`;

    try {
      const client = this.getClient();

      const response = await client.chat.completions.create({
        model: this.config.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      });

      if (onProgress) {
        onProgress(50);
      }

      const resultText = response.choices?.[0]?.message?.content || '';

      const translatedParagraphs = resultText.split(MARKER).map((p: string) => p.trim());

      if (onProgress) {
        onProgress(100);
      }

      return this.adjustCount(translatedParagraphs, texts.length);
    } catch (e: any) {
      const message = e?.message || 'Unknown LLM error';
      throw new Error(`LLM Translation failed: ${message}`);
    }
  }
}
