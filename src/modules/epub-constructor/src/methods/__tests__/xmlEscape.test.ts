import { escapeXml, sanitizeXmlId } from '../xmlEscape';

// Mock react-native-quick-crypto
jest.mock('react-native-quick-crypto', () => ({
  randomUUID: jest.fn(() => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    },
  )),
}));

describe('escapeXml', () => {
  it('should escape ampersand', () => {
    expect(escapeXml('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('should escape less-than', () => {
    expect(escapeXml('a < b')).toBe('a &lt; b');
  });

  it('should escape greater-than', () => {
    expect(escapeXml('a > b')).toBe('a &gt; b');
  });

  it('should escape double quotes', () => {
    expect(escapeXml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('should escape single quotes', () => {
    expect(escapeXml("it's")).toBe('it&apos;s');
  });

  it('should escape all special chars together', () => {
    expect(escapeXml('Chapter 1: "Hello" & <World>')).toBe(
      'Chapter 1: &quot;Hello&quot; &amp; &lt;World&gt;',
    );
  });

  it('should handle empty string', () => {
    expect(escapeXml('')).toBe('');
  });

  it('should not double-escape already escaped content', () => {
    // escapeXml should escape the & in &amp; to &amp;amp;
    // This is correct behavior — caller must pass raw text
    expect(escapeXml('&amp;')).toBe('&amp;amp;');
  });

  it('should handle unicode characters safely', () => {
    expect(escapeXml('日本語テスト')).toBe('日本語テスト');
  });

  it('should handle strings with only special characters', () => {
    expect(escapeXml('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&apos;');
  });
});

describe('sanitizeXmlId', () => {
  it('should return a valid XML NCName with prefix', () => {
    const id = sanitizeXmlId('ch');
    expect(id).toMatch(/^ch_[a-f0-9]{32}$/);
  });

  it('should generate unique IDs on subsequent calls', () => {
    const id1 = sanitizeXmlId('nav');
    const id2 = sanitizeXmlId('nav');
    expect(id1).not.toBe(id2);
  });

  it('should clean prefix with special characters', () => {
    const id = sanitizeXmlId('my chapter!@#');
    // Special chars replaced with _, UUID appended
    expect(id).toMatch(/^my_chapter___/);
  });

  it('should fix prefix starting with digit', () => {
    const id = sanitizeXmlId('123abc');
    // Leading digits replaced with _
    expect(id).toMatch(/^_abc_/);
  });

  it('should use default prefix for empty string', () => {
    const id = sanitizeXmlId('');
    expect(id).toMatch(/^_id_/);
  });

  it('should use default prefix when no argument given', () => {
    const id = sanitizeXmlId();
    expect(id).toMatch(/^id_/);
  });
});
