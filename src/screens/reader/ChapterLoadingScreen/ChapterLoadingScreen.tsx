import { useChapterReaderSettings } from '@hooks/persisted';
import color from 'color';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import SkeletonLines from '../components/SkeletonLines';

interface ChapterLoadingScreenProps {
  isLoading?: boolean;
  children?: React.ReactNode;
}

const ChapterLoadingScreen: React.FC<ChapterLoadingScreenProps> = ({
  isLoading,
  children,
}) => {
  const {
    theme: backgroundColor,
    padding,
    textSize,
    lineHeight,
  } = useChapterReaderSettings();

  return (
    <View style={styles.container}>
      {children}
      {isLoading && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor }]}>
          <SkeletonLines
            containerMargin={padding}
            containerHeight={'100%'}
            containerWidth={'100%'}
            color={
              color(backgroundColor).isDark()
                ? color(backgroundColor).luminosity() !== 0
                  ? color(backgroundColor).lighten(0.1).toString()
                  : color(backgroundColor).negate().darken(0.98).toString()
                : color(backgroundColor).darken(0.04).toString()
            }
            highlightColor={
              color(backgroundColor).isDark()
                ? color(backgroundColor).luminosity() !== 0
                  ? color(backgroundColor).lighten(0.4).toString()
                  : color(backgroundColor).negate().darken(0.92).toString()
                : color(backgroundColor).darken(0.08).toString()
            }
            textSize={textSize}
            lineHeight={lineHeight}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ChapterLoadingScreen;
