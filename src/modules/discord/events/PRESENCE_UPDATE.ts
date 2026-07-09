export interface PresenceUpdateEvent {
  user: {
    username: string;
    public_flags: number;
    primary_guild: {
      tag: string;
      identity_guild_id: string;
      identity_enabled: boolean;
      badge: string;
    } | null;
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
  status: string;
  restricted_application: null;
  processed_at_timestamp: number | null;
  hidden_activities: any[];
  client_status: Record<string, string>;
  activities: any[];
}
