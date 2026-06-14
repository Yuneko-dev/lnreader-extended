import {
  Appbar,
  ErrorScreenV2,
  LoadingScreenV2,
  Menu,
  SafeAreaView,
} from '@components';
import { getChapterReadingTimeStatsFromDb } from '@database/queries/StatsQueries';
import { ChapterReadingTimeStat } from '@database/types';
import { useTheme } from '@hooks/persisted';
import { LegendList } from '@legendapp/list';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getString } from '@strings/translations';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Appbar as PaperAppbar } from 'react-native-paper';

import { MoreStackParamList } from '../../navigators/types';
import { formatReadingTime } from './utils';

type Props = NativeStackScreenProps<
  MoreStackParamList,
  'NovelReadingTimeStats'
>;


const NovelReadingTimeStatsScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { novelId, novelName } = route.params;
  const theme = useTheme();

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ChapterReadingTimeStat[]>([]);
  const [error, setError] = useState<string | Error | null>(null);
  const [sortOrder, setSortOrder] = useState<
    'chapter_asc' | 'chapter_desc' | 'time_asc' | 'time_desc'
  >('time_desc');
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const stats = await getChapterReadingTimeStatsFromDb(novelId);
        if (mounted) setData(stats);
      } catch (err) {
        if (mounted) setError(err as Error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    fetchData();
    return () => {
      mounted = false;
    };
  }, [novelId]);

  const sortedData = React.useMemo(() => {
    return [...data].sort((a, b) => {
      if (sortOrder === 'chapter_asc') {
        if (a.chapterNumber != null && b.chapterNumber != null) {
          return a.chapterNumber - b.chapterNumber;
        }
        return a.chapterName.localeCompare(b.chapterName);
      }
      if (sortOrder === 'chapter_desc') {
        if (a.chapterNumber != null && b.chapterNumber != null) {
          return b.chapterNumber - a.chapterNumber;
        }
        return b.chapterName.localeCompare(a.chapterName);
      }
      if (sortOrder === 'time_asc') {
        return a.readDuration - b.readDuration;
      }
      if (sortOrder === 'time_desc') {
        return b.readDuration - a.readDuration;
      }
      return 0;
    });
  }, [data, sortOrder]);

  if (error) {
    return (
      <SafeAreaView excludeTop>
        <Appbar
          title={getString('readingTimeStatsScreen.novelReadingTime', {
            name: novelName,
          })}
          handleGoBack={navigation.goBack}
          theme={theme}
        />
        <ErrorScreenV2 error={error} />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView excludeTop>
        <Appbar
          title={getString('readingTimeStatsScreen.novelReadingTime', {
            name: novelName,
          })}
          handleGoBack={navigation.goBack}
          theme={theme}
        />
        <LoadingScreenV2 theme={theme} />
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: ChapterReadingTimeStat }) => (
    <View
      style={[
        styles.itemContainer,
        { borderBottomColor: theme.outlineVariant },
      ]}
    >
      <View style={styles.textContainer}>
        <Text
          style={[styles.chapterName, { color: theme.onSurface }]}
          numberOfLines={2}
        >
          {item.chapterName}
        </Text>
      </View>
      <View style={styles.timeContainer}>
        <MaterialCommunityIcons
          name="clock-outline"
          size={14}
          color={theme.onSurfaceVariant}
        />
        <Text style={[styles.timeText, { color: theme.onSurfaceVariant }]}>
          {formatReadingTime(item.readDuration)}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView excludeTop>
      <Appbar
        title={getString('readingTimeStatsScreen.novelReadingTime', {
          name: novelName,
        })}
        handleGoBack={navigation.goBack}
        theme={theme}
      >
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <PaperAppbar.Action
              icon="sort"
              iconColor={theme.onSurface}
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item
            onPress={() => {
              setSortOrder('chapter_asc');
              setMenuVisible(false);
            }}
            title={getString('readingTimeStatsScreen.sortChapterAsc')}
            titleStyle={sortOrder === 'chapter_asc' ? styles.selectedSort : undefined}
          />
          <Menu.Item
            onPress={() => {
              setSortOrder('chapter_desc');
              setMenuVisible(false);
            }}
            title={getString('readingTimeStatsScreen.sortChapterDesc')}
            titleStyle={sortOrder === 'chapter_desc' ? styles.selectedSort : undefined}
          />
          <Menu.Item
            onPress={() => {
              setSortOrder('time_asc');
              setMenuVisible(false);
            }}
            title={getString('readingTimeStatsScreen.sortTimeAsc')}
            titleStyle={sortOrder === 'time_asc' ? styles.selectedSort : undefined}
          />
          <Menu.Item
            onPress={() => {
              setSortOrder('time_desc');
              setMenuVisible(false);
            }}
            title={getString('readingTimeStatsScreen.sortTimeDesc')}
            titleStyle={sortOrder === 'time_desc' ? styles.selectedSort : undefined}
          />
        </Menu>
      </Appbar>
      {sortedData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ color: theme.onSurfaceVariant }}>
            {getString('readingTimeStatsScreen.noChapterReadingTime')}
          </Text>
        </View>
      ) : (
        <LegendList
          data={sortedData}
          estimatedItemSize={60}
          keyExtractor={item => item.chapterId.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  chapterName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  itemContainer: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  listContent: {
    paddingBottom: 40,
  },
  menuContainer: {
    alignItems: 'flex-end',
    position: 'absolute',
    right: 16,
    top: 60,
    zIndex: 1,
  },
  selectedSort: {
    opacity: 0.5,
  },
  textContainer: {
    flex: 1,
    marginRight: 16,
  },
  timeContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  timeText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});

export default NovelReadingTimeStatsScreen;
