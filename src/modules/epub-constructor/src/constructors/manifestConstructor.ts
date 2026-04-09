/**
 * Generates an XML element string representing a chapter in a manifest.
 *
 * @param id - The ID of the chapter.
 * @param href - The href of the chapter.
 * @returns The XML element string representing the chapter.
 */
export function manifestChapter(id: string, href: string) {
  return `<item id="${id}" href="${href}" media-type="application/xhtml+xml" properties="scripted"/>`;
}
/**
 * Generates an XML element representing a navigation item in a manifest file.
 * The XML element has the following attributes:
 * - properties: "nav"
 * - id: "toc"
 * - href: "toc.xhtml"
 * - media-type: "application/xhtml+xml"
 *
 * @returns {string} The XML element as a string.
 */
export function manifestNav(): string {
  return `<item properties="nav" id="toc" href="toc.xhtml" media-type="application/xhtml+xml" />`;
}
/**
 * Returns an XML element representing a table of contents (TOC) item in a manifest.
 *
 * @returns {string} The XML element for the TOC item.
 */
export function manifestToc(): string {
  return `<item href="toc.ncx" id="ncx" media-type="application/x-dtbncx+xml"/>`;
}

/**
 * Generates an XML element for a CSS file in a manifest.
 *
 * @returns {string} The XML element representing the CSS file.
 */
export function manifestStyle(): string {
  return `<item href="styles.css" id="css1" media-type="text/css"/>`;
}
/**
 * Returns an XML element representing a cover image in a manifest file.
 *
 * @returns {string} The XML element for the cover image.
 */
export function manifestCover(fileFormat: string): string {
  fileFormat = fileFormat.replace('.', '');
  return `<item id="cover" href="../OEBPS/images/cover.${fileFormat}" media-type="image/${
    fileFormat === 'jpg' ? 'jpeg' : fileFormat
  }" properties="cover-image" />`;
}
/**
 * Generates an XML element string for an image in a manifest file.
 *
 * @param uri - The URI (Uniform Resource Identifier) of the image.
 * @returns The XML element string representing the image in the manifest file.
 *
 * @example
 * const imageUri = "https://example.com/image.jpg";
 * const imageElement = manifestImage(imageUri);
 * console.log(imageElement);
 * // Output: <item id="image.jpg" href="https://example.com/image.jpg" media-type="image/jpeg" />
 */
export function manifestImage(uri: string, fileFormat: string): string {
  return `<item id="${uri.replace(
    /.*\//,
    '',
  )}" href="${uri}" media-type="image/${
    fileFormat === 'jpg' ? 'jpeg' : fileFormat
  }" />`;
}
