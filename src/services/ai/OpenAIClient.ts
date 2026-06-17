import OpenAI from 'openai';
import { zodResponseFormat, zodTextFormat } from 'openai/helpers/zod';
import z from 'zod';

import {
  AIToolSchema,
  GenerateContentOptions,
  GenerateContentResponse,
  GenerateTranslateContentOptions,
  GenerateTranslateContentResponse,
  LLMCoreClient,
} from './LLMCoreClient';

export interface OpenAIConfig {
  endpoint: string;
  apiKey: string;
  model: string;
  temperature?: number;
  apiMode?: 'responses' | 'chat-completions';
  enableReasoning?: boolean;
  reasoningEffort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
}

export class OpenAIClient extends LLMCoreClient {
  private client: OpenAI;
  private config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    super(config.endpoint, config.apiKey, config.model);
    this.config = config;
    this.client = new OpenAI({
      baseURL: this.config.endpoint || 'https://api.openai.com/v1',
      apiKey: this.config.apiKey || 'anonymous',
      dangerouslyAllowBrowser: true, // required for React Native client-side
    });
  }

  async fetchModels(): Promise<string[]> {
    try {
      const models = await this.client.models.list();
      return models.data.map(model => model.id);
    } catch (e: any) {
      throw new Error(`Failed to fetch OpenAI models: ${e.message}`);
    }
  }

  private mapTools(
    tools?: AIToolSchema[],
  ): OpenAI.Chat.Completions.ChatCompletionTool[] | undefined {
    if (!tools || tools.length === 0) {
      return undefined;
    }
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  async generateContent(
    options: GenerateContentOptions,
  ): Promise<GenerateContentResponse> {
    const { userPrompt, systemInstruction, stream, tools, signal, onStream } =
      options;

    try {
      if (this.config.apiMode === 'chat-completions') {
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
          [];
        if (systemInstruction) {
          messages.push({ role: 'system', content: systemInstruction });
        }
        messages.push({ role: 'user', content: userPrompt });

        const requestOptions: OpenAI.Chat.Completions.ChatCompletionCreateParams =
          {
            model: this.model,
            messages,
            temperature: this.config.temperature ?? 0.6,
            stream: stream === true,
            tools: this.mapTools(tools),
            store: false,
          };

        if (stream) {
          const streamResponse = await this.client.chat.completions.create(
            { ...requestOptions, stream: true },
            { signal },
          );

          let fullText = '';
          for await (const chunk of streamResponse) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullText += content;
              if (onStream) {
                onStream(content);
              }
            }
          }
          return { text: fullText, finishReason: 'stop' };
        } else {
          const response = await this.client.chat.completions.create(
            { ...requestOptions, stream: false },
            { signal },
          );
          return {
            text: response.choices[0]?.message?.content || '',
            finishReason: response.choices[0]?.finish_reason,
            usage: response.usage,
          };
        }
      } else {
        // Responses API
        let reasoningConfig: OpenAI.Reasoning | undefined;
        if (this.config.enableReasoning) {
          reasoningConfig = {
            effort: this.config.reasoningEffort as any,
          };
        }

        const response = await this.client.responses.create(
          {
            model: this.model,
            instructions: systemInstruction,
            input: userPrompt,
            store: false,
            reasoning: reasoningConfig,
          } as any,
          { signal },
        );

        return {
          text: (response as any).output_text,
          finishReason: (response as any).status,
          usage: (response as any).usage,
        };
      }
    } catch (e: any) {
      throw new Error(`OpenAI GenerateContent Error: ${e.message}`);
    }
  }

  async generateTranslateContent<T extends z.ZodTypeAny>(
    options: GenerateTranslateContentOptions<T>,
  ): Promise<GenerateTranslateContentResponse<T>> {
    const { userPrompt, systemInstruction, schema, tools, signal } = options;

    try {
      if (this.config.apiMode === 'chat-completions') {
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
          [];
        if (systemInstruction) {
          messages.push({ role: 'system', content: systemInstruction });
        }
        messages.push({ role: 'user', content: userPrompt });

        const response = await this.client.chat.completions.parse(
          {
            model: this.model,
            messages,
            temperature: this.config.temperature ?? 0.6,
            stream: false,
            tools: this.mapTools(tools),
            store: false,
            response_format: zodResponseFormat(schema, 'data'),
          },
          { signal },
        );
        return {
          data: response.choices[0].message.parsed,
          finishReason: response.choices[0]?.finish_reason,
          usage: response.usage,
        };
      } else {
        // Responses API
        let reasoningConfig: OpenAI.Reasoning | undefined;
        if (this.config.enableReasoning) {
          reasoningConfig = {
            effort: this.config.reasoningEffort,
          };
        }

        const response = await this.client.responses.parse(
          {
            model: this.model,
            instructions: systemInstruction,
            input: userPrompt,
            store: false,
            reasoning: reasoningConfig,
            text: {
              format: zodTextFormat(schema, 'data'),
            },
          },
          { signal },
        );

        return {
          data: response.output_parsed,
          finishReason: (response as any).status,
          usage: (response as any).usage,
        };
      }
    } catch (e: any) {
      throw new Error(`OpenAI GenerateTranslateContent Error: ${e.message}`);
    }
  }
}
