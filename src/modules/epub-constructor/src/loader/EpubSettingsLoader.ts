import parse, { HTMLElement } from 'node-html-parser';
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
    let chapters = [] as string[] | HTMLElement[];

    epubSettings.stylesheet = style;
    let page = undefined as undefined | HTMLElement;
    page = parse(pageContent);
    epubSettings.parameter = page.querySelectorAll('param').map(a => {
      return {
        name: a.getAttribute('name'),
        value: a.getAttribute('value'),
      } as Parameter;
    });
    epubSettings.title = page.querySelector('.title')?.innerText!;
    epubSettings.author = page.querySelector('.author')?.innerText!;
    epubSettings.rights = page.querySelector('.rights')?.innerText!;
    epubSettings.description = page.querySelector('.description')?.innerText!;
    epubSettings.language = page.querySelector('.language')?.innerText!;
    epubSettings.bookId = page.querySelector('.identifier')?.innerHTML!;
    epubSettings.source = page.querySelector('.source')?.innerText!;
    chapters = page.querySelectorAll('itemref');

    if (!epubSettings.chapters) {
      epubSettings.chapters = [] as EpubChapter[];
    }

    const len = chapters.length + 1;
    let index = 0;
    for (const x of chapters) {
      try {
        let content = '';
        let chItem = '';
        const chId = x.getAttribute('idref');
        chItem =
          page
            ?.querySelector("item[id='" + chId + "']")
            ?.getAttribute('href') ?? '';
        content = file.find(x => x.path.indexOf(chItem) != -1)?.content ?? '';
        const chapter = parse(content);
        epubSettings.chapters.push({
          parameter: chapter.querySelectorAll('param').map((a: any) => {
            return {
              name: a.getAttribute('name'),
              value: a.getAttribute('value'),
            } as Parameter;
          }),
          title: chapter.querySelector('title')?.innerText ?? '',
          htmlBody: chapter.querySelector('body')?.innerHTML!,
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
