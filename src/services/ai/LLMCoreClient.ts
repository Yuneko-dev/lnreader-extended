import { z } from 'zod';

export interface AIToolSchema {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface GenerateContentOptions {
  userPrompt: string;
  systemInstruction?: string;
  stream?: boolean;
  tools?: AIToolSchema[];
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
  onStream?: (chunk: string) => void;
}

export interface GenerateTranslateContentOptions<T extends z.ZodTypeAny>
  extends Omit<GenerateContentOptions, 'stream' | 'onStream'> {
  schema: T;
}

export interface GenerateContentResponse {
  text: string;
  finishReason?: string;
  usage?: any;
}
export interface GenerateTranslateContentResponse<T extends z.ZodTypeAny>
  extends Omit<GenerateContentResponse, 'text'> {
  data: z.infer<T>;
}
export abstract class LLMCoreClient {
  constructor(
    public readonly endpoint: string,
    public readonly apiKey: string,
    public readonly model: string,
  ) {}

  abstract fetchModels(): Promise<string[]>;
  abstract generateContent(
    options: GenerateContentOptions,
  ): Promise<GenerateContentResponse>;
  abstract generateTranslateContent<T extends z.ZodTypeAny>(
    options: GenerateTranslateContentOptions<T>,
  ): Promise<GenerateTranslateContentResponse<T>>;
}

export class MissingAIProviderError extends Error {
  constructor(
    message = 'AI Provider is not configured or API Key is missing.',
  ) {
    super(message);
    this.name = 'MissingAIProviderError';
  }
}
