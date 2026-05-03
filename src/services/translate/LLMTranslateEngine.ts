import OpenAI from 'openai';
import { TranslateEngine } from './TranslateEngine';
import {
  GenerateContentConfig,
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  ThinkingLevel,
} from '@google/genai';
import type { LLMProviderSupported } from '@hooks/persisted/useSettings';

export interface LLMConfig {
  provider?: LLMProviderSupported;
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
        const ai = this.createClient() as GoogleGenAI;
        const models = (await ai.models.list()).page;
        return models.map((model: any) => model.name);
      } else {
        const client = this.createClient() as OpenAI;
        const models = await client.models.list();
        return models.data.map(model => model.id);
      }
    } catch (e: any) {
      throw new Error(`Failed to fetch models: ${e.message}`);
    }
  }

  createClient = () => {
    if (this.config.provider === 'gemini') {
      return new GoogleGenAI({ apiKey: this.config.apiKey });
    } else {
      return new OpenAI({
        baseURL: this.config.endpoint || 'https://api.openai.com/v1',
        apiKey: this.config.apiKey || 'anonymous',
        dangerouslyAllowBrowser: true, // required for React Native client-side
      });
    }
  };

  async translate(
    texts: string[],
    source: string,
    target: string,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal,
  ): Promise<string[]> {
    if (!texts.length) return [];

    const MARKER = '<br>';
    const userPrompt = texts.join('\n' + MARKER + '\n');

    const systemPrompt = `You are an Expert Transcreator. Your task is to translate the source text accurately while dynamically adapting the style, tone, and localization based on any provided custom guidelines.

Core Directives:
1. Two-Step Process: Accurately capture the original meaning, then reshape the linguistic presentation according to the specific style requirements requested.
2. Neutral Fallback: If no custom style guidelines are provided, produce a highly natural and fluent standard translation in the target language.

Strict Technical Constraints (CRITICAL):
- Formatting: You MUST maintain the exact structural integrity of the input. Keep all ${MARKER} markers exactly as they appear between paragraphs.
- Clean Output: Output ONLY the final processed text. Do NOT include any explanations, formatting tags (unless present in the source), intro/outro conversational filler, or internal thinking.

---
[Custom Style Guidelines]:
${this.config.systemPrompt || 'No specific guidelines.'}

---
Task: Translate the following text from ${source} to ${target}.
`;

    let i: ReturnType<typeof setInterval> | undefined;

    // Helper: create a promise that rejects when aborted
    const createAbortError = () => {
      const err = new Error('Translation cancelled');
      err.name = 'AbortError';
      return err;
    };
    const abortCleanup = { remove: null as (() => void) | null };
    const abortPromise = signal
      ? new Promise<never>((_, reject) => {
          if (signal.aborted) {
            reject(createAbortError());
            return;
          }
          const handler = () => reject(createAbortError());
          signal.addEventListener('abort', handler, { once: true });
          abortCleanup.remove = () =>
            signal.removeEventListener('abort', handler);
        })
      : null;

    const startTime = Date.now();

    try {
      if (!this.config.model) {
        throw new Error('Model is not specified');
      }

      const startTime = Date.now();
      const estimatedTimeMs = 20_000;
      const maxProgress = 99;
      i = setInterval(() => {
        if (onProgress) {
          const elapsedTime = Date.now() - startTime;
          onProgress(maxProgress * (1 - Math.exp(-elapsedTime / estimatedTimeMs)));
        }
      }, 100);

      let resultText = '';
      let errorMessage: string | undefined | null = null;

      console.log('Input text count:', texts.length);

      if (this.config.provider === 'gemini') {
        const ai = this.createClient() as GoogleGenAI;
        const configOptions: GenerateContentConfig = {
          systemInstruction: systemPrompt,
        };
        if (this.config.enableReasoning) {
          configOptions.thinkingConfig = {};
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
              configOptions.thinkingConfig!.thinkingLevel =
                ThinkingLevel.MEDIUM;
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
        ];

        const apiPromise = ai.models.generateContent({
          model: this.config.model,
          contents: userPrompt,
          config: configOptions,
        });
        const response = abortPromise
          ? await Promise.race([apiPromise, abortPromise])
          : await apiPromise;
        resultText = response?.text || '';
        errorMessage = response.promptFeedback?.blockReason;
        if (__DEV__) {
          console.log('Gemini Response Info', response);
        } else {
          console.log('Gemini Response Info', {
            usage: response?.usageMetadata,
            promptFeedback: response?.promptFeedback,
            finishReason: response?.candidates?.[0]?.finishReason,
            modelStatus: response?.modelStatus,
          });
        }
      } else {
        const client = this.createClient() as OpenAI;
        let reasoningConfig: OpenAI.Reasoning | undefined = undefined;
        if (this.config.enableReasoning) {
          reasoningConfig = {
            effort: this.config.reasoningEffort,
            // summary: 'detailed',
          };
        }
        const apiPromise = client.responses.create({
          model: this.config.model,
          instructions: systemPrompt,
          input: userPrompt,
          store: false,
          reasoning: reasoningConfig,
        });
        const response = abortPromise
          ? await Promise.race([apiPromise, abortPromise])
          : await apiPromise;
        resultText = response.output_text;
        errorMessage = response.incomplete_details?.reason;
        if (__DEV__) {
          console.log('LLM Response Info', response);
        } else {
          console.log('LLM Response Info', {
            usage: response.usage,
            error: response.error,
            incomplete_details: response.incomplete_details,
            status: response.status,
          });
        }
      }

      if (!resultText.length) {
        throw new Error(
          `Cannot translate this chapter. Debug: ${errorMessage}`,
        );
      }

      const translatedParagraphs = resultText
        .split(MARKER)
        .map((p: string) => p.trim());

      if (onProgress) {
        onProgress(100);
      }

      return this.adjustCount(translatedParagraphs, texts.length);
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        throw e; // Re-throw abort errors without wrapping
      }
      // console.error('LLM Translation failed:', e);
      const message = e?.message || 'Unknown LLM error';
      throw new Error(`LLM Translation failed: ${message}`);
    } finally {
      console.info(
        `LLM Translation finished in ${(Date.now() - startTime) / 1000}s`,
      );
      clearInterval(i);
      abortCleanup.remove?.();
    }
  }
}
