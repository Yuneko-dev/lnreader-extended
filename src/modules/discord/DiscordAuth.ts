import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { discordRPC } from './DiscordRPC';
import { createHash, randomBytes } from 'react-native-quick-crypto';
import { API, TokenResponse } from './index';
import { Buffer } from 'buffer';
import { DISCORD_CLIENT_ID } from './utils/Constants';

export const DISCORD_SCOPE = ['openid', 'sdk.social_layer_presence'].join(' ');
export const REDIRECT_URI = 'lnreader:/authorize/callback';
const SECURE_STORE_KEY = 'DISCORD_OAUTH2_TOKEN';

export const rest = new API();

export interface StoredTokenData extends TokenResponse {
  expired_time: number;
}

export class DiscordAuth {
  static async login(): Promise<StoredTokenData | null> {
    return new Promise(async (resolve, reject) => {
      try {
        // Generate PKCE
        const codeVerifier = Buffer.from(randomBytes(32))
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/g, '');
        const codeChallenge = createHash('sha256')
          .update(codeVerifier)
          .digest('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/g, '');

        const searchParams = new URLSearchParams({
          client_id: DISCORD_CLIENT_ID,
          redirect_uri: REDIRECT_URI,
          response_type: 'code',
          scope: DISCORD_SCOPE,
          state: Buffer.from(randomBytes(16)).toString('base64'),
          code_challenge: codeChallenge,
          code_method: 'S256',
          fromAppsFlyer: 'false',
        });

        // Native URL for Android intent
        const nativeUrl = `discord://action/oauth2/authorize?${searchParams.toString()}`;
        const webUrl = `https://discord.com/oauth2/authorize?${searchParams.toString()}`;

        const exchangeCode = async (code: string) => {
          // Exchange code for token
          const body = new URLSearchParams({
            client_id: DISCORD_CLIENT_ID,
            grant_type: 'authorization_code',
            code: code,
            code_verifier: codeVerifier,
            redirect_uri: REDIRECT_URI,
          });

          const resp = await rest.api.oauth2.token.post({
            body: body.toString(),
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          });

          if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`Token exchange failed: ${resp.status} - ${text}`);
          }

          const tokenData = (await resp.json()) as TokenResponse;
          const storedData: StoredTokenData = {
            ...tokenData,
            expired_time: Date.now() + tokenData.expires_in * 1000,
          };

          await SecureStore.setItemAsync(
            SECURE_STORE_KEY,
            JSON.stringify(storedData),
          );
          resolve(storedData);
        };

        let subscription: { remove: () => void } | undefined;
        let timeoutId: NodeJS.Timeout | undefined;

        const handleUrl = async (event: { url: string }) => {
          if (event.url.startsWith(REDIRECT_URI)) {
            subscription?.remove();
            if (timeoutId) clearTimeout(timeoutId);
            try {
              const redirectUrl = new URL(event.url);
              const code = redirectUrl.searchParams.get('code');
              const error = redirectUrl.searchParams.get('error');

              if (error) {
                return reject(
                  new Error(
                    `OAuth2 Error: ${error} - ${redirectUrl.searchParams.get(
                      'error_description',
                    )}`,
                  ),
                );
              }
              if (!code) {
                return reject(new Error('No code found in redirect URI'));
              }
              await exchangeCode(code);
            } catch (e) {
              reject(e);
            }
          }
        };

        try {
          // Add event listener before trying to open
          subscription = Linking.addEventListener('url', handleUrl);

          await Linking.openURL(nativeUrl);

          // Fallback timeout in case user closes discord app manually
          timeoutId = setTimeout(() => {
            subscription?.remove();
            reject(new Error('Timeout waiting for Discord authorization'));
          }, 60000);
        } catch (e) {
          console.warn(
            'Failed to open Discord app, falling back to web auth:',
            e,
          );
          // Fallback to WebBrowser if native app fails or is not installed
          subscription?.remove();
          if (timeoutId) clearTimeout(timeoutId);
          const result = await WebBrowser.openAuthSessionAsync(
            webUrl,
            REDIRECT_URI,
          );

          if (result.type !== 'success') {
            return reject(new Error(`OAuth2 Failed: ${result.type}`));
          }

          const redirectUrl = new URL(result.url);
          const code = redirectUrl.searchParams.get('code');
          const error = redirectUrl.searchParams.get('error');

          if (error) {
            return reject(
              new Error(
                `OAuth2 Error: ${error} - ${redirectUrl.searchParams.get(
                  'error_description',
                )}`,
              ),
            );
          }

          if (!code) {
            return reject(new Error('No code found in redirect URI'));
          }

          await exchangeCode(code);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  static async getToken(): Promise<StoredTokenData | null> {
    try {
      const data = await SecureStore.getItemAsync(SECURE_STORE_KEY);
      if (!data) return null;
      const parsed = JSON.parse(data) as StoredTokenData;

      // Check expiration with 1 minute buffer
      if (Date.now() > parsed.expired_time - 60000) {
        return await this.refreshToken(parsed.refresh_token);
      }
      return parsed;
    } catch {
      return null;
    }
  }

  static async saveToken(data: StoredTokenData): Promise<void> {
    await SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(data));
  }

  static async refreshToken(
    refreshToken: string,
  ): Promise<StoredTokenData | null> {
    try {
      const body = new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      });

      const resp = await rest.api.oauth2.token.post({
        body: body.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (!resp.ok) {
        if (resp.status >= 400 && resp.status < 500) {
          console.error('Failed to refresh token (client error), logging out.');
          await this.logout();
        } else {
          console.error(`Server error refreshing token: ${resp.status}`);
        }
        return null;
      }

      const tokenData = (await resp.json()) as TokenResponse;
      const storedData: StoredTokenData = {
        ...tokenData,
        expired_time: Date.now() + tokenData.expires_in * 1000,
      };

      await this.saveToken(storedData);
      return storedData;
    } catch (err: any) {
      console.error('Refresh token error:', err);
      // Network error or fetch failed. Do NOT logout here, just return null.
      return null;
    }
  }

  static async logout(): Promise<void> {
    try {
      const data = await SecureStore.getItemAsync(SECURE_STORE_KEY);
      if (data) {
        const parsed = JSON.parse(data) as StoredTokenData;
        const body = new URLSearchParams({
          client_id: DISCORD_CLIENT_ID,
          token: parsed.access_token,
        });

        // Revoke the token
        await rest.api.oauth2.token.revoke.post({
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        });
      }
    } catch (err) {
      console.error('Revoke token error:', err);
    } finally {
      await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
      discordRPC.disconnect();
    }
  }

  static async getUserProfile(tokenData: StoredTokenData): Promise<any | null> {
    try {
      const userResp = await rest.api.users['@me'].get({
        headers: {
          Authorization: `${tokenData.token_type} ${tokenData.access_token}`,
        },
      });
      if (!userResp.ok) {
        if (userResp.status === 401 || userResp.status === 403) {
          return null; // Token is invalid
        }
        throw new Error(`API Error ${userResp.status}`);
      }
      return await userResp.json();
    } catch (e: any) {
      if (e.message && e.message.includes('API Error')) {
        throw e;
      }
      throw new Error('Network error fetching profile');
    }
  }
}
