import BitField from './BitField';

export default class Intents extends BitField {
  public static override FLAGS: Record<string, number> = {
    GUILDS: 1 << 0,
    GUILD_MEMBERS: 1 << 1,
    GUILD_BANS: 1 << 2,
    GUILD_EMOJIS_AND_STICKERS: 1 << 3,
    GUILD_INTEGRATIONS: 1 << 4,
    GUILD_WEBHOOKS: 1 << 5,
    GUILD_INVITES: 1 << 6,
    GUILD_VOICE_STATES: 1 << 7,
    GUILD_PRESENCES: 1 << 8,
    GUILD_MESSAGES: 1 << 9,
    GUILD_MESSAGE_REACTIONS: 1 << 10,
    GUILD_MESSAGE_TYPING: 1 << 11,
    DIRECT_MESSAGES: 1 << 12,
    DIRECT_MESSAGE_REACTIONS: 1 << 13,
    DIRECT_MESSAGE_TYPING: 1 << 14,
    MESSAGE_CONTENT: 1 << 15,
    GUILD_SCHEDULED_EVENTS: 1 << 16,
    GUILD_EMBEDDED_ACTIVITIES: 1 << 17,
    PRIVATE_CHANNELS: 1 << 18,
    CALLS: 1 << 19,
    AUTO_MODERATION_CONFIGURATION: 1 << 20,
    AUTO_MODERATION_EXECUTION: 1 << 21,
    USER_RELATIONSHIPS: 1 << 22,
    USER_PRESENCE: 1 << 23,
    GUILD_MESSAGE_POLLS: 1 << 24,
    DIRECT_MESSAGE_POLLS: 1 << 25,
    DIRECT_EMBEDDED_ACTIVITIES: 1 << 26,
    LOBBIES: 1 << 27,
    LOBBY_DELETE: 1 << 28,
    UNKNOWN_29: 1 << 29,
  };

  public static ALL = Object.values(Intents.FLAGS).reduce(
    (all, p) => all | p,
    0,
  );
}
