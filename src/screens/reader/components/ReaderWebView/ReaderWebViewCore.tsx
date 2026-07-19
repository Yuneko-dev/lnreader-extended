import { getUserAgent } from '@hooks/persisted/useUserAgent';
import React from 'react';
import WebView, { type WebViewProps } from 'react-native-webview';

type ReaderWebViewCoreProps = Omit<
  WebViewProps,
  | 'allowFileAccess'
  | 'allowsFullscreenVideo'
  | 'javaScriptEnabled'
  | 'mediaPlaybackRequiresUserAction'
  | 'onMessage'
  | 'originWhitelist'
  | 'scalesPageToFit'
  | 'showsVerticalScrollIndicator'
  | 'userAgent'
  | 'webviewDebuggingEnabled'
> & {
  onMessagePayload: (payload: string) => void;
  webViewRef: React.RefObject<WebView | null>;
};

const ReaderWebViewCore = ({
  onMessagePayload,
  webViewRef,
  ...props
}: ReaderWebViewCoreProps) => (
  <WebView
    {...props}
    ref={webViewRef}
    allowFileAccess
    allowsFullscreenVideo
    javaScriptEnabled
    mediaPlaybackRequiresUserAction={false}
    originWhitelist={['*']}
    scalesPageToFit
    showsVerticalScrollIndicator={false}
    userAgent={getUserAgent()}
    webviewDebuggingEnabled={__DEV__}
    onMessage={event => onMessagePayload(event.nativeEvent.data)}
  />
);

export default React.memo(ReaderWebViewCore);
