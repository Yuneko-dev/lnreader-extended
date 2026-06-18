/**
 * Generates an EPUB container XML string.
 *
 * The EPUB container file is used to specify the location of the EPUB package file,
 * which contains the content of the EPUB book.
 *
 * @param fileName - The name of the EPUB package file without the file extension.
 * @returns The EPUB container XML string.
 */
export function defaultContainer(fileName: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="EPUB/${fileName}.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
}

/**
 * Generates a default EPUB 3 OPF package document with placeholders
 * for metadata, manifest, and spine.
 *
 * @returns {string} The default EPUB OPF XML structure.
 */
export function defaultEpub() {
  return `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    #metadata
  </metadata>
  <manifest>
    #manifest
  </manifest>
  <spine toc="ncx">
    #spine
  </spine>
</package>`;
}

/**
 * Generates the NCX (Navigation Control for XML) table of contents.
 *
 * @param title The title of the book (must be pre-escaped for XML).
 * @param bookId The unique identifier for the book (must be pre-escaped for XML).
 * @param author The author of the book (optional, must be pre-escaped for XML).
 * @returns The NCX XML string.
 */
export function defaultNcxToc(title: string, bookId: string, author?: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="en">
  <head>
    <meta name="dtb:uid" content="${bookId}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${title}</text>
  </docTitle>
  <docAuthor>
    <text>${author ?? ''}</text>
  </docAuthor>
  <navMap>
    #navMap
  </navMap>
</ncx>`;
}

/**
 * Generates an XHTML table of contents (navigation document) for EPUB 3.
 *
 * @param title - The title of the TOC page (must be pre-escaped for XML).
 * @returns The XHTML TOC string.
 */
export function defaultHtmlToc(title: string) {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en" xml:lang="en">
  <head>
    <title>${title} - TOC</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <link rel="stylesheet" type="text/css" href="styles.css"/>
  </head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1>Table of Contents</h1>
      <ol>
        #ol
      </ol>
    </nav>
  </body>
</html>`;
}
