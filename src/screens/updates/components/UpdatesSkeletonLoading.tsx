import React, { memo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { ThemeColors } from '@theme/types';
import useLoadingColors from '@utils/useLoadingColors';
import Animated, { FadeIn } from 'react-native-reanimated';
import ShimmerPlaceholder from '@components/Skeleton/ShimmerPlaceholder';

const SKELETON_ITEMS = Array.from({ length: 8 });

interface Props {
  theme: ThemeColors;
}

const UpdatesSkeletonLoading: React.FC<Props> = ({ theme }) => {
  const { width } = useWindowDimensions();
  const textWidth = Math.max(80, width - 120);
  const [highlightColor, backgroundColor, disableLoadingAnimations] =
    useLoadingColors(theme);

  const renderLoadingChapter = (_: unknown, index: number) => {
    return (
      <View style={styles.chapterCtn} key={`updates-skeleton-${index}`}>
        <ShimmerPlaceholder
          style={styles.picture}
          shimmerColors={[backgroundColor, highlightColor, backgroundColor]}
          height={42}
          width={42}
          stopAutoRun={disableLoadingAnimations}
        />
        <View style={styles.textCtn}>
          <ShimmerPlaceholder
            style={styles.textTop}
            shimmerColors={[backgroundColor, highlightColor, backgroundColor]}
            height={16}
            width={textWidth}
            stopAutoRun={disableLoadingAnimations}
          />
          <ShimmerPlaceholder
            style={styles.textBottom}
            shimmerColors={[backgroundColor, highlightColor, backgroundColor]}
            height={12}
            width={textWidth}
            stopAutoRun={disableLoadingAnimations}
          />
        </View>
        <View style={styles.buttonCtn}>
          <ShimmerPlaceholder
            style={styles.button}
            shimmerColors={[backgroundColor, highlightColor, backgroundColor]}
            height={25}
            width={25}
            stopAutoRun={disableLoadingAnimations}
          />
        </View>
      </View>
    );
  };

  return (
    <Animated.View
      entering={disableLoadingAnimations ? undefined : FadeIn.duration(500)}
      style={styles.contentCtn}
    >
      {SKELETON_ITEMS.map(renderLoadingChapter)}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12.5,
  },
  buttonCtn: {
    alignItems: 'center',
    height: 45.1,
    justifyContent: 'center',
    width: 45.1,
  },
  chapterCtn: {
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: 8,
  },
  contentCtn: {
    paddingVertical: 8,
  },
  picture: {
    borderRadius: 4,
    height: 42,
    marginHorizontal: 16,
    width: 42,
  },
  textBottom: {
    borderRadius: 6,
    marginBottom: 5,
    marginTop: 2,
  },
  textTop: {
    borderRadius: 6,
    marginBottom: 2,
    marginTop: 5,
  },
  textCtn: {
    flex: 1,
    overflow: 'hidden',
  },
});

export default memo(UpdatesSkeletonLoading);
