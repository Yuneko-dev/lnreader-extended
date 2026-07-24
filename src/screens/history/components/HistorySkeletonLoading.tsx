import React, { memo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { ThemeColors } from '@theme/types';
import useLoadingColors from '@utils/useLoadingColors';
import ShimmerPlaceholder from '@components/Skeleton/ShimmerPlaceholder';

const SKELETON_ITEMS = [
  { dateWidth: 72 },
  { dateWidth: null },
  { dateWidth: null },
  { dateWidth: 88 },
  { dateWidth: null },
] as const;

interface Props {
  theme: ThemeColors;
}

const HistorySkeletonLoading: React.FC<Props> = ({ theme }) => {
  const { width } = useWindowDimensions();
  const textWidth = Math.max(80, width - 144);
  const [highlightColor, backgroundColor, disableLoadingAnimations] =
    useLoadingColors(theme);

  const renderLoadingChapter = (
    { dateWidth }: (typeof SKELETON_ITEMS)[number],
    index: number,
  ) => (
    <View key={`historyLoading${index}`}>
      {dateWidth ? (
        <ShimmerPlaceholder
          style={styles.date}
          shimmerColors={[backgroundColor, highlightColor, backgroundColor]}
          height={19.3}
          width={dateWidth}
          stopAutoRun={disableLoadingAnimations}
        />
      ) : null}
      <View style={styles.chapterCtn}>
        <ShimmerPlaceholder
          style={styles.picture}
          shimmerColors={[backgroundColor, highlightColor, backgroundColor]}
          height={80}
          width={56}
          stopAutoRun={disableLoadingAnimations}
        />
        <View style={styles.textCtn}>
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
            height={12}
            width={textWidth}
            stopAutoRun={disableLoadingAnimations}
          />
        </View>
        <View style={styles.buttonCtn}>
          <ShimmerPlaceholder
            style={styles.button}
            shimmerColors={[backgroundColor, highlightColor, backgroundColor]}
            height={24}
            width={24}
            stopAutoRun={disableLoadingAnimations}
          />
        </View>
      </View>
    </View>
  );

  return <View>{SKELETON_ITEMS.map(renderLoadingChapter)}</View>;
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12.5,
  },
  buttonCtn: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  chapterCtn: {
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: 8,
  },
  contentCtn: {
    paddingVertical: 8,
  },
  date: {
    borderRadius: 6,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  picture: {
    borderRadius: 4,
    height: 80,
    marginHorizontal: 16,
    width: 56,
  },
  text: {
    borderRadius: 6,
    marginBottom: 4,
  },
  textCtn: {
    borderRadius: 6,
    flex: 1,
    marginBottom: 2,
    marginTop: 5,
    overflow: 'hidden',
  },
});

export default memo(HistorySkeletonLoading);
