import NativeVolumeButtonListener from '@specs/NativeVolumeButtonListener';
import { type RefObject, useCallback, useEffect } from 'react';
import { Dimensions, NativeEventEmitter } from 'react-native';
import type WebView from 'react-native-webview';

const volumeButtonEmitter = new NativeEventEmitter(NativeVolumeButtonListener);

type UseVolumeButtonScrollOptions = {
  enabled: boolean;
  pageReader: boolean;
  volumeButtonsOffset: number | null;
  webViewRef: RefObject<WebView | null>;
};

export default function useVolumeButtonScroll({
  enabled,
  pageReader,
  volumeButtonsOffset,
  webViewRef,
}: UseVolumeButtonScrollOptions) {
  const move = useCallback(
    (direction: -1 | 1) => {
      if (pageReader) {
        webViewRef.current?.injectJavaScript(`
          if (window.pageReader) {
            pageReader.movePage(pageReader.page.val + ${direction});
          }`);
        return;
      }

      const defaultOffset = Math.round(Dimensions.get('window').height * 0.75);
      const offset = volumeButtonsOffset ?? defaultOffset;
      webViewRef.current?.injectJavaScript(`
        window.scrollBy({ top: ${direction * offset}, behavior: 'smooth' });
      `);
    },
    [pageReader, volumeButtonsOffset, webViewRef],
  );

  useEffect(() => {
    if (!enabled) return;

    const volumeUpSubscription = volumeButtonEmitter.addListener(
      'VolumeUp',
      () => move(-1),
    );
    const volumeDownSubscription = volumeButtonEmitter.addListener(
      'VolumeDown',
      () => move(1),
    );

    return () => {
      volumeUpSubscription.remove();
      volumeDownSubscription.remove();
    };
  }, [enabled, move]);
}
