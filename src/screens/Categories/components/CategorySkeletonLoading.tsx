import React, { memo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { ThemeColors } from '@theme/types';
import useLoadingColors from '@utils/useLoadingColors';
import ShimmerPlaceholder from '@components/Skeleton/ShimmerPlaceholder';

const SKELETON_ITEMS = Array.from({ length: 6 });

interface Props {
  width: number;
  height: number;
  theme: ThemeColors;
}

const CategorySkeletonLoading: React.FC<Props> = ({ height, width, theme }) => {
  const window = useWindowDimensions();
  const cardWidth = Math.min(width, window.width - 32);
  const [highlightColor, backgroundColor, disableLoadingAnimations] =
    useLoadingColors(theme);

  const renderLoadingCard = (_: unknown, index: number) => {
    return (
      <View key={`category-skeleton-${index}`}>
        <ShimmerPlaceholder
          style={styles.categoryCard}
          shimmerColors={[backgroundColor, highlightColor, backgroundColor]}
          height={height}
          width={cardWidth}
          stopAutoRun={disableLoadingAnimations}
        />
      </View>
    );
  };

  return (
    <View style={styles.contentCtn}>
      {SKELETON_ITEMS.map(renderLoadingCard)}
    </View>
  );
};

const styles = StyleSheet.create({
  categoryCard: {
    borderRadius: 12,
    marginHorizontal: 16,
  },
  contentCtn: {
    gap: 8,
    paddingBottom: 100,
    paddingVertical: 16,
  },
});

export default memo(CategorySkeletonLoading);
