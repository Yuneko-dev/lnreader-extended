import type { HybridObject } from 'react-native-nitro-modules'
import type { EpubExportChapter } from '../types/EpubExportChapter'
import type { EpubExportMetadata } from '../types/EpubExportMetadata'
import type { EpubExportResult } from '../types/EpubExportResult'
import type { EpubNovel } from '../types/EpubNovel'

/**
 * Imports and exports EPUB publications using shared native C++ code.
 *
 * @see {@linkcode Epub.parseNovelAndChapters}
 * @see {@linkcode Epub.exportEpub}
 */
export interface Epub extends HybridObject<{ android: 'c++'; ios: 'c++' }> {
  /**
   * Parses metadata and chapter paths from an extracted EPUB directory.
   */
  parseNovelAndChapters(epubDirPath: string): Promise<EpubNovel>

  /**
   * Creates an EPUB archive from downloaded chapter files.
   */
  exportEpub(
    metadata: EpubExportMetadata,
    chapters: EpubExportChapter[],
    outputPath: string
  ): Promise<EpubExportResult>
}
