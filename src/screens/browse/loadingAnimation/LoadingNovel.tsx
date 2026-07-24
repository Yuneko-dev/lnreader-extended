import React, { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { DisplayModes } from '@screens/library/constants/constants';
import ShimmerPlaceholder from '@components/Skeleton/ShimmerPlaceholder';

interface Props {
  availableWidth: number;
  backgroundColor: string;
  disableLoadingAnimations: boolean;
  highlightColor: string;
  pictureHeight: number;
  pictureWidth: number;
  displayMode: DisplayModes;
}

const LoadingNovel: React.FC<Props> = ({
  availableWidth,
  backgroundColor,
  disableLoadingAnimations,
  highlightColor,
  pictureHeight,
  pictureWidth,
  displayMode,
}) => {
  const showTitle =
    displayMode !== DisplayModes.CoverOnly &&
    displayMode !== DisplayModes.Compact;
  const loadingContainerStyle = useMemo(
    () => ({
      height: pictureHeight + (showTitle ? 54.6 : 9.6),
      width: pictureWidth + 9.6,
    }),
    [pictureHeight, pictureWidth, showTitle],
  );

  if (displayMode !== DisplayModes.List) {
    return (
      <View style={[styles.loadingContainer, loadingContainerStyle]}>
        <ShimmerPlaceholder
          style={styles.picture}
          shimmerColors={[backgroundColor, highlightColor, backgroundColor]}
          height={pictureHeight}
          width={pictureWidth}
          stopAutoRun={disableLoadingAnimations}
        />
        {showTitle ? (
          <>
            <ShimmerPlaceholder
              style={styles.text}
              shimmerColors={[backgroundColor, highlightColor, backgroundColor]}
              height={16}
              width={pictureWidth}
              stopAutoRun={disableLoadingAnimations}
            />
            <ShimmerPlaceholder
              style={styles.text}
              shimmerColors={[backgroundColor, highlightColor, backgroundColor]}
              height={16}
              width={pictureWidth * 0.68}
              stopAutoRun={disableLoadingAnimations}
            />
          </>
        ) : null}
      </View>
    );
  }

  const chapterNumberWidth = 40;
  const textWidth = Math.max(80, availableWidth - chapterNumberWidth - 88);
  return (
    <View style={styles.listLoadingContainer}>
      <ShimmerPlaceholder
        style={styles.picture}
        shimmerColors={[backgroundColor, highlightColor, backgroundColor]}
        height={40}
        width={40}
        stopAutoRun={disableLoadingAnimations}
      />
      <ShimmerPlaceholder
        style={styles.listText}
        shimmerColors={[backgroundColor, highlightColor, backgroundColor]}
        height={18}
        width={textWidth}
        stopAutoRun={disableLoadingAnimations}
      />
      <ShimmerPlaceholder
        style={styles.picture}
        shimmerColors={[backgroundColor, highlightColor, backgroundColor]}
        height={20}
        width={chapterNumberWidth}
        stopAutoRun={disableLoadingAnimations}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  listLoadingContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginHorizontal: 8,
    marginVertical: 8,
  },
  listText: {
    borderRadius: 4,
    marginLeft: 16,
    marginRight: 8,
  },
  loadingContainer: {
    marginBottom: 4,
    overflow: 'hidden',
    padding: 4.8,
  },
  picture: {
    borderRadius: 4,
  },
  text: {
    borderRadius: 8,
    marginTop: 5,
  },
});

export default memo(LoadingNovel);
