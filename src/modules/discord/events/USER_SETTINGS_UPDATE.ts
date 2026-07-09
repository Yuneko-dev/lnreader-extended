export type UserSettingsUpdateEvent = Partial<{
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
}>;
