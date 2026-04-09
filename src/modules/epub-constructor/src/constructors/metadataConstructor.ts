import { EpubSettings } from '../../types';

/**
 * Generates metadata for an EPUB file based on the provided settings.
 * If any setting is missing, default values will be used.
 *
 * @param epubSettings - The settings for the EPUB file.
 * @returns The generated metadata string.
 */
export function createMetadata(epubSettings: EpubSettings) {
  return `
    <dc:title>${epubSettings.title ?? 'Unnamed'}</dc:title>
    <dc:creator>${epubSettings.author ?? 'Unnamed'}</dc:creator>
    <dc:description>${epubSettings.description ?? 'None'}</dc:description>
    <dc:language>${epubSettings.language ?? 'en'}</dc:language>
    <dc:identifier id="BookId">${epubSettings.bookId}</dc:identifier>
    <dc:rights id="rights">${epubSettings.rights ?? 'None'}</dc:rights>
    <dc:source id="source">${epubSettings.source ?? 'None'}</dc:source>
    <dc:date>${new Date().toISOString()}</dc:date>
    <meta property="dcterms:modified">${
      new Date().toISOString().split('.')[0] + 'Z'
    }</meta>
    <meta name="cover" content="cover"/>`;
}
