import {
  fetchPlugins,
  installPlugin as _install,
  uninstallPlugin as _uninstall,
  updatePlugin as _update,
} from '@plugins/pluginManager';
import { PluginItem } from '@plugins/types';
import { getString } from '@strings/translations';
import { newer } from '@utils/compareVersion';
import { languagesMapping } from '@utils/constants/languages';
import { getMMKVObject, MMKVStorage, setMMKVObject } from '@utils/mmkv/mmkv';
import { getLocales } from 'expo-localization';
import { orderBy } from 'lodash-es';
import { useCallback, useMemo } from 'react';
import { useMMKVObject } from 'react-native-mmkv';

export const AVAILABLE_PLUGINS = 'AVAILABLE_PLUGINS';
export const INSTALLED_PLUGINS = 'INSTALL_PLUGINS';
export const LANGUAGES_FILTER = 'LANGUAGES_FILTER';
export const LAST_USED_PLUGIN = 'LAST_USED_PLUGIN';
export const PINNED_PLUGINS = 'PINNED_PLUGINS';
export const FILTERED_AVAILABLE_PLUGINS = 'FILTERED_AVAILABLE_PLUGINS';
export const FILTERED_INSTALLED_PLUGINS = 'FILTERED_INSTALLED_PLUGINS';

export default function usePlugins() {
  const defaultLang =
    languagesMapping[getLocales()[0]?.languageCode ?? 'en'] ?? 'English';

  const [lastUsedPlugin, setLastUsedPlugin] =
    useMMKVObject<PluginItem>(LAST_USED_PLUGIN);
  const [pinnedPlugins = [], setPinnedPlugins] =
    useMMKVObject<string[]>(PINNED_PLUGINS);
  const [languagesFilter = [defaultLang], setLanguagesFilter] =
    useMMKVObject<string[]>(LANGUAGES_FILTER);
  const [filteredAvailablePlugins = [], setFilteredAvailablePlugins] =
    useMMKVObject<PluginItem[]>(FILTERED_AVAILABLE_PLUGINS);
  const [filteredInstalledPlugins = [], setFilteredInstalledPlugins] =
    useMMKVObject<PluginItem[]>(FILTERED_INSTALLED_PLUGINS);
  const [availablePlugins = []] =
    useMMKVObject<PluginItem[]>(AVAILABLE_PLUGINS);

  const availablePluginsSet = useMemo(
    () => new Set(availablePlugins.map(p => p.id)),
    [availablePlugins],
  );
  /**
   * @param filter
   * We cant use the languagesFilter directly because it is updated only after component's lifecycle end.
   * And toggleLanguagFilter triggers filterPlugins before lifecycle end.
   */
  const filterPlugins = useCallback(
    (filter: string[]) => {
      const installedPlugins =
        getMMKVObject<PluginItem[]>(INSTALLED_PLUGINS) || [];
      const availableFilterPlugins =
        getMMKVObject<PluginItem[]>(AVAILABLE_PLUGINS) || [];
      setFilteredInstalledPlugins(
        installedPlugins.filter(plg => filter.includes(plg.lang)),
      );
      setFilteredAvailablePlugins(
        orderBy(
          availableFilterPlugins
            .filter(
              avalilablePlugin =>
                !installedPlugins.some(
                  installedPlugin => installedPlugin.id === avalilablePlugin.id,
                ),
            )
            .filter(plg => filter.includes(plg.lang)),
          'name',
        ),
      );
    },
    [setFilteredAvailablePlugins, setFilteredInstalledPlugins],
  );

  const refreshPlugins = useCallback(() => {
    const installedPlugins =
      getMMKVObject<PluginItem[]>(INSTALLED_PLUGINS) || [];
    return fetchPlugins().then(fetchedPlugins => {
      // Update installed plugins with new version info (immutably)
      const updatedInstalled = installedPlugins.map(installed => {
        const remote = fetchedPlugins.find(p => p.id === installed.id);
        if (remote && newer(remote.version, installed.version)) {
          const updated = {
            ...installed,
            hasUpdate: true,
            iconUrl: remote.iconUrl,
            url: remote.url,
          };
          if (installed.id === lastUsedPlugin?.id) {
            setLastUsedPlugin(updated);
          }
          return updated;
        }
        return installed;
      });

      setMMKVObject(INSTALLED_PLUGINS, updatedInstalled);
      setMMKVObject(AVAILABLE_PLUGINS, fetchedPlugins);
      filterPlugins(languagesFilter);
    });
  }, [filterPlugins, languagesFilter, lastUsedPlugin?.id, setLastUsedPlugin]);

  const toggleLanguageFilter = useCallback(
    (lang: string) => {
      const newFilter = languagesFilter.includes(lang)
        ? languagesFilter.filter(l => l !== lang)
        : [lang, ...languagesFilter];
      setLanguagesFilter(newFilter);
      filterPlugins(newFilter);
    },
    [languagesFilter, setLanguagesFilter, filterPlugins],
  );

  /**
   * Variable scope naming
   * plugin: parameter
   * _plg: value returned by pluginManager functions
   * plg: parameter in JS class method callback (.map, .reducer, ...)
   */

  const installPlugin = useCallback(
    (plugin: PluginItem) => {
      return _install(plugin).then(_plg => {
        if (_plg) {
          const installedPlugins =
            getMMKVObject<PluginItem[]>(INSTALLED_PLUGINS) || [];
          const actualPlugin: PluginItem = {
            ...plugin,
            version: _plg.version,
            hasSettings: !!_plg.pluginSettings,
          };
          // safe
          if (!installedPlugins.some(plg => plg.id === plugin.id)) {
            setMMKVObject(INSTALLED_PLUGINS, [
              ...installedPlugins,
              actualPlugin,
            ]);
          }
          filterPlugins(languagesFilter);
        } else {
          throw new Error(
            getString('browseScreen.installFailed', { name: plugin.name }),
          );
        }
      });
    },
    [filterPlugins, languagesFilter],
  );

  const uninstallPlugin = useCallback(
    (plugin: PluginItem) => {
      if (lastUsedPlugin?.id === plugin.id) {
        MMKVStorage.remove(LAST_USED_PLUGIN);
      }
      if (pinnedPlugins.includes(plugin.id)) {
        setPinnedPlugins(pinnedPlugins.filter(id => id !== plugin.id));
      }
      const installedPlugins =
        getMMKVObject<PluginItem[]>(INSTALLED_PLUGINS) || [];
      setMMKVObject(
        INSTALLED_PLUGINS,
        installedPlugins.filter(plg => plg.id !== plugin.id),
      );
      filterPlugins(languagesFilter);
      return _uninstall(plugin).then(() => {});
    },
    [
      lastUsedPlugin?.id,
      pinnedPlugins,
      setPinnedPlugins,
      filterPlugins,
      languagesFilter,
    ],
  );

  const updatePlugin = useCallback(
    (plugin: PluginItem) => {
      const availableUpdatePlugins =
        getMMKVObject<PluginItem[]>(AVAILABLE_PLUGINS) || [];
      const latestPlugin =
        availableUpdatePlugins.find(p => p.id === plugin.id) || plugin;

      return _update(latestPlugin).then(_plg => {
        if (plugin.version === _plg?.version && !__DEV__) {
          throw new Error('No update found!');
        }
        if (_plg) {
          const installedPlugins =
            getMMKVObject<PluginItem[]>(INSTALLED_PLUGINS) || [];
          setMMKVObject<PluginItem[]>(
            INSTALLED_PLUGINS,
            installedPlugins.map(plg => {
              if (plugin.id !== plg.id) {
                return plg;
              }
              const newPlugin: PluginItem = {
                ...latestPlugin,
                site: _plg.site,
                name: _plg.name,
                version: _plg.version,
                hasUpdate: false,
                hasSettings: !!_plg.pluginSettings,
              };
              if (newPlugin.id === lastUsedPlugin?.id) {
                setLastUsedPlugin(newPlugin);
              }
              return newPlugin;
            }),
          );
          filterPlugins(languagesFilter);
          return _plg.version;
        } else {
          throw Error(getString('browseScreen.updateFailed'));
        }
      });
    },
    [filterPlugins, languagesFilter, lastUsedPlugin?.id, setLastUsedPlugin],
  );

  const togglePinPlugin = useCallback(
    (pluginId: string) => {
      if (pinnedPlugins.includes(pluginId)) {
        setPinnedPlugins(pinnedPlugins.filter(id => id !== pluginId));
      } else {
        setPinnedPlugins([...pinnedPlugins, pluginId]);
      }
    },
    [pinnedPlugins, setPinnedPlugins],
  );

  const isPinned = useCallback(
    (pluginId: string) => pinnedPlugins.includes(pluginId),
    [pinnedPlugins],
  );

  return useMemo(
    () => ({
      filteredAvailablePlugins,
      filteredInstalledPlugins,
      availablePluginsSet,
      lastUsedPlugin,
      pinnedPlugins,
      languagesFilter,
      setLastUsedPlugin,
      refreshPlugins,
      toggleLanguageFilter,
      installPlugin,
      uninstallPlugin,
      updatePlugin,
      togglePinPlugin,
      isPinned,
    }),
    [
      filteredAvailablePlugins,
      filteredInstalledPlugins,
      availablePluginsSet,
      lastUsedPlugin,
      pinnedPlugins,
      languagesFilter,
      setLastUsedPlugin,
      refreshPlugins,
      toggleLanguageFilter,
      installPlugin,
      uninstallPlugin,
      updatePlugin,
      togglePinPlugin,
      isPinned,
    ],
  );
}
