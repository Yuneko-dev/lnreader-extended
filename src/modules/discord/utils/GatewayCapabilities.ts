import BitField from './BitField';

export default class GatewayCapabilities extends BitField {
  public static override FLAGS: Record<string, number> = {
    LAZY_USER_NOTES: 1 << 0,
    NO_AFFINE_USER_IDS: 1 << 1,
    VERSIONED_READ_STATES: 1 << 2,
    VERSIONED_USER_GUILD_SETTINGS: 1 << 3,
    DEDUPE_USER_OBJECTS: 1 << 4,
    PRIORITIZED_READY_PAYLOAD: 1 << 5,
    MULTIPLE_GUILD_EXPERIMENT_POPULATIONS: 1 << 6,
    NON_CHANNEL_READ_STATES: 1 << 7,
    AUTH_TOKEN_REFRESH: 1 << 8,
    USER_SETTINGS_PROTO: 1 << 9,
    CLIENT_STATE_V2: 1 << 10,
    PASSIVE_GUILD_UPDATE: 1 << 11,
    AUTO_CALL_CONNECT: 1 << 12,
    DEBOUNCE_MESSAGE_REACTIONS: 1 << 13,
    PASSIVE_GUILD_UPDATE_V2: 1 << 14,
    AUTO_LOBBY_CONNECT: 1 << 16,
  };

  public static ALL = Object.values(GatewayCapabilities.FLAGS).reduce(
    (all, p) => all | p,
    0,
  );
}
