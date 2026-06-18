/**
 * Generates an XML element string representing a chapter in a manifest.
 * All chapter hrefs are relative to the OPF file location (EPUB/).
 *
 * @param id - The ID of the chapter (must be valid XML NCName).
 * @param href - The href of the chapter (relative to EPUB/).
 * @param hasScript - Whether the chapter references a script.
 * @returns The XML element string representing the chapter.
 */
export function manifestChapter(
  id: string,
  href: string,
  hasScript: boolean = false,
) {
  const props = hasScript ? ' properties="scripted"' : '';
  return `<item id="${id}" href="${href}" media-type="application/xhtml+xml"${props}/>`;
}

/**
 * Generates an XML element representing a navigation item in a manifest file.
 *
 * @returns {string} The XML element as a string.
 */
export function manifestNav(): string {
  return '<item properties="nav" id="toc" href="toc.xhtml" media-type="application/xhtml+xml"/>';
}

/**
 * Returns an XML element representing a table of contents (TOC) item in a manifest.
 *
 * @returns {string} The XML element for the TOC item.
 */
export function manifestToc(): string {
  return '<item href="toc.ncx" id="ncx" media-type="application/x-dtbncx+xml"/>';
}

/**
 * Generates an XML element for a CSS file in a manifest.
 *
 * @returns {string} The XML element representing the CSS file.
 */
export function manifestStyle(): string {
  return '<item href="styles.css" id="css1" media-type="text/css"/>';
}

/**
 * Returns an XML element representing a cover image in a manifest file.
 * Path is relative to the OPF file (EPUB/).
 *
 * @param fileFormat - The image format extension (e.g., 'jpg', 'png').
 * @returns {string} The XML element for the cover image.
 */
export function manifestCover(fileFormat: string): string {
  fileFormat = fileFormat.replace('.', '');
  return `<item id="cover" href="images/cover.${fileFormat}" media-type="image/${
    fileFormat === 'jpg' ? 'jpeg' : fileFormat
  }" properties="cover-image"/>`;
}

/**
 * Generates an XML element string for an image in a manifest file.
 * Path is relative to the OPF file (EPUB/).
 *
 * @param href - The href path relative to EPUB/ (e.g., "images/ch1_image_1.jpg").
 * @param fileFormat - The image format extension (e.g., 'jpg', 'png').
 * @returns The XML element string representing the image in the manifest file.
 */
export function manifestImage(href: string, fileFormat: string): string {
  const fileName = href.replace(/.*\//, '');
  return `<item id="${fileName}" href="${href}" media-type="image/${
    fileFormat === 'jpg' ? 'jpeg' : fileFormat
  }"/>`;
}

/**
 * Generates an XML element for a script file in a manifest.
 *
 * @returns {string} The XML element representing the script file.
 */
export function manifestScript(): string {
  return '<item id="script" href="script.js" media-type="text/javascript"/>';
}
