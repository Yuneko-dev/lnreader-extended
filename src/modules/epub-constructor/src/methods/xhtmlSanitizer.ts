import { load } from 'cheerio';
import { decode } from 'html-entities';

// HTML5 void elements that must be self-closing in XHTML
const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/**
 * Convert potentially malformed HTML content into well-formed XHTML.
 *
 * Pipeline:
 * 1. Decode all HTML named entities → Unicode characters (via html-entities)
 * 2. Parse with cheerio (htmlparser2 internally) — tolerant, auto-fixes malformed HTML
 * 3. Remove disallowed tags for EPUB
 * 4. Serialize body content via cheerio xmlMode → well-formed output
 * 5. Fix void element serialization for strict XHTML compliance
 *
 * @param html Raw HTML string, possibly malformed
 * @returns Well-formed XHTML fragment string (body content only, no wrapper)
 */
export function htmlToXhtml(html: string): string {
  if (!html || html.trim().length === 0) {
    return '';
  }

  // Step 1: Decode ALL HTML named entities to unicode BEFORE parsing
  // e.g., &nbsp; → \u00A0, &mdash; → —, &ldquo; → "
  const decoded = decode(html, { level: 'html5' });

  // Step 2: Parse with cheerio in HTML mode (tolerant, auto-closes tags)
  const $ = load(decoded);

  // Step 3: Remove tags that should not be in EPUB XHTML content
  $(
    'script, style, link[rel="stylesheet"], meta, input, select, textarea, form, iframe, embed, object, canvas, template, slot, dialog',
  ).remove();

  // Step 4: Ensure <img> elements have required `alt` attribute (EPUB accessibility)
  $('img').each(function () {
    const el = $(this);
    if (!el.attr('alt')) {
      el.attr('alt', '');
    }
  });

  // Step 5: Get body content
  const bodyContent = $('body').html();
  if (!bodyContent || bodyContent.trim().length === 0) {
    return '';
  }

  // Step 6: Re-parse in xmlMode for well-formed serialization
  const $xml = load(bodyContent, {
    xmlMode: true,
  });

  let xhtml = $xml.xml();

  // Step 7: Clean up any xml declaration cheerio might add
  xhtml = xhtml.replace(/^\s*<\?xml[^?]*\?>\s*/i, '');

  // Step 8: Fix void elements — ensure self-closing format <br/> instead of <br></br>
  for (const tag of VOID_ELEMENTS) {
    const pattern = new RegExp(`<${tag}([^>]*?)>\\s*</${tag}>`, 'gi');
    xhtml = xhtml.replace(pattern, `<${tag}$1/>`);
  }

  return xhtml.trim();
}
