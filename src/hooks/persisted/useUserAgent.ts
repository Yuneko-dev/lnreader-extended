import { MMKVStorage } from '@utils/mmkv/mmkv';
import { useCallback } from 'react';
import { getUserAgentSync } from 'react-native-device-info';
import { useMMKVString } from 'react-native-mmkv';

export const CUSTOM_USER_AGENT = 'CUSTOM_USER_AGENT';

export const getDefaultUserAgent = () =>
  getUserAgentSync()
    .replace(/; Android .*?\)/, '; Android 10; K)')
    .replace(/Version\/.* Chrome\//, 'Chrome/');

export const getUserAgent = () => {
  return (
    MMKVStorage.getString(CUSTOM_USER_AGENT)?.trim() || getDefaultUserAgent()
  );
};

export default function useUserAgent() {
  const [customUserAgent, _setUserAgent] = useMMKVString(CUSTOM_USER_AGENT);
  const defaultUserAgent = getDefaultUserAgent();
  const userAgent = customUserAgent?.trim() || defaultUserAgent;

  const setUserAgent = useCallback(
    (newUA: string | undefined | null) => {
      const normalizedUserAgent = newUA?.trim();
      if (!normalizedUserAgent || normalizedUserAgent === defaultUserAgent) {
        // Remove the custom key so future WebView updates refresh the default.
        _setUserAgent(undefined);
      } else {
        _setUserAgent(normalizedUserAgent);
      }
    },
    [_setUserAgent, defaultUserAgent],
  );

  return {
    userAgent,
    defaultUserAgent,
    hasCustomUserAgent: Boolean(customUserAgent?.trim()),
    setUserAgent,
  };
}
