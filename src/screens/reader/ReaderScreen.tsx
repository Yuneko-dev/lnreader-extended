import { ErrorScreenV2 } from '@components';
import { BottomSheetModalMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { useBackHandler } from '@hooks/index';
import { useChapterGeneralSettings, useTheme } from '@hooks/persisted';
import { discordRPC } from '@modules/discord/DiscordRPC';
import { ChapterScreenProps } from '@navigators/types';
import { useFocusEffect } from '@react-navigation/native';
import { resolveUrl } from '@services/plugin/fetch';
import { getString } from '@strings/translations';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { Drawer } from 'react-native-drawer-layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChapterContextProvider, useChapterContext } from './ChapterContext';
import ChapterLoadingScreen from './ChapterLoadingScreen/ChapterLoadingScreen';
import ChapterDrawer from './components/ChapterDrawer';
import KeepScreenAwake from './components/KeepScreenAwake';
import ReaderAppbar from './components/ReaderAppbar';
import ReaderBottomSheetV2 from './components/ReaderBottomSheet/ReaderBottomSheet';
import ReaderFooter from './components/ReaderFooter';
import WebViewReader from './components/WebViewReader';
import { useNativeChapterSearch } from './hooks/useNativeChapterSearch';

const Chapter = ({ route, navigation }: ChapterScreenProps) => {
  const [open, setOpen] = useState(false);

  useBackHandler(() => {
    if (open) {
      setOpen(false);
      return true;
    }
    return false;
  });

  const openDrawer = useCallback(() => {
    setOpen(true);
  }, []);

  return (
    <ChapterContextProvider
      novel={route.params.novel}
      initialChapter={route.params.chapter}
    >
      <Drawer
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        renderDrawerContent={() => <ChapterDrawer />}
      >
        <ChapterContent
          route={route}
          navigation={navigation}
          openDrawer={openDrawer}
        />
      </Drawer>
    </ChapterContextProvider>
  );
};

type ChapterContentProps = ChapterScreenProps & {
  openDrawer: () => void;
};

export const ChapterContent = ({
  navigation,
  openDrawer,
}: ChapterContentProps) => {
  const { left, right, bottom } = useSafeAreaInsets();
  const {
    novel,
    chapter,
    hidden,
    loading,
    error,
    webViewRef,
    hideHeader,
    refetch,
  } = useChapterContext();
  const readerSheetRef = useRef<BottomSheetModalMethods>(null);
  const theme = useTheme();
  const { pageReader = false, keepScreenOn } = useChapterGeneralSettings();
  const search = useNativeChapterSearch(webViewRef);
  const { closeSearch, handleFindResult, visible: searchVisible } = search;
  const [bookmarked, setBookmarked] = useState<boolean>(
    chapter.bookmark ?? false,
  );
  const nonZeroBottom = useRef(bottom);
  if (nonZeroBottom.current !== bottom && bottom !== 0) {
    nonZeroBottom.current = bottom;
  }

  useEffect(() => {
    setBookmarked(chapter.bookmark ?? false);
  }, [chapter]);

  useEffect(() => {
    closeSearch();
  }, [chapter.id, closeSearch]);

  useEffect(() => {
    if (hidden) {
      closeSearch();
    }
  }, [closeSearch, hidden]);

  useBackHandler(
    useCallback(() => {
      if (searchVisible) {
        closeSearch();
        return true;
      }
      return false;
    }, [closeSearch, searchVisible]),
  );

  useFocusEffect(
    useCallback(() => {
      if (novel && chapter) {
        const url = resolveUrl(novel.pluginId, chapter.path);
        discordRPC.setReadingChapter(
          novel.name,
          chapter.name,
          getString('discord.readChapter'),
          novel?.cover,
          url,
          chapter.page,
          novel.pluginId,
        );
      }
    }, [novel, chapter]),
  );

  const scrollToStart = () =>
    requestAnimationFrame(() => {
      webViewRef?.current?.injectJavaScript(
        !pageReader
          ? `(()=>{
                window.scrollTo({top:0,behavior:'smooth'})
              })()`
          : `(()=>{
              pageReader.movePage(0);
            })()`,
      );
    });

  const openDrawerI = useCallback(() => {
    openDrawer();
    hideHeader();
  }, [hideHeader, openDrawer]);

  const openWebView = useCallback(() => {
    navigation.navigate('WebviewScreen', {
      name: novel.name,
      url: chapter.path,
      pluginId: novel.pluginId,
    });
  }, [chapter.path, navigation, novel.name, novel.pluginId]);

  const handleReaderPress = useCallback(() => {
    if (searchVisible) {
      Keyboard.dismiss();
      return;
    }
    hideHeader();
  }, [hideHeader, searchVisible]);

  if (error) {
    return (
      <ErrorScreenV2
        error={error}
        actions={[
          {
            iconName: 'refresh',
            title: getString('common.retry'),
            onPress: refetch,
          },
          {
            iconName: 'earth',
            title: 'WebView',
            onPress: openWebView,
          },
        ]}
      />
    );
  }
  return (
    <View style={[{ paddingStart: left, paddingEnd: right }, styles.container]}>
      {keepScreenOn ? <KeepScreenAwake /> : null}
      <ChapterLoadingScreen isLoading={loading}>
        <View style={styles.container}>
          <WebViewReader
            onPress={handleReaderPress}
            onFindResult={handleFindResult}
            bottomInset={nonZeroBottom.current}
          />
        </View>
      </ChapterLoadingScreen>
      <ReaderBottomSheetV2 bottomSheetRef={readerSheetRef} />
      {!hidden && (
        <View style={StyleSheet.absoluteFill} pointerEvents="auto">
          <ReaderAppbar
            goBack={navigation.goBack}
            theme={theme}
            bookmarked={bookmarked}
            setBookmarked={setBookmarked}
            openWebView={openWebView}
            search={search}
          />
          {!searchVisible ? (
            <ReaderFooter
              readerSheetRef={readerSheetRef}
              scrollToStart={scrollToStart}
              openDrawer={openDrawerI}
            />
          ) : null}
        </View>
      )}
    </View>
  );
};

export default Chapter;

const styles = StyleSheet.create({
  container: { flex: 1 },
});
