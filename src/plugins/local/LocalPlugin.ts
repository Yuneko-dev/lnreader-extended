import { Storage } from '@plugins/helpers/storage';
import {
  ImageRequestInit,
  NovelItem,
  Plugin,
  PluginContentType,
  PluginContentWarning,
  PluginSettings,
  SourceNovel,
  SourcePage,
} from '@plugins/types';
import NativeFile from '@specs/NativeFile';
import { NOVEL_STORAGE } from '@utils/Storages';
import { load } from 'cheerio';

import { getLocalServerUrl } from './localServerManager';

export const LOCAL_PLUGIN_ID = 'local';

const storage = new Storage(LOCAL_PLUGIN_ID);

/**
 * A built-in plugin that handles locally imported novels (EPUBs).
 *
 * Instead of fetching from a remote source, it reads from the local
 * database and filesystem. All file:// URIs in chapter HTML are
 * rewritten to http://localhost:PORT/ to avoid FileUriExposedException.
 */
class LocalPlugin implements Plugin {
  id = LOCAL_PLUGIN_ID;
  name = 'Local EPUBs';
  site = '';
  lang = 'Multi';
  version = '1.0.0';
  url = '';
  iconUrl =
    'https://raw.githubusercontent.com/Yuneko-dev/lnreader-plugins/refs/heads/master/public/static/epub.png';
  contentWarning = PluginContentWarning.SAFE;
  contentType = PluginContentType.NOVEL;
  imageRequestInit: ImageRequestInit = { headers: {} };
  hasSettings = true;
  webStorageUtilized = false;

  pluginSettings: PluginSettings = {
    disableEpubCss: {
      label: 'Remove embedded EPUB CSS to prevent layout issues.',
      value: true,
      type: 'Switch',
    },
  };

  get disableEpubCss(): boolean {
    return Boolean(storage.get('disableEpubCss'));
  }

  async popularNovels(): Promise<NovelItem[]> {
    throw new Error('Do not open it in this plugin. Use Category instead.');
  }

  async searchNovels(): Promise<NovelItem[]> {
    throw new Error('Do not open it in this plugin. Use Category instead.');
  }

  async parseNovel(): Promise<SourceNovel> {
    throw new Error('Do not open it in this plugin. Use Category instead.');
  }

  async parsePage(): Promise<SourcePage> {
    throw new Error('Do not open it in this plugin. Use Category instead.');
  }

  async parseChapter(chapterPath: string): Promise<string> {
    // chapterPath format: NOVEL_STORAGE/local/{novelId}/{chapterId}/index.html
    // or just the directory path
    const filePath = chapterPath.endsWith('/index.html')
      ? chapterPath
      : chapterPath + '/index.html';

    if (!NativeFile.exists(filePath)) {
      return '';
    }

    let html = NativeFile.readFile(filePath);

    // Strip absolute file:// paths down to just the filename.
    // e.g. file:///storage/.../Novels/local/124/image.png → image.png
    // The WebView's baseUrl points to the local server, so relative paths
    // will resolve automatically like a real web page.
    html = html.replace(
      /file:\/\/[^\s"']*\/Novels\/local\/\d+\/([^\s"']+)/g,
      '$1',
    );

    const $ = load(html);

    if (this.disableEpubCss) {
      // Remove all stylesheet including those in <head> and <body>
      $.root()
        .find('link[rel="stylesheet"]')
        .each((i, el) => {
          $(el).remove();
        });
    }

    html = $.html();

    return html;
  }

  resolveUrl(path: string): string {
    const serverUrl = getLocalServerUrl();
    if (serverUrl && path.startsWith(NOVEL_STORAGE)) {
      return path.replace(NOVEL_STORAGE, serverUrl);
    }
    return path;
  }
}

export const localPlugin = new LocalPlugin();
