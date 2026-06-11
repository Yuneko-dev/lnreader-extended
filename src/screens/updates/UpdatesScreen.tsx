import {
  EmptyView,
  ErrorScreenV2,
  SafeAreaView,
  SearchbarV2,
} from '@components';
import { useUpdateContext } from '@components/Context/UpdateContext';
import { deleteChapter } from '@database/queries/ChapterQueries';
import { UpdateOverview } from '@database/types';
import { useSearch } from '@hooks';
import { useTheme } from '@hooks/persisted';
import { UpdateScreenProps } from '@navigators/types';
import { useFocusEffect } from '@react-navigation/native';
import ServiceManager from '@services/ServiceManager';
import { getString } from '@strings/translations';
import { ThemeColors } from '@theme/types';
import { showToast } from '@utils/showToast';
import dayjs from 'dayjs';
import React, {
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { RefreshControl, SectionList, StyleSheet, Text } from 'react-native';

import UpdateNovelCard from './components/UpdateNovelCard';
import UpdatesSkeletonLoading from './components/UpdatesSkeletonLoading';

const UpdatesScreen = ({ navigation }: UpdateScreenProps) => {
  const theme = useTheme();
  const {
    updatesOverview,
    getUpdates,
    lastUpdateTime,
    showLastUpdateTime,
    error,
  } = useUpdateContext();
  const { searchText, setSearchText, clearSearchbar } = useSearch();
  const onChangeText = (text: string) => {
    setSearchText(text);
  };

  const sections = useMemo(() => {
    const lowered = searchText.toLowerCase();
    const filtered = lowered
      ? updatesOverview.filter(v => v.novelName.toLowerCase().includes(lowered))
      : updatesOverview;

    return filtered.reduce(
      (
        acc: { data: UpdateOverview[]; date: string }[],
        cur: UpdateOverview,
      ) => {
        if (acc.length === 0 || acc[acc.length - 1]?.date !== cur.updateDate) {
          acc.push({ data: [cur], date: cur.updateDate });
          return acc;
        }
        acc[acc.length - 1]?.data.push(cur);
        return acc;
      },
      [],
    );
  }, [updatesOverview, searchText]);

  useEffect(
    () =>
      navigation.addListener('tabPress', e => {
        if (navigation.isFocused()) {
          e.preventDefault();

          navigation.navigate('MoreStack', {
            screen: 'TaskQueue',
          });
        }
      }),
    [navigation],
  );

  return (
    <SafeAreaView excludeBottom>
      <SearchbarV2
        searchText={searchText}
        clearSearchbar={clearSearchbar}
        placeholder={getString('updatesScreen.searchbar')}
        onChangeText={onChangeText}
        leftIcon="magnify"
        theme={theme}
        rightIcons={[
          {
            iconName: 'reload',
            onPress: () =>
              ServiceManager.manager.addTask({ name: 'UPDATE_LIBRARY' }),
          },
        ]}
      />
      {error ? (
        <ErrorScreenV2 error={error} />
      ) : (
        <SectionList
          extraData={[updatesOverview.length]}
          ListHeaderComponent={
            showLastUpdateTime && lastUpdateTime ? (
              <LastUpdateTime lastUpdateTime={lastUpdateTime} theme={theme} />
            ) : null
          }
          contentContainerStyle={styles.listContainer}
          renderSectionHeader={({ section: { date } }) => (
            <Text style={[styles.dateHeader, { color: theme.onSurface }]}>
              {dayjs(date).calendar()}
            </Text>
          )}
          sections={sections}
          keyExtractor={item => 'updatedGroup' + item.novelId}
          renderItem={({ item }) => (
            <Suspense fallback={<UpdatesSkeletonLoading theme={theme} />}>
              <UpdateNovelCard
                deleteChapter={chapter => {
                  deleteChapter(
                    chapter.pluginId,
                    chapter.novelId,
                    chapter.id,
                  ).then(() => {
                    showToast(
                      getString('common.deleted', {
                        name: chapter.name,
                      }),
                    );
                    getUpdates();
                  });
                }}
                chapterListInfo={item}
                descriptionText={getString('updatesScreen.updatesLower')}
              />
            </Suspense>
          )}
          ListEmptyComponent={
            <EmptyView
              icon="(˘･_･˘)"
              description={getString('updatesScreen.emptyView')}
              theme={theme}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() =>
                ServiceManager.manager.addTask({ name: 'UPDATE_LIBRARY' })
              }
              colors={[theme.onPrimary]}
              progressBackgroundColor={theme.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

export default memo(UpdatesScreen);

const LastUpdateTime: React.FC<{
  lastUpdateTime: Date | number | string;
  theme: ThemeColors;
}> = ({ lastUpdateTime, theme }) => {
  const [, forceUpdate] = useState(0);

  useFocusEffect(
    useCallback(() => {
      forceUpdate(n => n + 1);
    }, []),
  );

  return (
    <Text style={[styles.lastUpdateTime, { color: theme.onSurface }]}>
      {`${getString('updatesScreen.lastUpdatedAt')} ${dayjs(
        lastUpdateTime,
      ).fromNow()}`}
    </Text>
  );
};

const styles = StyleSheet.create({
  dateHeader: {
    paddingBottom: 2,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  lastUpdateTime: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  listContainer: {
    flexGrow: 1,
  },
});
