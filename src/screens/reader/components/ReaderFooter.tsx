import { IconButtonV2, Menu } from '@components';
import { BottomSheetModalMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { useTheme } from '@hooks/persisted';
import { useNovelLayout } from '@screens/novel/NovelContext';
import { getString } from '@strings/translations';
import color from 'color';
import React, { useMemo, useState } from 'react';
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
  openDrawer: () => void;
  openTranslateSettings: () => void;
}

const fastOutSlowIn = Easing.bezier(0.4, 0.0, 0.2, 1.0);

const ChapterFooter = ({
  readerSheetRef,
  scrollToStart,
  openDrawer,
  openTranslateSettings,
}: ChapterFooterProps) => {
  const {
    canRetranslate,
    nextChapter,
    prevChapter,
    navigateChapter,
    isTranslating,
    translateChapter,
    isTranslated,
    translateProgress,
    isOfflineTranslated,
    retranslateChapter,
  } = useChapterContext();
  const [translateMenuVisible, setTranslateMenuVisible] = useState(false);
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

  const translateIconColor = isOfflineTranslated
    ? color(theme.onSurface).alpha(0.38).string()
    : isTranslating || isTranslated
    ? theme.primary
    : theme.onSurface;

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
          disabled={!prevChapter}
        >
          <IconButton
            icon="chevron-left"
            size={26}
            iconColor={
              prevChapter
                ? theme.onSurface
                : color(theme.onSurface).alpha(0.38).string()
            }
          />
        </Pressable>
        <View style={styles.buttonStyles}>
          <View style={styles.translateButtonContainer}>
            <Menu
              anchor={
                <IconButtonV2
                  name={
                    isTranslating
                      ? 'translate'
                      : isTranslated
                      ? 'translate-off'
                      : 'translate'
                  }
                  size={26}
                  onPress={translateChapter}
                  onLongPress={() => setTranslateMenuVisible(true)}
                  color={translateIconColor}
                  theme={theme}
                />
              }
              onDismiss={() => setTranslateMenuVisible(false)}
              visible={translateMenuVisible}
            >
              <Menu.Item
                disabled={!canRetranslate}
                onPress={() => {
                  setTranslateMenuVisible(false);
                  retranslateChapter();
                }}
                title={getString('readerScreen.retranslate')}
              />
              <Menu.Item
                onPress={() => {
                  setTranslateMenuVisible(false);
                  openTranslateSettings();
                }}
                title={getString(
                  'readerScreen.bottomSheet.translateTab.translationSettings',
                )}
              />
            </Menu>
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
        </View>
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
          disabled={!nextChapter}
        >
          <IconButton
            icon="chevron-right"
            size={26}
            iconColor={
              nextChapter
                ? theme.onSurface
                : color(theme.onSurface).alpha(0.38).string()
            }
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
  opacity0: {
    opacity: 0,
  },
  opacity1: {
    opacity: 1,
  },
  progressBarBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 1.5,
  },
  progressBarContainer: {
    width: 28,
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    marginTop: -6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  translateButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
});
