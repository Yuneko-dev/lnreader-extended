import type { RefObject } from 'react';
import type WebView from 'react-native-webview';

export const SPEN_REMOTE_EVENTS = {
  NEXT_PAGE: 'SPenRemoteNextPage',
  PREV_PAGE: 'SPenRemotePrevPage',
  NEXT_CHAPTER: 'SPenRemoteNextChapter',
  PREV_CHAPTER: 'SPenRemotePrevChapter',
} as const;

export type SPenRemoteEventName =
  (typeof SPEN_REMOTE_EVENTS)[keyof typeof SPEN_REMOTE_EVENTS];

type PageDirection = 'NEXT' | 'PREV';

type RemoteNavigationDeps = {
  navigateChapter: (direction: 'NEXT' | 'PREV') => void;
  webViewRef: RefObject<WebView | null>;
};

export const buildSPenPageNavigationScript = (
  direction: PageDirection,
): string => {
  const pageDelta = direction === 'NEXT' ? '+ 1' : '- 1';
  const scrollDirection = direction === 'NEXT' ? '' : '-';

  return `(() => {
    if (!window.reader) {
      return;
    }

    if (
      window.pageReader &&
      typeof window.pageReader.movePage === 'function' &&
      window.reader.generalSettings?.val?.pageReader
    ) {
      window.pageReader.movePage(window.pageReader.page.val ${pageDelta});
      return;
    }

    const layoutHeight = window.reader.layoutHeight || window.innerHeight;
    const offset = layoutHeight * 0.75;
    window.scrollBy({ top: ${scrollDirection}offset, behavior: 'smooth' });
  })();
  true;`;
};

export const handleSPenRemoteEvent = (
  { navigateChapter, webViewRef }: RemoteNavigationDeps,
  eventName: SPenRemoteEventName,
) => {
  switch (eventName) {
    case SPEN_REMOTE_EVENTS.NEXT_PAGE:
      webViewRef.current?.injectJavaScript(
        buildSPenPageNavigationScript('NEXT'),
      );
      break;
    case SPEN_REMOTE_EVENTS.PREV_PAGE:
      webViewRef.current?.injectJavaScript(
        buildSPenPageNavigationScript('PREV'),
      );
      break;
    case SPEN_REMOTE_EVENTS.NEXT_CHAPTER:
      navigateChapter('NEXT');
      break;
    case SPEN_REMOTE_EVENTS.PREV_CHAPTER:
      navigateChapter('PREV');
      break;
  }
};
