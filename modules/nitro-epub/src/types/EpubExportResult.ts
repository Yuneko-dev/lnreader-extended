/**
 * Describes a successfully created EPUB archive.
 *
 * @see {@linkcode EpubExportResult.outputPath}
 */
export interface EpubExportResult {
  /** Absolute path to the completed EPUB archive. */
  outputPath: string
  /** Number of downloaded chapters written to the archive. */
  chapterCount: number
}
