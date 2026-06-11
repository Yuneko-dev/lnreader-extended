import { APP_SETTINGS, AppSettings } from '@hooks/persisted/useSettings';
import { getString } from '@strings/translations';
import { APP_GITHUB, APP_NAME } from '@utils/constants/metadata';
import { MMKVStorage } from '@utils/mmkv/mmkv';
import * as FileSystem from 'expo-file-system/legacy';
import { AppState, AppStateStatus, InteractionManager } from 'react-native';

import { DiscordAuth, rest } from './DiscordAuth';
import { GatewayClient } from './Gateway';
import { RichPresence } from './structures/Presence';
import { Util } from './utils';
import {
  DEFAULTS,
  DISCORD_CLIENT_ID,
  GatewayOp,
  NON_RESUMABLE_CLOSE_CODES,
} from './utils/Constants';

export class DiscordRPCManager {
  private static instance: DiscordRPCManager;
  private gateway: GatewayClient | null = null;
  private isConnecting = false;
  private isReady = false;
  private lastPayloadTime = 0;
  private pendingPayload: any = null;
  private currentPayload: any = null;
  private throttleTimeout: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private uploadedImages = new Map<string, string>();
  private sessionId = '';
  private applicationId = DISCORD_CLIENT_ID;
  private appStartTime = Date.now();
  private accessToken = '';
  private readonly LOGO_APP_ID = '1512169205879934986';

  private lastAppStateConnectTime = 0;

  private constructor() {
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (state: AppStateStatus) => {
    if (state === 'active' && !this.isReady && !this.isConnecting) {
      const now = Date.now();
      if (now - this.lastAppStateConnectTime < 10000) return;

      const settings = this.getSettings();
      const librarySettings = this.getLibrarySettings();
      if (settings?.discordRPCEnabled && !librarySettings?.incognitoMode) {
        console.log('Automatically reconnect on AppState changes');
        this.lastAppStateConnectTime = now;
        this.connect();
      }
    }
  };

  get token() {
    if (!this.accessToken) return '';
    else return `Bearer ${this.accessToken.replace('Bearer', '').trim()}`;
  }

  static getInstance(): DiscordRPCManager {
    if (!DiscordRPCManager.instance) {
      DiscordRPCManager.instance = new DiscordRPCManager();
    }
    return DiscordRPCManager.instance;
  }

  private getSettings(): AppSettings | null {
    try {
      const settingsStr = MMKVStorage.getString(APP_SETTINGS);
      return settingsStr ? (JSON.parse(settingsStr) as AppSettings) : null;
    } catch {
      return null;
    }
  }

  private getLibrarySettings(): any {
    try {
      const librarySettingsStr = MMKVStorage.getString('LIBRARY_SETTINGS');
      return librarySettingsStr ? JSON.parse(librarySettingsStr) : null;
    } catch {
      return null;
    }
  }

  async connect(): Promise<void> {
    if (this.gateway || this.isConnecting) return;

    this.isConnecting = true;

    // Clear any pending reconnect
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    const librarySettings = this.getLibrarySettings();
    if (librarySettings?.incognitoMode) {
      this.isConnecting = false;
      return;
    }

    const tokenData = await DiscordAuth.getToken();
    if (!tokenData) {
      this.isConnecting = false;
      return;
    }
    this.accessToken = tokenData.access_token;

    this.gateway = new GatewayClient();

    this.gateway.on('ready', ready => {
      this.sessionId = ready.session_id;
      this.isReady = true;
      // eslint-disable-next-line no-console
      console.log('Discord Gateway Ready:', ready.user.username);
      if (this.pendingPayload) {
        this.sendPayload(this.pendingPayload);
        this.pendingPayload = null;
      } else if (this.currentPayload) {
        this.sendPayload(this.currentPayload);
      }
    });

    this.gateway.on('close', info => {
      // eslint-disable-next-line no-console
      console.log('Discord Gateway Closed:', info);
      this.isReady = false;
      this.cleanup();

      if (info.code !== 1000 && !NON_RESUMABLE_CLOSE_CODES.has(info.code)) {
        // eslint-disable-next-line no-console
        console.log('Attempting to reconnect in 1s...');
        this.reconnectTimeout = setTimeout(() => {
          this.connect();
        }, 1000);
      }
    });

    this.gateway.on('error', err => {
      // eslint-disable-next-line no-console
      console.error('Discord Gateway Error:', err);
    });

    try {
      await this.gateway.connect({
        token: `${tokenData.token_type} ${tokenData.access_token}`,
        identify: {
          capabilities: 0,
        },
        gatewayUrl: DEFAULTS.GATEWAY_SDK_URL,
      });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Discord Gateway Connect Error:', err);
      this.cleanup();

      // If the error doesn't have a code, it means it wasn't a clean websocket close
      // The close event listener handles standard reconnects, so we only handle network/abort errors here.
      if (!err?.code) {
        this.reconnectTimeout = setTimeout(() => {
          this.connect();
        }, 1000);
      }
    } finally {
      this.isConnecting = false;
    }
  }

  disconnect(): void {
    if (this.gateway) {
      this.gateway.close(1000, 'User Requested Disconnect');
    }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.gateway) {
      this.gateway.removeAllListeners();
      this.gateway = null;
    }
    this.isConnecting = false;
    this.isReady = false;
    if (this.throttleTimeout) {
      clearTimeout(this.throttleTimeout);
      this.throttleTimeout = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Send an RPC update with throttling (1 req / 5s)
   */
  setActivity(activity: RichPresence | null): void {
    InteractionManager.runAfterInteractions(() => {
      const librarySettings = this.getLibrarySettings();

      if (librarySettings?.incognitoMode || !this.gateway) {
        return;
      }

      const payload = {
        activities: activity ? [activity.toJSON()] : [],
        afk: false,
        since: 0,
        status: 'idle',
      };

      this.currentPayload = payload;

      const now = Date.now();
      const timeSinceLast = now - this.lastPayloadTime;

      if (timeSinceLast >= 5000) {
        // Can send immediately
        this.sendPayload(payload);
      } else {
        // Throttle / Debounce
        this.pendingPayload = payload;
        if (!this.throttleTimeout) {
          this.throttleTimeout = setTimeout(() => {
            if (this.pendingPayload) {
              this.sendPayload(this.pendingPayload);
              this.pendingPayload = null;
            }
            this.throttleTimeout = null;
          }, 5000 - timeSinceLast);
        }
      }
    });
  }

  private sendPayload(payload: any) {
    if (this.gateway && this.isReady) {
      this.gateway.send(GatewayOp.PRESENCE_UPDATE, payload);
      this.lastPayloadTime = Date.now();
    } else {
      this.pendingPayload = payload;
    }
  }

  // Helpers for standard actions
  createBaseActivity(button2?: { name: string; url: string }): RichPresence {
    const buttons: {
      name: string;
      url: string;
    }[] = [];
    const activity = new RichPresence(this.sessionId)
      .setApplicationId(this.applicationId)
      .setName(APP_NAME)
      .setType('WATCHING')
      .setStartTimestamp(this.appStartTime);
    buttons.push({ name: getString('discord.btnReadOnApp'), url: APP_GITHUB });

    if (button2 && button2.url && Util.URLCanParse(button2.url)) {
      buttons.push(button2);
    }
    activity.setButtons(...buttons);

    return activity;
  }

  private async resolveCoverForRPC(
    cover?: string | null,
  ): Promise<string | null> {
    if (!cover) return null;
    let uploadUrl = cover;
    if (cover.startsWith('file://')) {
      if (this.uploadedImages.has(cover)) {
        uploadUrl = this.uploadedImages.get(cover)!;
      } else {
        try {
          const res = await FileSystem.uploadAsync(
            'https://tmpfiles.org/api/v1/upload',
            cover,
            {
              fieldName: 'file',
              httpMethod: 'POST',
              parameters: {
                expire: '86400',
              },
              uploadType: FileSystem.FileSystemUploadType.MULTIPART,
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
              },
            },
          );
          const json = JSON.parse(res.body);
          if (
            res.status === 200 &&
            json?.status === 'success' &&
            json?.data?.url
          ) {
            const directUrl = json.data.url.replace(
              'tmpfiles.org/',
              'tmpfiles.org/dl/',
            );
            this.uploadedImages.set(cover, directUrl);
            uploadUrl = directUrl;
          } else {
            return null;
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.log('Failed to upload local cover to tmpfiles', e);
          return null;
        }
      }
    }
    if (!this.token) return null;
    try {
      const ext = await Util.getExternal(
        rest,
        this.token,
        this.applicationId,
        uploadUrl,
      );
      if (ext && ext.length > 0) {
        return ext[0].external_asset_path;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('Failed to fetch external cover for RPC', e);
    }
    return null;
  }

  async setAppOpen(text: string): Promise<void> {
    const settings = this.getSettings();
    if (
      settings?.discordRPCEnabled === false ||
      settings?.discordRPCAppOpen === false
    ) {
      this.setActivity(null);
      return;
    }

    const activity = this.createBaseActivity()
      .setAssetsLargeImage(this.LOGO_APP_ID)
      .setAssetsLargeText(APP_NAME)
      .setState(text);
    this.setActivity(activity);
  }

  async setBrowsingSource(
    sourceName: string,
    text: string,
    sourceUrl?: string,
    sourceIcon?: string,
  ): Promise<void> {
    const settings = this.getSettings();
    if (
      settings?.discordRPCEnabled === false ||
      settings?.discordRPCBrowsing === false
    ) {
      this.setActivity(null);
      return;
    }

    const button2 = sourceUrl
      ? { name: getString('discord.btnSource'), url: sourceUrl }
      : undefined;
    const activity = this.createBaseActivity(button2)
      .setAssetsLargeImage(this.LOGO_APP_ID)
      .setAssetsLargeText(APP_NAME)
      .setDetails(text)
      .setState(sourceName);

    const resolvedIcon = await this.resolveCoverForRPC(sourceIcon);
    if (resolvedIcon) {
      activity.setAssetsSmallImage(resolvedIcon);
      activity.setAssetsSmallText(sourceName);
    }

    this.setActivity(activity);
  }

  async setBrowsingNovel(
    novelName: string,
    text: string,
    cover?: string | null,
    novelUrl?: string,
  ): Promise<void> {
    const settings = this.getSettings();
    if (
      settings?.discordRPCEnabled === false ||
      settings?.discordRPCReading === false
    ) {
      this.setActivity(null);
      return;
    }

    const button2 = novelUrl
      ? { name: getString('discord.btnViewNovel'), url: novelUrl }
      : undefined;
    const activity = this.createBaseActivity(button2)
      .setAssetsSmallImage(this.LOGO_APP_ID)
      .setAssetsSmallText(APP_NAME)
      .setDetails(text)
      .setState(novelName);

    const resolvedCover = await this.resolveCoverForRPC(cover);
    if (resolvedCover) {
      activity.setAssetsLargeImage(resolvedCover);
      activity.setAssetsLargeText(novelName);
    }

    this.setActivity(activity);
  }

  async setReadingChapter(
    novelName: string,
    chapterName: string,
    text: string,
    cover?: string | null,
    chapterUrl?: string,
    chapterPage?: string | null,
  ): Promise<void> {
    const settings = this.getSettings();
    if (
      settings?.discordRPCEnabled === false ||
      settings?.discordRPCReading === false
    ) {
      this.setActivity(null);
      return;
    }

    const button2 = chapterUrl
      ? { name: getString('discord.btnReadChapter'), url: chapterUrl }
      : undefined;
    const activity = this.createBaseActivity(button2)
      .setAssetsSmallImage(this.LOGO_APP_ID)
      .setAssetsSmallText(APP_NAME)
      .setDetails(novelName)
      .setState(`${text}: ${chapterName}`);

    const resolvedCover = await this.resolveCoverForRPC(cover);
    if (resolvedCover) {
      activity.setAssetsLargeImage(resolvedCover);
      const largeText = chapterPage
        ? `[${chapterPage}]: ${chapterName}`
        : chapterName;
      activity.setAssetsLargeText(largeText);
    }

    this.setActivity(activity);
  }
}

export const discordRPC = DiscordRPCManager.getInstance();
