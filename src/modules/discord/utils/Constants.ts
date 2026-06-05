export const DISCORD_CLIENT_ID = '1510134118048858142';

/**
 * Discord Gateway opcodes (subset relevant to a self/user transport).
 * Reference: https://discord.com/developers/docs/topics/opcodes-and-status-codes
 */
export const GatewayOp = {
  DISPATCH: 0,
  HEARTBEAT: 1,
  IDENTIFY: 2,
  PRESENCE_UPDATE: 3,
  VOICE_STATE_UPDATE: 4,
  RESUME: 6,
  RECONNECT: 7,
  REQUEST_GUILD_MEMBERS: 8,
  INVALID_SESSION: 9,
  HELLO: 10,
  HEARTBEAT_ACK: 11,
} as const;

export type GatewayOpCode = (typeof GatewayOp)[keyof typeof GatewayOp];

/**
 * Close codes that the library considers RESUMABLE on the next connect().
 * Anything else (4004 auth, 4010-4014 sharding/intents) means start fresh
 * and discard the prior session_id.
 *
 * Source: https://discord.com/developers/docs/topics/opcodes-and-status-codes#gateway-close-event-codes
 */
export const NON_RESUMABLE_CLOSE_CODES: ReadonlySet<number> = new Set([
  4004, // Authentication failed
  4010, // Invalid shard
  4011, // Sharding required
  4012, // Invalid API version
  4013, // Invalid intents
  4014, // Disallowed intents
]);

export const DEFAULTS = {
  API_BASE: 'https://discord.com/api',
  API_SDK_BASE: 'https://gaming-sdk.com/api',
  API_VERSION: 9,
  GATEWAY_URL: 'wss://gateway.discord.gg',
  GATEWAY_SDK_URL: 'wss://gateway.gaming-sdk.com',
  GATEWAY_VERSION: 9,
  USER_AGENT: 'Discord Embedded/1.9.15780',
  REQUEST_TIMEOUT_MS: 15_000,
  HELLO_TIMEOUT_MS: 20_000,
  CLOSE_TIMEOUT_MS: 5_000,
} as const;

export const DEFAULT_SUPER_PROPERTIES = {
  browser: 'Discord Embedded',
  browser_user_agent: 'Discord Embedded/1.9.15780',
  browser_version: '1.9.15780',
  client_build_number: 15780,
  client_version: '1.9.15780',
  design_id: 0,
  device: 'console',
  native_build_number: 15780,
  os: 'Android',
  release_channel: 'unknown',
};

function createEnum(keys: (string | null)[]) {
  const obj: Record<string | number, string | number> = {};
  for (const [index, key] of keys.entries()) {
    if (key === null) continue;
    obj[key] = index;
    obj[index] = key;
  }
  return obj;
}

export const ActivityTypes = createEnum([
  'PLAYING',
  'STREAMING',
  'LISTENING',
  'WATCHING',
  'CUSTOM',
  'COMPETING',
  'HANG',
]);
