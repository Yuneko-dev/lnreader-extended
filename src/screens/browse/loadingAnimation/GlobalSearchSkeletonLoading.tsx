import React, { memo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { ThemeColors } from '@theme/types';
import LoadingNovel from './LoadingNovel';
import useLoadingColors from '@utils/useLoadingColors';
import { DisplayModes } from '@screens/library/constants/constants';

interface Props {
  theme: ThemeColors;
}

const GlobalSearchSkeletonLoading: React.FC<Props> = ({ theme }) => {
  const { width } = useWindowDimensions();
  const [highlightColor, backgroundColor, disableLoadingAnimations] =
    useLoadingColors(theme);

  return (
    <View style={[styles.container, styles.row]}>
      {SKELETON_ITEMS.map((_, index) => {
        return (
          <LoadingNovel
            key={index}
            availableWidth={width}
            backgroundColor={backgroundColor}
            disableLoadingAnimations={disableLoadingAnimations}
            highlightColor={highlightColor}
            pictureHeight={153.1}
            pictureWidth={100}
            displayMode={DisplayModes.Comfortable}
          />
        );
      })}
    </View>
  );
};

const SKELETON_ITEMS = Array.from({ length: 4 });

const styles = StyleSheet.create({
  container: {
    marginBottom: 6,
    marginHorizontal: 4,
    marginTop: 6,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 3,
  },
});

export default memo(GlobalSearchSkeletonLoading);
