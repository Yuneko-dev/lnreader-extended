/* eslint-disable no-console */

import OpenAI from 'openai';
import { TranslateEngine } from './TranslateEngine';
import { GenerateContentConfig, GoogleGenAI, HarmBlockThreshold, HarmCategory, ThinkingLevel } from '@google/genai';

export interface LLMConfig {
  provider?: 'openai' | 'openrouter' | 'deepseek' | 'gemini' | 'custom';
  endpoint: string;
  apiKey: string;
  model: string;
  systemPrompt?: string;
  enableReasoning?: boolean;
  reasoningEffort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
}

export class LLMTranslateEngine implements TranslateEngine {
  id = 'llm';
  name = 'LLM (OpenAI Compatible)';

  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  private adjustCount(
    translatedParagraphs: string[],
    expectedCount: number,
  ): string[] {
    if (translatedParagraphs.length === expectedCount) {
      return translatedParagraphs;
    }
    const result = [...translatedParagraphs];
    while (result.length < expectedCount) {
      result.push('');
    }
    return result.slice(0, expectedCount);
  }

  async fetchModels(): Promise<string[]> {
    try {
      if (this.config.provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey: this.config.apiKey });
        const models = (await ai.models.list()).page;
        return models.map((model: any) => model.name);
      } else {
        const client = new OpenAI({
          baseURL: this.config.endpoint || 'https://api.openai.com/v1',
          apiKey: this.config.apiKey || 'anonymous',
          dangerouslyAllowBrowser: true, // required for React Native client-side
        });
        const models = await client.models.list();
        return models.data.map(model => model.id);
      }
    } catch (e: any) {
      throw new Error(`Failed to fetch models: ${e.message}`);
    }
  }

  async translate(
    texts: string[],
    source: string,
    target: string,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal,
  ): Promise<string[]> {
    if (!texts.length) return [];

    const MARKER = '---PARAGRAPH_BREAK---';
    const userPrompt = texts.join('\n' + MARKER + '\n');

    const defaultSystemPrompt =
      'You are a professional translator. Do NOT add any extra notes or conversational text. Maintain paragraph structural integrity by keeping the exact same ---PARAGRAPH_BREAK--- markers between translated paragraphs.';
    const systemPrompt =
      (this.config.systemPrompt || defaultSystemPrompt) +
      `\nTranslate the following text from ${source} to ${target}`;

    let i: any;

    // Helper: create a promise that rejects when aborted
    const createAbortError = () => {
      const err = new Error('Translation cancelled');
      err.name = 'AbortError';
      return err;
    };
    const abortPromise = signal
      ? new Promise<never>((_, reject) => {
        if (signal.aborted) {
          reject(createAbortError());
        }
        signal.addEventListener(
          'abort',
          () => reject(createAbortError()),
          { once: true },
        );
      })
      : null;

    try {
      if (!this.config.model) {
        throw new Error('Model is not specified');
      }

      let progress = 0;
      i = setInterval(() => {
        if (Math.random() > 0.5 && progress < 96 && onProgress) {
          onProgress(progress++);
        }
      }, 333);

      let resultText = '';
      let errorMessage: string | undefined | null = null;

      console.log('Input', texts, userPrompt);

      if (this.config.provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey: this.config.apiKey });
        const configOptions: GenerateContentConfig = {
          systemInstruction: systemPrompt,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.THINKING_LEVEL_UNSPECIFIED,
          },
        };
        if (this.config.enableReasoning) {
          switch (this.config.reasoningEffort) {
            case 'none': {
              configOptions.thinkingConfig!.thinkingLevel =
                ThinkingLevel.THINKING_LEVEL_UNSPECIFIED;
              break;
            }
            case 'minimal': {
              configOptions.thinkingConfig!.thinkingLevel =
                ThinkingLevel.MINIMAL;
              break;
            }
            case 'low': {
              configOptions.thinkingConfig!.thinkingLevel = ThinkingLevel.LOW;
              break;
            }
            case 'medium': {
              configOptions.thinkingConfig!.thinkingLevel = ThinkingLevel.MEDIUM;
              break;
            }
            case 'high':
            case 'xhigh': {
              configOptions.thinkingConfig!.thinkingLevel = ThinkingLevel.HIGH;
              break;
            }
          }
        }

        // Bypass safety settings
        configOptions.safetySettings = [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.OFF,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.OFF,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.OFF,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.OFF,
          },
          {
            category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY,
            threshold: HarmBlockThreshold.OFF,
          },
        ]

        const apiPromise = ai.models.generateContent({
          model: this.config.model,
          contents: userPrompt,
          config: configOptions,
        });
        const response = abortPromise
          ? await Promise.race([apiPromise, abortPromise])
          : await apiPromise;
        resultText = response?.text || '';
        console.log('Gemini Response', response);
        errorMessage = response.promptFeedback?.blockReason;
      } else {
        const client = new OpenAI({
          baseURL: this.config.endpoint || 'https://api.openai.com/v1',
          apiKey: this.config.apiKey || 'anonymous',
          dangerouslyAllowBrowser: true, // required for React Native client-side
        });

        const apiPromise = client.responses.create({
          model: this.config.model,
          instructions: systemPrompt,
          input: userPrompt,
          store: false,
          reasoning: {
            effort: this.config.reasoningEffort || 'none',
          },
        });
        const response = abortPromise
          ? await Promise.race([apiPromise, abortPromise])
          : await apiPromise;
        resultText = response.output_text;
        console.log('LLM Response', response);
      }

      if (!resultText.length) {
        throw new Error(`Cannot translate this chapter. Debug: ${errorMessage}`);
      }

      clearInterval(i);

      const translatedParagraphs = resultText
        .split(MARKER)
        .map((p: string) => p.trim());

      if (onProgress) {
        onProgress(100);
      }

      return this.adjustCount(translatedParagraphs, texts.length);
    } catch (e: any) {
      clearInterval(i);
      if (e?.name === 'AbortError') {
        throw e; // Re-throw abort errors without wrapping
      }
      // console.error('LLM Translation failed:', e);
      const message = e?.message || 'Unknown LLM error';
      throw new Error(`LLM Translation failed: ${message}`);
    }
  }
}

