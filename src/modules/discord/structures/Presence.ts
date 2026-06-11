import { randomBytes } from 'react-native-quick-crypto';

import { ActivityTypes, EmojiIdentifierResolvable, Util } from '../utils';

function parseImage(image: any): string | null {
  if (typeof image !== 'string') {
    image = null;
  } else if (image.startsWith('mp:')) {
    return image;
  } else if (
    Util.URLCanParse(image) &&
    ['http:', 'https:'].includes(new URL(image).protocol)
  ) {
    image = image
      .replace('https://cdn.discordapp.com/', 'mp:')
      .replace('http://cdn.discordapp.com/', 'mp:')
      .replace('https://media.discordapp.net/', 'mp:')
      .replace('http://media.discordapp.net/', 'mp:');
    if (!image.startsWith('mp:')) {
      throw new Error('INVALID_URL');
    }
  } else if (/^[0-9]{17,19}$/.test(image)) {
    // ID Assets
  } else if (
    ['mp:', 'youtube:', 'spotify:', 'twitch:'].some(v => image.startsWith(v))
  ) {
    // Image
  } else if (image.startsWith('external/')) {
    image = `mp:${image}`;
  }
  return image;
}

function formatRPCString(
  str: string | null | undefined,
  maxLength: number = 128,
): string | null | undefined {
  if (str === null || str === undefined) return str;
  const trimmed = str.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length < 2) return trimmed + '\u200b'; // add zero-width space to reach 2 chars
  if (trimmed.length <= maxLength) return trimmed;
  if (maxLength <= 3) return trimmed.substring(0, maxLength);
  return trimmed.substring(0, maxLength - 3) + '...';
}

export class RichPresence {
  public name?: string;
  public type: number = 0;
  public url?: string | null;
  public applicationId?: string | null;
  public state?: string | null;
  public details?: string | null;
  public party?: { id: string | null; size: number[] } | null;
  public timestamps?: { start: number | null; end: number | null } | null;
  public buttons: string[] = [];
  public platform?: string | null;
  public secrets: any = {};
  public metadata: any = {};
  public createdTimestamp: number = Date.now();
  public assets: {
    largeImage?: string | null;
    largeText?: string | null;
    smallImage?: string | null;
    smallText?: string | null;
  } = {};
  public flags?: number;
  public syncId?: string | null;
  public id?: string;
  public sessionId?: string | null;

  constructor(sessionId?: string) {
    if (sessionId) {
      this.sessionId = sessionId;
    }
  }

  public setApplicationId(id: string | null): this {
    this.applicationId = id;
    return this;
  }

  public setType(type: string | number): this {
    this.type =
      typeof type === 'number' ? type : (ActivityTypes[type] as number);
    return this;
  }

  public setURL(url: string | null): this {
    if (typeof url === 'string' && !Util.URLCanParse(url)) {
      throw new Error('URL must be a valid URL');
    }
    this.url = url;
    return this;
  }

  public setState(state: string | null): this {
    this.state = formatRPCString(state) ?? undefined;
    return this;
  }

  public setName(name: string | null): this {
    this.name = formatRPCString(name) ?? undefined;
    return this;
  }

  public setDetails(details: string | null): this {
    this.details = formatRPCString(details) ?? undefined;
    return this;
  }

  public setParty(
    party: { max: number; current: number; id?: string } | null,
  ): this {
    if (party) {
      if (!party.max || typeof party.max !== 'number') {
        throw new Error('Party must have max number');
      }
      if (!party.current || typeof party.current !== 'number') {
        throw new Error('Party must have current');
      }
      if (party.current > party.max) {
        throw new Error('Party current must be less than max number');
      }
      this.party = {
        size: [party.current, party.max],
        id: party.id || randomBytes(16).toString('hex'),
      };
    } else {
      this.party = null;
    }
    return this;
  }

  public setStartTimestamp(timestamp: Date | number | null): this {
    if (!this.timestamps) this.timestamps = { start: null, end: null };
    if (timestamp instanceof Date) timestamp = timestamp.getTime();
    this.timestamps.start = timestamp;
    return this;
  }

  public setEndTimestamp(timestamp: Date | number | null): this {
    if (!this.timestamps) this.timestamps = { start: null, end: null };
    if (timestamp instanceof Date) timestamp = timestamp.getTime();
    this.timestamps.end = timestamp;
    return this;
  }

  public setAssetsLargeImage(image: string | null): this {
    this.assets.largeImage = image;
    return this;
  }

  public setAssetsLargeText(text: string | null): this {
    this.assets.largeText = formatRPCString(text) ?? undefined;
    return this;
  }

  public setAssetsSmallImage(image: string | null): this {
    this.assets.smallImage = image;
    return this;
  }

  public setAssetsSmallText(text: string | null): this {
    this.assets.smallText = formatRPCString(text) ?? undefined;
    return this;
  }

  public setPlatform(platform: string | null): this {
    this.platform = platform;
    return this;
  }

  public addButton(name: string, url: string): this {
    if (!name || !url) throw new Error('Button must have name and url');
    if (typeof name !== 'string') {
      throw new Error('Button name must be a string');
    }
    if (!Util.URLCanParse(url)) {
      throw new Error('Button url must be a valid url');
    }
    const btnName = formatRPCString(name, 32);
    if (!btnName) throw new Error('Button name must be valid');
    this.buttons.push(btnName);
    if (Array.isArray(this.metadata.button_urls)) {
      this.metadata.button_urls.push(url);
    } else {
      this.metadata.button_urls = [url];
    }
    return this;
  }

  public setButtons(...button: { name: string; url: string }[]): this {
    if (button.length === 0) {
      this.buttons = [];
      delete this.metadata.button_urls;
      return this;
    } else if (button.length > 2) {
      throw new Error('RichPresence can only have up to 2 buttons');
    }

    this.buttons = [];
    this.metadata.button_urls = [];

    button.flat(2).forEach(b => {
      if (b.name && b.url) {
        const btnName = formatRPCString(b.name, 32);
        if (!btnName) throw new Error('Button name must be valid');
        this.buttons.push(btnName);
        if (!Util.URLCanParse(b.url)) {
          throw new Error('Button url must be a valid url');
        }
        this.metadata.button_urls.push(b.url);
      } else {
        throw new Error('Button must have name and url');
      }
    });
    return this;
  }

  public setJoinSecret(join: string | null): this {
    this.secrets.join = join;
    return this;
  }

  public toJSON(): any {
    const result: any = {
      name: this.name,
      type: this.type,
      url: this.url,
      state: this.state,
      details: this.details,
      application_id: this.applicationId,
      timestamps: this.timestamps,
      party: this.party,
      secrets: Object.keys(this.secrets).length > 0 ? this.secrets : undefined,
      buttons: this.buttons.length > 0 ? this.buttons : undefined,
      metadata:
        Object.keys(this.metadata).length > 0 ? this.metadata : undefined,
      platform: this.platform,
      created_at: this.createdTimestamp,
      session_id: this.sessionId,
    };

    if (this.flags !== undefined) result.flags = this.flags;
    if (this.syncId !== undefined) result.sync_id = this.syncId;
    if (this.id !== undefined) result.id = this.id;

    const hasAssets =
      this.assets.largeImage ||
      this.assets.largeText ||
      this.assets.smallImage ||
      this.assets.smallText;
    if (hasAssets) {
      result.assets = {
        large_image: parseImage(this.assets.largeImage),
        large_text: this.assets.largeText,
        small_image: parseImage(this.assets.smallImage),
        small_text: this.assets.smallText,
      };
    }

    return Util.clearNullOrUndefinedObject(result);
  }
}

export class CustomStatus {
  public name: string = ' ';
  public type: number = ActivityTypes.CUSTOM as number;
  public state?: string | null;
  public emoji?: any | null;

  public setEmoji(emoji: EmojiIdentifierResolvable | null): this {
    this.emoji = Util.resolvePartialEmoji(emoji);
    return this;
  }

  public setState(state: string | null): this {
    if (typeof state === 'string' && state.length > 128) {
      throw new Error('State must be less than 128 characters');
    }
    this.state = state;
    return this;
  }

  public toJSON(): any {
    if (!this.emoji && !this.state) {
      throw new Error('CustomStatus must have at least one of emoji or state');
    }
    return {
      name: this.name,
      type: this.type,
      state: this.state,
      emoji: this.emoji,
    };
  }
}

export class SpotifyRPC extends RichPresence {
  constructor(userId: string, sessionId?: string) {
    super(sessionId);
    this.name = 'Spotify';
    this.type = ActivityTypes.LISTENING as number;
    this.id = 'spotify:1';
    this.flags = 48; // Sync + Play (ActivityFlags)
    this.party = {
      id: `spotify:${userId}`,
      size: [],
    } as any;
  }

  public setSongId(id: string): this {
    this.syncId = id;
    return this;
  }

  public addArtistId(id: string): this {
    if (!this.metadata.artist_ids) this.metadata.artist_ids = [];
    this.metadata.artist_ids.push(id);
    return this;
  }

  public setArtistIds(...ids: string[]): this {
    if (!ids?.length) {
      this.metadata.artist_ids = [];
      return this;
    }
    if (!this.metadata.artist_ids) this.metadata.artist_ids = [];
    ids.flat(2).forEach(id => this.metadata.artist_ids.push(id));
    return this;
  }

  public setAlbumId(id: string): this {
    this.metadata.album_id = id;
    this.metadata.context_uri = `spotify:album:${id}`;
    return this;
  }

  public toJSON(): any {
    const result = super.toJSON();
    delete result.id;
    delete result.emoji;
    delete result.platform;
    delete result.buttons;
    return result;
  }
}
