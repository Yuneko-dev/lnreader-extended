import { TokenResponse } from '../interface';
import { API } from '../REST';

export type Snowflake = string;

export interface APIEmoji {
  animated: boolean;
  name: string;
  id: string | null;
}

export interface RawEmoji {
  id: string | null;
  name?: string;
  animated?: boolean;
}

export type EmojiIdentifierResolvable =
  | string
  | { id?: string | null; name?: string; animated?: boolean };

const isObject = (d: unknown): d is Record<string, any> =>
  typeof d === 'object' && d !== null;

/**
 * Contains various general-purpose utility methods.
 */
export class Util {
  private constructor() {}

  static URLCanParse(url: string | URL, base?: string | URL | undefined) {
    try {
      return !!new URL(url, base);
    } catch {
      return false;
    }
  }

  /**
   * Flatten an object. Any properties that are collections will get converted to an array of keys.
   * @param obj The object to flatten.
   * @param props Specific properties to include/exclude.
   */
  static flatten(
    obj: unknown,
    ...props: Array<Record<string, boolean | string>>
  ): any {
    if (!isObject(obj)) return obj;

    const objProps = Object.keys(obj)
      .filter(k => !k.startsWith('_'))
      .map(k => ({ [k]: true }));

    const mergedProps: Record<string, boolean | string> = objProps.length
      ? Object.assign({}, ...objProps, ...props)
      : Object.assign({}, ...props);

    const out: Record<string, any> = {};

    // eslint-disable-next-line prefer-const
    for (let [prop, newProp] of Object.entries(mergedProps)) {
      if (!newProp) continue;
      newProp = newProp === true ? prop : newProp;

      const element = obj[prop];
      const elemIsObj = isObject(element);

      const valueOf =
        elemIsObj && typeof (element as any).valueOf === 'function'
          ? (element as any).valueOf()
          : null;
      const hasToJSON =
        elemIsObj && typeof (element as any).toJSON === 'function';

      // If it's an array, call toJSON function on each element if present, otherwise flatten each element
      if (Array.isArray(element)) {
        out[newProp as string] = element.map(
          (e: any) => e?.toJSON?.() ?? Util.flatten(e),
        );
      }
      // If it's an object with a primitive `valueOf`, use that value
      else if (typeof valueOf !== 'object' && valueOf !== null) {
        out[newProp as string] = valueOf;
      }
      // If it's an object with a toJSON function, use the return value of it
      else if (hasToJSON) {
        out[newProp as string] = (element as any).toJSON();
      }
      // If element is an object, use the flattened version of it
      else if (typeof element === 'object' && element !== null) {
        out[newProp as string] = Util.flatten(element);
      }
      // If it's a primitive
      else if (!elemIsObj) {
        out[newProp as string] = element;
      }
    }

    return out;
  }

  /**
   * Parses emoji info out of a string.
   * @param text Emoji string to parse
   */
  static parseEmoji(text: string): APIEmoji | null {
    if (text.includes('%')) text = decodeURIComponent(text);
    if (!text.includes(':')) {
      return { animated: false, name: text, id: null };
    }

    const match = text.match(/<?(?:(a):)?(\w{2,32}):(\d{17,19})?>?/);
    return match
      ? {
          animated: Boolean(match[1]),
          name: match[2],
          id: match[3] ?? null,
        }
      : null;
  }

  /**
   * Resolves a partial emoji object from an EmojiIdentifierResolvable.
   * @param emoji Emoji identifier to resolve
   */
  static resolvePartialEmoji(
    emoji?: EmojiIdentifierResolvable | null,
  ): RawEmoji | null {
    if (!emoji) return null;
    if (typeof emoji === 'string') {
      return /^\d{17,19}$/.test(emoji) ? { id: emoji } : Util.parseEmoji(emoji);
    }

    const { id, name, animated } = emoji;
    if (!id && !name) return null;
    return { id: id ?? null, name, animated: Boolean(animated) };
  }

  /**
   * Calculates the default avatar index for a given user id.
   * @param userId - The user id to calculate the default avatar index for
   */
  static calculateUserDefaultAvatarIndex(userId: Snowflake): number {
    // eslint-disable-next-line no-bitwise
    return Number(BigInt(userId) >> 22n) % 6;
  }

  /**
   * Lazily evaluates a callback function
   * @param cb The callback to lazily evaluate
   */
  static lazy<T>(cb: () => T): () => T {
    let defaultValue: T;
    return () => (defaultValue ??= cb());
  }

  /**
   * Recursively clears undefined, null, or empty arrays from an object.
   * @param object The object to clean
   */
  static clearNullOrUndefinedObject(
    object: Record<string, any>,
  ): Record<string, any> | undefined {
    const data: Record<string, any> = {};
    const keys = Object.keys(object);

    for (const key of keys) {
      const value = object[key];

      if (
        value === undefined ||
        value === null ||
        (Array.isArray(value) && value.length === 0)
      ) {
        continue;
      } else if (!Array.isArray(value) && typeof value === 'object') {
        const cleanedValue = Util.clearNullOrUndefinedObject(value);
        if (cleanedValue !== undefined) {
          data[key] = cleanedValue;
        }
      } else {
        data[key] = value;
      }
    }

    return Object.keys(data).length > 0 ? data : undefined;
  }

  static async getExternal(
    rest: API,
    token: string,
    applicationId: string,
    ...images: string[]
  ) {
    if (!/^[0-9]{17,19}$/.test(applicationId)) {
      throw new Error('Application id must be a Discord Snowflake');
    }
    if (images.length > 2) {
      throw new Error('RichPresence can only have up to 2 external images');
    }
    if (images.some(image => !Util.URLCanParse(image))) {
      throw new Error('Each image must be a valid URL.');
    }
    const res = await rest.api.applications[applicationId][
      'external-assets'
    ].post({
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: images }),
    });
    return res.json() as Promise<
      { url: string; external_asset_path: string }[]
    >;
  }

  static async refreshToken(
    rest: API,
    token: string,
    clientId: string,
    oldData: TokenResponse,
  ) {
    const res = await rest.api.oauth2.token.post({
      body: new URLSearchParams({
        client_id: clientId,
        refresh_token: oldData.refresh_token,
        grant_type: 'refresh_token',
      }),
      headers: { Authorization: token },
    });
    if (!res.ok) {
      const json = await res.json();
      if (json.error === 'invalid_client') {
        throw new Error(
          'You must have the PUBLIC_OAUTH2_CLIENT application flag set.',
        );
      } else {
        throw new Error(
          `Failed to refresh token: ${res.status} - ${JSON.stringify(json)}`,
        );
      }
    } else {
      return res.json() as Promise<TokenResponse>;
    }
  }
}
