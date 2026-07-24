import React, { createContext, memo, useContext, useMemo } from 'react';
import {
  View,
  StyleSheet,
  StyleProp,
  useWindowDimensions,
  ViewStyle,
} from 'react-native';
import { ThemeColors } from '@theme/types';
import useLoadingColors from '@utils/useLoadingColors';
import ShimmerPlaceholder from '@components/Skeleton/ShimmerPlaceholder';

interface Props {
  theme: ThemeColors;
}

interface SkeletonContextValue {
  backgroundColor: string;
  disableLoadingAnimations: boolean;
  fullWidth: number;
  highlightColor: string;
}

const SkeletonContext = createContext<SkeletonContextValue | null>(null);

const useSkeletonContext = () => {
  const value = useContext(SkeletonContext);
  if (!value) {
    throw new Error('Loading skeleton must be rendered inside SkeletonContext');
  }
  return value;
};

const DESCRIPTION_LINES = Array.from({ length: 2 });
const CHIP_WIDTHS = [64, 88, 52, 72];
const STAT_ITEMS = Array.from({ length: 3 });
const CHAPTER_ITEMS = Array.from({ length: 7 });

export const LoadingShimmer = memo(
  ({
    style,
    height,
    width,
    visible = true,
  }: {
    style?: StyleProp<ViewStyle>;
    height: number;
    width: number | string;
    visible?: boolean;
  }) => {
    const { backgroundColor, disableLoadingAnimations, highlightColor } =
      useSkeletonContext();
    if (!visible) {
      return null;
    }

    return (
      <ShimmerPlaceholder
        style={style}
        shimmerColors={[backgroundColor, highlightColor, backgroundColor]}
        height={height}
        width={width}
        stopAutoRun={disableLoadingAnimations}
      />
    );
  },
);

const NovelTop = memo(() => {
  const { fullWidth } = useSkeletonContext();
  const textWidth = Math.max(80, fullWidth - 116);
  return (
    <View style={styles.headerContainer}>
      <LoadingShimmer style={styles.picture} height={150} width={100} />
      <View style={styles.headerText}>
        <LoadingShimmer style={styles.text} height={25} width={textWidth} />
        <LoadingShimmer style={styles.text} height={20} width={textWidth} />
        <LoadingShimmer style={styles.text} height={20} width={textWidth} />
      </View>
    </View>
  );
});

export const LoadingDescription = memo(() => {
  const { fullWidth } = useSkeletonContext();
  return (
    <View style={styles.novelInformationText}>
      {DESCRIPTION_LINES.map((_, index) => (
        <LoadingShimmer
          key={`description-skeleton-${index}`}
          style={styles.text}
          height={16}
          width={fullWidth}
        />
      ))}
    </View>
  );
});

export const LoadingChips = memo(() => (
  <View style={styles.novelInformationChips}>
    {CHIP_WIDTHS.map((width, index) => (
      <LoadingShimmer
        key={`chip-skeleton-${index}`}
        style={styles.chip}
        height={32}
        width={width}
      />
    ))}
  </View>
));

const NovelInformation = memo(() => (
  <View style={styles.metadataContainer}>
    <View style={styles.statsContainer}>
      {STAT_ITEMS.map((_, index) => (
        <LoadingShimmer
          key={`stat-skeleton-${index}`}
          style={styles.icon}
          height={56}
          width={90}
        />
      ))}
    </View>
    <LoadingDescription />
    <LoadingChips />
  </View>
));

export const LoadingChapterItem = memo(() => {
  const { fullWidth } = useSkeletonContext();
  const textWidth = Math.max(80, fullWidth - 50);
  return (
    <View style={styles.chapter}>
      <View>
        <LoadingShimmer style={styles.text} height={20} width={textWidth} />
        <LoadingShimmer style={styles.text} height={16} width={textWidth} />
      </View>
      <LoadingShimmer
        style={styles.loadingChapterItem}
        height={30}
        width={30}
      />
    </View>
  );
});

const Chapters = memo(() => {
  const { fullWidth } = useSkeletonContext();
  return (
    <View>
      <LoadingShimmer
        style={[styles.text, styles.chapters]}
        height={30}
        width={fullWidth}
      />
      {CHAPTER_ITEMS.map((_, index) => (
        <LoadingChapterItem key={`chapter-skeleton-${index}`} />
      ))}
    </View>
  );
});

const NovelScreenLoading: React.FC<Props> = ({ theme }) => {
  const { width } = useWindowDimensions();
  const [highlightColor, backgroundColor, disableLoadingAnimations] =
    useLoadingColors(theme);
  const contextValue = useMemo(
    () => ({
      backgroundColor,
      disableLoadingAnimations,
      fullWidth: Math.max(160, width - 32),
      highlightColor,
    }),
    [backgroundColor, disableLoadingAnimations, highlightColor, width],
  );

  return (
    <SkeletonContext.Provider value={contextValue}>
      <View style={styles.container}>
        <NovelTop />
        <NovelInformation />
        <Chapters />
      </View>
    </SkeletonContext.Provider>
  );
};

const styles = StyleSheet.create({
  loadingChapterItem: { borderRadius: 20, alignSelf: 'center', marginLeft: 20 },
  chapters: { marginBottom: 5, marginHorizontal: 16 },
  chapter: {
    flexDirection: 'row',
    marginHorizontal: 16,
    paddingVertical: 8,
  },
  chapterContainer: {
    marginHorizontal: 16,
  },
  chip: {
    borderRadius: 8,
    marginLeft: 8,
  },
  container: {
    flexGrow: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  headerContainer: {
    flexDirection: 'row',
    height: 268,
    justifyContent: 'space-evenly',
    paddingTop: 118,
    width: '100%',
  },
  headerText: {
    height: 100,
    justifyContent: 'center',
    paddingTop: 30,
  },
  icon: {
    borderRadius: 30,
  },
  metadataContainer: {
    marginVertical: 4,
  },
  novelInformationChips: {
    flexDirection: 'row',
    paddingBottom: 6,
    paddingLeft: 8,
  },
  novelInformationText: {
    height: 62,
    margin: 16,
    marginTop: 8,
  },
  picture: {
    borderRadius: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  text: {
    borderRadius: 8,
    marginTop: 5,
  },
});

export default memo(NovelScreenLoading);
