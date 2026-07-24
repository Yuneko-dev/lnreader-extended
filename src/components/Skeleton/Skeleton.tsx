import { useTheme } from '@hooks/persisted';
import * as React from 'react';
import { StyleProp, ViewStyle, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import useLoadingColors from '@utils/useLoadingColors';
import { LinearGradient } from 'expo-linear-gradient';

const duration = 1000;
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

function useSetupLoadingAnimations() {
  const translateX = useSharedValue(-100);
  const theme = useTheme();
  const [highlightColor, backgroundColor, disableLoadingAnimations] =
    useLoadingColors(theme);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: (translateX.value + '%') as `${number}%`,
        },
      ],
    };
  });

  const LGC = React.useMemo(
    () =>
      disableLoadingAnimations ? null : (
        <AnimatedLinearGradient
          start={[0, 0]}
          end={[1, 0]}
          locations={[0, 0.3, 0.7, 1]}
          style={[styles.LG, animatedStyle]}
          colors={[
            'transparent',
            highlightColor,
            highlightColor,
            'transparent',
          ]}
        />
      ),
    [animatedStyle, disableLoadingAnimations, highlightColor],
  );

  React.useEffect(() => {
    cancelAnimation(translateX);
    translateX.value = -100;
    if (!disableLoadingAnimations) {
      translateX.value = withRepeat(withTiming(200, { duration }), -1, false);
    }
    return () => cancelAnimation(translateX);
  }, [disableLoadingAnimations, translateX]);

  return [LGC, backgroundColor] as const;
}

const ChapterSkeleton = React.memo(function ChapterSkeletonItem({
  lgc,
  backgroundStyle,
  img,
}: {
  lgc: React.JSX.Element | null;
  backgroundStyle: StyleProp<ViewStyle>;
  img?: boolean;
}) {
  return (
    <View style={[styles.chapter, styles.h40]}>
      {img ? (
        <View style={[styles.default, styles.img, backgroundStyle]}>{lgc}</View>
      ) : (
        <></>
      )}
      <View style={[styles.flex, styles.chapterText]}>
        <View style={[styles.default, styles.h20, backgroundStyle]}>{lgc}</View>
        <View style={[styles.default, styles.h15, backgroundStyle]}>{lgc}</View>
      </View>
      <View style={[styles.default, styles.circle, backgroundStyle]}>
        {lgc}
      </View>
    </View>
  );
});

function VerticalBarSkeleton() {
  const [LGC, backgroundColor] = useSetupLoadingAnimations();
  return (
    <View
      style={[
        { backgroundColor: backgroundColor },
        styles.verticalBar,
        styles.default,
        styles.h24,
      ]}
    >
      {LGC}
    </View>
  );
}

function NovelMetaSkeleton() {
  const [LGC, backgroundColor] = useSetupLoadingAnimations();

  const Chips = React.useMemo(
    () => (
      <View
        style={[
          styles.default,
          styles.chip,
          {
            backgroundColor: backgroundColor,
          },
        ]}
      >
        {LGC}
      </View>
    ),
    [LGC, backgroundColor],
  );

  return (
    <View style={[styles.novelInformationText, styles.h62]}>
      <View style={[styles.flex, styles.h20]}>
        <View
          style={[
            styles.default,
            styles.h20,
            {
              backgroundColor: backgroundColor,
            },
          ]}
        >
          {LGC}
        </View>
        <View
          style={[
            styles.default,
            styles.h20,
            {
              backgroundColor: backgroundColor,
            },
          ]}
        >
          {LGC}
        </View>
        <View style={[styles.metaGap, styles.row, styles.flex]}>
          {Chips}
          {Chips}
          {Chips}
          {Chips}
        </View>
      </View>
    </View>
  );
}

const ChapterListSkeleton = ({ img }: { img?: boolean }) => {
  const [LGC, backgroundColor] = useSetupLoadingAnimations();
  const skeletonItems = React.useMemo(() => Array.from({ length: 7 }), []);
  const backgroundStyle = React.useMemo(
    () => ({ backgroundColor }),
    [backgroundColor],
  );

  return (
    <>
      {skeletonItems.map((_, i) => (
        <ChapterSkeleton
          key={i}
          lgc={LGC}
          backgroundStyle={backgroundStyle}
          img={img}
        />
      ))}
    </>
  );
};

export { ChapterListSkeleton, NovelMetaSkeleton, VerticalBarSkeleton };

const styles = StyleSheet.create({
  LG: {
    height: 40,
    position: 'absolute',
    width: '60%',
  },
  chapter: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  chapterText: {
    height: 40,
    overflow: 'hidden',
    position: 'relative',
  },
  chip: {
    borderRadius: 8,
    height: 30,
    marginRight: 8,
    width: 80,
  },
  circle: {
    alignSelf: 'center',
    borderRadius: 20,
    height: 30,
    marginLeft: 20,
    width: 30,
  },
  default: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  flex: { flex: 1 },
  h15: {
    height: 15,
  },
  h20: {
    height: 20,
    marginBottom: 5,
  },
  h24: {
    height: 24,
  },
  h40: {
    height: 40,
  },
  h62: {
    height: 110,
  },
  img: {
    alignSelf: 'center',
    height: 40,
    marginRight: 20,
    width: 40,
  },
  metaGap: {
    marginTop: 22,
  },
  novelInformationText: {
    height: 62,
    marginBottom: 2.5,
    marginHorizontal: 16,
    marginTop: 8,
    paddingTop: 5,
  },
  row: { flexDirection: 'row' },
  verticalBar: {
    borderRadius: 4,
    marginHorizontal: 16,
    marginVertical: 16,
  },
});
