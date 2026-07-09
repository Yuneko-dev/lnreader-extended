export interface ReadyEvent {
  user_settings: {
    status: string;
    show_current_game: boolean;
    guild_folders: {
      name: string | null;
      id: number | null;
      guild_ids: string[];
      color: number | null;
    }[];
    custom_status: {
      text: string;
      expires_at: null | string;
      emoji_name: null | string;
      emoji_id: null | string;
    };
    allow_activity_party_privacy_voice_channel: boolean;
    allow_activity_party_privacy_friends: boolean;
  };
  user_application_profiles: {};
  user: {
    username: string;
    public_flags: number;
    primary_guild: {
      tag: string;
      identity_guild_id: string;
      identity_enabled: boolean;
      badge: string;
    } | null;
    premium_type: number;
    id: string;
    global_name: string | null;
    flags: number;
    discriminator: string;
    clan: {
      tag: string;
      identity_guild_id: string;
      identity_enabled: boolean;
      badge: string;
    } | null;
    bot: boolean;
    banner_color: string;
    banner: string | null;
    avatar: string | null;
    accent_color: number | null;
  };
  session_id: string;
  scopes: string[];
  resume_gateway_url: string;
  sessions: {
    status: string;
    session_id: string;
    hidden_activities: never[];
    client_info: {
      version: number;
      os: string;
      client: string;
    };
    activities: any[];
    processed_at_timestamp?: number;
    active?: boolean;
  }[];
  relationships: any[];
  private_channels: any[];
  presences: any[];
  guilds: { id: string; name: string }[];
  game_relationships: any[];
  feature_flags: {
    disabled_gateway_events: any[];
    disabled_functions: any[];
  };
  av_sf_protocol_floor: number;
  application: {
    name: string;
    id: string;
    flags_new: string;
    flags: number;
  };
  analytics_token: string;
  _trace: string[];
}
