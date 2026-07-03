import {
  ACTIVE_AI_PROVIDER_KEY,
  AI_PROVIDERS_KEY,
  AIProvider,
} from '@hooks/persisted/useAIProviders';
import {
  initialTranslateSettings,
  TRANSLATE_SETTINGS,
  TranslateSettings,
} from '@hooks/persisted/useSettings';
import { getMMKVObject } from '@utils/mmkv/mmkv';

import { TranslateConfig } from './TranslateManager';

export interface TranslateConfigSnapshot {
  config: TranslateConfig;
  configKey: string;
  settings: TranslateSettings;
}

export const getTranslateConfigSnapshot = (): TranslateConfigSnapshot => {
  const settings =
    getMMKVObject<TranslateSettings>(TRANSLATE_SETTINGS) ||
    initialTranslateSettings;
  const providers = getMMKVObject<AIProvider[]>(AI_PROVIDERS_KEY) || [];
  const activeProviderId = getMMKVObject<string>(ACTIVE_AI_PROVIDER_KEY);
  const activeAIProvider = providers.find(
    provider => provider.id === activeProviderId,
  );
  const config: TranslateConfig = {
    engine: settings.engine,
    sourceLang: settings.sourceLang,
    targetLang: settings.targetLang,
    llmSystemPrompts: settings.llmSystemPrompts,
    activeSystemPromptId: settings.activeSystemPromptId,
    activeAIProvider,
    llmChunkingEnabled: settings.llmChunkingEnabled,
    llmChunkWordLimit: settings.llmChunkWordLimit,
    llmRetryEnabled: settings.llmRetryEnabled,
    llmRetryMaxAttempts: settings.llmRetryMaxAttempts,
    llmDisableStructuredOutput: settings.llmDisableStructuredOutput,
  };

  return { config, configKey: JSON.stringify(config), settings };
};
