export type SessionsReplaceEvent = {
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
