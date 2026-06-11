import {
  GenerateContentConfig,
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  ThinkingLevel,
  Tool,
  Type,
} from '@google/genai';
import z from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import {
  AIToolSchema,
  GenerateContentOptions,
  GenerateContentResponse,
  GenerateTranslateContentOptions,
  GenerateTranslateContentResponse,
  LLMCoreClient,
} from './LLMCoreClient';

export interface GeminiConfig {
  endpoint?: string;
  apiKey: string;
  model: string;
  enableReasoning?: boolean;
  reasoningEffort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
}

export class GeminiClient extends LLMCoreClient {
  private client: GoogleGenAI;
  private config: GeminiConfig;

  constructor(config: GeminiConfig) {
    super(config.endpoint || '', config.apiKey, config.model);
    this.config = config;

    const options: { apiKey: string; httpOptions?: { baseUrl: string } } = {
      apiKey: this.config.apiKey,
    };
    if (this.config.endpoint) {
      options.httpOptions = { baseUrl: this.config.endpoint };
    }
    this.client = new GoogleGenAI(options);
  }

  async fetchModels(): Promise<string[]> {
    try {
      const models = (await this.client.models.list()).page;
      return models.map((model: any) => model.name);
    } catch (e: any) {
      throw new Error(`Failed to fetch Gemini models: ${e.message}`);
    }
  }

  private mapTools(tools?: AIToolSchema[]): Tool[] | undefined {
    if (!tools || tools.length === 0) {
      return undefined;
    }
    return [
      {
        functionDeclarations: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: {
            ...tool.parameters,
            type: Type.OBJECT,
          } as any,
        })),
      },
    ];
  }

  async generateContent(
    options: GenerateContentOptions,
  ): Promise<GenerateContentResponse> {
    const { userPrompt, systemInstruction, stream, tools, signal, onStream } =
      options;

    const configOptions: GenerateContentConfig = {
      systemInstruction,
      abortSignal: signal,
      tools: this.mapTools(tools),
    };

    if (this.config.enableReasoning) {
      configOptions.thinkingConfig = {};
      switch (this.config.reasoningEffort) {
        case 'none':
          configOptions.thinkingConfig.thinkingLevel =
            ThinkingLevel.THINKING_LEVEL_UNSPECIFIED;
          break;
        case 'minimal':
          configOptions.thinkingConfig.thinkingLevel = ThinkingLevel.MINIMAL;
          break;
        case 'low':
          configOptions.thinkingConfig.thinkingLevel = ThinkingLevel.LOW;
          break;
        case 'medium':
          configOptions.thinkingConfig.thinkingLevel = ThinkingLevel.MEDIUM;
          break;
        case 'high':
        case 'xhigh':
          configOptions.thinkingConfig.thinkingLevel = ThinkingLevel.HIGH;
          break;
      }
    }

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

    try {
      if (stream) {
        const responseStream = await this.client.models.generateContentStream({
          model: this.model,
          contents: userPrompt,
          config: configOptions,
        });

        let fullText = '';
        for await (const chunk of responseStream) {
          const { text } = chunk;
          if (text) {
            fullText += text;
            if (onStream) {
              onStream(text);
            }
          }
        }
        return { text: fullText, finishReason: 'stop' };
      } else {
        const response = await this.client.models.generateContent({
          model: this.model,
          contents: userPrompt,
          config: configOptions,
        });

        return {
          text: response?.text || '',
          finishReason: response?.candidates?.[0]?.finishReason,
          usage: response?.usageMetadata,
        };
      }
    } catch (e: any) {
      throw new Error(`Gemini GenerateContent Error: ${e.message}`);
    }
  }

  async generateTranslateContent<T extends z.ZodTypeAny>(
    options: GenerateTranslateContentOptions<T>,
  ): Promise<GenerateTranslateContentResponse<T>> {
    const { userPrompt, systemInstruction, tools, signal, schema } = options;

    const configOptions: GenerateContentConfig = {
      systemInstruction,
      abortSignal: signal,
      tools: this.mapTools(tools),
      responseMimeType: 'application/json',
      responseJsonSchema: zodToJsonSchema(schema),
    };

    if (this.config.enableReasoning) {
      configOptions.thinkingConfig = {};
      switch (this.config.reasoningEffort) {
        case 'none':
          configOptions.thinkingConfig.thinkingLevel =
            ThinkingLevel.THINKING_LEVEL_UNSPECIFIED;
          break;
        case 'minimal':
          configOptions.thinkingConfig.thinkingLevel = ThinkingLevel.MINIMAL;
          break;
        case 'low':
          configOptions.thinkingConfig.thinkingLevel = ThinkingLevel.LOW;
          break;
        case 'medium':
          configOptions.thinkingConfig.thinkingLevel = ThinkingLevel.MEDIUM;
          break;
        case 'high':
        case 'xhigh':
          configOptions.thinkingConfig.thinkingLevel = ThinkingLevel.HIGH;
          break;
      }
    }

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

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: userPrompt,
        config: configOptions,
      });

      return {
        data: schema.parse(JSON.parse(response?.text || '')),
        finishReason: response?.candidates?.[0]?.finishReason,
        usage: response?.usageMetadata,
      };
    } catch (e: any) {
      throw new Error(`Gemini generateTranslateContent Error: ${e.message}`);
    }
  }
}
