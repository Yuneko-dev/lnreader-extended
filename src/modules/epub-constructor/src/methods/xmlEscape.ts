import { randomUUID } from 'react-native-quick-crypto';

/**
 * Escape XML special characters in text content & attribute values.
 * Only the 5 predefined XML entities: &, <, >, ", '
 */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Sanitize a string into a valid XML NCName ID.
 *
 * XML ID (NCName) rules:
 * - Must start with a letter (a-z, A-Z) or underscore (_)
 * - May contain letters, digits, hyphens, underscores, periods
 * - No whitespace or other special characters
 *
 * Uses a prefix + cryptographically secure UUID (react-native-quick-crypto)
 * to guarantee uniqueness and prevent collisions.
 *
 * @param prefix - A descriptive prefix for readability (e.g., 'ch', 'nav')
 * @returns A valid, unique XML NCName string
 */
export function sanitizeXmlId(prefix: string = 'id'): string {
  // Clean prefix: keep only valid NCName start characters
  const cleanPrefix = prefix
    .replace(/[^\w.-]/g, '_')
    .replace(/^[^a-zA-Z_]+/, '_');

  const safePrefix = cleanPrefix || '_id';
  const uuid = randomUUID().replace(/-/g, '');

  return `${safePrefix}_${uuid}`;
}
