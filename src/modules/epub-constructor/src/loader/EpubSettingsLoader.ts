import { load, Element } from 'cheerio';
import { EpubSettings, EpubChapter, Parameter, File } from '../../types';
import { parseJSon, isValid, sleep } from '../methods/helper';

export async function EpubSettingsLoader(
  file: File[],
  localOnProgress?: (progress: number) => void,
) {
  try {
    const jsonSettingsFile = file.find(x => x.path.endsWith('.json'));
    if (jsonSettingsFile) {
      return parseJSon(jsonSettingsFile.content) as EpubSettings;
    }
    let dProgress = 0.01;
    localOnProgress?.(dProgress);
    const epubSettings = { chapters: [] as EpubChapter[] } as EpubSettings;
    if (!isValid(file, ['toc.ncx', 'toc.xhtml', '.opf', 'styles.css'])) {
      throw 'This is not a valid Epub file created by this library(epub-constructor)';
    }

    const pageContent =
      file.find(x => x.path.indexOf('.opf') != -1)?.content ?? '';
    const style =
      file.find(x => x.path.indexOf('styles.css') != -1)?.content ?? '';
    let chapters = [] as Element[];

    epubSettings.stylesheet = style;
    const $page = load(pageContent, { xmlMode: true });
    
    epubSettings.parameter = $page('param').map((_, a) => {
      const $a = $page(a);
      return {
        name: $a.attr('name') ?? null,
        value: $a.attr('value') ?? null,
      } as Parameter;
    }).get();
    
    epubSettings.title = $page('.title').text();
    epubSettings.author = $page('.author').text();
    epubSettings.rights = $page('.rights').text();
    epubSettings.description = $page('.description').text();
    epubSettings.language = $page('.language').text();
    epubSettings.bookId = $page('.identifier').html() ?? '';
    epubSettings.source = $page('.source').text();
    chapters = $page('itemref').toArray();

    if (!epubSettings.chapters) {
      epubSettings.chapters = [] as EpubChapter[];
    }

    const len = chapters.length + 1;
    let index = 0;
    for (const x of chapters) {
      try {
        let content = '';
        let chItem = '';
        const chId = $page(x).attr('idref');
        chItem = $page(`item[id='${chId}']`).attr('href') ?? '';
        content = file.find(x => x.path.indexOf(chItem) != -1)?.content ?? '';
        const $chapter = load(content, { xmlMode: true });
        
        epubSettings.chapters.push({
          parameter: $chapter('param').map((_, a) => {
            const $a = $chapter(a);
            return {
              name: $a.attr('name') ?? null,
              value: $a.attr('value') ?? null,
            } as Parameter;
          }).get(),
          title: $chapter('title').text(),
          htmlBody: $chapter('body').html() ?? '',
        });
        
        dProgress = (index / parseFloat(len.toString())) * 100;
        localOnProgress?.(dProgress);
        index++;
        await sleep(0);
      } catch (error) {
        throw error;
      }
    }
    dProgress = (len / parseFloat(len.toString())) * 100;
    localOnProgress?.(dProgress);
    return epubSettings;
  } catch (error) {
    throw error;
  }
}
