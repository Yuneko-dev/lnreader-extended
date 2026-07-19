import type {
  ChapterGeneralSettings,
  ChapterReaderSettings,
} from '@hooks/persisted/useSettings';
import { useEffect, useRef } from 'react';
import { NativeEventEmitter, NativeModules } from 'react-native';
import type WebView from 'react-native-webview';

const { RNDeviceInfo } = NativeModules;
const deviceInfoEmitter = new NativeEventEmitter(RNDeviceInfo);

type UseReaderSettingsBridgeOptions = {
  webViewRef: React.RefObject<WebView | null>;
  bottomInset: number;
  chapterGeneralSettings: ChapterGeneralSettings;
  readerSettings: ChapterReaderSettings;
  stopNativePlayback: () => void;
};

export const useReaderSettingsBridge = ({
  webViewRef,
  bottomInset,
  chapterGeneralSettings,
  readerSettings,
  stopNativePlayback,
}: UseReaderSettingsBridgeOptions) => {
  const readerSettingsMountedRef = useRef(false);
  const generalSettingsMountedRef = useRef(false);
  const previousTTSRef = useRef(readerSettings.tts);

  useEffect(() => {
    if (!readerSettingsMountedRef.current) {
      readerSettingsMountedRef.current = true;
      return;
    }
    const ttsChanged =
      JSON.stringify(previousTTSRef.current) !==
      JSON.stringify(readerSettings.tts);
    if (ttsChanged) {
      stopNativePlayback();
    }
    previousTTSRef.current = readerSettings.tts;
    webViewRef.current?.injectJavaScript(`
      if (window.reader?.readerSettings) {
        reader.readerSettings.val = ${JSON.stringify(readerSettings)};
      }`);
  }, [readerSettings, stopNativePlayback, webViewRef]);

  useEffect(() => {
    if (!generalSettingsMountedRef.current) {
      generalSettingsMountedRef.current = true;
      return;
    }
    webViewRef.current?.injectJavaScript(`
      if (window.reader?.generalSettings) {
        reader.generalSettings.val = ${JSON.stringify(chapterGeneralSettings)};
        document.documentElement.style.setProperty(
          '--reader-bottomInset',
          '${chapterGeneralSettings.fullScreenMode ? 0 : bottomInset}px'
        );
      }`);
  }, [bottomInset, chapterGeneralSettings, webViewRef]);

  useEffect(() => {
    const batterySubscription = deviceInfoEmitter.addListener(
      'RNDeviceInfo_batteryLevelDidChange',
      (level: number) => {
        webViewRef.current?.injectJavaScript(`
          if (window.reader?.batteryLevel) {
            reader.batteryLevel.val = ${level};
          }`);
      },
    );

    return () => {
      batterySubscription.remove();
    };
  }, [webViewRef]);
};
