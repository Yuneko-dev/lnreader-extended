import { TranslateEngine } from './TranslateEngine';
import { LLMCoreClient, MissingAIProviderError } from '../ai/LLMCoreClient';

export interface LLMTranslateConfig {
  systemPrompt?: string;
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
    if (!Array.isArray(translatedParagraphs))
      return new Array(expectedCount).fill('');
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

    const systemPrompt = `You are an Expert Transcreator. Your task is to translate the source text accurately while dynamically adapting the style, tone, and localization based on any provided custom guidelines.

Core Directives:
1. Two-Step Process: Accurately capture the original meaning, then reshape the linguistic presentation according to the specific style requirements requested.
2. Neutral Fallback: If no custom style guidelines are provided, produce a highly natural and fluent standard translation in the target language.

Strict Technical Constraints (CRITICAL):
- Formatting: You MUST output ONLY a valid JSON object.
- The JSON object MUST contain exactly one key named "data", which is an array of strings.
- The "data" array MUST contain exactly the same number of items as the input JSON array.
- Each item in the "data" array MUST be the translated text of the corresponding item in the input array.
- Do NOT include any explanations, intro/outro conversational filler, or markdown formatting like \`\`\`json.

---
[Custom Style Guidelines]:
${this.config.systemPrompt || 'No specific guidelines.'}

---
Task: Translate the following text array from ${source} to ${target}.
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

      const response = await this.client.generateContent({
        userPrompt: JSON.stringify(texts),
        systemInstruction: systemPrompt,
        responseFormat: 'json',
        stream: false,
        signal,
      });

      let resultText = response.text;

      // Attempt to clean up markdown if the model ignored instructions
      if (resultText.startsWith('```json')) {
        resultText = resultText
          .replace(/^```json/, '')
          .replace(/```$/, '')
          .trim();
      }

      let translatedParagraphs: string[] = [];
      try {
        const parsed = JSON.parse(resultText);
        if (parsed.data && Array.isArray(parsed.data)) {
          translatedParagraphs = parsed.data;
        } else {
          throw new Error('Invalid JSON structure returned from LLM');
        }
      } catch (e: any) {
        throw new Error(
          `Failed to parse JSON from LLM response: ${
            e.message
          }. Response: ${resultText.substring(0, 100)}...`,
        );
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
