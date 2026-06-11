import {
  EmptyView,
  ErrorScreenV2,
  SafeAreaView,
  SearchbarV2,
} from '@components';
import { History } from '@database/types';
import { convertDateToISOString } from '@database/utils/convertDateToISOString';
import { useBoolean, useSearch } from '@hooks';
import { useHistory, useTheme } from '@hooks/persisted';
import { HistoryScreenProps } from '@navigators/types';
import { LOCAL_PLUGIN_ID } from '@plugins/pluginManager';
import { getString } from '@strings/translations';
import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text } from 'react-native';
import { Portal } from 'react-native-paper';

import ClearHistoryDialog from './components/ClearHistoryDialog';
import HistoryCard from './components/HistoryCard/HistoryCard';
import HistorySkeletonLoading from './components/HistorySkeletonLoading';

const HistoryScreen = ({ navigation }: HistoryScreenProps) => {
  const theme = useTheme();
  const {
    isLoading,
    history,
    clearAllHistory,
    removeChapterFromHistory,
    error,
  } = useHistory();

  const { searchText, setSearchText, clearSearchbar } = useSearch();
  const [searchResults, setSearchResults] = useState<History[]>([]);

  const onChangeText = (text: string) => {
    setSearchText(text);
    setSearchResults(
      history.filter(item =>
        item.novelName.toLowerCase().includes(text.toLowerCase()),
      ),
    );
  };

  const groupHistoryByDate = (rawHistory: History[]) => {
    const dateGroups = rawHistory.reduce<Record<string, History[]>>(
      (groups, item) => {
        if (!item.readTime) return groups;
        const date = convertDateToISOString(item.readTime);

        if (!groups[date]) {
          groups[date] = [];
        }

        groups[date].push(item);

        return groups;
      },
      {},
    );

    const groupedHistory = Object.keys(dateGroups).map(date => {
      return {
        date,
        data: dateGroups[date],
      };
    });

    return groupedHistory;
  };

  const sections = useMemo(
    () => groupHistoryByDate(searchText ? searchResults : history),
    [searchText, searchResults, history],
  );

  const {
    value: clearHistoryDialogVisible,
    setTrue: openClearHistoryDialog,
    setFalse: closeClearHistoryDialog,
  } = useBoolean();

  useEffect(
    () =>
      navigation.addListener('tabPress', e => {
        const lastNovel = history[0];
        if (navigation.isFocused() && lastNovel) {
          e.preventDefault();

          navigation.navigate('ReaderStack', {
            screen: 'Novel',
            params: {
              name: lastNovel.novelName,
              path: lastNovel.novelPath,
              cover: lastNovel.novelCover,
              pluginId: lastNovel.pluginId,
              isLocal: lastNovel.pluginId === LOCAL_PLUGIN_ID,
            },
          });
        }
      }),
    [navigation, history],
  );

  return (
    <SafeAreaView excludeBottom>
      <SearchbarV2
        searchText={searchText}
        placeholder={getString('historyScreen.searchbar')}
        leftIcon="magnify"
        onChangeText={onChangeText}
        clearSearchbar={clearSearchbar}
        rightIcons={[
          {
            iconName: 'delete-sweep-outline',
            onPress: openClearHistoryDialog,
          },
        ]}
        theme={theme}
      />
      {isLoading ? (
        <HistorySkeletonLoading theme={theme} />
      ) : error ? (
        <ErrorScreenV2 error={error} />
      ) : (
        <>
          <SectionList
            contentContainerStyle={styles.listContainer}
            sections={sections}
            keyExtractor={(item, index) => 'history' + index}
            renderSectionHeader={({ section: { date } }) => (
              <Text style={[styles.dateHeader, { color: theme.onSurface }]}>
                {dayjs(date).calendar()}
              </Text>
            )}
            renderItem={({ item }) => (
              <HistoryCard
                history={item}
                handleRemoveFromHistory={removeChapterFromHistory}
              />
            )}
            ListEmptyComponent={
              <EmptyView
                icon="(˘･_･˘)"
                description={getString('historyScreen.nothingReadRecently')}
                theme={theme}
              />
            }
          />
          <Portal>
            <ClearHistoryDialog
              visible={clearHistoryDialogVisible}
              onSubmit={clearAllHistory}
              onDismiss={closeClearHistoryDialog}
              theme={theme}
            />
          </Portal>
        </>
      )}
    </SafeAreaView>
  );
};

export default HistoryScreen;

const styles = StyleSheet.create({
  dateHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  listContainer: {
    flexGrow: 1,
  },
});
