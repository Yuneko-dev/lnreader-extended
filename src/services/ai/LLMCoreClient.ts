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
  responseFormat?: 'text' | 'json';
  stream?: boolean;
  tools?: AIToolSchema[];
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
  onStream?: (chunk: string) => void;
}

export interface GenerateContentResponse {
  text: string;
  finishReason?: string;
  usage?: any;
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
}

export class MissingAIProviderError extends Error {
  constructor(
    message = 'AI Provider is not configured or API Key is missing.',
  ) {
    super(message);
    this.name = 'MissingAIProviderError';
  }
}
