import { BottomSheetModalMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { useTheme } from '@hooks/persisted';
import { ChapterScreenProps } from '@navigators/types';
import { useNovelLayout } from '@screens/novel/NovelContext';
import color from 'color';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { IconButton } from 'react-native-paper';
import Animated, {
  Easing,
  ReduceMotion,
  withTiming,
} from 'react-native-reanimated';

import { useChapterContext } from '../ChapterContext';

interface ChapterFooterProps {
  readerSheetRef: React.RefObject<BottomSheetModalMethods | null>;
  scrollToStart: () => void;
  navigation: ChapterScreenProps['navigation'];
  openDrawer: () => void;
}

const fastOutSlowIn = Easing.bezier(0.4, 0.0, 0.2, 1.0);

const ChapterFooter = ({
  readerSheetRef,
  scrollToStart,
  navigation,
  openDrawer,
}: ChapterFooterProps) => {
  const {
    novel,
    chapter,
    nextChapter,
    prevChapter,
    navigateChapter,
    isTranslating,
  } = useChapterContext();
  const theme = useTheme();
  const rippleConfig = {
    color: theme.rippleColor,
    borderless: true,
    radius: 50,
  };
  const { navigationBarHeight } = useNovelLayout();
  // Use reactive viewport height so footer animation targets stay correct
  // when the host window is resized (e.g. WSA, foldables, split-screen).
  const { height: screenHeight } = useWindowDimensions();

  const entering = () => {
    'worklet';
    const animations = {
      originY: withTiming(screenHeight - navigationBarHeight - 64, {
        duration: 250,
        easing: fastOutSlowIn,
        reduceMotion: ReduceMotion.System,
      }),
      opacity: withTiming(1, { duration: 150 }),
    };
    const initialValues = {
      originY: screenHeight - 64,
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
      originY: withTiming(screenHeight - 64, {
        duration: 250,
        easing: fastOutSlowIn,
        reduceMotion: ReduceMotion.System,
      }),
      opacity: withTiming(0, { duration: 150 }),
    };
    const initialValues = {
      originY: screenHeight - navigationBarHeight - 64,
      opacity: 1,
    };
    return {
      initialValues,
      animations,
    };
  };

  const style = useMemo(
    () => [
      styles.footer,
      {
        backgroundColor: color(theme.surface).alpha(0.9).string(),
        paddingBottom: navigationBarHeight,
      },
    ],
    [theme.surface, navigationBarHeight],
  );

  return (
    <Animated.View
      entering={entering}
      exiting={exiting}
      style={[styles.footer, style]}
    >
      <View style={styles.buttonsContainer}>
        <Pressable
          android_ripple={rippleConfig}
          style={styles.buttonStyles}
          onPress={() => navigateChapter('PREV')}
        >
          <IconButton
            icon="chevron-left"
            size={26}
            disabled={!prevChapter}
            iconColor={theme.onSurface}
          />
        </Pressable>
        {!novel.isLocal ? (
          <Pressable
            android_ripple={rippleConfig}
            style={styles.buttonStyles}
            onPress={() =>
              navigation.navigate('WebviewScreen', {
                name: novel.name,
                url: chapter.path,
                pluginId: novel.pluginId,
              })
            }
          >
            <IconButton icon="earth" size={26} iconColor={theme.onSurface} />
          </Pressable>
        ) : null}
        <Pressable
          android_ripple={rippleConfig}
          style={styles.buttonStyles}
          onPress={() => scrollToStart()}
        >
          <IconButton
            icon="format-vertical-align-top"
            size={26}
            iconColor={theme.onSurface}
          />
        </Pressable>
        <Pressable
          android_ripple={rippleConfig}
          style={styles.buttonStyles}
          onPress={() => openDrawer()}
        >
          <IconButton
            icon="format-horizontal-align-right"
            size={26}
            iconColor={theme.onSurface}
          />
        </Pressable>
        <Pressable
          android_ripple={rippleConfig}
          style={styles.buttonStyles}
          onPress={() => readerSheetRef.current?.present()}
          disabled={isTranslating}
        >
          <IconButton
            icon="cog-outline"
            size={26}
            iconColor={
              isTranslating
                ? color(theme.onSurface).alpha(0.38).string()
                : theme.onSurface
            }
          />
        </Pressable>
        <Pressable
          android_ripple={rippleConfig}
          style={styles.buttonStyles}
          onPress={() => navigateChapter('NEXT')}
        >
          <IconButton
            icon="chevron-right"
            size={26}
            disabled={!nextChapter}
            iconColor={theme.onSurface}
          />
        </Pressable>
      </View>
    </Animated.View>
  );
};

export default React.memo(ChapterFooter);

const styles = StyleSheet.create({
  buttonStyles: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 4,
    paddingVertical: 8,
  },
  buttonsContainer: {
    flexDirection: 'row',
  },
  footer: {
    bottom: 0,
    flex: 1,
    position: 'absolute',
    width: '100%',
    zIndex: 1,
  },
});
