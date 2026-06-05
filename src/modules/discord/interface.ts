export type TokenResponse = {
  token_type: string;
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  id_token?: string;
};
