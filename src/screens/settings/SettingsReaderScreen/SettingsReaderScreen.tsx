import { View, StyleSheet, useWindowDimensions } from 'react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import WebView from 'react-native-webview';
import { FAB } from 'react-native-paper';
import { dummyHTML } from './utils';

import { Appbar, SafeAreaView } from '@components/index';
import BottomSheet from '@components/BottomSheet/BottomSheet';

import {
  useChapterGeneralSettings,
  useChapterReaderSettings,
  useTheme,
} from '@hooks/persisted';
import { getString } from '@strings/translations';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBatteryLevel } from 'react-native-device-info';
import * as Speech from 'expo-speech';

import { generateReaderHtml } from '../../reader/utils/htmlGenerator';

import TabBar, { Tab } from './components/TabBar';
import DisplayTab from './tabs/DisplayTab';
import ThemeTab from './tabs/ThemeTab';
import NavigationTab from './tabs/NavigationTab';
import AccessibilityTab from './tabs/AccessibilityTab';
import AdvancedTab from './tabs/AdvancedTab';

export type TextAlignments =
  | 'left'
  | 'center'
  | 'auto'
  | 'right'
  | 'justify'
  | undefined;

type WebViewPostEvent = {
  type: string;
  data?: { [key: string]: string | number };
};

const SettingsReaderScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const webViewRef = useRef<WebView>(null);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const { bottom, right } = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<string>('display');

  const tabs: Tab[] = [
    { id: 'display', label: 'Display', icon: 'format-size' },
    { id: 'theme', label: 'Theme', icon: 'palette-outline' },
    { id: 'navigation', label: 'Navigation', icon: 'gesture-swipe-horizontal' },
    { id: 'accessibility', label: 'Accessibility', icon: 'account-voice' },
    { id: 'advanced', label: 'Advanced', icon: 'code-braces' },
  ];

  const novel = {
    'artist': null,
    'author': 'LNReader-kun',
    'cover':
      'file:///storage/emulated/0/Android/data/com.rajarsheechatterjee.LNReader/files/Novels/lightnovelcave/16/cover.png?1717862123181',
    'genres': 'Action,Hero',
    'id': 16,
    'inLibrary': true,
    'isLocal': false,
    'name': 'Preview Man (LN)',
    'path': 'novel/preview-man-16091321',
    'pluginId': 'lightnovelcave',
    'status': 'Ongoing',
    'summary':
      'To preview or not preview. A question that bothered humanity for a long time, until one day… Preview Man appeared.Show More',
    'totalPages': 8,
  };
  const chapter = {
    'bookmark': false,
    'chapterNumber': 1,
    'id': 3722,
    'isDownloaded': true,
    'name': 'Chapter 1 - The rise of Preview Man',
    'novelId': 16,
    'page': '2',
    'path': 'novel/preview-man/chapter-1',
    'position': 0,
    'progress': 3,
    'readTime': '2100-01-01 00:00:00',
    'releaseTime': 'January 1, 2100',
    'unread': true,
    'updatedTime': null,
  };
  const [hidden, setHidden] = useState(true);
  const batteryLevel = useBatteryLevel();
  const readerSettings = useChapterReaderSettings();
  const chapterGeneralSettings = useChapterGeneralSettings();

  const BOTTOM_SHEET_HEIGHT = screenHeight * 0.7;
  const assetsUriPrefix = useMemo(
    () => (__DEV__ ? 'http://localhost:8081/assets' : 'file:///android_asset'),
    [],
  );

  const readerBackgroundColor = readerSettings.theme;

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const openBottomSheet = () => {
    bottomSheetRef.current?.present();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'display':
        return <DisplayTab />;
      case 'theme':
        return <ThemeTab />;
      case 'navigation':
        return <NavigationTab />;
      case 'accessibility':
        return <AccessibilityTab />;
      case 'advanced':
        return <AdvancedTab />;
      default:
        return <DisplayTab />;
    }
  };

  return (
    <SafeAreaView
      excludeTop
      style={[styles.container, { backgroundColor: readerBackgroundColor }]}
    >
      <Appbar
        mode="small"
        title={getString('readerSettings.title')}
        handleGoBack={navigation.goBack}
        theme={theme}
      />

      {/* Large Preview Area */}
      <View style={styles.previewContainer}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          allowFileAccess={true}
          scalesPageToFit={true}
          showsVerticalScrollIndicator={false}
          javaScriptEnabled={true}
          style={[styles.webView, { backgroundColor: readerBackgroundColor }]}
          nestedScrollEnabled={true}
          onMessage={(ev: { nativeEvent: { data: string } }) => {
            const event: WebViewPostEvent = JSON.parse(ev.nativeEvent.data);
            switch (event.type) {
              case 'hide':
                if (hidden) {
                  webViewRef.current?.injectJavaScript(
                    'reader.hidden.val = true',
                  );
                } else {
                  webViewRef.current?.injectJavaScript(
                    'reader.hidden.val = false',
                  );
                }
                setHidden(!hidden);
                break;
              case 'speak':
                if (event.data && typeof event.data === 'string') {
                  Speech.speak(event.data, {
                    onDone() {
                      webViewRef.current?.injectJavaScript('tts.next?.()');
                    },
                    voice: readerSettings.tts?.voice?.identifier,
                    pitch: readerSettings.tts?.pitch || 1,
                    rate: readerSettings.tts?.rate || 1,
                  });
                } else {
                  webViewRef.current?.injectJavaScript('tts.next?.()');
                }
                break;
              case 'stop-speak':
                Speech.stop();
                break;
            }
          }}
          source={{
            html: generateReaderHtml({
              html: dummyHTML,
              theme,
              readerSettings,
              chapterGeneralSettings,
              novel,
              chapter,
              nextChapter: chapter,
              prevChapter: chapter,
              assetsUriPrefix,
              batteryLevel,
              isSettingsPreview: true,
              strings: {
                finished: `${getString('readerScreen.finished')}: ${chapter.name.trim()}`,
                nextChapter: getString('readerScreen.nextChapter', {
                  name: chapter.name,
                }),
                noNextChapter: getString('readerScreen.noNextChapter'),
              },
            }),
          }}
        />
      </View>

      {/* Floating Action Button to Open Bottom Sheet */}
      <FAB
        style={[
          styles.fab,
          {
            backgroundColor: theme.primary,
            bottom,
            right,
          },
        ]}
        icon="cog"
        color={theme.onPrimary}
        onPress={openBottomSheet}
      />

      {/* Bottom Sheet with Tabs */}
      <BottomSheet
        bottomSheetRef={bottomSheetRef}
        snapPoints={[BOTTOM_SHEET_HEIGHT]}
        enablePanDownToClose={true}
      >
        <View
          style={[
            styles.bottomSheetContent,
            { backgroundColor: theme.surface },
          ]}
        >
          {/* Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View
              style={[
                styles.dragHandle,
                { backgroundColor: theme.onSurfaceVariant },
              ]}
            />
          </View>

          {/* Tab Bar */}
          <TabBar
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            theme={theme}
          />

          {/* Tab Content */}
          <View style={styles.tabContent}>{renderTabContent()}</View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
};

export default SettingsReaderScreen;

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    margin: 16,
  },
  bottomSheetContent: {
    flex: 1,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragHandle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
  tabContent: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  previewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
});
