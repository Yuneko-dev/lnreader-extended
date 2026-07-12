import { bookmarkChapter } from '@database/queries/ChapterQueries';
import { useNovelLayout } from '@screens/novel/NovelContext';
import { getString } from '@strings/translations';
import { ThemeColors } from '@theme/types';
import color from 'color';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
  Easing,
  ReduceMotion,
  withTiming,
} from 'react-native-reanimated';

import { IconButtonV2, Menu } from '../../../components';
import { useChapterContext } from '../ChapterContext';
import { NativeChapterSearch } from '../hooks/useNativeChapterSearch';
import ReaderSearchbar from './ReaderSearchbar';

interface ReaderAppbarProps {
  theme: ThemeColors;
  goBack: () => void;
  bookmarked: boolean;
  setBookmarked: React.Dispatch<React.SetStateAction<boolean>>;
  openWebView: () => void;
  search: NativeChapterSearch;
}

const fastOutSlowIn = Easing.bezier(0.4, 0.0, 0.2, 1.0);

const ReaderAppbar = ({
  goBack,
  theme,
  bookmarked,
  setBookmarked,
  openWebView,
  search,
}: ReaderAppbarProps) => {
  const { chapter, novel } = useChapterContext();
  const { statusBarHeight } = useNovelLayout();
  const [menuVisible, setMenuVisible] = useState(false);
  const { openSearch } = search;

  const openMenu = useCallback(() => setMenuVisible(true), []);
  const closeMenu = useCallback(() => setMenuVisible(false), []);
  const handleOpenWebView = useCallback(() => {
    closeMenu();
    openWebView();
  }, [closeMenu, openWebView]);
  const handleOpenSearch = useCallback(() => {
    closeMenu();
    openSearch();
  }, [closeMenu, openSearch]);

  const entering = () => {
    'worklet';
    const animations = {
      originY: withTiming(0, {
        duration: 250,
        easing: fastOutSlowIn,
        reduceMotion: ReduceMotion.System,
      }),
      opacity: withTiming(1, { duration: 150 }),
    };
    const initialValues = {
      originY: -statusBarHeight,
      opacity: 0,
    };
    return {
      initialValues,
      animations,
    };
  };
  const exiting = () => {
    'worklet';
    const animations = {
      originY: withTiming(-statusBarHeight, {
        duration: 250,
        easing: fastOutSlowIn,
        reduceMotion: ReduceMotion.System,
      }),
      opacity: withTiming(0, { duration: 150 }),
    };
    const initialValues = {
      originY: 0,
      opacity: 1,
    };
    return {
      initialValues,
      animations,
    };
  };

  return (
    <Animated.View
      entering={entering}
      exiting={exiting}
      style={[
        styles.container,
        {
          paddingTop: statusBarHeight,
          backgroundColor: color(theme.surface).alpha(0.9).string(),
        },
      ]}
    >
      <View style={styles.appbar}>
        {search.visible ? (
          <ReaderSearchbar theme={theme} search={search} />
        ) : (
          <>
            <View style={styles.iconContainer}>
              <IconButtonV2
                name="arrow-left"
                onPress={goBack}
                color={theme.onSurface}
                size={26}
                theme={theme}
              />
            </View>
            <View style={styles.content}>
              <Text
                style={[styles.title, { color: theme.onSurface }]}
                numberOfLines={1}
              >
                {novel.name}
              </Text>
              <Text
                style={[styles.subtitle, { color: theme.onSurfaceVariant }]}
                numberOfLines={1}
              >
                {chapter.name}
              </Text>
            </View>
            <View style={styles.iconContainer}>
              <IconButtonV2
                name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                size={26}
                onPress={() => {
                  bookmarkChapter(chapter.id).then(() =>
                    setBookmarked(!bookmarked),
                  );
                }}
                color={theme.onSurface}
                theme={theme}
              />
              <Menu
                visible={menuVisible}
                onDismiss={closeMenu}
                anchor={
                  <IconButtonV2
                    name="dots-vertical"
                    size={26}
                    onPress={openMenu}
                    color={theme.onSurface}
                    theme={theme}
                    style={styles.menu}
                  />
                }
                contentStyle={{ backgroundColor: theme.surface2 }}
              >
                <Menu.Item
                  title={getString('webview.openInWebView')}
                  onPress={handleOpenWebView}
                  disabled={Boolean(novel.isLocal)}
                />
                <Menu.Item
                  title={getString('readerScreen.findInChapter')}
                  onPress={handleOpenSearch}
                />
              </Menu>
            </View>
          </>
        )}
      </View>
    </Animated.View>
  );
};

export default ReaderAppbar;

const styles = StyleSheet.create({
  appbar: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  menu: {
    marginEnd: 4,
  },
  container: {
    flex: 1,
    paddingBottom: 8,
    position: 'absolute',
    top: 0,
    width: '100%',
    zIndex: 1,
  },
  content: {
    flex: 1,
  },
  subtitle: {
    fontSize: 16,
  },
  title: {
    fontSize: 20,
  },
});
