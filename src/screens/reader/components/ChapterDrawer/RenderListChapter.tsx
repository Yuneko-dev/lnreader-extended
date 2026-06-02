import React from 'react';
import { View, Pressable, TextStyle, StyleProp, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import color from 'color';
import { ChapterInfo } from '@database/types';
import { ThemeColors } from '@theme/types';
import dayjs from 'dayjs';

type Styles = {
  chapterCtn: StyleProp<ViewStyle>;
  drawerElementContainer: StyleProp<ViewStyle>;
  chapterNameCtn: StyleProp<TextStyle>;
  releaseDateCtn: StyleProp<TextStyle>;
};

type Props = {
  item: ChapterInfo;
  styles: Styles;
  theme: ThemeColors;
  chapterId: number;
  onPress: () => void;
};

const renderListChapter = ({
  item,
  styles,
  theme,
  onPress,
  chapterId,
}: Props) => {
  function parseTime(time?: string | Date | null) {
    if (!time) return undefined;
    const parsedTime = dayjs(time);
    return parsedTime.isValid() ? parsedTime.format('LL') : (time as string);
  }
  const releaseTime = parseTime(item.releaseTime);

  return (
    <View
      style={[
        styles.drawerElementContainer,
        item.id === chapterId && {
          backgroundColor: color(theme.primary).alpha(0.12).string(),
        },
      ]}
    >
      <Pressable
        android_ripple={{ color: theme.rippleColor }}
        onPress={onPress}
        style={styles.chapterCtn}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.chapterNameCtn,
            { color: item.unread ? theme.onSurface : theme.outline },
          ]}
        >
          {item.name}
        </Text>
        {releaseTime ? (
          <Text
            style={[
              styles.releaseDateCtn,
              { color: item.unread ? theme.onSurfaceVariant : theme.outline },
            ]}
          >
            {releaseTime}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
};
export default renderListChapter;
