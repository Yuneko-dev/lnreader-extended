/**
 * A downloaded chapter included in an exported EPUB publication.
 *
 * @see {@linkcode EpubExportChapter.htmlPath}
 */
export interface EpubExportChapter {
  /** Chapter title displayed in the table of contents. */
  title: string
  /** Absolute path to the downloaded chapter HTML file. */
  htmlPath: string
  /** LNReader novel identifier exposed to optional chapter JavaScript. */
  novelId: string
  /** LNReader chapter identifier exposed to optional chapter JavaScript. */
  chapterId: string
}
