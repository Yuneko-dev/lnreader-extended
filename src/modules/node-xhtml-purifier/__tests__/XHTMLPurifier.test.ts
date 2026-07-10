import { SaxesParser } from 'saxes';

import { EPUB_ALLOWED_TAGS, purify, purifyXhtml } from '../XHTMLPurifier';

const compact = (value: string) => value.replace(/\s+/g, '');

const expectXmlToParse = (xml: string) => {
  const parser = new SaxesParser({ xmlns: true });
  let parseError: Error | undefined;
  parser.on('error', error => {
    parseError = error;
  });
  parser.write(xml).close();
  expect(parseError).toBeUndefined();
};

describe('XHTMLPurifier', () => {
  it('wraps loose text and preserves supported inline formatting', () => {
    expect(purify('this is a test')).toBe('<p>this is a test</p>');
    expect(purify('Testing <b>bold</b> and <i>italic</i>')).toBe(
      '<p>Testing <strong>bold</strong> and <em>italic</em></p>',
    );
  });

  it('unwraps unsupported tags while retaining their safe content', () => {
    const result = purify(
      '<ol><li><o:p></o:p><span>Hello, World!</span><o:p>&nbsp;</o:p></li></ol>',
    );

    expect(result).toContain('Hello, World!');
    expect(result).not.toContain('o:p');
    expect(result).not.toContain('&nbsp;');
  });

  it('removes HTML comments before parsing', () => {
    const result = purify(
      '<p>Visible<!-- hidden\ncomment --><span> text</span></p>',
    );

    expect(result).toBe('<p>Visible<span> text</span></p>');
    expect(result).not.toContain('hidden');
    expect(result).not.toContain('<!--');
  });

  it('escapes text, drops executable elements, and prevents attribute injection', () => {
    const unsafeHref = ['java', 'script:alert(1)'].join('');
    const result = purify(
      `&lt;script&gt;not executable&lt;/script&gt;<script>alert('xss')</script><a href="${unsafeHref}" class='c" onmouseover="x'>safe</a>`,
      true,
      true,
    );

    expect(result).toContain('&lt;script&gt;not executable&lt;/script&gt;');
    expect(result).not.toContain('alert');
    expect(result).not.toMatch(/\son[a-z]+\s*=\s*"/i);
    expect(result).not.toContain(unsafeHref);
    expect(result).toContain('class="c&quot; onmouseover=&quot;x"');
  });

  it('repairs common malformed markup and writes XML-safe void elements', () => {
    const result = purifyXhtml(
      '<p>First<p>Second<br><img src="cover.jpg"><div>Third</div>',
    );

    expect(result).toContain('<p>First</p>');
    expect(result).toContain('<p>Second<br/><img src="cover.jpg" alt=""/></p>');
    expect(result).toContain('<div>Third</div>');
    expect(result).not.toMatch(/<br(?=[^/>]*>)/);
    expect(result).not.toMatch(/<img(?=[^/>]*>)/);
  });

  it('produces an XML-well-formed EPUB body fragment', () => {
    const body = purifyXhtml(
      '<section epub:type="chapter"><p>Text<br><img src="cover.jpg"><p>Second</section>',
    );

    expect(body).toContain('<section epub:type="chapter">');
    expectXmlToParse(`<?xml version="1.0" encoding="utf-8"?>
      <html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
        <body>${body}</body>
      </html>`);
  });

  it('keeps and normalizes valid table content', () => {
    const result = purify(
      '<table><caption>Caption</caption><thead><tr><td>Header</td></tr></thead><tbody><tr><td>Row</td></tr></tbody></table>',
    );

    expect(compact(result)).toBe(
      '<table><caption>Caption</caption><thead><tr><td>Header</td></tr></thead><tbody><tr><td>Row</td></tr></tbody></table>',
    );
    expect(purify('<table></table> <p>Hola</p>')).toBe('<p>Hola</p>');
  });

  it('repairs the malformed table cases covered by the original module tests', () => {
    const malformed = purify(
      '<table><caption>Caption<thead><th><td>My Header</td></th><tbody><tr><td>Row</td></tr></table>',
    );
    const outsideTable = purify(
      'Hello <tr><td>World!</tr></td><table>Thingy</table>',
    );
    const multipleBodies = purify(
      '<table><tbody><tr><td>Testing</td><tbody><tr><th>Another test</th></tr></tbody><tfoot><tr><td>Testing</td></tr></tfoot>',
    );

    expect(malformed).toContain('<table>');
    expect(malformed).toContain('<thead><tr>');
    expect(malformed).toContain('My Header');
    expect(malformed).toContain('<tbody><tr><td>Row</td></tr></tbody>');
    expect(outsideTable).toContain('<p>Hello World!</p>');
    expect(outsideTable).toContain('<table>Thingy</table>');
    expect(compact(multipleBodies)).toContain(
      '<tbody><tr><td>Testing</td></tr></tbody>',
    );
    expect(compact(multipleBodies)).toContain(
      '<tbody><tr><th>Anothertest</th></tr></tbody>',
    );
    expect(compact(multipleBodies)).toContain(
      '<tfoot><tr><td>Testing</td></tr></tfoot>',
    );
  });

  it('supports the EPUB 3.3 vocabulary plus safe SVG and MathML descendants', () => {
    const result = purifyXhtml(`
      <article epub:type="chapter" data-source="local"><header><h1>Title</h1></header>
        <figure><img src="file:///cover.jpg"/><figcaption>Cover</figcaption></figure>
        <ruby>漢<rt>かん</rt><rp>(</rp><rt>kan</rt><rp>)</rp></ruby>
        <table><tbody><tr><td colspan="2">Cell</td></tr></tbody></table>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M0 0"/></svg>
        <math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mi>x</mi><mo>=</mo><mn>1</mn></mrow></math>
      </article>
    `);

    for (const tag of [
      'article',
      'header',
      'h1',
      'figure',
      'figcaption',
      'ruby',
      'rt',
      'table',
      'svg',
      'math',
    ]) {
      expect(result).toContain(`<${tag}`);
    }
    expect(result).toContain('<path d="M0 0"/>');
    expect(result).toContain('<mrow><mi>x</mi><mo>=</mo><mn>1</mn></mrow>');
    expect(result).toContain('epub:type="chapter"');
    expect(result).toContain('data-source="local"');
    expect(result).toContain('viewBox="0 0 1 1"');
  });

  it('exports the complete EPUB tag allowlist', () => {
    expect(EPUB_ALLOWED_TAGS).toEqual(
      expect.arrayContaining([
        'article',
        'img',
        'ruby',
        'svg',
        'math',
        'table',
      ]),
    );
    expect(EPUB_ALLOWED_TAGS).toHaveLength(73);
  });
});
