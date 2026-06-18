import { EpubSettings } from '../../types';
import { escapeXml } from '../methods/xmlEscape';

/**
 * Generates metadata for an EPUB file based on the provided settings.
 * All text values are XML-escaped to prevent well-formedness errors.
 *
 * EPUB 3.3 Dublin Core metadata elements:
 * - dc:title, dc:creator, dc:description, dc:language, dc:identifier
 * - dc:rights, dc:source, dc:date, dc:subject, dc:publisher
 * - meta property="dcterms:modified" (required by EPUB 3)
 * - meta property="generator"
 *
 * @param epubSettings - The settings for the EPUB file.
 * @returns The generated metadata string.
 */
export function createMetadata(epubSettings: EpubSettings) {
  const now = new Date();
  const lines: string[] = [
    `<dc:title>${escapeXml(epubSettings.title ?? 'Unnamed')}</dc:title>`,
    `<dc:creator>${escapeXml(epubSettings.author ?? 'Unnamed')}</dc:creator>`,
    `<dc:description>${escapeXml(epubSettings.description ?? 'None')}</dc:description>`,
    `<dc:language>${escapeXml(epubSettings.language ?? 'en')}</dc:language>`,
    `<dc:identifier id="BookId">${escapeXml(epubSettings.bookId ?? '')}</dc:identifier>`,
    `<dc:rights>${escapeXml(epubSettings.rights ?? 'None')}</dc:rights>`,
    `<dc:source>${escapeXml(epubSettings.source ?? 'None')}</dc:source>`,
    `<dc:date>${now.toISOString()}</dc:date>`,
    `<meta property="dcterms:modified">${now.toISOString().split('.')[0] + 'Z'}</meta>`,
  ];

  // Genre/Subject tags (one per genre)
  if (epubSettings.genres && epubSettings.genres.length > 0) {
    for (const genre of epubSettings.genres) {
      const trimmed = genre.trim();
      if (trimmed) {
        lines.push(`<dc:subject>${escapeXml(trimmed)}</dc:subject>`);
      }
    }
  }

  // Publisher
  if (epubSettings.publisher) {
    lines.push(
      `<dc:publisher>${escapeXml(epubSettings.publisher)}</dc:publisher>`,
    );
  }

  // Generator (EPUB 3 property-based meta)
  if (epubSettings.generator) {
    lines.push(
      `<meta property="generator">${escapeXml(epubSettings.generator)}</meta>`,
    );
  }

  // Novel URL (custom metadata)
  if (epubSettings.novelUrl) {
    lines.push(
      `<meta property="novel:url">${escapeXml(epubSettings.novelUrl)}</meta>`,
    );
  }

  // Novel Status (custom metadata)
  if (epubSettings.novelStatus) {
    lines.push(
      `<meta property="novel:status">${escapeXml(epubSettings.novelStatus)}</meta>`,
    );
  }

  return '\n    ' + lines.join('\n    ');
}
