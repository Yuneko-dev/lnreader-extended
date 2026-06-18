import { createChapter } from '../createChapter';

// Mock react-native-quick-crypto (used by xmlEscape → sanitizeXmlId)
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

describe('createChapter', () => {
  it('should create a file with correct path', () => {
    const file = createChapter({
      title: 'Test Chapter',
      fileName: 'content/test.xhtml',
      htmlBody: '<p>Hello</p>',
    });

    expect(file.path).toBe('EPUB/content/test.xhtml');
  });

  it('should include XML declaration', () => {
    const file = createChapter({
      title: 'Test',
      fileName: 'content/test.xhtml',
      htmlBody: '<p>Hello</p>',
    });

    expect(file.content).toContain('<?xml version="1.0" encoding="utf-8"?>');
  });

  it('should include DOCTYPE', () => {
    const file = createChapter({
      title: 'Test',
      fileName: 'content/test.xhtml',
      htmlBody: '<p>Hello</p>',
    });

    expect(file.content).toContain('<!DOCTYPE html>');
  });

  it('should include XHTML namespace', () => {
    const file = createChapter({
      title: 'Test',
      fileName: 'content/test.xhtml',
      htmlBody: '<p>Hello</p>',
    });

    expect(file.content).toContain('xmlns="http://www.w3.org/1999/xhtml"');
  });

  it('should include EPUB namespace', () => {
    const file = createChapter({
      title: 'Test',
      fileName: 'content/test.xhtml',
      htmlBody: '<p>Hello</p>',
    });

    expect(file.content).toContain(
      'xmlns:epub="http://www.idpf.org/2007/ops"',
    );
  });

  it('should escape special characters in title', () => {
    const file = createChapter({
      title: 'Chapter: "Hello" & <World>',
      fileName: 'content/test.xhtml',
      htmlBody: '<p>Content</p>',
    });

    expect(file.content).toContain(
      'Chapter: &quot;Hello&quot; &amp; &lt;World&gt;',
    );
  });

  it('should include stylesheet link', () => {
    const file = createChapter({
      title: 'Test',
      fileName: 'content/test.xhtml',
      htmlBody: '<p>Hello</p>',
    });

    expect(file.content).toContain('href="../styles.css"');
  });

  it('should strip disallowed tags (canvas, iframe, etc)', () => {
    const file = createChapter({
      title: 'Test',
      fileName: 'content/test.xhtml',
      htmlBody: '<p>Text</p><canvas>drawing</canvas><iframe src="x"></iframe>',
    });

    expect(file.content).not.toContain('<canvas');
    expect(file.content).not.toContain('<iframe');
    expect(file.content).toContain('Text');
  });

  it('should not include script tag', () => {
    const file = createChapter({
      title: 'Test',
      fileName: 'content/test.xhtml',
      htmlBody: '<p>Text</p>',
    });

    expect(file.content).not.toContain('<script');
    expect(file.content).not.toContain('onload');
  });

  it('should convert HTML entities to unicode', () => {
    const file = createChapter({
      title: 'Test',
      fileName: 'content/test.xhtml',
      htmlBody: '<p>Hello&nbsp;World&mdash;End</p>',
    });

    // Named entities should not appear in output
    expect(file.content).not.toContain('&nbsp;');
    expect(file.content).not.toContain('&mdash;');
    // Content should still be present
    expect(file.content).toContain('Hello');
    expect(file.content).toContain('World');
    expect(file.content).toContain('End');
  });
});
