/**
 * Publication metadata and optional reader assets used to create an EPUB.
 *
 * @see {@linkcode EpubExportMetadata.bookId}
 */
export interface EpubExportMetadata {
  /** Publication title. */
  title: string
  /** BCP 47 language tag written to the EPUB package. */
  language: string
  /** Local cover image path or file URI, or an empty string for no cover. */
  coverPath: string
  /** Publication description. */
  description: string
  /** Publication author. */
  author: string
  /** Stable unique identifier for the publication. */
  bookId: string
  /** CSS included as the publication stylesheet. */
  stylesheet: string
  /** JavaScript executed when each chapter loads, or an empty string. */
  javascript: string
}
