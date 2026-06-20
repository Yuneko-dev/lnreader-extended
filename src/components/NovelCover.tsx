import { DBNovelInfo, NovelInfo } from '@database/types';
import { useDeviceOrientation } from '@hooks';
import { useLibrarySettings } from '@hooks/persisted';
import { getUserAgent } from '@hooks/persisted/useUserAgent';
import { defaultCover } from '@plugins/helpers/constants';
import { ImageRequestInit, NovelItem } from '@plugins/types';
import SourceScreenSkeletonLoading from '@screens/browse/loadingAnimation/SourceScreenSkeletonLoading';
import { DisplayModes } from '@screens/library/constants/constants';
import { getString } from '@strings/translations';
import { ThemeColors } from '@theme/types';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useMemo } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

import { coverPlaceholderColor } from '../theme/colors';
import ListView from './ListView';

interface UnreadBadgeProps {
  showDownloadBadges: boolean;
  chaptersDownloaded: number | null;
  chaptersUnread: number;
  theme: ThemeColors;
}
interface DownloadBadgeProps {
  showUnreadBadges: boolean;
  chaptersDownloaded: number;
  chaptersUnread: number | null;
  theme: ThemeColors;
}

type CoverItemDB =
  | DBNovelInfo & {
      completeRow?: number;
    };

type CoverItemLibrary =
  | NovelInfo & {
      completeRow?: number;
    };

type CoverItemPlugin =
  | NovelItem & {
      completeRow?: number;
    };

/**
 * Layout props computed by the parent to avoid per-item hook subscriptions.
 * When provided, NovelCover skips calling useLibrarySettings/useWindowDimensions/useDeviceOrientation.
 */
interface NovelCoverLayoutProps {
  /** Number of columns in the grid */
  numColumns?: number;
  /** Computed cover height in px */
  coverHeight?: number;
  /** Computed cover width in px (only for globalSearch) */
  coverWidth?: number;
  /** Display mode (Comfortable/Compact/List) */
  displayMode?: number;
  /** Whether to show download count badges */
  showDownloadBadges?: boolean;
  /** Whether to show unread count badges */
  showUnreadBadges?: boolean;
}

interface INovelCover<TNovel> extends NovelCoverLayoutProps {
  item: TNovel;
  onPress: () => void;
  libraryStatus: boolean;
  theme: ThemeColors;
  isSelected: boolean;
  addSkeletonLoading?: boolean;
  inActivity?: boolean;
  onLongPress: (item: TNovel) => void;
  hasSelection?: boolean;
  selectedNovelIds?: number[];
  globalSearch?: boolean;
  imageRequestInit?: ImageRequestInit;
}

function isFromDB(
  item: CoverItemLibrary | CoverItemPlugin | CoverItemDB,
): item is CoverItemDB {
  return 'chaptersDownloaded' in item;
}

/**
 * Hook to compute layout values for NovelCover.
 * Call this ONCE in the parent list component, not inside each item.
 */
export function useNovelCoverLayout(globalSearch?: boolean) {
  const {
    displayMode = DisplayModes.Comfortable,
    showDownloadBadges = true,
    showUnreadBadges = true,
    novelsPerRow = 3,
  } = useLibrarySettings();
  const window = useWindowDimensions();
  const orientation = useDeviceOrientation();

  const numColumns = orientation === 'landscape' ? 6 : novelsPerRow;

  const coverHeight = globalSearch
    ? ((window.width / 3 - 16) * 4) / 3
    : (window.width / numColumns) * (4 / 3);

  const coverWidth = globalSearch ? window.width / 3 - 16 : undefined;

  return {
    numColumns,
    coverHeight,
    coverWidth,
    displayMode,
    showDownloadBadges,
    showUnreadBadges,
  };
}

function NovelCover<
  TNovel extends CoverItemLibrary | CoverItemPlugin | CoverItemDB,
>({
  item,
  onPress,
  libraryStatus,
  theme,
  isSelected,
  addSkeletonLoading,
  inActivity,
  onLongPress,
  hasSelection,
  globalSearch,
  imageRequestInit,
  // Layout props from parent (preferred) or fallback to hooks
  numColumns: numColumnsProp,
  coverHeight: coverHeightProp,
  coverWidth: coverWidthProp,
  displayMode: displayModeProp,
  showDownloadBadges: showDownloadBadgesProp,
  showUnreadBadges: showUnreadBadgesProp,
}: INovelCover<TNovel>) {
  const selectionActive = hasSelection ?? false;

  // Fallback: compute layout values if parent didn't provide them.
  // When used inside a list, parents SHOULD pass these to avoid per-item hook subscriptions.
  const fallback = useFallbackLayout(
    numColumnsProp,
    coverHeightProp,
    displayModeProp,
    globalSearch,
  );

  const numColumns = numColumnsProp ?? fallback.numColumns;
  const coverHeight = coverHeightProp ?? fallback.coverHeight;
  const coverWidth = coverWidthProp ?? fallback.coverWidth;
  const displayMode =
    displayModeProp ?? fallback.displayMode ?? DisplayModes.Comfortable;
  const showDownloadBadges =
    showDownloadBadgesProp ?? fallback.showDownloadBadges ?? true;
  const showUnreadBadges =
    showUnreadBadgesProp ?? fallback.showUnreadBadges ?? true;

  const selectNovel = () => onLongPress(item);

  const uri = item.cover || defaultCover;
  const requestInit = useMemo(() => {
    const init = imageRequestInit || ({} as ImageRequestInit);
    if (init.headers) {
      return init;
    }
    return {
      ...init,
      headers: { 'User-Agent': getUserAgent() },
    };
  }, [imageRequestInit]);

  if (item.completeRow) {
    if (!addSkeletonLoading) {
      return <></>;
    }
    return (
      <SourceScreenSkeletonLoading
        theme={theme}
        completeRow={item.completeRow}
      />
    );
  }

  const flex = globalSearch ? 1 : 1 / numColumns;
  const margin = globalSearch ? 0 : 2;

  return displayMode !== DisplayModes.List || globalSearch ? (
    <View
      style={[
        {
          flex,
          width: coverWidth,
          margin,
        },
        styles.standardNovelCover,
        isSelected && {
          backgroundColor: theme.primary,
          ...styles.selectedNovelCover,
        },
      ]}
    >
      <Pressable
        android_ripple={{ color: theme.rippleColor }}
        style={styles.opac}
        onPress={selectionActive ? selectNovel : onPress}
        onLongPress={selectNovel}
      >
        <View style={styles.badgeContainer}>
          {libraryStatus ? <InLibraryBadge theme={theme} /> : null}
          {isFromDB(item) ? (
            <>
              {showDownloadBadges &&
              item.chaptersDownloaded &&
              item.chaptersDownloaded > 0 ? (
                <DownloadBadge
                  showUnreadBadges={showUnreadBadges}
                  chaptersDownloaded={item.chaptersDownloaded}
                  chaptersUnread={item.chaptersUnread}
                  theme={theme}
                />
              ) : null}
              {showUnreadBadges &&
              item.chaptersUnread &&
              item.chaptersUnread > 0 ? (
                <UnreadBadge
                  theme={theme}
                  chaptersDownloaded={item.chaptersDownloaded}
                  chaptersUnread={item.chaptersUnread}
                  showDownloadBadges={showDownloadBadges}
                />
              ) : null}
            </>
          ) : null}
          {inActivity ? <InActivityBadge theme={theme} /> : null}
        </View>
        <Image
          source={{ uri, ...requestInit }}
          style={[
            {
              height: coverHeight,
              backgroundColor: coverPlaceholderColor,
            },
            styles.standardBorderRadius,
            libraryStatus && styles.opacityPoint5,
          ]}
        />
        <View style={styles.compactTitleContainer}>
          {displayMode === DisplayModes.Compact ? (
            <CompactTitle novelName={item.name} />
          ) : null}
        </View>
        {displayMode === DisplayModes.Comfortable ? (
          <ComfortableTitle
            novelName={item.name}
            theme={theme}
            width={coverWidth}
          />
        ) : null}
      </Pressable>
    </View>
  ) : (
    <ListView
      item={item}
      downloadBadge={
        showDownloadBadges && isFromDB(item) && item.chaptersDownloaded ? (
          <DownloadBadge
            theme={theme}
            showUnreadBadges={showUnreadBadges}
            chaptersDownloaded={item.chaptersDownloaded}
            chaptersUnread={item.chaptersUnread}
          />
        ) : null
      }
      unreadBadge={
        showUnreadBadges && isFromDB(item) && item.chaptersUnread ? (
          <UnreadBadge
            theme={theme}
            chaptersDownloaded={item.chaptersDownloaded}
            chaptersUnread={item.chaptersUnread}
            showDownloadBadges={showDownloadBadges}
          />
        ) : null
      }
      inLibraryBadge={libraryStatus && <InLibraryBadge theme={theme} />}
      theme={theme}
      onPress={selectionActive ? selectNovel : onPress}
      onLongPress={selectNovel}
      isSelected={isSelected}
    />
  );
}

/**
 * Internal fallback: only called when parent doesn't provide layout props.
 * React hooks must always be called, so this always runs, but parents
 * passing layout props means the values are simply unused.
 */
function useFallbackLayout(
  numColumnsProp?: number,
  coverHeightProp?: number,
  displayModeProp?: number,
  globalSearch?: boolean,
) {
  const {
    displayMode = DisplayModes.Comfortable,
    showDownloadBadges = true,
    showUnreadBadges = true,
    novelsPerRow = 3,
  } = useLibrarySettings();
  const window = useWindowDimensions();
  const orientation = useDeviceOrientation();

  // Skip computation if parent provided values
  if (
    numColumnsProp !== undefined &&
    coverHeightProp !== undefined &&
    displayModeProp !== undefined
  ) {
    return {
      numColumns: numColumnsProp,
      coverHeight: coverHeightProp,
      coverWidth: undefined as number | undefined,
      displayMode: displayModeProp,
      showDownloadBadges,
      showUnreadBadges,
    };
  }

  const numColumns = orientation === 'landscape' ? 6 : novelsPerRow;
  const coverHeight = globalSearch
    ? ((window.width / 3 - 16) * 4) / 3
    : (window.width / numColumns) * (4 / 3);
  const coverWidth = globalSearch ? window.width / 3 - 16 : undefined;

  return {
    numColumns,
    coverHeight,
    coverWidth,
    displayMode,
    showDownloadBadges,
    showUnreadBadges,
  };
}

export default memo(NovelCover);

const ComfortableTitle = ({
  theme,
  novelName,
  width,
}: {
  theme: ThemeColors;
  novelName: string;
  width?: number;
}) => (
  <Text
    numberOfLines={2}
    style={[
      styles.title,
      styles.padding4,
      {
        color: theme.onSurface,
        maxWidth: width,
      },
    ]}
  >
    {novelName}
  </Text>
);

const CompactTitle = ({ novelName }: { novelName: string }) => (
  <View style={styles.titleContainer}>
    <LinearGradient
      colors={['transparent', 'rgba(0,0,0,0.7)']}
      style={styles.linearGradient}
    >
      <Text numberOfLines={2} style={[styles.title, styles.compactTitle]}>
        {novelName}
      </Text>
    </LinearGradient>
  </View>
);

const InLibraryBadge = ({ theme }: { theme: ThemeColors }) => (
  <Text
    style={[
      styles.inLibraryBadge,
      {
        backgroundColor: theme.primary,
        color: theme.onPrimary,
      },
      styles.standardBorderRadius,
    ]}
  >
    {getString('novelScreen.inLibrary')}
  </Text>
);

const InActivityBadge = ({ theme }: { theme: ThemeColors }) => (
  <View
    style={[
      styles.activityBadge,
      {
        backgroundColor: theme.primary,
      },
      styles.standardBorderRadius,
    ]}
  >
    <ActivityIndicator animating={true} size={10} color={theme.onPrimary} />
  </View>
);

const UnreadBadge: React.FC<UnreadBadgeProps> = ({
  chaptersDownloaded,
  chaptersUnread,
  showDownloadBadges,
  theme,
}: UnreadBadgeProps) => (
  <Text
    style={[
      styles.unreadBadge,
      !chaptersDownloaded && styles.LeftBorderRadius,
      !showDownloadBadges && styles.standardBorderRadius,
      {
        backgroundColor: theme.primary,
        color: theme.onPrimary,
      },
    ]}
  >
    {chaptersUnread}
  </Text>
);

const DownloadBadge: React.FC<DownloadBadgeProps> = ({
  chaptersDownloaded,
  showUnreadBadges,
  chaptersUnread,
  theme,
}: DownloadBadgeProps) => (
  <Text
    style={[
      styles.downloadBadge,
      !chaptersUnread && styles.RightBorderRadius,
      !showUnreadBadges && styles.standardBorderRadius,
      {
        backgroundColor: theme.tertiary,
        color: theme.onTertiary,
      },
    ]}
  >
    {chaptersDownloaded}
  </Text>
);

const styles = StyleSheet.create({
  LeftBorderRadius: {
    borderBottomLeftRadius: 4,
    borderTopLeftRadius: 4,
  },
  RightBorderRadius: {
    borderBottomRightRadius: 4,
    borderTopRightRadius: 4,
  },
  activityBadge: {
    marginHorizontal: 4,
    padding: 5,
  },
  badgeContainer: {
    flexDirection: 'row',
    left: 10,
    position: 'absolute',
    top: 10,
    zIndex: 1,
  },
  compactTitle: {
    color: 'rgba(255,255,255,1)',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  compactTitleContainer: {
    bottom: 4,
    left: 4,
    position: 'absolute',
    right: 4,
  },
  downloadBadge: {
    borderBottomLeftRadius: 4,
    borderTopLeftRadius: 4,
    fontSize: 12,
    paddingHorizontal: 5,
    paddingTop: 2,
  },
  extensionIcon: {
    borderRadius: 4,
    height: 42,
    width: 42,
  },
  inLibraryBadge: {
    fontSize: 12,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  linearGradient: {
    borderRadius: 4,
  },
  listView: {
    alignItems: 'center',
    borderRadius: 4,
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  opac: {
    borderRadius: 4,
    flex: 1,
    padding: 4.8,
  },
  opacityPoint5: { opacity: 0.5 },
  padding4: { padding: 4 },
  selectedNovelCover: {
    opacity: 0.8,
  },
  standardBorderRadius: {
    borderRadius: 4,
  },
  standardNovelCover: {
    borderRadius: 6,
    overflow: 'hidden',
  },
  title: {
    fontFamily: 'ArchivoNarrow-Bold',
    fontSize: 14,
    padding: 8,
  },
  titleContainer: {
    borderRadius: 4,
    flex: 1,
  },
  unreadBadge: {
    borderBottomRightRadius: 4,
    borderTopRightRadius: 4,
    fontSize: 12,
    paddingHorizontal: 4,
    paddingTop: 2,
  },
});
