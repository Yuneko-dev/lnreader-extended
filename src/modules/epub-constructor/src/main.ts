import sanitizeFileName from 'sanitize-filename';

import { EpubSettings, File, InternalEpubChapter } from '../types';
import {
  defaultContainer,
  defaultEpub,
  defaultHtmlToc,
  defaultNcxToc,
} from './constructors/defaultsConstructor';
import {
  manifestChapter,
  manifestCover,
  manifestImage,
  manifestNav,
  manifestScript,
  manifestStyle,
  manifestToc,
} from './constructors/manifestConstructor';
import { createMetadata } from './constructors/metadataConstructor';
import { createChapter } from './methods/createChapter';
import { createStyle } from './methods/createStyle';
import {
  createFile,
  getImageType,
  removeFileExtension,
  setChapterFileNames,
  sleep,
} from './methods/helper';
import { escapeXml, sanitizeXmlId } from './methods/xmlEscape';

const OPF_FILE_NAME = 'package';

export default class EpubFile {
  epubSettings: EpubSettings;

  constructor(epubSettings: EpubSettings) {
    const fileName = epubSettings.fileName?.trim();

    this.epubSettings = {
      ...epubSettings,
      fileName: sanitizeFileName(
        fileName && fileName !== '' ? fileName : epubSettings.title,
      ),
    };
  }

  /**
   * Constructs the EPUB file based on the provided settings.
   * @param localOnProgress Optional callback function to track the progress of EPUB construction.
   * @returns An array of File objects representing the files in the EPUB.
   * @throws Error if the EPUB file needs at least one chapter.
   */
  public async constructEpub(
    localOnProgress?: (progress: number) => Promise<void>,
  ): Promise<File[]> {
    const files: File[] = [];
    const manifest: string[] = [];
    const spine: string[] = [];
    let dProgress = 0;

    if (
      !this.epubSettings.chapters ||
      this.epubSettings.chapters.length === 0
    ) {
      throw new Error('Epub file needs at least one chapter');
    }
    if (
      !this.epubSettings.title ||
      this.epubSettings.title.trim() === '' ||
      !this.epubSettings.fileName
    ) {
      throw new Error('Epub file needs a title');
    }

    const len = this.epubSettings.chapters.length;
    const hasScript = !!this.epubSettings.js;

    this.epubSettings.bookId ??= new Date().getUTCMilliseconds().toString();
    this.epubSettings.fileName = removeFileExtension(
      this.epubSettings.fileName,
    );

    // Cover image — now stored under EPUB/images/ (unified directory)
    if (this.epubSettings.cover) {
      const fileType = getImageType(this.epubSettings.cover);
      const coverFilePath = `EPUB/images/cover.${fileType}`;
      files.push(createFile(coverFilePath, this.epubSettings.cover, true));
      manifest.push(manifestCover(fileType));
    }

    files.push(
      createFile('META-INF/container.xml', defaultContainer(OPF_FILE_NAME)),
      createFile('EPUB/styles.css', createStyle(this.epubSettings.stylesheet)),
    );

    // Only include script.js if custom JS is provided
    if (hasScript) {
      files.push(
        createFile(
          'EPUB/script.js',
          `function fnEpub(){${this.epubSettings.js}}`,
        ),
      );
      manifest.push(manifestScript());
    }

    let epub = defaultEpub();
    let ncxToc = defaultNcxToc(
      escapeXml(this.epubSettings.title),
      escapeXml(this.epubSettings.bookId),
      this.epubSettings.author
        ? escapeXml(this.epubSettings.author)
        : undefined,
    );
    let htmlToc = defaultHtmlToc(escapeXml(this.epubSettings.title));
    const metadata = createMetadata(this.epubSettings);
    const navMap: string[] = [];
    const ol: string[] = [];

    this.epubSettings.chapters = setChapterFileNames(
      this.epubSettings.chapters,
    );

    for (let index = 0; index < len; index++) {
      const chapter = this.epubSettings.chapters[index] as InternalEpubChapter;
      dProgress = (index / len) * 100;

      let imageIndex = 0;
      const idRef = sanitizeXmlId('ch');

      // Process inline images: extract URIs, create image files, update paths
      // Images are stored under EPUB/images/, chapters are at EPUB/content/
      // So relative path from chapter to image: ../images/
      chapter.htmlBody = chapter.htmlBody.replace(
        /(?<=<img[^>]+src=(?:"|')).+?(?="|')/gi,
        (uri: string) => {
          imageIndex++;
          const imageIdRef = `${idRef}_img_${imageIndex}`;
          const fileType = getImageType(uri);
          const imagePath = `EPUB/images/${imageIdRef}.${fileType}`;
          files.push(createFile(imagePath, uri, true));
          manifest.push(
            manifestImage(`images/${imageIdRef}.${fileType}`, fileType),
          );
          return `../images/${imageIdRef}.${fileType}`;
        },
      );

      manifest.push(manifestChapter(idRef, chapter.fileName, hasScript));
      files.push(createChapter(chapter, hasScript));
      spine.push(`<itemref idref="${idRef}"/>`);
      ol.push(
        `<li><a href="${chapter.fileName}">${escapeXml(
          chapter.title,
        )}</a></li>`,
      );
      navMap.push(
        `<navPoint id="${idRef}" playOrder="${index + 1}">
      <navLabel>
        <text>${escapeXml(chapter.title)}</text>
      </navLabel>
      <content src="${chapter.fileName}"/>
    </navPoint>`,
      );

      if (localOnProgress && index % 300 === 0) {
        await sleep(0);
      }
      if (localOnProgress) {
        await localOnProgress(dProgress);
      }
    }

    manifest.push(manifestNav(), manifestStyle(), manifestToc());

    epub = epub
      .replace('#manifest', manifest.join('\n'))
      .replace('#spine', spine.join('\n'))
      .replace('#metadata', metadata);
    ncxToc = ncxToc.replace('#navMap', navMap.join('\n'));
    htmlToc = htmlToc.replace('#ol', ol.join('\n'));

    files.push(
      createFile(`EPUB/${OPF_FILE_NAME}.opf`, epub),
      createFile('EPUB/toc.xhtml', htmlToc),
      createFile('EPUB/toc.ncx', ncxToc),
      createFile('mimetype', 'application/epub+zip'),
    );

    if (localOnProgress) {
      await localOnProgress(len);
    }

    return files;
  }

  /**
   * Extracts EPUB settings from an existing EPUB file.
   * @param file An array of File objects representing the files in the EPUB.
   * @returns The extracted EPUB settings.
   */
  // static async load(file: File[]): Promise<EpubSettings> {
  //   return await EpubSettingsLoader(file);
  // }
}
