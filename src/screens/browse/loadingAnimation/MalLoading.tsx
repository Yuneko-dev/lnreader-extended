import React, { memo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { ThemeColors } from '@theme/types';

import ShimmerPlaceholder from '@components/Skeleton/ShimmerPlaceholder';
import useLoadingColors from '@utils/useLoadingColors';

interface Props {
  theme: ThemeColors;
}

const SKELETON_ITEMS = [
  { height: 128, lastLineRatio: 0.72 },
  { height: 142, lastLineRatio: 0.54 },
  { height: 136, lastLineRatio: 0.8 },
  { height: 148, lastLineRatio: 0.62 },
  { height: 132, lastLineRatio: 0.7 },
] as const;

const MalLoading: React.FC<Props> = ({ theme }) => {
  const { width } = useWindowDimensions();
  const textWidth = Math.max(80, width - 140);
  const [highlightColor, backgroundColor, disableLoadingAnimations] =
    useLoadingColors(theme);

  return (
    <View style={styles.container}>
      {SKELETON_ITEMS.map((item, index) => (
        <View
          key={`mal-skeleton-${index}`}
          style={[styles.loadingContainer, { backgroundColor: theme.overlay3 }]}
        >
          <ShimmerPlaceholder
            shimmerColors={[backgroundColor, highlightColor, backgroundColor]}
            height={item.height}
            width={100}
            stopAutoRun={disableLoadingAnimations}
          />
          <View style={styles.loadingText}>
            <ShimmerPlaceholder
              style={styles.text}
              shimmerColors={[backgroundColor, highlightColor, backgroundColor]}
              height={16}
              width={textWidth}
              stopAutoRun={disableLoadingAnimations}
            />
            <ShimmerPlaceholder
              style={styles.text}
              shimmerColors={[backgroundColor, highlightColor, backgroundColor]}
              height={16}
              width={textWidth}
              stopAutoRun={disableLoadingAnimations}
            />
            <ShimmerPlaceholder
              style={styles.text}
              shimmerColors={[backgroundColor, highlightColor, backgroundColor]}
              height={16}
              width={textWidth * item.lastLineRatio}
              stopAutoRun={disableLoadingAnimations}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    flexGrow: 1,
    marginBottom: 8,
    marginTop: -3,
    overflow: 'hidden',
    position: 'relative',
  },
  loadingContainer: {
    borderRadius: 8,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    flexDirection: 'row',
    margin: 10,
    overflow: 'hidden',
  },
  loadingText: {
    flex: 1,
    margin: 10,
    overflow: 'hidden',
  },
  text: {
    borderRadius: 8,
    marginVertical: 5,
  },
});

export default memo(MalLoading);
