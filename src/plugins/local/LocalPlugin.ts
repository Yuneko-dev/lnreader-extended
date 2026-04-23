import { eq, like, and } from 'drizzle-orm';

import { Plugin, NovelItem, SourceNovel, SourcePage, ChapterItem, PopularNovelsOptions, ImageRequestInit, PluginSettings } from '@plugins/types';
import { NovelStatus } from '@plugins/types';
import { Filters } from '@plugins/types/filterTypes';
import { dbManager } from '@database/db';
import { novel as novelSchema } from '@database/schema/novel';
import { chapter as chapterSchema } from '@database/schema/chapter';
import NativeFile from '@specs/NativeFile';
import { NOVEL_STORAGE } from '@utils/Storages';
import { getLocalServerUrl } from './localServerManager';
import { Storage } from '@plugins/helpers/storage';
import { LOCAL_PLUGIN_ID } from '@plugins/pluginManager';
import { load } from 'cheerio';

const storage = new Storage(LOCAL_PLUGIN_ID);

// Init default value for plugin settings
if (storage.get('disableEpubCss', true) === undefined) {
  storage.set('disableEpubCss', true);
}

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
  iconUrl = 'https://raw.githubusercontent.com/Yuneko-dev/lnreader-plugins/refs/heads/master/public/static/epub.png';
  imageRequestInit: ImageRequestInit = { headers: {} };
  hasSettings = true;

  pluginSettings: PluginSettings = {
    disableEpubCss: {
      label: '',
      value: true,
      type: 'Switch',
    },
  };

  get disableEpubCss(): boolean {
    return storage.get('disableEpubCss');
  }

  async popularNovels(
    pageNo: number,
    _options?: PopularNovelsOptions<Filters>,
  ): Promise<NovelItem[]> {
    if (pageNo > 1) return [];
    const novels = await dbManager
      .select({
        id: novelSchema.id,
        name: novelSchema.name,
        path: novelSchema.path,
        cover: novelSchema.cover,
      })
      .from(novelSchema)
      .where(eq(novelSchema.isLocal, true))
      .all();

    return novels.map(n => ({
      id: undefined,
      name: n.name,
      path: n.path,
      cover: rewriteFileUri(n.cover),
    }));
  }

  async searchNovels(
    searchTerm: string,
    pageNo: number,
  ): Promise<NovelItem[]> {
    if (pageNo > 1) return [];
    const novels = await dbManager
      .select({
        id: novelSchema.id,
        name: novelSchema.name,
        path: novelSchema.path,
        cover: novelSchema.cover,
      })
      .from(novelSchema)
      .where(
        and(
          eq(novelSchema.isLocal, true),
          like(novelSchema.name, `%${searchTerm}%`),
        ),
      )
      .all();

    return novels.map(n => ({
      id: undefined,
      name: n.name,
      path: n.path,
      cover: rewriteFileUri(n.cover),
    }));
  }

  async parseNovel(novelPath: string): Promise<SourceNovel> {
    const novel = await dbManager
      .select()
      .from(novelSchema)
      .where(
        and(
          eq(novelSchema.path, novelPath),
          eq(novelSchema.pluginId, 'local'),
        ),
      )
      .get();

    if (!novel) {
      throw new Error(`Local novel not found: ${novelPath}`);
    }

    const chapters = await dbManager
      .select()
      .from(chapterSchema)
      .where(eq(chapterSchema.novelId, novel.id))
      .all();

    const chapterItems: ChapterItem[] = chapters.map(ch => ({
      name: ch.name,
      path: ch.path,
      chapterNumber: ch.chapterNumber ?? undefined,
      releaseTime: ch.releaseTime ?? undefined,
      page: ch.page ?? '1',
    }));

    return {
      id: undefined,
      name: novel.name,
      path: novel.path,
      cover: rewriteFileUri(novel.cover),
      summary: novel.summary ?? undefined,
      author: novel.author ?? undefined,
      artist: novel.artist ?? undefined,
      status: (novel.status as NovelStatus) ?? NovelStatus.Unknown,
      genres: novel.genres ?? undefined,
      chapters: chapterItems,
    };
  }

  async parsePage(novelPath: string, _page: string): Promise<SourcePage> {
    const novel = await this.parseNovel(novelPath);
    return {
      chapters: novel.chapters || [],
    };
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
      $.root().find('link[rel="stylesheet"]').each((i, el) => {
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

/**
 * Rewrite a file:// URI to go through the local HTTP server.
 * Returns the original value if server is not running or value is not a file URI.
 */
function rewriteFileUri(uri: string | null | undefined): string | undefined {
  if (!uri) {
    return undefined;
  }
  const serverUrl = getLocalServerUrl();
  if (serverUrl && uri.includes('/Novels/')) {
    return uri.replace(/file:\/\/[^\s"']*\/Novels\//, serverUrl + '/');
  }
  return uri;
}
