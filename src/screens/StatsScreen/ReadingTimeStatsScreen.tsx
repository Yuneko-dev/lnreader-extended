import {
  Appbar,
  ErrorScreenV2,
  LoadingScreenV2,
  Menu,
  SafeAreaView,
} from '@components';
import { getNovelReadingTimeStatsFromDb } from '@database/queries/StatsQueries';
import { NovelReadingTimeStat } from '@database/types';
import { useTheme } from '@hooks/persisted';
import { LegendList } from '@legendapp/list';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getString } from '@strings/translations';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Appbar as PaperAppbar } from 'react-native-paper';

import { MoreStackParamList } from '../../navigators/types';
import { formatReadingTime } from './utils';

type Props = NativeStackScreenProps<MoreStackParamList, 'ReadingTimeStats'>;


const ReadingTimeStatsScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<NovelReadingTimeStat[]>([]);
  const [error, setError] = useState<string | Error | null>(null);
  const [sortOrder, setSortOrder] = useState<
    'name_asc' | 'name_desc' | 'time_asc' | 'time_desc'
  >('time_desc');
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const stats = await getNovelReadingTimeStatsFromDb();
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
  }, []);

  const sortedData = React.useMemo(() => {
    return [...data].sort((a, b) => {
      if (sortOrder === 'name_asc') {
        return a.novelName.localeCompare(b.novelName);
      }
      if (sortOrder === 'name_desc') {
        return b.novelName.localeCompare(a.novelName);
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
          title={getString('readingTimeStatsScreen.title')}
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
          title={getString('readingTimeStatsScreen.title')}
          handleGoBack={navigation.goBack}
          theme={theme}
        />
        <LoadingScreenV2 theme={theme} />
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: NovelReadingTimeStat }) => (
    <Pressable
      style={[
        styles.itemContainer,
        { borderBottomColor: theme.outlineVariant },
      ]}
      android_ripple={{ color: theme.rippleColor }}
      onPress={() =>
        navigation.navigate('NovelReadingTimeStats', {
          novelId: item.novelId,
          novelName: item.novelName,
        })
      }
    >
      {item.coverUrl ? (
        <Image source={{ uri: item.coverUrl }} style={styles.cover} />
      ) : (
        <View
          style={[styles.cover, { backgroundColor: theme.surfaceVariant }]}
        />
      )}
      <View style={styles.textContainer}>
        <Text
          style={[styles.novelName, { color: theme.onSurface }]}
          numberOfLines={2}
        >
          {item.novelName}
        </Text>
        <View style={styles.timeContainer}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={14}
            color={theme.onSurfaceVariant}
          />
          <Text style={[styles.timeText, { color: theme.onSurfaceVariant }]}>
            {getString('readingTimeStatsScreen.totalTime', {
              time: formatReadingTime(item.readDuration),
            })}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView excludeTop>
      <Appbar
        title={getString('readingTimeStatsScreen.title')}
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
              setSortOrder('name_asc');
              setMenuVisible(false);
            }}
            title={getString('readingTimeStatsScreen.sortNameAsc')}
            titleStyle={sortOrder === 'name_asc' ? styles.selectedSort : undefined}
          />
          <Menu.Item
            onPress={() => {
              setSortOrder('name_desc');
              setMenuVisible(false);
            }}
            title={getString('readingTimeStatsScreen.sortNameDesc')}
            titleStyle={sortOrder === 'name_desc' ? styles.selectedSort : undefined}
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
            {getString('readingTimeStatsScreen.emptyView')}
          </Text>
        </View>
      ) : (
        <LegendList
          data={sortedData}
          estimatedItemSize={80}
          keyExtractor={item => item.novelId.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  cover: {
    borderRadius: 4,
    height: 60,
    width: 40,
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
    paddingVertical: 12,
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
  novelName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  textContainer: {
    flex: 1,
    marginLeft: 16,
  },
  timeContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 4,
  },
  timeText: {
    fontSize: 14,
    marginLeft: 4,
  },
});

export default ReadingTimeStatsScreen;
