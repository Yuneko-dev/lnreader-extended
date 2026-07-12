import { useLibraryContext } from '@components/Context/LibraryContext';
import { ErrorScreenV2, SafeAreaView, SearchbarV2 } from '@components/index';
import NovelCover from '@components/NovelCover';
import NovelList from '@components/NovelList';
import SearchHistoryList from '@components/SearchHistoryList/SearchHistoryList';
import { NovelInfo } from '@database/types';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useSearch } from '@hooks';
import { useSearchHistory, useTheme } from '@hooks/persisted';
import usePlugins from '@hooks/persisted/usePlugins';
import { discordRPC } from '@modules/discord/DiscordRPC';
import { BrowseSourceScreenProps } from '@navigators/types';
import { getPlugin } from '@plugins/pluginManager';
import { NovelItem } from '@plugins/types';
import { useFocusEffect } from '@react-navigation/native';
import SourceScreenSkeletonLoading from '@screens/browse/loadingAnimation/SourceScreenSkeletonLoading';
import { getString } from '@strings/translations';
import { ThemeColors } from '@theme/types';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { FAB } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBar, TabView } from 'react-native-tab-view';

import FilterBottomSheet from './components/FilterBottomSheet';
import { useBrowseSource, useSearchSource } from './useBrowseSource';

interface SourceRoute {
  key: 'popular' | 'latest';
  title: string;
}

const routes: SourceRoute[] = [
  {
    key: 'popular',
    title: getString('browseScreen.popular'),
  },
  {
    key: 'latest',
    title: getString('browseScreen.latest'),
  },
];

interface SourceNovelsTabProps {
  pluginId: string;
  showLatestNovels: boolean;
  theme: ThemeColors;
  searchText: string;
  isSearchFocused: boolean;
  onHistorySearch: (keyword: string) => void;
  isSearching: boolean;
  searchResults: NovelItem[];
  hasNextSearchPage: boolean;
  searchNextPage: () => void;
  searchSource: (searchTerm: string) => void;
  searchError?: string;
  navigateToNovel: (item: NovelItem | NovelInfo) => void;
}

const SourceNovelsTab = ({
  pluginId,
  showLatestNovels,
  theme,
  searchText,
  isSearchFocused,
  onHistorySearch,
  isSearching,
  searchResults,
  hasNextSearchPage,
  searchNextPage,
  searchSource,
  searchError,
  navigateToNovel,
}: SourceNovelsTabProps) => {
  const imageRequestInit = useMemo(
    () => getPlugin(pluginId)?.imageRequestInit,
    [pluginId],
  );
  const {
    isLoading,
    novels,
    hasNextPage,
    fetchNextPage,
    error,
    filterValues,
    setFilters,
    clearFilters,
    refetchNovels,
  } = useBrowseSource(pluginId, showLatestNovels, Boolean(searchText));
  const { novelInLibrary, switchNovelToLibrary } = useLibraryContext();
  const [inActivity, setInActivity] = useState<Record<string, boolean>>({});
  const { bottom, right } = useSafeAreaInsets();
  const filterSheetRef = useRef<BottomSheetModal | null>(null);

  const novelList = searchResults.length > 0 ? searchResults : novels;
  const errorMessage = error || searchError;

  const renderItem = useCallback(
    ({ item }: { item: NovelItem | NovelInfo }) => {
      const inLibrary = novelInLibrary(pluginId, item.path);

      return (
        <NovelCover
          item={item}
          theme={theme}
          libraryStatus={inLibrary}
          inActivity={inActivity[item.path]}
          onPress={() => navigateToNovel(item)}
          isSelected={false}
          addSkeletonLoading={
            (hasNextPage && !searchText) ||
            (hasNextSearchPage && Boolean(searchText))
          }
          onLongPress={async () => {
            setInActivity(prev => ({ ...prev, [item.path]: true }));
            await switchNovelToLibrary(item.path, pluginId);
            setInActivity(prev => ({ ...prev, [item.path]: false }));
          }}
          hasSelection={false}
          imageRequestInit={imageRequestInit}
        />
      );
    },
    [
      novelInLibrary,
      pluginId,
      theme,
      inActivity,
      navigateToNovel,
      hasNextPage,
      searchText,
      hasNextSearchPage,
      switchNovelToLibrary,
      imageRequestInit,
    ],
  );

  const onEndReached = useCallback(() => {
    if (searchText) {
      if (hasNextSearchPage) {
        searchNextPage();
      }
      return;
    }
    if (hasNextPage) {
      fetchNextPage();
    }
  }, [
    searchText,
    hasNextSearchPage,
    searchNextPage,
    hasNextPage,
    fetchNextPage,
  ]);

  const retryActions = useMemo(
    () => [
      {
        iconName: 'refresh' as const,
        title: getString('common.retry'),
        onPress: () =>
          searchText ? searchSource(searchText) : refetchNovels(),
      },
    ],
    [searchText, searchSource, refetchNovels],
  );

  const fabStyle = useMemo(
    () => [
      styles.filterFab,
      {
        backgroundColor: theme.primary,
        marginBottom: bottom + 16,
        marginEnd: right + 16,
      },
    ],
    [theme.primary, bottom, right],
  );

  const openFilterSheet = useCallback(
    () => filterSheetRef.current?.present(),
    [],
  );

  return (
    <>
      {isSearchFocused && !searchText ? (
        <SearchHistoryList theme={theme} onSearch={onHistorySearch} />
      ) : isLoading || isSearching ? (
        <SourceScreenSkeletonLoading theme={theme} />
      ) : errorMessage || novelList.length === 0 ? (
        <ErrorScreenV2
          error={errorMessage || getString('sourceScreen.noResultsFound')}
          actions={retryActions}
        />
      ) : (
        <NovelList
          data={novelList}
          inSource
          renderItem={renderItem}
          onEndReached={onEndReached}
          onEndReachedThreshold={1.5}
        />
      )}
      {!showLatestNovels && filterValues && !searchText ? (
        <>
          <FAB
            icon="filter-variant"
            style={fabStyle}
            label={getString('common.filter')}
            uppercase={false}
            color={theme.onPrimary}
            onPress={openFilterSheet}
          />
          <FilterBottomSheet
            filterSheetRef={filterSheetRef}
            filters={filterValues}
            setFilters={setFilters}
            clearFilters={clearFilters}
          />
        </>
      ) : null}
    </>
  );
};

const BrowseSourceScreen = ({ route, navigation }: BrowseSourceScreenProps) => {
  const theme = useTheme();
  const {
    pluginId,
    pluginName,
    site,
    searchText: initialSearchText,
  } = route.params;
  const layout = useWindowDimensions();
  const {
    isSearching,
    searchResults,
    hasNextSearchPage,
    searchNextPage,
    searchSource,
    clearSearchResults,
    searchError,
  } = useSearchSource(pluginId, initialSearchText);
  const { searchText, setSearchText, clearSearchbar } = useSearch(
    initialSearchText,
    false,
  );
  const { addSearchKey } = useSearchHistory();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [index, setIndex] = useState(0);

  const onChangeText = useCallback(
    (text: string) => setSearchText(text),
    [setSearchText],
  );
  const onSubmitEditing = useCallback(() => {
    addSearchKey(searchText);
    searchSource(searchText);
  }, [searchSource, searchText, addSearchKey]);
  const handleHistorySearch = useCallback(
    (keyword: string) => {
      setSearchText(keyword);
      searchSource(keyword);
    },
    [setSearchText, searchSource],
  );
  const handleClearSearchbar = useCallback(() => {
    clearSearchbar();
    clearSearchResults();
  }, [clearSearchbar, clearSearchResults]);
  const handleOpenWebView = useCallback(() => {
    navigation.navigate('WebviewScreen', {
      name: pluginName,
      url: site,
      pluginId,
    });
  }, [navigation, pluginName, site, pluginId]);
  const navigateToNovel = useCallback(
    (item: NovelItem | NovelInfo) =>
      navigation.navigate('ReaderStack', {
        screen: 'Novel',
        params: {
          ...item,
          pluginId,
        },
      }),
    [navigation, pluginId],
  );

  const { filteredInstalledPlugins } = usePlugins();
  const pluginIcon = useMemo(
    () => filteredInstalledPlugins.find(p => p.id === pluginId)?.iconUrl,
    [filteredInstalledPlugins, pluginId],
  );
  useFocusEffect(
    useCallback(() => {
      discordRPC.setBrowsingSource(
        pluginName,
        getString('discord.browseSource'),
        site,
        pluginIcon,
        pluginId,
      );
    }, [pluginId, pluginName, site, pluginIcon]),
  );

  const rightIcons = useMemo(
    () => [{ iconName: 'earth' as const, onPress: handleOpenWebView }],
    [handleOpenWebView],
  );
  const indicatorStyle = useMemo(
    () => ({ backgroundColor: theme.primary, height: 3 }),
    [theme.primary],
  );
  const tabBarStyle = useMemo(
    () => ({
      backgroundColor: theme.surface,
      elevation: 0,
      borderBottomWidth: 1,
      borderBottomColor: theme.outlineVariant,
    }),
    [theme.surface, theme.outlineVariant],
  );
  const renderScene = useCallback(
    ({ route: sourceRoute }: { route: SourceRoute }) => (
      <SourceNovelsTab
        pluginId={pluginId}
        showLatestNovels={sourceRoute.key === 'latest'}
        theme={theme}
        searchText={searchText}
        isSearchFocused={isSearchFocused}
        onHistorySearch={handleHistorySearch}
        isSearching={isSearching}
        searchResults={searchResults}
        hasNextSearchPage={hasNextSearchPage}
        searchNextPage={searchNextPage}
        searchSource={searchSource}
        searchError={searchError}
        navigateToNovel={navigateToNovel}
      />
    ),
    [
      pluginId,
      theme,
      searchText,
      isSearchFocused,
      handleHistorySearch,
      isSearching,
      searchResults,
      hasNextSearchPage,
      searchNextPage,
      searchSource,
      searchError,
      navigateToNovel,
    ],
  );
  const renderTabBar = useCallback(
    (props: any) =>
      isSearchFocused || searchText ? null : (
        <TabBar
          {...props}
          indicatorStyle={indicatorStyle}
          style={tabBarStyle}
          inactiveColor={theme.onSurfaceVariant}
          activeColor={theme.primary}
          android_ripple={{ color: theme.rippleColor }}
        />
      ),
    [
      isSearchFocused,
      searchText,
      indicatorStyle,
      tabBarStyle,
      theme.onSurfaceVariant,
      theme.primary,
      theme.rippleColor,
    ],
  );

  return (
    <SafeAreaView>
      <SearchbarV2
        searchText={searchText}
        leftIcon="magnify"
        placeholder={`${getString('common.search')} ${pluginName}`}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setIsSearchFocused(true)}
        onBlur={() => setIsSearchFocused(false)}
        clearSearchbar={handleClearSearchbar}
        handleBackAction={navigation.goBack}
        rightIcons={rightIcons}
        theme={theme}
      />
      <TabView
        navigationState={{ index, routes }}
        initialLayout={{ width: layout.width }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        renderTabBar={renderTabBar}
        lazy
      />
    </SafeAreaView>
  );
};

export default React.memo(BrowseSourceScreen);

const styles = StyleSheet.create({
  filterFab: {
    bottom: 0,
    margin: 16,
    position: 'absolute',
    end: 0,
  },
});
