import { MMKVStorage } from '@utils/mmkv/mmkv';
import { useCallback } from 'react';
import { getUserAgentSync } from 'react-native-device-info';
import { useMMKVString } from 'react-native-mmkv';

export const CUSTOM_USER_AGENT = 'CUSTOM_USER_AGENT';

export const getUserAgent = () => {
  return MMKVStorage.getString(CUSTOM_USER_AGENT) || getUserAgentSync();
};

export default function useUserAgent() {
  const [userAgent = getUserAgentSync(), _setUserAgent] =
    useMMKVString(CUSTOM_USER_AGENT);

  const setUserAgent = useCallback(
    (newUA: string | undefined | null) => {
      if (!newUA || newUA === getUserAgentSync()) {
        _setUserAgent(undefined); // removes the key completely
      } else {
        _setUserAgent(newUA);
      }
    },
    [_setUserAgent],
  );

  return {
    userAgent,
    setUserAgent,
  };
}
