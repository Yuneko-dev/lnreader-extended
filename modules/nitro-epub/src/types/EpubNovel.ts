import type { EpubChapter } from './EpubChapter'

/**
 * Metadata and local resources discovered in an extracted EPUB publication.
 *
 * @see {@linkcode EpubChapter}
 */
export interface EpubNovel {
  /** Publication title. */
  name: string
  /** Absolute path to the extracted cover image, when present. */
  cover?: string
  /** Publication description, when present. */
  summary?: string
  /** Publication author, when present. */
  author?: string
  /** Publication illustrator or artist, when present. */
  artist?: string
  /** Chapters in reading order. */
  chapters: EpubChapter[]
  /** Absolute paths to extracted stylesheets. */
  cssPaths: string[]
  /** Absolute paths to extracted images. */
  imagePaths: string[]
}
