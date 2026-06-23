import { rewriteChapterResourceUrls } from '../import';

const DIR = '/storage/Novels/local/42';

describe('rewriteChapterResourceUrls', () => {
  describe('relative resources → flattened local file', () => {
    it('rewrites img src', () => {
      const out = rewriteChapterResourceUrls(
        '<img src="images/pic.png"/>',
        DIR,
      );
      expect(out).toBe(`<img src="file://${DIR}/pic.png"/>`);
    });

    it('rewrites link href to css', () => {
      const out = rewriteChapterResourceUrls(
        '<link href="../Styles/main.css" rel="stylesheet"/>',
        DIR,
      );
      expect(out).toBe(
        `<link href="file://${DIR}/main.css" rel="stylesheet"/>`,
      );
    });

    it('rewrites EPUB3 SVG xlink:href cover (the original bug)', () => {
      const html =
        '<svg xmlns:xlink="http://www.w3.org/1999/xlink"><image xlink:href="../Images/cover.jpg"/></svg>';
      const out = rewriteChapterResourceUrls(html, DIR);
      expect(out).toContain(`xlink:href="file://${DIR}/cover.jpg"`);
    });

    it('rewrites video poster', () => {
      const out = rewriteChapterResourceUrls(
        '<video poster="thumbs/p.png"></video>',
        DIR,
      );
      expect(out).toBe(`<video poster="file://${DIR}/p.png"></video>`);
    });

    it('handles single quotes', () => {
      const out = rewriteChapterResourceUrls("<img src='a/b.gif'/>", DIR);
      expect(out).toBe(`<img src='file://${DIR}/b.gif'/>`);
    });

    it('is case-insensitive on attribute name', () => {
      const out = rewriteChapterResourceUrls('<IMG SRC="x.png">', DIR);
      expect(out).toBe(`<IMG SRC="file://${DIR}/x.png">`);
    });

    it('strips query and fragment from resource path', () => {
      const out = rewriteChapterResourceUrls(
        '<img src="images/pic.png?v=2#frag"/>',
        DIR,
      );
      expect(out).toBe(`<img src="file://${DIR}/pic.png"/>`);
    });

    it('rewrites multiple references in one document', () => {
      const html = '<img src="a/1.png"/><img src="b/2.png"/>';
      const out = rewriteChapterResourceUrls(html, DIR);
      expect(out).toBe(
        `<img src="file://${DIR}/1.png"/><img src="file://${DIR}/2.png"/>`,
      );
    });
  });

  describe('external / non-rewritable references left untouched', () => {
    it.each([
      ['<a href="http://example.com/x">', 'http link'],
      ['<a href="https://example.com/x.png">', 'https link'],
      ['<img src="data:image/png;base64,AAAA"/>', 'data URI'],
      ['<a href="mailto:foo@bar.com">', 'mailto'],
      ['<a href="tel:12345">', 'tel'],
      ['<img src="//cdn.example.com/x.png"/>', 'protocol-relative'],
      ['<a href="#section">', 'pure fragment'],
    ])('leaves %s unchanged (%s)', input => {
      expect(rewriteChapterResourceUrls(input, DIR)).toBe(input);
    });
  });

  describe('edge cases', () => {
    it('returns empty string unchanged', () => {
      expect(rewriteChapterResourceUrls('', DIR)).toBe('');
    });

    it('ignores empty attribute value', () => {
      const html = '<img src=""/>';
      expect(rewriteChapterResourceUrls(html, DIR)).toBe(html);
    });

    it('does not match attributes that merely end with href/src', () => {
      // The lookbehind requires whitespace/quote before the name, so the
      // "href" inside "data-href" must NOT be rewritten.
      const html = '<a data-href="x/y.png" class="z">';
      expect(rewriteChapterResourceUrls(html, DIR)).toBe(html);
    });

    it('rewrites a real attribute adjacent to a data-* attribute', () => {
      const html = '<img data-id="9" src="img/a.png"/>';
      expect(rewriteChapterResourceUrls(html, DIR)).toBe(
        `<img data-id="9" src="file://${DIR}/a.png"/>`,
      );
    });
  });
});
