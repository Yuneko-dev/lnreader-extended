import { ChapterOrderKey } from '@database/constants';
import {
  DisplayModes,
  LibraryFilter,
  LibrarySortOrder,
} from '@screens/library/constants/constants';
import { Voice } from 'expo-speech';
import { useCallback, useMemo } from 'react';
import { useMMKVObject } from 'react-native-mmkv';

export const APP_SETTINGS = 'APP_SETTINGS';
export const BROWSE_SETTINGS = 'BROWSE_SETTINGS';
export const LIBRARY_SETTINGS = 'LIBRARY_SETTINGS';
export const CHAPTER_GENERAL_SETTINGS = 'CHAPTER_GENERAL_SETTINGS';
export const CHAPTER_READER_SETTINGS = 'CHAPTER_READER_SETTINGS';
export const TRANSLATE_SETTINGS = 'TRANSLATE_SETTINGS';
export const SECURITY_SETTINGS = 'SECURITY_SETTINGS';

export interface AppSettings {
  /**
   * General settings
   */

  incognitoMode: boolean;
  disableHapticFeedback: boolean;
  verboseLogging: boolean;

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
   * Novel settings
   */

  hideBackdrop: boolean;
  defaultChapterSort: ChapterOrderKey;
  clearCacheOnExit: boolean;
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
  fontFamily: string;
  lineHeight: number;
  customCSS: string;
  customJS: string;
  customThemes: ReaderTheme[];
  tts?: {
    voice?: Voice;
    rate?: number;
    pitch?: number;
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

export interface TranslateSettings {
  engine: 'google-free' | 'llm';
  sourceLang: string;
  targetLang: string;
  llmProvider: LLMProviderSupported;
  llmEndpoint: string;
  llmApiKey: string;
  llmModel: string;
  llmSystemPrompt: string;
  llmEnableReasoning: boolean;
  llmReasoningEffort: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
  autoTranslateNextChapter: boolean;
  downloadTranslated: boolean;
}

const initialAppSettings: AppSettings = {
  /**
   * General settings
   */

  incognitoMode: false,
  disableHapticFeedback: false,
  verboseLogging: false,

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
  clearCacheOnExit: false,
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
  fontFamily: '',
  lineHeight: 1.5,
  customCSS: '',
  customJS: '',
  customThemes: [],
  tts: {
    rate: 1,
    pitch: 1,
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
  llmSystemPrompt: '',
  llmEnableReasoning: false,
  llmReasoningEffort: 'low',
  autoTranslateNextChapter: false,
  downloadTranslated: false,
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
  const chapterReaderSettings = {
    ...storedSettings,
    tts: {
      ...initialChapterReaderSettings.tts,
      ...storedSettings.tts,
      // Explicitly ensure these defaults if undefined
      autoPageAdvance: storedSettings.tts?.autoPageAdvance ?? false,
      scrollToTop: storedSettings.tts?.scrollToTop ?? true,
      rate: storedSettings.tts?.rate ?? 1,
      pitch: storedSettings.tts?.pitch ?? 1,
    },
  };

  const setChapterReaderSettings = (values: Partial<ChapterReaderSettings>) =>
    setSettings({ ...chapterReaderSettings, ...values });

  const saveCustomReaderTheme = (theme: ReaderTheme) =>
    setSettings({
      ...chapterReaderSettings,
      customThemes: [theme, ...chapterReaderSettings.customThemes],
    });

  const deleteCustomReaderTheme = (theme: ReaderTheme) =>
    setSettings({
      ...chapterReaderSettings,
      customThemes: chapterReaderSettings.customThemes.filter(
        v =>
          !(
            v.backgroundColor === theme.backgroundColor &&
            v.textColor === theme.textColor
          ),
      ),
    });

  return {
    ...chapterReaderSettings,
    setChapterReaderSettings,
    saveCustomReaderTheme,
    deleteCustomReaderTheme,
  };
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

export interface SecuritySettings {
  appLockEnabled: boolean;
  lockOnBackground: LockOnBackground;
  screenProtection: ScreenProtection;
}

const initialSecuritySettings: SecuritySettings = {
  appLockEnabled: false,
  lockOnBackground: 'always',
  screenProtection: 'never',
};

export const useSecuritySettings = () => {
  const [securitySettings = initialSecuritySettings, setSettings] =
    useMMKVObject<SecuritySettings>(SECURITY_SETTINGS);

  const setSecuritySettings = useCallback(
    (values: Partial<SecuritySettings>) =>
      setSettings(prev => ({
        ...initialSecuritySettings,
        ...prev,
        ...values,
      })),
    [setSettings],
  );

  return useMemo(
    () => ({
      ...securitySettings,
      setSecuritySettings,
    }),
    [securitySettings, setSecuritySettings],
  );
};
