import { EpubSettings } from '../../types';
import { escapeXml } from '../methods/xmlEscape';

/**
 * Generates metadata for an EPUB file based on the provided settings.
 * All text values are XML-escaped to prevent well-formedness errors.
 *
 * @param epubSettings - The settings for the EPUB file.
 * @returns The generated metadata string.
 */
export function createMetadata(epubSettings: EpubSettings) {
  return `
    <dc:title>${escapeXml(epubSettings.title ?? 'Unnamed')}</dc:title>
    <dc:creator>${escapeXml(epubSettings.author ?? 'Unnamed')}</dc:creator>
    <dc:description>${escapeXml(epubSettings.description ?? 'None')}</dc:description>
    <dc:language>${escapeXml(epubSettings.language ?? 'en')}</dc:language>
    <dc:identifier id="BookId">${escapeXml(epubSettings.bookId ?? '')}</dc:identifier>
    <dc:rights>${escapeXml(epubSettings.rights ?? 'None')}</dc:rights>
    <dc:source>${escapeXml(epubSettings.source ?? 'None')}</dc:source>
    <dc:date>${new Date().toISOString()}</dc:date>
    <meta property="dcterms:modified">${
      new Date().toISOString().split('.')[0] + 'Z'
    }</meta>`;
}
