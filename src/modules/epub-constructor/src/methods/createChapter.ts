import sanitizeHtml from 'sanitize-html';

import { EpubChapter } from '../../types';
import { createFile } from './helper';
import { htmlToXhtml } from './xhtmlSanitizer';
import { escapeXml } from './xmlEscape';

/**
 * Allowed tags per EPUB 3.3 Content Documents spec.
 * @see https://www.w3.org/TR/epub-33/#sec-xhtml-content-document
 */
const EPUB_ALLOWED_TAGS: string[] = [
  'a',
  'abbr',
  'address',
  'article',
  'aside',
  'b',
  'bdi',
  'bdo',
  'blockquote',
  'br',
  'cite',
  'code',
  'data',
  'dd',
  'del',
  'details',
  'dfn',
  'div',
  'dl',
  'dt',
  'em',
  'figcaption',
  'figure',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hgroup',
  'hr',
  'i',
  'img',
  'ins',
  'kbd',
  'li',
  'main',
  'mark',
  'nav',
  'ol',
  'p',
  'picture',
  'pre',
  'q',
  'rp',
  'rt',
  'ruby',
  's',
  'samp',
  'section',
  'small',
  'source',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'time',
  'tr',
  'u',
  'ul',
  'var',
  'wbr',
  'svg',
  'math',
];

/**
 * Allowed attributes per EPUB 3.3 Content Documents spec.
 */
const EPUB_ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  '*': [
    'class',
    'id',
    'lang',
    'xml:lang',
    'dir',
    'title',
    'epub:type',
    'role',
    'aria-label',
    'aria-labelledby',
    'aria-describedby',
    'data-*',
  ],
  a: ['href', 'hreflang', 'type'],
  img: ['src', 'alt', 'width', 'height'],
  ol: ['reversed', 'start', 'type'],
  li: ['value'],
  blockquote: ['cite'],
  q: ['cite'],
  time: ['datetime'],
  del: ['cite', 'datetime'],
  ins: ['cite', 'datetime'],
  table: ['border', 'summary'],
  td: ['colspan', 'rowspan', 'headers'],
  th: ['colspan', 'rowspan', 'headers', 'scope'],
  source: ['src', 'type', 'srcset'],
  data: ['value'],
  svg: ['width', 'height', 'viewBox', 'xmlns'],
  math: ['xmlns'],
};

/**
 * Creates an EPUB chapter file with valid XHTML content.
 *
 * Pipeline:
 * 1. sanitize-html: strip disallowed tags/attributes (EPUB 3.3 strict)
 * 2. htmlToXhtml: fix malformed HTML → well-formed XHTML (via cheerio)
 * 3. Wrap in proper XHTML document structure with XML declaration
 *
 * @param chapter - The chapter object containing chapter details.
 * @returns The created File object representing the chapter file.
 */
export function createChapter(chapter: EpubChapter) {
  // Step 1: Strip disallowed tags/attributes
  const sanitized = sanitizeHtml(chapter.htmlBody, {
    allowedTags: EPUB_ALLOWED_TAGS,
    allowedAttributes: EPUB_ALLOWED_ATTRIBUTES,
  }).replace(/<!--(.|[\n\r])*?-->/gm, ''); // Remove HTML comments

  // Step 2: Convert to well-formed XHTML
  const xhtmlBody = htmlToXhtml(sanitized);

  // Step 3: Wrap in proper XHTML document
  return createFile(
    `EPUB/${chapter.fileName}`,
    `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <head>
    <link rel="stylesheet" type="text/css" href="../styles.css"/>
    <title>${escapeXml(chapter.title)}</title>
  </head>
  <body>
${xhtmlBody}
  </body>
</html>`,
  );
}
