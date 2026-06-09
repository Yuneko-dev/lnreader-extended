import { getApiKey } from '@hooks/persisted/useAIProviders';
import { GeminiClient } from './GeminiClient';
import { OpenAIClient } from './OpenAIClient';
import { LLMCoreClient, MissingAIProviderError } from './LLMCoreClient';
import type { AIProvider } from '@hooks/persisted/useAIProviders';

export class AIManager {
  static async getClient(provider: AIProvider): Promise<LLMCoreClient> {
    const apiKey = await getApiKey(provider.id);
    if (!apiKey) {
      throw new MissingAIProviderError(
        `API Key not found for provider: ${provider.alias}. Please check your AI settings.`,
      );
    }

    if (provider.provider === 'gemini') {
      return new GeminiClient({
        endpoint: provider.endpoint,
        apiKey: apiKey,
        model: provider.model,
        enableReasoning: provider.enableReasoning,
        reasoningEffort: provider.reasoningEffort,
      });
    } else {
      return new OpenAIClient({
        endpoint: provider.endpoint,
        apiKey: apiKey,
        model: provider.model,
        temperature: provider.temperature,
        apiMode: provider.apiMode,
        enableReasoning: provider.enableReasoning,
        reasoningEffort: provider.reasoningEffort,
      });
    }
  }

  static async fetchAvailableModels(
    providerConfig: AIProvider,
  ): Promise<string[]> {
    const client = await this.getClient(providerConfig);
    return client.fetchModels();
  }
}
