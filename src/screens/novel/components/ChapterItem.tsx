import React, { memo, useCallback, useMemo, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  ChapterBookmarkButton,
  DownloadButton,
} from './Chapter/ChapterDownloadButtons';
import { ThemeColors } from '@theme/types';
import { ChapterInfo } from '@database/types';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { MaterialDesignIconName } from '@type/icon';
import { getString } from '@strings/translations';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import * as Haptics from 'expo-haptics';
import { useAppSettings } from '@hooks/persisted';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { SwipeAction } from '@hooks/persisted/useSettings';

/**
 * Width of the action panel that Swipeable measures as its "open" position.
 * Keep this small so the snap-back animation is fast and natural.
 */
const ACTION_WIDTH = 90;

const ICON_SIZE = 20;

/**
 * Drag distance at which the visual indicator (icon + color) appears.
 */
const VISUAL_THRESHOLD = ACTION_WIDTH - ICON_SIZE;

// ────────────────────────────────────────────────────────────────────────────
// Swipe action background + icon (rendered behind the chapter row)
// ────────────────────────────────────────────────────────────────────────────

interface SwipeActionViewProps {
  dragX: SharedValue<number>;
  backgroundColor: string;
  icon: MaterialDesignIconName;
  iconColor: string;
  side: 'left' | 'right';
  disableHaptic: boolean;
}

const SwipeActionView = React.memo(
  ({
    dragX,
    backgroundColor,
    icon,
    iconColor,
    side,
    disableHaptic,
  }: SwipeActionViewProps) => {
    const triggerHaptic = useCallback(() => {
      if (!disableHaptic) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }, [disableHaptic]);

    // Fire haptic once when user crosses the visual threshold
    useAnimatedReaction(
      () => {
        if (side === 'left') {
          return dragX.value >= VISUAL_THRESHOLD;
        }
        return dragX.value <= -VISUAL_THRESHOLD;
      },
      (active, prev) => {
        if (active && !prev) {
          runOnJS(triggerHaptic)();
        }
      },
    );

    // Background color fades in when threshold is crossed
    const bgStyle = useAnimatedStyle(() => {
      const absX = Math.abs(dragX.value);
      const progress = interpolate(
        absX,
        [VISUAL_THRESHOLD - ICON_SIZE, VISUAL_THRESHOLD],
        [0, 1],
        Extrapolation.CLAMP,
      );
      return {
        opacity: progress,
      };
    });

    // Icon fades in and scales up when threshold is crossed
    const iconStyle = useAnimatedStyle(() => {
      const absX = Math.abs(dragX.value);
      const opacity = interpolate(
        absX,
        [VISUAL_THRESHOLD - 25, VISUAL_THRESHOLD],
        [0, 1],
        Extrapolation.CLAMP,
      );
      const scale = interpolate(
        absX,
        [VISUAL_THRESHOLD - 25, VISUAL_THRESHOLD],
        [0.5, 1],
        Extrapolation.CLAMP,
      );
      return {
        opacity,
        transform: [{ scale }],
      };
    });

    return (
      <View
        style={[
          styles.actionContainer,
          {
            justifyContent: 'center',
            alignItems: side === 'left' ? 'flex-end' : 'flex-start',
          },
        ]}
      >
        {/* Colored overlay that fades in */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor }, bgStyle]}
        />
        {/* Icon */}
        <Animated.View style={[styles.iconWrapper, iconStyle]}>
          <MaterialCommunityIcons name={icon} color={iconColor} size={24} />
        </Animated.View>
      </View>
    );
  },
);

// ────────────────────────────────────────────────────────────────────────────
// ChapterItem
// ────────────────────────────────────────────────────────────────────────────

interface ChapterItemProps {
  chapter: ChapterInfo;
  isDownloading?: boolean;
  isBookmarked?: boolean;
  isSelected?: boolean;
  isLocal: boolean;
  isUpdateCard?: boolean;
  theme: ThemeColors;
  showChapterTitles: boolean;
  novelName: string;
  left?: ReactNode;
  onDeleteChapter: (chapter: ChapterInfo) => void;
  onDownloadChapter: (chapter: ChapterInfo) => void;
  onSelectPress: (chapter: ChapterInfo) => void;
  onSelectLongPress?: (chapter: ChapterInfo) => void;
  onToggleRead?: (chapter: ChapterInfo) => void;
  onToggleBookmark?: (chapter: ChapterInfo) => void;
}

const ChapterItem: React.FC<ChapterItemProps> = ({
  chapter,
  isDownloading,
  isBookmarked,
  isSelected,
  isLocal,
  isUpdateCard,
  theme,
  showChapterTitles,
  novelName,
  left,
  onDeleteChapter,
  onDownloadChapter,
  onSelectPress,
  onSelectLongPress,
  onToggleRead,
  onToggleBookmark,
}) => {
  const { id, name, unread, releaseTime, bookmark, chapterNumber, progress } =
    chapter;

  const {
    swipeActionLeft = 'disabled' as SwipeAction,
    swipeActionRight = 'disabled' as SwipeAction,
    disableHapticFeedback,
  } = useAppSettings();

  isBookmarked ??= bookmark ?? false;

  // Swipe is disabled when toggle handlers are not provided (e.g. UpdateNovelCard)
  const swipeEnabled = !!(onToggleRead && onToggleBookmark);

  // ── Callbacks ──────────────────────────────────────────────────────────
  const handlePress = useCallback(
    () => onSelectPress(chapter),
    [onSelectPress, chapter],
  );
  const handleLongPress = useCallback(
    () => onSelectLongPress?.(chapter),
    [onSelectLongPress, chapter],
  );
  const handleDelete = useCallback(
    () => onDeleteChapter(chapter),
    [onDeleteChapter, chapter],
  );
  const handleDownload = useCallback(
    () => onDownloadChapter(chapter),
    [onDownloadChapter, chapter],
  );

  const executeAction = useCallback(
    (action: SwipeAction) => {
      switch (action) {
        case 'bookmark':
          onToggleBookmark?.(chapter);
          break;
        case 'markAsRead':
          onToggleRead?.(chapter);
          break;
        case 'download':
          if (chapter.isDownloaded) {
            onDeleteChapter(chapter);
          } else {
            onDownloadChapter(chapter);
          }
          break;
      }
    },
    [
      disableHapticFeedback,
      chapter,
      onToggleBookmark,
      onToggleRead,
      onDeleteChapter,
      onDownloadChapter,
    ],
  );

  // ── Action visual config ───────────────────────────────────────────────
  const getActionStyles = useCallback(
    (action: SwipeAction) => {
      switch (action) {
        case 'bookmark':
          return {
            backgroundColor: theme.secondary,
            icon: (bookmark
              ? 'bookmark-off'
              : 'bookmark') as MaterialDesignIconName,
            color: theme.onSecondary,
          };
        case 'markAsRead':
          return {
            backgroundColor: theme.primary,
            icon: (unread ? 'eye-check' : 'eye-off') as MaterialDesignIconName,
            color: theme.onPrimary,
          };
        case 'download':
          return {
            backgroundColor: theme.tertiary,
            icon: (chapter.isDownloaded
              ? 'delete'
              : 'download') as MaterialDesignIconName,
            color: theme.onTertiary,
          };
        default:
          return {
            backgroundColor: 'transparent',
            icon: 'blank' as MaterialDesignIconName,
            color: 'transparent',
          };
      }
    },
    [theme, bookmark, unread, chapter.isDownloaded],
  );

  // ── Swipeable config ───────────────────────────────────────────────────

  /*
   * DIRECTION MAPPING (ReanimatedSwipeable):
   *
   * User drags LEFT→RIGHT ("swipe right"):
   *   → Reveals the LEFT action panel (renderLeftActions)
   *   → toValue = +leftWidth → onSwipeableOpen('right')
   *   → We use the user's "swipeActionRight" setting
   *
   * User drags RIGHT→LEFT ("swipe left"):
   *   → Reveals the RIGHT action panel (renderRightActions)
   *   → toValue = -rightWidth → onSwipeableOpen('left')
   *   → We use the user's "swipeActionLeft" setting
   */

  // Resolve effective action: disable download for local novels
  const effectiveRight =
    swipeActionRight === 'download' && isLocal ? 'disabled' : swipeActionRight;
  const effectiveLeft =
    swipeActionLeft === 'download' && isLocal ? 'disabled' : swipeActionLeft;

  const leftActionConfig = useMemo(() => {
    if (!swipeEnabled || effectiveRight === 'disabled') return null;
    return getActionStyles(effectiveRight);
  }, [swipeEnabled, effectiveRight, getActionStyles]);

  const rightActionConfig = useMemo(() => {
    if (!swipeEnabled || effectiveLeft === 'disabled') return null;
    return getActionStyles(effectiveLeft);
  }, [swipeEnabled, effectiveLeft, getActionStyles]);

  const renderLeftActions = useCallback(
    (_progress: SharedValue<number>, dragX: SharedValue<number>) => {
      if (!leftActionConfig) return null;
      return (
        <SwipeActionView
          dragX={dragX}
          backgroundColor={leftActionConfig.backgroundColor}
          icon={leftActionConfig.icon}
          iconColor={leftActionConfig.color}
          side="left"
          disableHaptic={!!disableHapticFeedback}
        />
      );
    },
    [leftActionConfig, disableHapticFeedback],
  );

  const renderRightActions = useCallback(
    (_progress: SharedValue<number>, dragX: SharedValue<number>) => {
      if (!rightActionConfig) return null;
      return (
        <SwipeActionView
          dragX={dragX}
          backgroundColor={rightActionConfig.backgroundColor}
          icon={rightActionConfig.icon}
          iconColor={rightActionConfig.color}
          side="right"
          disableHaptic={!!disableHapticFeedback}
        />
      );
    },
    [rightActionConfig, disableHapticFeedback],
  );

  const swipeableRef = React.useRef<any>(null);

  /**
   * Use onSwipeableWillOpen instead of onSwipeableOpen to trigger immediately
   * upon release, eliminating the pause where the panel waits at ACTION_WIDTH.
   */
  const onSwipeableWillOpen = useCallback(
    (direction: 'left' | 'right') => {
      const action = direction === 'right' ? effectiveRight : effectiveLeft;

      // 1. Immediately force the panel to spring back to 0
      swipeableRef.current?.close();

      // 2. Delay the heavy JS execution (DB writes, state updates) slightly
      // so the close animation has time to start rendering smoothly on the UI thread.
      requestAnimationFrame(() => {
        executeAction(action);
      });
    },
    [effectiveLeft, effectiveRight, executeAction],
  );

  // ── Visual styles ──────────────────────────────────────────────────────
  const selectedStyle = useMemo(
    () =>
      isSelected
        ? [styles.chapterCardContainer, { backgroundColor: theme.rippleColor }]
        : [styles.chapterCardContainer, { backgroundColor: theme.surface }],
    [isSelected, theme.rippleColor, theme.surface],
  );

  const titleColor = useMemo(
    () =>
      !unread ? theme.outline : bookmark ? theme.primary : theme.onSurface,
    [unread, bookmark, theme.outline, theme.primary, theme.onSurface],
  );

  const releaseColor = useMemo(
    () =>
      !unread
        ? theme.outline
        : bookmark
        ? theme.primary
        : theme.onSurfaceVariant,
    [unread, bookmark, theme.outline, theme.primary, theme.onSurfaceVariant],
  );

  const ripple = useMemo(
    () => ({ color: theme.rippleColor }),
    [theme.rippleColor],
  );

  const releaseTimeStyle = {
    color: theme.outline,
    marginStart: chapter.releaseTime ? 5 : 0,
  } as const;

  // ── Render ─────────────────────────────────────────────────────────────
  const chapterContent = (
    <Pressable
      style={selectedStyle}
      onPress={handlePress}
      onLongPress={handleLongPress}
      android_ripple={ripple}
    >
      <View style={styles.row}>
        {left}
        {isBookmarked ? <ChapterBookmarkButton theme={theme} /> : null}
        <View style={styles.flex1}>
          {isUpdateCard ? (
            <Text
              style={[
                styles.updateCardName,
                { color: unread ? theme.onSurface : theme.outline },
              ]}
              numberOfLines={1}
            >
              {novelName}
            </Text>
          ) : null}
          <View style={styles.titleRow}>
            {unread ? (
              <MaterialCommunityIcons
                name="circle"
                color={theme.primary}
                size={8}
                style={styles.unreadIcon}
              />
            ) : null}

            <Text
              style={[
                isUpdateCard ? styles.textSmall : styles.textNormal,
                { color: titleColor },
                styles.flex1,
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {showChapterTitles
                ? name
                : getString('novelScreen.chapterChapnum', {
                    num: chapterNumber,
                  })}
            </Text>
          </View>
          <View style={styles.metaRow}>
            {releaseTime && !isUpdateCard ? (
              <Text
                style={[{ color: releaseColor }, styles.mt4, styles.text]}
                numberOfLines={1}
              >
                {releaseTime}
              </Text>
            ) : null}
            {!isUpdateCard && progress && progress > 0 && chapter.unread ? (
              <Text
                style={[styles.text, styles.mt4, releaseTimeStyle]}
                numberOfLines={1}
              >
                {chapter.releaseTime ? '•  ' : null}
                {getString('novelScreen.progress', { progress })}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
      {!isLocal ? (
        <DownloadButton
          isDownloading={isDownloading}
          isDownloaded={chapter.isDownloaded ?? false}
          theme={theme}
          deleteChapter={handleDelete}
          downloadChapter={handleDownload}
        />
      ) : null}
    </Pressable>
  );

  if (!swipeEnabled) {
    return <View key={'chapterItem' + id}>{chapterContent}</View>;
  }

  return (
    <View key={'chapterItem' + id}>
      <Swipeable
        ref={swipeableRef}
        renderLeftActions={leftActionConfig ? renderLeftActions : undefined}
        renderRightActions={rightActionConfig ? renderRightActions : undefined}
        onSwipeableWillOpen={onSwipeableWillOpen}
        overshootFriction={8}
        friction={1.5}
        leftThreshold={VISUAL_THRESHOLD}
        rightThreshold={VISUAL_THRESHOLD}
      >
        {chapterContent}
      </Swipeable>
    </View>
  );
};

export default memo(ChapterItem);

const styles = StyleSheet.create({
  actionContainer: {
    width: ACTION_WIDTH,
    height: '100%',
    overflow: 'hidden',
  },
  iconWrapper: {
    paddingHorizontal: 24,
  },
  chapterCardContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 64,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  flex1: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  row: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  text: {
    fontSize: 12,
  },
  textNormal: {
    fontSize: 14,
  },
  textSmall: {
    fontSize: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadIcon: {
    marginEnd: 4,
  },
  updateCardName: {
    fontSize: 14,
  },
  mt4: {
    marginTop: 4,
  },
});
