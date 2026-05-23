import {
  ctr,
  ecb,
  cbc,
  cfb,
  gcm,
  gcmsiv,
  aeskw,
  aeskwp,
  cmac,
  aessiv,
} from '@noble/ciphers/aes.js';
import { utf8ToBytes, bytesToUtf8 } from '@noble/ciphers/utils.js';
import dayjs from 'dayjs';
import { load } from 'cheerio';
import { Parser } from 'htmlparser2';
import { reverse, uniqBy } from 'lodash-es';
import { encode, decode } from 'urlencode';
import {
  encode as encodeHtmlEntities,
  decode as decodeHtmlEntities,
} from 'html-entities';
import CookieManager from '@preeternal/react-native-cookie-manager';
import NodeCrypto from 'react-native-quick-crypto';

import { getRepositoriesFromDb } from '@database/queries/RepositoryQueries';
import { getUserAgent } from '@hooks/persisted/useUserAgent';
import { newer } from '@utils/compareVersion';
import NativeFile from '@specs/NativeFile';
import { showToast } from '@utils/showToast';
import { PLUGIN_STORAGE } from '@utils/Storages';

import {
  store,
  Storage,
  LocalStorage,
  SessionStorage,
} from './helpers/storage';
import { NovelStatus, Plugin, PluginItem } from './types';
import { defaultCover } from './helpers/constants';
import { downloadFile, fetchApi, fetchProto, fetchText } from './helpers/fetch';
import { FilterTypes } from './types/filterTypes';
import { isUrlAbsolute } from './helpers/isAbsoluteUrl';
import { localPlugin } from './local/LocalPlugin';
import {
  solveCloudflareAPI,
  solveCloudflareTurnstileAPI,
} from './helpers/cloudflareStore';

const getBypassCacheUrl = (url: string) => {
  return `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
};

const packages: Record<string, any> = {
  'htmlparser2': { Parser },
  'cheerio': { load },
  'dayjs': dayjs,
  'urlencode': { encode, decode },
  '@libs/novelStatus': { NovelStatus },
  '@libs/fetch': { fetchApi, fetchText, fetchProto },
  '@libs/isAbsoluteUrl': { isUrlAbsolute },
  '@libs/filterInputs': { FilterTypes },
  '@libs/defaultCover': { defaultCover },
  '@libs/aes': { ctr, ecb, cbc, cfb, gcm, gcmsiv, aeskw, aeskwp, cmac, aessiv },
  '@libs/utils': {
    utf8ToBytes,
    bytesToUtf8,
    Buffer: NodeCrypto.Buffer,
    encodeHtmlEntities,
    decodeHtmlEntities,
    NodeCrypto,
    getUserAgent,
  },
  '@libs/cookie': {
    set: CookieManager.set,
    setFromResponse: CookieManager.setFromResponse,
    get: CookieManager.get,
    flush: CookieManager.flush,
    removeSessionCookies: CookieManager.removeSessionCookies,
  },
  '@libs/webview': {
    solveCloudflare: solveCloudflareAPI,
    solveCloudflareTurnstile: solveCloudflareTurnstileAPI,
  },
};

const initPlugin = (pluginId: string, rawCode: string) => {
  try {
    const _require = (packageName: string) => {
      if (packageName === '@libs/storage') {
        return {
          storage: new Storage(pluginId),
          localStorage: new LocalStorage(pluginId),
          sessionStorage: new SessionStorage(pluginId),
        };
      }
      return packages[packageName];
    };
    /* eslint no-new-func: "off", curly: "error" */
    const plugin: Plugin = Function(
      'require',
      'module',
      `const exports = module.exports = {};
      ${rawCode};
      return exports.default`,
    )(_require, {});

    if (!plugin.imageRequestInit) {
      plugin.imageRequestInit = {
        headers: { 'User-Agent': getUserAgent() },
      };
    } else {
      if (!plugin.imageRequestInit.headers) {
        plugin.imageRequestInit.headers = {};
      }

      const hasUserAgent = Object.keys(plugin.imageRequestInit.headers).some(
        header => header.toLowerCase() === 'user-agent',
      );

      if (!hasUserAgent) {
        plugin.imageRequestInit.headers['User-Agent'] = getUserAgent();
      }
    }

    return plugin;
  } catch (e) {
    console.error('Init Plugin Failed:', e);
    return undefined;
  }
};

const plugins: Record<string, Plugin | undefined> = {};

const installPlugin = async (
  _plugin: PluginItem,
): Promise<Plugin | undefined> => {
  const rawCode = await fetch(getBypassCacheUrl(_plugin.url), {
    headers: { 'pragma': 'no-cache', 'cache-control': 'no-cache' },
  }).then(res => res.text());
  const plugin = initPlugin(_plugin.id, rawCode);
  if (!plugin) {
    return undefined;
  }
  let currentPlugin = plugins[plugin.id];
  if (
    !currentPlugin ||
    newer(plugin.version, currentPlugin.version) ||
    __DEV__
  ) {
    plugins[plugin.id] = plugin;
    currentPlugin = plugin;

    // save plugin code;
    const pluginDir = `${PLUGIN_STORAGE}/${plugin.id}`;
    NativeFile.mkdir(pluginDir);
    const pluginPath = pluginDir + '/index.js';
    const customJSPath = pluginDir + '/custom.js';
    const customCSSPath = pluginDir + '/custom.css';
    if (_plugin.customJS) {
      await downloadFile(getBypassCacheUrl(_plugin.customJS), customJSPath);
      console.log(`[${plugin.id}]: Updated JS`);
    } else if (NativeFile.exists(customJSPath)) {
      NativeFile.unlink(customJSPath);
      console.log(`[${plugin.id}]: Deleted JS`);
    }
    if (_plugin.customCSS) {
      await downloadFile(getBypassCacheUrl(_plugin.customCSS), customCSSPath);
      console.log(`[${plugin.id}]: Updated CSS`);
    } else if (NativeFile.exists(customCSSPath)) {
      NativeFile.unlink(customCSSPath);
      console.log(`[${plugin.id}]: Deleted CSS`);
    }
    NativeFile.writeFile(pluginPath, rawCode);
  }
  return currentPlugin;
};

const uninstallPlugin = async (_plugin: PluginItem) => {
  plugins[_plugin.id] = undefined;
  store.getAllKeys().forEach(key => {
    if (key.startsWith(_plugin.id)) {
      store.delete(key);
    }
  });
  const pluginFilePath = `${PLUGIN_STORAGE}/${_plugin.id}/index.js`;
  const customJSPath = `${PLUGIN_STORAGE}/${_plugin.id}/custom.js`;
  const customCSSPath = `${PLUGIN_STORAGE}/${_plugin.id}/custom.css`;

  if (NativeFile.exists(pluginFilePath)) {
    NativeFile.unlink(pluginFilePath);
  }
  if (NativeFile.exists(customJSPath)) {
    NativeFile.unlink(customJSPath);
  }
  if (NativeFile.exists(customCSSPath)) {
    NativeFile.unlink(customCSSPath);
  }
};

const updatePlugin = async (plugin: PluginItem) => {
  return installPlugin(plugin);
};

const fetchPlugins = async (): Promise<PluginItem[]> => {
  const allPlugins: PluginItem[] = [];
  const allRepositories = await getRepositoriesFromDb();

  const repoPluginsRes = await Promise.allSettled(
    allRepositories.map(({ url }) =>
      fetch(getBypassCacheUrl(url), {
        headers: { 'pragma': 'no-cache', 'cache-control': 'no-cache' },
      }).then(res => res.json()),
    ),
  );

  repoPluginsRes.forEach(repoPlugins => {
    if (repoPlugins.status === 'fulfilled') {
      allPlugins.push(...repoPlugins.value);
    } else {
      showToast(repoPlugins.reason.toString());
    }
  });

  return uniqBy(reverse(allPlugins), 'id');
};

const getPlugin = (pluginId: string) => {
  if (pluginId === LOCAL_PLUGIN_ID) {
    return localPlugin;
  }

  if (!plugins[pluginId]) {
    const filePath = `${PLUGIN_STORAGE}/${pluginId}/index.js`;
    try {
      const code = NativeFile.readFile(filePath);
      const plugin = initPlugin(pluginId, code);
      plugins[pluginId] = plugin;
    } catch {
      // file doesnt exist
      return undefined;
    }
  }
  return plugins[pluginId];
};

const LOCAL_PLUGIN_ID = 'local';

export {
  getPlugin,
  installPlugin,
  uninstallPlugin,
  updatePlugin,
  fetchPlugins,
  LOCAL_PLUGIN_ID,
};
