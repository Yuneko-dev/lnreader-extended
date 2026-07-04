import { bookmarkChapter } from '@database/queries/ChapterQueries';
import { useNovelLayout } from '@screens/novel/NovelContext';
import { ThemeColors } from '@theme/types';
import color from 'color';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
  Easing,
  ReduceMotion,
  withTiming,
} from 'react-native-reanimated';

import { IconButtonV2 } from '../../../components';
import { useChapterContext } from '../ChapterContext';

interface ReaderAppbarProps {
  theme: ThemeColors;
  goBack: () => void;
  bookmarked: boolean;
  setBookmarked: React.Dispatch<React.SetStateAction<boolean>>;
}

const fastOutSlowIn = Easing.bezier(0.4, 0.0, 0.2, 1.0);

const ReaderAppbar = ({
  goBack,
  theme,
  bookmarked,
  setBookmarked,
}: ReaderAppbarProps) => {
  const {
    chapter,
    novel,
    translateChapter,
    isTranslated,
    isTranslating,
    translateProgress,
    isOfflineTranslated,
    retranslateChapter,
  } = useChapterContext();
  const { statusBarHeight } = useNovelLayout();

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

  const getTranslateIconName = () => {
    if (isTranslating) return 'translate';
    if (isTranslated) return 'translate-off';
    return 'translate';
  };

  const getTranslateIconColor = () => {
    if (isOfflineTranslated) return color(theme.onSurface).alpha(0.38).string();
    if (isTranslating) return theme.primary;
    if (isTranslated) return theme.primary;
    return theme.onSurface;
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
          <View style={styles.translateButtonContainer}>
            <IconButtonV2
              name={getTranslateIconName()}
              size={22}
              onPress={() => {
                if (!isOfflineTranslated) translateChapter();
              }}
              onLongPress={retranslateChapter}
              color={getTranslateIconColor()}
              theme={theme}
              disabled={isOfflineTranslated}
            />
            <View
              style={[
                styles.progressBarContainer,
                isTranslating ? styles.opacity1 : styles.opacity0,
              ]}
            >
              <View
                style={[
                  styles.progressBarBackground,
                  { backgroundColor: color(theme.primary).alpha(0.2).string() },
                ]}
              />
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: theme.primary,
                    width: `${Math.max(translateProgress, 2)}%`,
                  },
                ]}
              />
            </View>
          </View>
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
            style={styles.bookmark}
          />
        </View>
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
  bookmark: {
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
  translateButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginStart: 4,
    marginEnd: -4,
    marginBottom: 4,
  },
  progressBarContainer: {
    width: 28,
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    marginTop: -6,
  },
  progressBarBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 1.5,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  opacity1: {
    opacity: 1,
  },
  opacity0: {
    opacity: 0,
  },
});
