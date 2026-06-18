import { htmlToXhtml } from '../xhtmlSanitizer';

describe('htmlToXhtml', () => {
  it('should return empty string for empty input', () => {
    expect(htmlToXhtml('')).toBe('');
    expect(htmlToXhtml('   ')).toBe('');
  });

  it('should pass through simple well-formed HTML', () => {
    const result = htmlToXhtml('<p>Hello world</p>');
    expect(result).toContain('<p>');
    expect(result).toContain('Hello world');
    expect(result).toContain('</p>');
  });

  it('should handle void elements in valid XML form', () => {
    const result = htmlToXhtml('<p>Text<br>More text</p>');
    // cheerio xmlMode serializes <br> as <br></br> which is valid XML
    // It should NOT contain un-closed <br> without xml-valid form
    expect(result).toContain('<p>');
    expect(result).toContain('Text');
    expect(result).toContain('More text');
    // Valid XML: either <br/> or <br></br>
    expect(result).toMatch(/<br\s*\/?>|<br><\/br>/);
  });

  it('should ensure <img> has alt attribute', () => {
    const result = htmlToXhtml('<img src="test.jpg">');
    expect(result).toContain('alt=""');
  });

  it('should convert named HTML entities to numeric or unicode', () => {
    const result = htmlToXhtml('<p>Hello&nbsp;World</p>');
    // &nbsp; should not appear as named entity
    expect(result).not.toContain('&nbsp;');
    expect(result).toContain('Hello');
    expect(result).toContain('World');
  });

  it('should convert &mdash; to numeric entity', () => {
    const result = htmlToXhtml('<p>Hello&mdash;World</p>');
    // &mdash; decoded to — then may be encoded as &#x2014; by cheerio
    expect(result).not.toContain('&mdash;');
    // Should contain either the unicode char or hex entity
    const hasMdash = result.includes('—') || result.includes('&#x2014;');
    expect(hasMdash).toBe(true);
  });

  it('should fix unclosed tags', () => {
    const result = htmlToXhtml('<p>Paragraph without close<p>Another');
    // cheerio should auto-close the tags
    expect(result).toContain('</p>');
  });

  it('should fix mismatched tags', () => {
    const result = htmlToXhtml('<div><p>Text</div></p>');
    // Output should be well-formed — contains closing tags
    expect(result).toContain('</p>');
    expect(result).toContain('</div>');
  });

  it('should remove script tags', () => {
    const result = htmlToXhtml(
      '<p>Text</p><script>alert("xss")</script><p>More</p>',
    );
    expect(result).not.toContain('script');
    expect(result).not.toContain('alert');
    expect(result).toContain('Text');
    expect(result).toContain('More');
  });

  it('should remove style tags', () => {
    const result = htmlToXhtml('<style>body{color:red}</style><p>Text</p>');
    expect(result).not.toContain('style');
    expect(result).not.toContain('color:red');
    expect(result).toContain('Text');
  });

  it('should remove form elements', () => {
    const result = htmlToXhtml(
      '<form><input type="text"><select><option>A</option></select></form><p>Text</p>',
    );
    expect(result).not.toContain('<form');
    expect(result).not.toContain('<input');
    expect(result).not.toContain('<select');
  });

  it('should handle nested elements correctly', () => {
    const result = htmlToXhtml(
      '<div><p>Hello <strong>world</strong></p></div>',
    );
    expect(result).toContain('<strong>world</strong>');
  });

  it('should handle unicode content (may be hex-encoded)', () => {
    const result = htmlToXhtml('<p>日本語テスト</p>');
    // Cheerio xmlMode may hex-encode non-ASCII chars as &#x...;
    // Both raw unicode and hex entities are valid XHTML
    const hasContent =
      result.includes('日本語テスト') || result.includes('&#x');
    expect(hasContent).toBe(true);
    expect(result).toContain('<p>');
    expect(result).toContain('</p>');
  });

  it('should convert multiple named entities to non-named form', () => {
    const result = htmlToXhtml('<p>&ldquo;Hello&rdquo; &amp; goodbye</p>');
    // Named entities should be decoded
    expect(result).not.toContain('&ldquo;');
    expect(result).not.toContain('&rdquo;');
    // &amp; re-escaped by xmlMode
    expect(result).toContain('&amp;');
    // Should contain content
    expect(result).toContain('Hello');
    expect(result).toContain('goodbye');
  });

  it('should remove iframe and embed', () => {
    const result = htmlToXhtml(
      '<iframe src="x"></iframe><embed src="y"><p>Text</p>',
    );
    expect(result).not.toContain('iframe');
    expect(result).not.toContain('embed');
    expect(result).toContain('Text');
  });
});
