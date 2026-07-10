import {
  initialSecuritySettings,
  LIBRARY_SETTINGS,
  LibrarySettings,
  SECURITY_SETTINGS,
  SecuritySettings,
} from '@hooks/persisted/useSettings';
import { PluginContentWarning, PluginItem } from '@plugins/types';
import { getMMKVObject } from '@utils/mmkv/mmkv';

const INSTALLED_PLUGINS_KEY = 'INSTALL_PLUGINS';

export type PrivacyAction =
  | 'readingProgress'
  | 'readingHistory'
  | 'searchHistory'
  | 'discordRPC';

const getPluginContentWarning = (pluginId?: string) => {
  if (!pluginId) {
    return PluginContentWarning.UNSPECIFIED;
  }

  const plugins = getMMKVObject<PluginItem[]>(INSTALLED_PLUGINS_KEY) || [];
  return (
    plugins.find(plugin => plugin.id === pluginId)?.contentWarning ??
    PluginContentWarning.UNSPECIFIED
  );
};

export const shouldBlockPrivacyAction = (
  action: PrivacyAction,
  pluginId?: string,
): boolean => {
  const librarySettings = getMMKVObject<LibrarySettings>(LIBRARY_SETTINGS);
  if (librarySettings?.incognitoMode) {
    return true;
  }

  if (action === 'searchHistory') {
    return false;
  }

  const securitySettings = getMMKVObject<SecuritySettings>(SECURITY_SETTINGS);
  const contentWarning = getPluginContentWarning(pluginId);
  const source =
    contentWarning === PluginContentWarning.MIXED
      ? 'mixed'
      : contentWarning === PluginContentWarning.NSFW
      ? 'nsfw'
      : undefined;

  return source
    ? securitySettings?.sourcePrivacy?.[source]?.[action] ??
        initialSecuritySettings.sourcePrivacy[source][action]
    : false;
};
