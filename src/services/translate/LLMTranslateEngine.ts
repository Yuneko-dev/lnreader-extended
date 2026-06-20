import z from 'zod';

import { LLMCoreClient, MissingAIProviderError } from '../ai/LLMCoreClient';
import { TranslateEngine } from './TranslateEngine';

const MARKER = '<br>';

const schema = z.object({
  paragraphs: z
    .array(z.string())
    .describe(
      'Array of translated paragraphs, must match the order and count of the input array',
    ),
});

export interface LLMTranslateConfig {
  systemPrompt?: string;
  disableStructuredOutput?: boolean;
}

export class LLMTranslateEngine implements TranslateEngine {
  id = 'llm';
  name = 'LLM (OpenAI Compatible)';

  private config: LLMTranslateConfig;
  private client: LLMCoreClient;

  constructor(client: LLMCoreClient, config: LLMTranslateConfig) {
    if (!client) {
      throw new MissingAIProviderError();
    }
    this.client = client;
    this.config = config;
  }

  private adjustCount(
    translatedParagraphs: string[],
    expectedCount: number,
  ): string[] {
    if (!Array.isArray(translatedParagraphs)) {
      return new Array(expectedCount).fill('');
    }
    if (translatedParagraphs.length === expectedCount) {
      return translatedParagraphs;
    }
    const result = [...translatedParagraphs];
    while (result.length < expectedCount) {
      result.push('');
    }
    return result.slice(0, expectedCount);
  }

  async translate(
    texts: string[],
    source: string,
    target: string,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal,
  ): Promise<string[]> {
    if (!texts.length) return [];

    const useMarker = this.config.disableStructuredOutput ?? false;
    const customGuidelines =
      this.config.systemPrompt || 'No specific guidelines.';

    const formattingConstraint = useMarker
      ? `You MUST maintain the exact structural integrity of the input. Keep all ${MARKER} markers exactly as they appear between paragraphs.`
      : 'You MUST output ONLY a valid JSON object.';

    const taskSubject = useMarker ? 'text' : 'text array';

    const systemPrompt = `You are an Expert Transcreator. Your task is to translate the source text accurately while dynamically adapting the style, tone, and localization based on any provided custom guidelines.

Core Directives:
1. Two-Step Process: Accurately capture the original meaning, then reshape the linguistic presentation according to the specific style requirements requested.
2. Neutral Fallback: If no custom style guidelines are provided, produce a highly natural and fluent standard translation in the target language.

Strict Technical Constraints (CRITICAL):
- Formatting: ${formattingConstraint}
- Clean Output: Output ONLY the final processed text. Do NOT include any explanations, formatting tags (unless present in the source), intro/outro conversational filler, or internal thinking.

---
[Custom Style Guidelines]:
${customGuidelines}

---
Task: Translate the following ${taskSubject} from ${source} to ${target}.
`;

    let i: ReturnType<typeof setInterval> | undefined;
    const startTime = Date.now();

    try {
      const startTimeEstimate = Date.now();
      const estimatedTimeMs = 30_000;
      const maxProgress = 99;
      i = setInterval(() => {
        if (onProgress) {
          const elapsedTime = Date.now() - startTimeEstimate;
          onProgress(
            maxProgress * (1 - Math.exp(-elapsedTime / estimatedTimeMs)),
          );
        }
      }, 100);

      console.log('Input text count:', texts.length);

      let translatedParagraphs: string[];

      if (useMarker) {
        const userPrompt = texts.join('\n' + MARKER + '\n');
        const response = await this.client.generateContent({
          userPrompt,
          systemInstruction: systemPrompt,
          signal,
        });
        translatedParagraphs = response.text
          .split(MARKER)
          .map((p: string) => p.trim());
      } else {
        const response = await this.client.generateTranslateContent({
          userPrompt: JSON.stringify(texts),
          systemInstruction: systemPrompt,
          schema,
          signal,
        });
        translatedParagraphs = response.data.paragraphs;
      }

      if (onProgress) {
        onProgress(100);
      }

      return this.adjustCount(translatedParagraphs, texts.length);
    } catch (e: any) {
      const message = e?.message || 'Unknown LLM error';
      throw new Error(`LLM Translation failed: ${message}`);
    } finally {
      console.info(
        `LLM Translation finished in ${(Date.now() - startTime) / 1000}s`,
      );
      clearInterval(i);
    }
  }
}
