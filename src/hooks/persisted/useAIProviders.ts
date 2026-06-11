import * as SecureStore from 'expo-secure-store';
import { useCallback, useMemo, useEffect, useState } from 'react';
import { useMMKVObject } from 'react-native-mmkv';
import {
  useTranslateSettings,
  type LLMProviderSupported,
} from '@hooks/persisted/useSettings';
import { randomUUID } from 'react-native-quick-crypto';

export const AI_PROVIDERS_KEY = 'AI_PROVIDERS';
export const ACTIVE_AI_PROVIDER_KEY = 'ACTIVE_AI_PROVIDER';

export interface AIProvider {
  id: string;
  alias: string;
  provider: LLMProviderSupported;
  endpoint: string;
  model: string;
  temperature?: number;
  apiMode?: 'responses' | 'chat-completions';
  enableReasoning?: boolean;
  reasoningEffort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
}

export const setApiKey = async (id: string, key: string) => {
  try {
    await SecureStore.setItemAsync(`ai_key_${id}`, key);
  } catch (e: any) {
    console.error('Failed to save API key to secure store', e);
    throw new Error('Failed to save API key to secure store: ' + e.message);
  }
};

export const getApiKey = async (id: string): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(`ai_key_${id}`);
  } catch (e) {
    console.error('Failed to get API key from secure store', e);
    return null;
  }
};

export const deleteApiKey = async (id: string) => {
  try {
    await SecureStore.deleteItemAsync(`ai_key_${id}`);
  } catch (e: any) {
    console.error('Failed to delete API key from secure store', e);
    throw new Error('Failed to delete API key from secure store: ' + e.message);
  }
};

const defaultProviders: AIProvider[] = [];

export const useAIProviders = () => {
  const [providers = defaultProviders, setSettings] =
    useMMKVObject<AIProvider[]>(AI_PROVIDERS_KEY);
  const [activeProviderId, setActiveProviderId] = useMMKVObject<string>(
    ACTIVE_AI_PROVIDER_KEY,
  );
  const [isReady, setIsReady] = useState(false);

  const oldSettings = useTranslateSettings();

  // Migration from old TranslateSettings to new AIProvider
  useEffect(() => {
    const migrate = async () => {
      try {
        if (oldSettings.llmApiKey && providers.length === 0) {
          const id = 'migrated-default-id';
          const newProvider: AIProvider = {
            id,
            alias: 'Default ' + oldSettings.llmProvider,
            provider: oldSettings.llmProvider,
            endpoint: oldSettings.llmEndpoint,
            model: oldSettings.llmModel,
            temperature: oldSettings.llmTemperature,
            apiMode: oldSettings.llmApiMode,
            enableReasoning: oldSettings.llmEnableReasoning,
            reasoningEffort: oldSettings.llmReasoningEffort,
          };
          setSettings([newProvider]);
          setActiveProviderId(id);
          await setApiKey(id, oldSettings.llmApiKey);

          // Clear old api key
          oldSettings.setTranslateSettings({ llmApiKey: '' });
        }
      } catch (e) {
        console.error('AIProvider Migration failed', e);
      } finally {
        setIsReady(true);
      }
    };

    if (!isReady) {
      migrate();
    }
  }, [
    providers.length,
    isReady,
    setSettings,
    setActiveProviderId,
    oldSettings,
  ]);

  const addProvider = useCallback(
    async (provider: Omit<AIProvider, 'id'>, apiKey: string) => {
      const id = randomUUID();
      const newProvider = { ...provider, id };
      setSettings(prev => [...(prev || []), newProvider]);
      await setApiKey(id, apiKey);
      if (!activeProviderId) {
        setActiveProviderId(id);
      }
    },
    [setSettings, activeProviderId, setActiveProviderId],
  );

  const updateProvider = useCallback(
    async (id: string, updates: Partial<AIProvider>, apiKey?: string) => {
      setSettings(prev =>
        (prev || []).map(p => (p.id === id ? { ...p, ...updates } : p)),
      );
      if (apiKey !== undefined) {
        await setApiKey(id, apiKey);
      }
    },
    [setSettings],
  );

  const removeProvider = useCallback(
    async (id: string) => {
      setSettings(prev => (prev || []).filter(p => p.id !== id));
      if (activeProviderId === id) {
        setActiveProviderId(undefined);
      }
      await deleteApiKey(id);
    },
    [setSettings, activeProviderId, setActiveProviderId],
  );

  return useMemo(
    () => ({
      isReady,
      providers,
      activeProviderId,
      activeProvider: providers.find(p => p.id === activeProviderId),
      setActiveProviderId,
      addProvider,
      updateProvider,
      removeProvider,
    }),
    [
      isReady,
      providers,
      activeProviderId,
      setActiveProviderId,
      addProvider,
      updateProvider,
      removeProvider,
    ],
  );
};
