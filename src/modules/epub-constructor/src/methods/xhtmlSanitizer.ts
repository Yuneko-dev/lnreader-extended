import { purifyXhtml } from '@modules/node-xhtml-purifier';

/**
 * Convert potentially malformed HTML into an EPUB 3.3-compatible XHTML
 * fragment. The purifier performs one htmlparser2 parse and XML-safe output.
 */
export function htmlToXhtml(html: string): string {
  return purifyXhtml(html);
}
