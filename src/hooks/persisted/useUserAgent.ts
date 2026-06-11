import { MMKVStorage } from '@utils/mmkv/mmkv';
import { getUserAgentSync } from 'react-native-device-info';
import { useMMKVString } from 'react-native-mmkv';

export const USER_AGENT = 'USER_AGENT';

export const getUserAgent = () => {
  return MMKVStorage.getString(USER_AGENT) || getUserAgentSync();
};

export default function useUserAgent() {
  const [userAgent = getUserAgentSync(), setUserAgent] =
    useMMKVString(USER_AGENT);

  return {
    userAgent,
    setUserAgent,
  };
}
