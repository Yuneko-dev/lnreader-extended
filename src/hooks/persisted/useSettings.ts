import { ChapterOrderKey } from '@database/constants';
import {
  DisplayModes,
  LibraryFilter,
  LibrarySortOrder,
} from '@screens/library/constants/constants';
import { getMMKVObject } from '@utils/mmkv/mmkv';
import { Voice } from 'expo-speech';
import { useCallback, useMemo } from 'react';
import { useMMKVObject } from 'react-native-mmkv';

import type { DohProviderId } from '../../services/network/doh';

/**
 * Cooldown applied between sequential chapter downloads when no override
 * is configured. Matches the historical hard-coded sleep so installs
 * upgrading from earlier builds keep the same behaviour.
 */
export const DEFAULT_CHAPTER_DOWNLOAD_COOLDOWN_MS = 1000;

/**
 * Resolve the cooldown without subscribing to changes. Safe to call from
 * background services and the headless task runner.
 */
export const getChapterDownloadCooldownMs = (): number => {
  const settings = getMMKVObject<AppSettings>(APP_SETTINGS);
  const ms = settings?.chapterDownloadCooldownMs;
  return typeof ms === 'number' && Number.isFinite(ms) && ms >= 0
    ? ms
    : DEFAULT_CHAPTER_DOWNLOAD_COOLDOWN_MS;
};
export const APP_SETTINGS = 'APP_SETTINGS';
export const BROWSE_SETTINGS = 'BROWSE_SETTINGS';
export const LIBRARY_SETTINGS = 'LIBRARY_SETTINGS';
export const CHAPTER_GENERAL_SETTINGS = 'CHAPTER_GENERAL_SETTINGS';
export const CHAPTER_READER_SETTINGS = 'CHAPTER_READER_SETTINGS';
export const TRANSLATE_SETTINGS = 'TRANSLATE_SETTINGS';
export const SECURITY_SETTINGS = 'SECURITY_SETTINGS';

export type SwipeAction = 'disabled' | 'bookmark' | 'markAsRead' | 'download';

export interface AppSettings {
  /**
   * General settings
   */

  incognitoMode: boolean;
  discordRPCEnabled?: boolean;
  discordRPCAppOpen?: boolean;
  discordRPCBrowsing?: boolean;
  discordRPCReading?: boolean;
  disableHapticFeedback: boolean;
  verboseLogging: boolean;
  allowCloudflareBypass: boolean;
  hideCloudflareOverlay: boolean;
  allowProxyAPI: boolean;
  dohProvider: DohProviderId;

  /**
   * Appearence settings
   */

  showHistoryTab: boolean;
  showUpdatesTab: boolean;
  showLabelsInNav: boolean;
  useFabForContinueReading: boolean;
  disableLoadingAnimations: boolean;

  /**
   * Library settings
   */

  downloadedOnlyMode: boolean;
  useLibraryFAB: boolean;

  /**
   * Update settings
   */

  onlyUpdateOngoingNovels: boolean;
  updateLibraryOnLaunch: boolean;
  downloadNewChapters: boolean;
  refreshNovelMetadata: boolean;

  /**
   * Download settings
   */

  /** Cooldown between sequential chapter downloads in milliseconds. */
  chapterDownloadCooldownMs?: number;

  /**
   * Novel settings
   */

  hideBackdrop: boolean;
  defaultChapterSort: ChapterOrderKey;
  swipeActionLeft: SwipeAction;
  swipeActionRight: SwipeAction;

  /**
   * AI settings
   */
  backupApiKeys: boolean;
}

export interface BrowseSettings {
  showMyAnimeList: boolean;
  showAniList: boolean;
  globalSearchConcurrency?: number;
}

export interface LibrarySettings {
  sortOrder?: LibrarySortOrder;
  filter?: LibraryFilter;
  showDownloadBadges?: boolean;
  showUnreadBadges?: boolean;
  showNumberOfNovels?: boolean;
  displayMode?: DisplayModes;
  novelsPerRow?: number;
  incognitoMode?: boolean;
  downloadedOnlyMode?: boolean;
}

export interface ChapterGeneralSettings {
  keepScreenOn: boolean;
  fullScreenMode: boolean;
  pageReader: boolean;
  swipeGestures: boolean;
  showScrollPercentage: boolean;
  useVolumeButtons: boolean;
  volumeButtonsOffset: number | null;
  showBatteryAndTime: boolean;
  autoScroll: boolean;
  autoScrollInterval: number;
  autoScrollOffset: number | null;
  verticalSeekbar: boolean;
  removeExtraParagraphSpacing: boolean;
  bionicReading: boolean;
  tapToScroll: boolean;
  TTSEnable: boolean;
  einkRefreshOnPageTurn: boolean;
}

export interface ReaderTheme {
  backgroundColor: string;
  textColor: string;
}

export interface ChapterReaderSettings {
  theme: string;
  textColor: string;
  textSize: number;
  textAlign: string;
  padding: number;
  paragraphIndent: number;
  paragraphSpacing: number;
  fontFamily: string;
  lineHeight: number;
  customCSS: string;
  customJS: string;
  customThemes: ReaderTheme[];
  tts?: {
    engine?: 'native' | 'tiktok';
    voice?: Voice;
    rate?: number;
    pitch?: number;
    queueSize?: number;
    autoPageAdvance?: boolean;
    scrollToTop?: boolean;
  };
  epubLocation: string;
  epubUseAppTheme: boolean;
  epubUseCustomCSS: boolean;
  epubUseCustomJS: boolean;
}

export type LLMProviderSupported =
  | 'openai'
  | 'xai'
  | 'openrouter'
  | 'deepseek'
  | 'gemini'
  | 'groq'
  | 'custom';

export type LLMReasoningEffortType =
  | 'none'
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh';

export interface SystemPrompt {
  id: string;
  title: string;
  content: string;
}

export interface TranslateSettings {
  engine: 'google-free' | 'llm';
  sourceLang: string;
  targetLang: string;
  llmProvider: LLMProviderSupported;
  llmEndpoint: string;
  llmApiKey: string;
  llmModel: string;
  llmSystemPrompts: SystemPrompt[];
  activeSystemPromptId: string;
  llmEnableReasoning: boolean;
  llmReasoningEffort: LLMReasoningEffortType;
  llmApiMode: 'responses' | 'chat-completions';
  llmTemperature: number;
  autoTranslateNextChapter: boolean;
  downloadTranslated: boolean;
  /** Chunking: split large chapters into word-count-limited chunks */
  llmChunkingEnabled: boolean;
  llmChunkWordLimit: number;
  /** Auto-retry: retry failed translations with Fibonacci backoff */
  llmRetryEnabled: boolean;
  llmRetryMaxAttempts: number;
  /** Fallback for proxies that don't support Structured Model Output */
  llmDisableStructuredOutput: boolean;
}

const initialAppSettings: AppSettings = {
  /**
   * General settings
   */

  incognitoMode: false,
  discordRPCEnabled: true,
  discordRPCAppOpen: true,
  discordRPCBrowsing: true,
  discordRPCReading: true,
  disableHapticFeedback: false,
  verboseLogging: false,
  allowCloudflareBypass: false,
  hideCloudflareOverlay: false,
  allowProxyAPI: false,
  dohProvider: 'disabled',

  /**
   * Appearence settings
   */

  showHistoryTab: true,
  showUpdatesTab: true,
  showLabelsInNav: true,
  useFabForContinueReading: false,
  disableLoadingAnimations: false,

  /**
   * Library settings
   */

  downloadedOnlyMode: false,
  useLibraryFAB: false,

  /**
   * Update settings
   */

  onlyUpdateOngoingNovels: false,
  updateLibraryOnLaunch: false,
  downloadNewChapters: false,
  refreshNovelMetadata: false,

  /**
   * Novel settings
   */

  hideBackdrop: false,
  defaultChapterSort: 'positionAsc',
  swipeActionLeft: 'disabled',
  swipeActionRight: 'disabled',

  /**
   * AI settings
   */
  backupApiKeys: false,
};

const initialBrowseSettings: BrowseSettings = {
  showMyAnimeList: true,
  showAniList: true,
  globalSearchConcurrency: 3,
};

export const initialChapterGeneralSettings: ChapterGeneralSettings = {
  keepScreenOn: true,
  fullScreenMode: true,
  pageReader: false,
  swipeGestures: false,
  showScrollPercentage: true,
  useVolumeButtons: false,
  volumeButtonsOffset: null,
  showBatteryAndTime: false,
  autoScroll: false,
  autoScrollInterval: 10,
  autoScrollOffset: null,
  verticalSeekbar: true,
  removeExtraParagraphSpacing: false,
  bionicReading: false,
  tapToScroll: false,
  TTSEnable: true,
  einkRefreshOnPageTurn: false,
};

export const initialChapterReaderSettings: ChapterReaderSettings = {
  theme: '#292832',
  textColor: '#CCCCCC',
  textSize: 16,
  textAlign: 'left',
  padding: 16,
  paragraphIndent: 0,
  paragraphSpacing: 1,
  fontFamily: '',
  lineHeight: 1.5,
  customCSS: '',
  customJS: '',
  customThemes: [],
  tts: {
    engine: 'native',
    rate: 1,
    pitch: 1,
    queueSize: 3,
    autoPageAdvance: false,
    scrollToTop: true,
  },
  epubLocation: '',
  epubUseAppTheme: false,
  epubUseCustomCSS: false,
  epubUseCustomJS: false,
};

export const initialTranslateSettings: TranslateSettings = {
  engine: 'google-free',
  sourceLang: 'auto',
  targetLang: 'en',
  llmProvider: 'openai',
  llmEndpoint: 'https://api.openai.com/v1',
  llmApiKey: '',
  llmModel: '',
  llmSystemPrompts: [
    {
      id: 'default',
      title: 'Default',
      content: '',
    },
  ],
  activeSystemPromptId: 'default',
  llmEnableReasoning: false,
  llmReasoningEffort: 'low',
  llmApiMode: 'responses',
  llmTemperature: 0.6,
  autoTranslateNextChapter: false,
  downloadTranslated: false,
  llmChunkingEnabled: false,
  llmChunkWordLimit: 4000,
  llmRetryEnabled: false,
  llmRetryMaxAttempts: 3,
  llmDisableStructuredOutput: false,
};

export const useAppSettings = () => {
  const [appSettings = initialAppSettings, setSettings] =
    useMMKVObject<AppSettings>(APP_SETTINGS);

  const setAppSettings = useCallback(
    (values: Partial<AppSettings>) =>
      setSettings(prev => ({ ...initialAppSettings, ...prev, ...values })),
    [setSettings],
  );

  return useMemo(
    () => ({
      ...initialAppSettings,
      ...appSettings,
      setAppSettings,
    }),
    [appSettings, setAppSettings],
  );
};

export const useBrowseSettings = () => {
  const [browseSettings = initialBrowseSettings, setSettings] =
    useMMKVObject<BrowseSettings>(BROWSE_SETTINGS);

  const setBrowseSettings = useCallback(
    (values: Partial<BrowseSettings>) =>
      setSettings(prev => ({ ...initialBrowseSettings, ...prev, ...values })),
    [setSettings],
  );

  return useMemo(
    () => ({
      ...initialBrowseSettings,
      ...browseSettings,
      setBrowseSettings,
    }),
    [browseSettings, setBrowseSettings],
  );
};

const defaultLibrarySettings: LibrarySettings = {
  showNumberOfNovels: false,
  downloadedOnlyMode: false,
  incognitoMode: false,
  displayMode: DisplayModes.Comfortable,
  showDownloadBadges: true,
  showUnreadBadges: true,
  novelsPerRow: 3,
  sortOrder: LibrarySortOrder.DateAdded_DESC,
};

export const useLibrarySettings = () => {
  const [librarySettings, setSettings] =
    useMMKVObject<LibrarySettings>(LIBRARY_SETTINGS);

  const setLibrarySettings = useCallback(
    (value: Partial<LibrarySettings>) =>
      setSettings(prev => ({ ...defaultLibrarySettings, ...prev, ...value })),
    [setSettings],
  );

  return useMemo(
    () => ({
      ...defaultLibrarySettings,
      ...librarySettings,
      setLibrarySettings,
    }),
    [librarySettings, setLibrarySettings],
  );
};

export const useChapterGeneralSettings = () => {
  const [chapterGeneralSettings = initialChapterGeneralSettings, setSettings] =
    useMMKVObject<ChapterGeneralSettings>(CHAPTER_GENERAL_SETTINGS);

  const setChapterGeneralSettings = useCallback(
    (values: Partial<ChapterGeneralSettings>) =>
      setSettings(prev => ({
        ...initialChapterGeneralSettings,
        ...prev,
        ...values,
      })),
    [setSettings],
  );

  return useMemo(
    () => ({
      ...initialChapterGeneralSettings,
      ...chapterGeneralSettings,
      setChapterGeneralSettings,
    }),
    [chapterGeneralSettings, setChapterGeneralSettings],
  );
};

export const useChapterReaderSettings = () => {
  const [storedSettings = initialChapterReaderSettings, setSettings] =
    useMMKVObject<ChapterReaderSettings>(CHAPTER_READER_SETTINGS);

  // Ensure TTS settings have proper defaults (migration for existing users)
  const chapterReaderSettings = useMemo(
    () => ({
      ...initialChapterReaderSettings,
      ...storedSettings,
      textSize: Math.max(
        8,
        storedSettings.textSize ?? initialChapterReaderSettings.textSize,
      ),
      tts: {
        ...initialChapterReaderSettings.tts,
        ...storedSettings.tts,
        // Explicitly ensure these defaults if undefined
        autoPageAdvance: storedSettings.tts?.autoPageAdvance ?? false,
        scrollToTop: storedSettings.tts?.scrollToTop ?? true,
        rate: storedSettings.tts?.rate ?? 1,
        pitch: storedSettings.tts?.pitch ?? 1,
        engine: storedSettings.tts?.engine ?? 'native',
        queueSize: storedSettings.tts?.queueSize ?? 3,
      },
    }),
    [storedSettings],
  );

  const setChapterReaderSettings = useCallback(
    (values: Partial<ChapterReaderSettings>) =>
      setSettings(prev => ({
        ...initialChapterReaderSettings,
        ...prev,
        ...values,
      })),
    [setSettings],
  );

  const saveCustomReaderTheme = useCallback(
    (theme: ReaderTheme) =>
      setSettings(prev => {
        const current = { ...initialChapterReaderSettings, ...prev };
        return {
          ...current,
          customThemes: [theme, ...current.customThemes],
        };
      }),
    [setSettings],
  );

  const deleteCustomReaderTheme = useCallback(
    (theme: ReaderTheme) =>
      setSettings(prev => {
        const current = { ...initialChapterReaderSettings, ...prev };
        return {
          ...current,
          customThemes: current.customThemes.filter(
            v =>
              !(
                v.backgroundColor === theme.backgroundColor &&
                v.textColor === theme.textColor
              ),
          ),
        };
      }),
    [setSettings],
  );

  return useMemo(
    () => ({
      ...chapterReaderSettings,
      setChapterReaderSettings,
      saveCustomReaderTheme,
      deleteCustomReaderTheme,
    }),
    [
      chapterReaderSettings,
      setChapterReaderSettings,
      saveCustomReaderTheme,
      deleteCustomReaderTheme,
    ],
  );
};

export const useTranslateSettings = () => {
  const [translateSettings = initialTranslateSettings, setSettings] =
    useMMKVObject<TranslateSettings>(TRANSLATE_SETTINGS);

  const setTranslateSettings = useCallback(
    (values: Partial<TranslateSettings>) =>
      setSettings(prev => ({
        ...initialTranslateSettings,
        ...prev,
        ...values,
      })),
    [setSettings],
  );

  return useMemo(
    () => ({
      ...initialTranslateSettings,
      ...translateSettings,
      setTranslateSettings,
    }),
    [translateSettings, setTranslateSettings],
  );
};

// --- Security Settings ---

export type LockOnBackground =
  | 'always'
  | '1min'
  | '2min'
  | '5min'
  | '10min'
  | 'never';
export type ScreenProtection = 'always' | 'incognito' | 'never';
export type ContentPrivacySource = 'mixed' | 'nsfw';
export type ContentPrivacyAction =
  | 'readingProgress'
  | 'readingHistory'
  | 'discordRPC';

export interface ContentPrivacySettings {
  readingProgress: boolean;
  readingHistory: boolean;
  discordRPC: boolean;
}

export interface SourcePrivacySettings {
  mixed: ContentPrivacySettings;
  nsfw: ContentPrivacySettings;
}

export interface SecuritySettings {
  appLockEnabled: boolean;
  lockOnBackground: LockOnBackground;
  screenProtection: ScreenProtection;
  sourcePrivacy: SourcePrivacySettings;
}

export const initialSecuritySettings: SecuritySettings = {
  appLockEnabled: false,
  lockOnBackground: 'always',
  screenProtection: 'never',
  sourcePrivacy: {
    mixed: {
      readingProgress: false,
      readingHistory: false,
      discordRPC: false,
    },
    nsfw: {
      readingProgress: false,
      readingHistory: false,
      discordRPC: true,
    },
  },
};

const mergeSecuritySettings = (
  settings?: Partial<SecuritySettings>,
): SecuritySettings => ({
  ...initialSecuritySettings,
  ...settings,
  sourcePrivacy: {
    ...initialSecuritySettings.sourcePrivacy,
    ...settings?.sourcePrivacy,
    mixed: {
      ...initialSecuritySettings.sourcePrivacy.mixed,
      ...settings?.sourcePrivacy?.mixed,
    },
    nsfw: {
      ...initialSecuritySettings.sourcePrivacy.nsfw,
      ...settings?.sourcePrivacy?.nsfw,
    },
  },
});

export const useSecuritySettings = () => {
  const [securitySettings = initialSecuritySettings, setSettings] =
    useMMKVObject<SecuritySettings>(SECURITY_SETTINGS);

  const setSecuritySettings = useCallback(
    (values: Partial<SecuritySettings>) =>
      setSettings(prev => mergeSecuritySettings({ ...prev, ...values })),
    [setSettings],
  );

  const setContentPrivacy = useCallback(
    (
      source: ContentPrivacySource,
      action: ContentPrivacyAction,
      blocked: boolean,
    ) =>
      setSettings(prev => {
        const settings = mergeSecuritySettings(prev);
        return {
          ...settings,
          sourcePrivacy: {
            ...settings.sourcePrivacy,
            [source]: {
              ...settings.sourcePrivacy[source],
              [action]: blocked,
            },
          },
        };
      }),
    [setSettings],
  );

  return useMemo(
    () => ({
      ...mergeSecuritySettings(securitySettings),
      setSecuritySettings,
      setContentPrivacy,
    }),
    [securitySettings, setContentPrivacy, setSecuritySettings],
  );
};
