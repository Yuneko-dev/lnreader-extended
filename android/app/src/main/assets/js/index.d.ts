/* eslint-disable */

import { ChapterInfo, NovelInfo } from '@database/types';
import {
  ChapterGeneralSettings,
  ChapterReaderSettings,
} from '@hooks/persisted/useSettings';

import { State } from './modules/core/van';

export interface Reader {
  // element
  chapterElement: HTMLElement;
  viewport: HTMLMetaElement;
  selection: Selection;

  // state
  hidden: State<boolean>;
  generalSettings: State<ChapterGeneralSettings>;
  readerSettings: State<ChapterReaderSettings>;
  batteryLevel: State<number>;

  novel: NovelInfo;
  chapter: ChapterInfo;
  nextChapter?: ChapterInfo;
  autoSaveInterval: number;
  rawHTML: string;
  strings: {
    finished: string;
    nextChapter: string;
    noNextChapter: string;
  };

  // layout props
  paddingTop: number;
  layoutHeight: number;
  layoutWidth: number;
  chapterHeight: number;
  chapterWidth: number;

  post: (obj: Record<string, any>) => void;
  refresh: () => void;
}

interface PageReader {
  page: State<number>;
  totalPages: State<number>;
  movePage: (page: number) => void;
}

interface TTS {
  started: boolean;
  reading: boolean;
  start: (element?: HTMLElement) => void;
  resume: () => void;
  stop: () => void;
  pause: () => void;
  readable: (element?: HTMLElement) => void;
}

interface LNReaderPlayerAPI {
  container: HTMLElement | null;
  videoElement: HTMLVideoElement | null;
  iframeElement: HTMLIFrameElement | null;
  hlsInstance: any | null;
  debugOverlay: HTMLElement | null;
  loadingOverlay: HTMLElement | null;

  hasSeekedInitial: boolean;
  lastSaveTime: number;
  isDebugMode: boolean;

  init(): void;
  log(msg: string): void;
  showLoading(show: boolean): void;
  destroyCurrentMedia(): void;
  attachEventListeners(video: HTMLVideoElement): void;
  generateHTML5Video(): HTMLVideoElement;
  generateHTMLVideo(metaPlayerType?: string): HTMLVideoElement;
  playDirect(url: string): void;
  playHls(url: string, customHlsConfig?: Record<string, any>): void;
  playIframe(url: string): void;
}

declare global {
  const reader: Reader;
  const tts: TTS;
  const pageReader: PageReader;
  const LNReaderPlayer: LNReaderPlayerAPI | undefined;
}
