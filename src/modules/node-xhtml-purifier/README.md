# XHTML purifier

The LNReader EPUB exporter uses this TypeScript module to convert downloaded
chapter HTML into a safe, well-formed XHTML fragment.

It performs a single tolerant parse with `htmlparser2`, rather than the legacy
hand-written tokenizer or multiple Cheerio passes. The serializer always emits
XML-safe text and attributes, explicit closing tags, and self-closing XHTML
void elements.

## API

```ts
import { purifyXhtml } from '@modules/node-xhtml-purifier';

const xhtml = purifyXhtml('<p>Unclosed<br><img src="cover.jpg">');
// <p>Unclosed<br/><img src="cover.jpg" alt=""/></p>
```

`purify()` remains as a compatibility alias for the original cloned package.

## EPUB support

`EPUB_ALLOWED_TAGS` exports the EPUB 3.3 vocabulary used by chapter export.
Supported attributes include global EPUB attributes (`epub:type`, `xml:lang`,
ARIA and `data-*`), chapter links and images, table attributes, and Ruby.

Safe SVG and MathML descendants are also preserved inside the EPUB-supported
`svg` and `math` elements. Scripts, forms, embedded content, event handlers,
unsafe URL schemes, and unsupported attributes are removed. Malformed table
sections are normalized into valid `thead`/`tbody`/`tfoot` and `tr` structure.
