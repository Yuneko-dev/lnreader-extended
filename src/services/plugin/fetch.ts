import { normalizePluginChapters } from '@plugins/helpers/chapterPage';
import { isUrlAbsolute } from '@plugins/helpers/isAbsoluteUrl';
import { getPlugin } from '@plugins/pluginManager';

export const fetchNovel = async (pluginId: string, novelPath: string) => {
  const plugin = getPlugin(pluginId);
  if (!plugin) {
    throw new Error(`Unknown plugin: ${pluginId}`);
  }
  const res = await plugin.parseNovel(novelPath);
  return {
    ...res,
    chapters: normalizePluginChapters(pluginId, res.chapters, 'parseNovel'),
  };
};

export const fetchChapter = async (pluginId: string, chapterPath: string) => {
  const plugin = getPlugin(pluginId);
  let chapterText = `Unknown plugin: ${pluginId}`;
  if (plugin) {
    chapterText = await plugin.parseChapter(chapterPath);
  }
  return chapterText;
};

export const fetchChapters = async (pluginId: string, novelPath: string) => {
  const plugin = getPlugin(pluginId);
  if (!plugin) {
    throw new Error(`Unknown plugin: ${pluginId}`);
  }
  const res = await plugin.parseNovel(novelPath);
  return normalizePluginChapters(pluginId, res.chapters, 'parseNovel');
};

export const fetchPage = async (
  pluginId: string,
  novelPath: string,
  page: string,
) => {
  const plugin = getPlugin(pluginId);

  if (!plugin) {
    throw new Error(`Unknown plugin: ${pluginId}`);
  }

  if (!plugin.parsePage) {
    throw new Error(`Could not fetch chapters for page ${page}`);
  }
  const res = await plugin.parsePage(novelPath, page);
  return {
    ...res,
    chapters: normalizePluginChapters(pluginId, res.chapters, 'parsePage'),
  };
};

export const resolveUrl = (
  pluginId: string,
  path: string,
  isNovel?: boolean,
) => {
  if (isUrlAbsolute(path)) {
    return path;
  }
  const plugin = getPlugin(pluginId);
  try {
    if (!plugin) {
      throw new Error(`Unknown plugin: ${pluginId}`);
    }
    if (plugin.resolveUrl) {
      return plugin.resolveUrl(path, isNovel);
    }
  } catch {
    return path;
  }
  return plugin.site + path;
};
