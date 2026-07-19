import { EpubChapter } from '../../types';
import { createFile } from './helper';
import { htmlToXhtml } from './xhtmlSanitizer';
import { escapeXml } from './xmlEscape';

/**
 * Creates a valid EPUB XHTML chapter document. Chapter body HTML is filtered
 * and repaired by the htmlparser2-backed EPUB 3.3 purifier before wrapping.
 */
export function createChapter(chapter: EpubChapter, includeScript = false) {
  const xhtmlBody = htmlToXhtml(chapter.htmlBody);
  const script = includeScript
    ? '\n    <script src="../script.js"></script>\n    <script>fnEpub();</script>'
    : '';

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
${xhtmlBody}${script}
  </body>
</html>`,
  );
}
