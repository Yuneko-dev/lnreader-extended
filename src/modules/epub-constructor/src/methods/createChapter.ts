import { EpubChapter } from '../../types';
import { createFile } from './helper';
import * as sanitizeHtml from 'sanitize-html';
/**
 * Creates an EPUB chapter file with the provided chapter information.
 *
 * @param chapter - The chapter object containing the chapter details.
 * @returns The created File object representing the chapter file.
 */
export function createChapter(chapter: EpubChapter) {
  return createFile(
    `EPUB/${chapter.fileName}`,
    `
    <!DOCTYPE html>
    <html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
        <head>
            <link rel="stylesheet" type="text/css" href="../styles.css"/>
            <title>${chapter.title}</title>
            <script src="../script.js"></script>
        </head>
        <body onload="fnEpub()">
            ${
              sanitizeHtml //@ts-ignore
                .default(chapter.htmlBody, {
                  allowedTags: [
                    'a',
                    'abbr',
                    'address',
                    'area',
                    'article',
                    'aside',
                    'audio',
                    'b',
                    'bdi',
                    'bdo',
                    'blockquote',
                    'br',
                    'button',
                    'canvas',
                    'cite',
                    'code',
                    'data',
                    'datalist',
                    'del',
                    'details',
                    'dfn',
                    'dialog',
                    'div',
                    'dl',
                    'em',
                    'embed',
                    'epub:switch',
                    'epub:trigger',
                    'fieldset',
                    'figure',
                    'footer',
                    'form',
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
                    'iframe',
                    'img',
                    'input',
                    'ins',
                    'kbd',
                    'label',
                    'link',
                    'main',
                    'map',
                    'mark',
                    'menu',
                    'meta',
                    'meter',
                    'nav',
                    'ns1:math',
                    'ns2:svg',
                    'object',
                    'ol',
                    'output',
                    'p',
                    'picture',
                    'pre',
                    'progress',
                    'q',
                    'ruby',
                    's',
                    'samp',
                    'section',
                    'select',
                    'slot',
                    'small',
                    'span',
                    'strong',
                    'sub',
                    'sup',
                    'table',
                    'template',
                    'textarea',
                    'time',
                    'u',
                    'ul',
                    'var',
                    'video',
                    'wbr',
                  ],
                  allowedAttributes: false, //@ts-ignore
                  // disallowedTagsMode: 'completelyDiscard',
                })
                .replace(/<!--(.|\n)*?-->/gm, '') //? remove comments
            }
        </body>
    </html>
      `,
  );
}
