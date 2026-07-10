import type { ChildNode, Element } from 'domhandler';
import { parseDocument } from 'htmlparser2';

type AttributeMap = Record<string, string>;

type XhtmlNode = XhtmlElement | XhtmlText;

type XhtmlText = {
  type: 'text';
  value: string;
};

type XhtmlElement = {
  type: 'element';
  name: string;
  attributes: AttributeMap;
  children: XhtmlNode[];
};

/** EPUB 3.3 HTML vocabulary used by LNReader chapter documents. */
export const EPUB_ALLOWED_TAGS = [
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
] as const;

/**
 * SVG and MathML descendants are needed for an allowed <svg> or <math>
 * element to remain useful. They are still filtered to a conservative set.
 */
const FOREIGN_ALLOWED_TAGS = [
  'annotation',
  'annotation-xml',
  'caption',
  'circle',
  'col',
  'colgroup',
  'defs',
  'desc',
  'ellipse',
  'g',
  'line',
  'lineargradient',
  'math',
  'mfrac',
  'mi',
  'mn',
  'mo',
  'mover',
  'mrow',
  'mspace',
  'msqrt',
  'mstyle',
  'msub',
  'msubsup',
  'msup',
  'mtext',
  'mtable',
  'mtd',
  'mtr',
  'munder',
  'munderover',
  'path',
  'polygon',
  'polyline',
  'radialgradient',
  'rect',
  'semantics',
  'stop',
  'svg',
  'symbol',
  'text',
  'title',
  'tspan',
  'use',
  'view',
] as const;

const ALLOWED_TAGS = new Set<string>([
  ...EPUB_ALLOWED_TAGS,
  ...FOREIGN_ALLOWED_TAGS,
]);

const GLOBAL_ATTRIBUTES = new Set([
  'aria-describedby',
  'aria-label',
  'aria-labelledby',
  'class',
  'dir',
  'epub:type',
  'id',
  'lang',
  'role',
  'title',
  'xml:lang',
]);

const TAG_ATTRIBUTES: Record<string, ReadonlySet<string>> = {
  a: new Set(['href', 'hreflang', 'type']),
  blockquote: new Set(['cite']),
  data: new Set(['value']),
  del: new Set(['cite', 'datetime']),
  img: new Set(['alt', 'height', 'src', 'width']),
  ins: new Set(['cite', 'datetime']),
  li: new Set(['value']),
  math: new Set(['display', 'xmlns']),
  ol: new Set(['reversed', 'start', 'type']),
  q: new Set(['cite']),
  source: new Set(['src', 'srcset', 'type']),
  svg: new Set(['height', 'viewbox', 'width', 'xmlns']),
  table: new Set(['border', 'summary']),
  td: new Set(['colspan', 'headers', 'rowspan']),
  th: new Set(['colspan', 'headers', 'rowspan', 'scope']),
  time: new Set(['datetime']),
};

const FOREIGN_ATTRIBUTES = new Set([
  'cx',
  'cy',
  'd',
  'fill',
  'height',
  'href',
  'marker-end',
  'marker-start',
  'offset',
  'opacity',
  'points',
  'preserveaspectratio',
  'r',
  'rx',
  'ry',
  'stroke',
  'stroke-width',
  'transform',
  'viewbox',
  'width',
  'x',
  'x1',
  'x2',
  'y',
  'y1',
  'y2',
  'xmlns',
]);

const VOID_ELEMENTS = new Set(['br', 'hr', 'img', 'source', 'wbr']);
const GRAPHIC_EMPTY_ELEMENTS = new Set([
  'circle',
  'col',
  'ellipse',
  'line',
  'path',
  'polygon',
  'polyline',
  'rect',
  'stop',
  'use',
]);
const TABLE_ONLY_ELEMENTS = new Set([
  'caption',
  'colgroup',
  'col',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
]);
const TABLE_SECTION_ELEMENTS = new Set(['tbody', 'tfoot', 'thead']);
const TABLE_CELL_ELEMENTS = new Set(['td', 'th']);
const DROP_WITH_CONTENT = new Set([
  'canvas',
  'embed',
  'form',
  'iframe',
  'input',
  'object',
  'script',
  'select',
  'slot',
  'style',
  'template',
  'textarea',
]);
const INLINE_ELEMENTS = new Set([
  'a',
  'abbr',
  'b',
  'bdi',
  'bdo',
  'br',
  'cite',
  'code',
  'data',
  'del',
  'dfn',
  'em',
  'i',
  'img',
  'ins',
  'kbd',
  'mark',
  'q',
  'rp',
  'rt',
  'ruby',
  's',
  'samp',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'time',
  'u',
  'var',
  'wbr',
]);

const ATTRIBUTE_NAME_MAP: Record<string, string> = {
  viewbox: 'viewBox',
  preserveaspectratio: 'preserveAspectRatio',
};

const TAG_NAME_MAP: Record<string, string> = {
  b: 'strong',
  i: 'em',
  lineargradient: 'linearGradient',
  radialgradient: 'radialGradient',
};

const isElement = (node: ChildNode): node is Element => node.type === 'tag';

const escapeText = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeAttribute = (value: string) =>
  escapeText(value).replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const isDataAttribute = (name: string) => name.startsWith('data-');

const isSafeUrl = (value: string, isImage: boolean) => {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized.startsWith('#')) return true;
  if (/^(?:\.\.?(?:\/|\\)|\/)/.test(normalized)) return true;
  if (/^(?:https?|file):/i.test(normalized)) return true;
  if (isImage && normalized.startsWith('data:image/')) return true;
  return !/^[a-z][a-z0-9+.-]*:/i.test(normalized);
};

const isAttributeAllowed = (tag: string, name: string) =>
  GLOBAL_ATTRIBUTES.has(name) ||
  isDataAttribute(name) ||
  TAG_ATTRIBUTES[tag]?.has(name) ||
  (FOREIGN_ALLOWED_TAGS.includes(tag as never) && FOREIGN_ATTRIBUTES.has(name));

const sanitizeAttributes = (tag: string, attributes: AttributeMap) => {
  const sanitized: AttributeMap = {};

  for (const [rawName, value] of Object.entries(attributes)) {
    const name = rawName.toLowerCase();
    if (!isAttributeAllowed(tag, name)) continue;
    if (
      (name === 'href' || name === 'src') &&
      !isSafeUrl(value, tag === 'img')
    ) {
      continue;
    }
    sanitized[ATTRIBUTE_NAME_MAP[name] ?? name] = value;
  }

  if (tag === 'img' && !('alt' in sanitized)) {
    sanitized.alt = '';
  }

  return sanitized;
};

const sanitizeNodes = (
  nodes: ChildNode[],
  insideTable = false,
): XhtmlNode[] => {
  const sanitized: XhtmlNode[] = [];

  for (const node of nodes) {
    if (node.type === 'text') {
      sanitized.push({ type: 'text', value: node.data });
      continue;
    }
    if (!isElement(node)) continue;

    const originalName = node.name.toLowerCase();
    if (DROP_WITH_CONTENT.has(originalName)) continue;

    const mappedName = TAG_NAME_MAP[originalName] ?? originalName;
    if (!ALLOWED_TAGS.has(mappedName)) {
      sanitized.push(...sanitizeNodes(node.children, insideTable));
      continue;
    }
    if (TABLE_ONLY_ELEMENTS.has(mappedName) && !insideTable) {
      sanitized.push(...sanitizeNodes(node.children, insideTable));
      continue;
    }

    const element: XhtmlElement = {
      type: 'element',
      name: mappedName,
      attributes: sanitizeAttributes(mappedName, node.attribs),
      children: [],
    };
    element.children = VOID_ELEMENTS.has(mappedName)
      ? []
      : sanitizeNodes(node.children, insideTable || mappedName === 'table');
    sanitized.push(element);
  }

  return sanitized;
};

const hasMeaningfulContent = (node: XhtmlNode): boolean => {
  if (node.type === 'text') return /\S/.test(node.value);
  if (VOID_ELEMENTS.has(node.name) || GRAPHIC_EMPTY_ELEMENTS.has(node.name)) {
    return true;
  }
  return node.children.some(hasMeaningfulContent);
};

const normalizeTable = (table: XhtmlElement) => {
  const directChildren: XhtmlNode[] = [];
  for (const child of table.children) {
    if (child.type !== 'element' || child.name !== 'caption') {
      directChildren.push(child);
      continue;
    }

    const captionChildren: XhtmlNode[] = [];
    for (const captionChild of child.children) {
      if (
        captionChild.type === 'element' &&
        (TABLE_SECTION_ELEMENTS.has(captionChild.name) ||
          captionChild.name === 'tr' ||
          TABLE_CELL_ELEMENTS.has(captionChild.name))
      ) {
        directChildren.push(captionChild);
      } else {
        captionChildren.push(captionChild);
      }
    }
    child.children = captionChildren;
    if (hasMeaningfulContent(child)) directChildren.push(child);
  }

  const flattenSection = (section: XhtmlElement): XhtmlElement[] => {
    const nestedSections: XhtmlElement[] = [];
    const removeNestedSections = (nodes: XhtmlNode[]): XhtmlNode[] =>
      nodes.flatMap<XhtmlNode>(node => {
        if (node.type !== 'element') return [node];
        if (TABLE_SECTION_ELEMENTS.has(node.name)) {
          nestedSections.push(node);
          return [];
        }
        node.children = removeNestedSections(node.children);
        return [node];
      });

    section.children = removeNestedSections(section.children);
    normalizeTableSection(section);
    return [section, ...nestedSections.flatMap(flattenSection)];
  };
  const flattenedChildren = directChildren.flatMap(child =>
    child.type === 'element' && TABLE_SECTION_ELEMENTS.has(child.name)
      ? flattenSection(child)
      : [child],
  );

  const normalizedChildren: XhtmlNode[] = [];
  let looseRows: XhtmlElement[] = [];
  let activeSection: XhtmlElement | undefined;
  const flushRows = () => {
    if (looseRows.length > 0) {
      normalizedChildren.push({
        type: 'element',
        name: 'tbody',
        attributes: {},
        children: looseRows,
      });
      looseRows = [];
    }
  };

  for (const child of flattenedChildren) {
    if (child.type !== 'element') {
      normalizedChildren.push(child);
      continue;
    }
    if (TABLE_SECTION_ELEMENTS.has(child.name)) {
      flushRows();
      normalizedChildren.push(child);
      activeSection = child;
      continue;
    }
    if (TABLE_CELL_ELEMENTS.has(child.name) && activeSection) {
      activeSection.children.push(child);
      continue;
    }
    if (child.name === 'tr') {
      activeSection = undefined;
      looseRows.push(child);
      continue;
    }
    flushRows();
    activeSection = undefined;
    normalizedChildren.push(child);
  }
  flushRows();
  table.children = normalizedChildren;
  for (const child of table.children) {
    if (child.type === 'element' && TABLE_SECTION_ELEMENTS.has(child.name)) {
      normalizeTableSection(child);
    }
  }
};

const normalizeTableSection = (section: XhtmlElement) => {
  const normalizedChildren: XhtmlNode[] = [];
  let looseCells: XhtmlElement[] = [];
  const flushCells = () => {
    if (looseCells.length > 0) {
      normalizedChildren.push({
        type: 'element',
        name: 'tr',
        attributes: {},
        children: looseCells,
      });
      looseCells = [];
    }
  };

  for (const child of section.children) {
    if (child.type === 'element' && TABLE_CELL_ELEMENTS.has(child.name)) {
      if (hasMeaningfulContent(child)) looseCells.push(child);
      continue;
    }
    flushCells();
    normalizedChildren.push(child);
  }
  flushCells();
  section.children = normalizedChildren;
};

const normalizeNodes = (nodes: XhtmlNode[]): XhtmlNode[] => {
  const normalized: XhtmlNode[] = [];
  for (const node of nodes) {
    if (node.type === 'text') {
      normalized.push(node);
      continue;
    }
    node.children = normalizeNodes(node.children);
    if (node.name === 'table') normalizeTable(node);
    if (TABLE_SECTION_ELEMENTS.has(node.name)) normalizeTableSection(node);
    if (
      hasMeaningfulContent(node) ||
      TABLE_CELL_ELEMENTS.has(node.name) ||
      TABLE_SECTION_ELEMENTS.has(node.name)
    ) {
      normalized.push(node);
    }
  }
  return normalized;
};

const wrapTopLevelInlineContent = (nodes: XhtmlNode[]) => {
  const output: XhtmlNode[] = [];
  let paragraphChildren: XhtmlNode[] = [];
  const flushParagraph = () => {
    if (paragraphChildren.some(hasMeaningfulContent)) {
      output.push({
        type: 'element',
        name: 'p',
        attributes: {},
        children: paragraphChildren,
      });
    }
    paragraphChildren = [];
  };

  for (const node of nodes) {
    if (node.type === 'text' || INLINE_ELEMENTS.has(node.name)) {
      paragraphChildren.push(node);
      continue;
    }
    flushParagraph();
    output.push(node);
  }
  flushParagraph();
  return output;
};

const serializeNode = (node: XhtmlNode): string => {
  if (node.type === 'text') return escapeText(node.value);

  const attributes = Object.entries(node.attributes)
    .map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
    .join('');
  if (
    VOID_ELEMENTS.has(node.name) ||
    (GRAPHIC_EMPTY_ELEMENTS.has(node.name) && node.children.length === 0)
  ) {
    return `<${node.name}${attributes}/>`;
  }
  return `<${node.name}${attributes}>${node.children
    .map(serializeNode)
    .join('')}</${node.name}>`;
};

/**
 * Parse malformed chapter HTML once with htmlparser2, filter it to EPUB 3.3
 * content, and serialize a well-formed XHTML fragment.
 */
export const purifyXhtml = (html: string): string => {
  if (!html || html.trim().length === 0) return '';

  const document = parseDocument(html, {
    decodeEntities: true,
    lowerCaseAttributeNames: true,
    lowerCaseTags: true,
    recognizeSelfClosing: true,
  });
  const sanitized = sanitizeNodes(document.children);
  return wrapTopLevelInlineContent(normalizeNodes(sanitized))
    .map(serializeNode)
    .join('')
    .trim();
};

/** Backward-compatible entry point from the original node-xhtml-purifier. */
export const purify = (
  html: string,
  _dontFormat?: boolean,
  _catchErrors?: boolean,
) => purifyXhtml(html);

export default { purify, purifyXhtml };
