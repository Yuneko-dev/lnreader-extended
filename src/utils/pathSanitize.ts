/**
 * Path traversal guards (CWE-22).
 *
 * Across the app, identifiers such as `pluginId` are concatenated into
 * filesystem paths (e.g. `${PLUGIN_STORAGE}/${pluginId}/index.js`,
 * `${NOVEL_STORAGE}/${pluginId}/${novelId}`). These ids originate from
 * untrusted sources — repository JSON and restored backups — so an id like
 * `../../databases` would let a write/read/delete escape its intended
 * directory. Numeric ids (novelId, chapterId) are safe; only string segments
 * need validation.
 *
 * A value is safe to use as a single path segment when it is a non-empty
 * string that is neither "." nor ".." and contains no path separator or NUL.
 */
export const isSafePathSegment = (segment: unknown): segment is string => {
  return (
    typeof segment === 'string' &&
    segment.length > 0 &&
    segment !== '.' &&
    segment !== '..' &&
    !/[/\\\0]/.test(segment)
  );
};

/**
 * Throw if `segment` cannot be safely used as a single filesystem path
 * segment. `label` is included in the error for diagnostics.
 */
export const assertSafePathSegment = (
  segment: unknown,
  label = 'path segment',
): void => {
  if (!isSafePathSegment(segment)) {
    throw new Error(`Unsafe ${label}: ${JSON.stringify(segment)}`);
  }
};
