import { assertSafePathSegment, isSafePathSegment } from '@utils/pathSanitize';

describe('isSafePathSegment', () => {
  it('accepts ordinary plugin-id-like segments', () => {
    expect(isSafePathSegment('en.novelupdates')).toBe(true);
    expect(isSafePathSegment('local')).toBe(true);
    expect(isSafePathSegment('a..b')).toBe(true); // dots inside, no separator
    expect(isSafePathSegment('plugin_123-x')).toBe(true);
  });

  it('rejects traversal and separator segments', () => {
    expect(isSafePathSegment('..')).toBe(false);
    expect(isSafePathSegment('.')).toBe(false);
    expect(isSafePathSegment('../evil')).toBe(false);
    expect(isSafePathSegment('a/b')).toBe(false);
    expect(isSafePathSegment('a\\b')).toBe(false);
    expect(isSafePathSegment('../../databases/lnreader.db')).toBe(false);
  });

  it('rejects empty, NUL, and non-string values', () => {
    expect(isSafePathSegment('')).toBe(false);
    expect(isSafePathSegment('a\0b')).toBe(false);
    expect(isSafePathSegment(undefined)).toBe(false);
    expect(isSafePathSegment(null)).toBe(false);
    expect(isSafePathSegment(123)).toBe(false);
  });
});

describe('assertSafePathSegment', () => {
  it('does not throw for safe segments', () => {
    expect(() => assertSafePathSegment('en.novelupdates')).not.toThrow();
  });

  it('throws for unsafe segments with the label in the message', () => {
    expect(() => assertSafePathSegment('../x', 'pluginId')).toThrow(/pluginId/);
  });
});
