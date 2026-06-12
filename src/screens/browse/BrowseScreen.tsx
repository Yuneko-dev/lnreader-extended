import { EmptyView, SafeAreaView, SearchbarV2 } from '@components';
import { useSearch } from '@hooks';
import { usePlugins, useTheme } from '@hooks/persisted';
import { DISABLED_REPOSITORIES } from '@hooks/persisted/useDisabledRepositories';
import { BrowseScreenProps } from '@navigators/types';
import { useFocusEffect } from '@react-navigation/native';
import { getString } from '@strings/translations';
import { getMMKVObject } from '@utils/mmkv/mmkv';
import { showToast } from '@utils/showToast';
import Color from 'color';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { TabBar, TabView } from 'react-native-tab-view';

import { AvailableTab } from './components/AvailableTab';
import { InstalledTab } from './components/InstalledTab';

const routes = [
  { key: 'installedRoute', title: getString('browseScreen.installed') },
  { key: 'availableRoute', title: getString('browseScreen.available') },
];

const BrowseScreen = ({ navigation }: BrowseScreenProps) => {
  const theme = useTheme();
  const { searchText, setSearchText, clearSearchbar } = useSearch();
  const { languagesFilter } = usePlugins();
  const layout = useWindowDimensions();

  const prevDisabledReposRef = React.useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const currentDisabledRepos =
        getMMKVObject<number[]>(DISABLED_REPOSITORIES) || [];
      const currentHash = currentDisabledRepos.join(',');

      if (
        prevDisabledReposRef.current !== null &&
        prevDisabledReposRef.current !== currentHash
      ) {
        showToast(getString('browseScreen.repositoryChanged'));
      }

      prevDisabledReposRef.current = currentHash;
    }, []),
  );

  const searchbarActions = useMemo(
    () =>
      [
        {
          iconName: 'book-search',
          onPress: () => navigation.navigate('GlobalSearchScreen', {}),
        },
        {
          iconName: 'swap-vertical-variant',
          onPress: () => navigation.navigate('Migration'),
        },
        {
          iconName: 'cog-outline',
          onPress: () => navigation.navigate('BrowseSettings'),
        },
      ] as const,
    [navigation],
  );

  useEffect(
    () =>
      navigation.addListener('tabPress', e => {
        if (navigation.isFocused()) {
          e.preventDefault();

          navigation.navigate('GlobalSearchScreen', {});
        }
      }),
    [navigation],
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
      borderBottomColor: Color(theme.isDark ? '#FFFFFF' : '#000000')
        .alpha(0.12)
        .string(),
    }),
    [theme.surface, theme.isDark],
  );

  const renderScene = useCallback(
    ({ route }: { route: { key: string } }) => {
      if (languagesFilter.length === 0) {
        return (
          <EmptyView
            icon="(･Д･。"
            description={getString('browseScreen.listEmpty')}
            theme={theme}
          />
        );
      }
      switch (route.key) {
        case 'availableRoute':
          return <AvailableTab theme={theme} searchText={searchText} />;
        default:
          return (
            <InstalledTab
              navigation={navigation}
              theme={theme}
              searchText={searchText}
            />
          );
      }
    },
    [languagesFilter.length, theme, searchText, navigation],
  );

  const renderTabBar = useCallback(
    (props: any) => (
      <TabBar
        {...props}
        indicatorStyle={indicatorStyle}
        style={tabBarStyle}
        inactiveColor={theme.secondary}
        activeColor={theme.primary}
        android_ripple={{ color: theme.rippleColor }}
      />
    ),
    [
      indicatorStyle,
      tabBarStyle,
      theme.secondary,
      theme.primary,
      theme.rippleColor,
    ],
  );

  const [index, setIndex] = React.useState(0);
  return (
    <SafeAreaView excludeBottom>
      <SearchbarV2
        searchText={searchText}
        placeholder={getString('browseScreen.searchbar')}
        leftIcon="magnify"
        onChangeText={setSearchText}
        clearSearchbar={clearSearchbar}
        theme={theme}
        rightIcons={searchbarActions}
      />
      <TabView
        navigationState={{ index, routes }}
        initialLayout={{ width: layout.width }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        renderTabBar={renderTabBar}
        swipeEnabled={false}
      />
    </SafeAreaView>
  );
};

export default React.memo(BrowseScreen);
