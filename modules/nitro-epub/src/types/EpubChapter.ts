/**
 * Identifies a chapter discovered while parsing an EPUB publication.
 *
 * @see {@linkcode EpubChapter.path}
 */
export interface EpubChapter {
  /** Chapter title presented to the reader. */
  name: string
  /** Absolute path to the extracted chapter document. */
  path: string
}
