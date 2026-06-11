import { BottomTabBar } from '@components';
import { useAppSettings, usePlugins, useTheme } from '@hooks/persisted';
import { discordRPC } from '@modules/discord/DiscordRPC';
import Icon from '@react-native-vector-icons/material-design-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { getString } from '@strings/translations';
import { MaterialDesignIconName } from '@type/icon';
import React, { useCallback, useMemo } from 'react';

import Browse from '../screens/browse/BrowseScreen';
import History from '../screens/history/HistoryScreen';
import Library from '../screens/library/LibraryScreen';
import More from '../screens/more/MoreScreen';
import Updates from '../screens/updates/UpdatesScreen';
import { BottomNavigatorParamList } from './types';

const Tab = createBottomTabNavigator<BottomNavigatorParamList>();
const TAB_ICON_SIZE = 24;
const TAB_ICON_STYLE = {
  includeFontPadding: false,
  textAlign: 'center' as const,
  width: TAB_ICON_SIZE,
};

const BottomNavigator = () => {
  const theme = useTheme();

  const {
    showHistoryTab = true,
    showUpdatesTab = true,
    showLabelsInNav = false,
  } = useAppSettings();

  const { filteredInstalledPlugins } = usePlugins();
  const pluginsWithUpdate = useMemo(
    () => filteredInstalledPlugins.filter(p => p.hasUpdate).length,
    [filteredInstalledPlugins],
  );

  useFocusEffect(
    useCallback(() => {
      discordRPC.setAppOpen(getString('discord.openApp'));
    }, []),
  );

  const renderIcon = useCallback(
    ({ color, route }: { route: { name: string }; color: string }) => {
      let iconName: MaterialDesignIconName;
      switch (route.name) {
        case 'Library':
          iconName = 'bookmark-box-multiple';
          break;
        case 'Updates':
          iconName = 'alert-decagram-outline';
          break;
        case 'History':
          iconName = 'history';
          break;
        case 'Browse':
          iconName = 'compass-outline';
          break;
        case 'More':
          iconName = 'dots-horizontal';
          break;
        default:
          iconName = 'circle';
      }

      return (
        <Icon
          allowFontScaling={false}
          color={color}
          name={iconName}
          size={TAB_ICON_SIZE}
          style={TAB_ICON_STYLE}
        />
      );
    },
    [],
  );

  const renderTabBar = useCallback(
    (props: any) => (
      <BottomTabBar
        {...props}
        theme={theme}
        showLabelsInNav={showLabelsInNav}
        renderIcon={renderIcon}
      />
    ),
    [theme, showLabelsInNav, renderIcon],
  );

  const tabBarBadgeStyle = useMemo(
    () => ({
      backgroundColor: theme.error,
      color: theme.onError,
    }),
    [theme.error, theme.onError],
  );
  const screenOptions = useMemo(
    () => ({
      headerShown: false as const,
      animation: 'shift' as const,
      lazy: true,
      freezeOnBlur: true,
      tabBarBadgeStyle,
    }),
    [tabBarBadgeStyle],
  );

  return (
    <Tab.Navigator screenOptions={screenOptions} tabBar={renderTabBar}>
      <Tab.Screen
        name="Library"
        component={Library}
        options={{
          title: getString('library'),
        }}
      />
      {showUpdatesTab ? (
        <Tab.Screen
          name="Updates"
          component={Updates}
          options={{
            title: getString('updates'),
          }}
        />
      ) : null}
      {showHistoryTab ? (
        <Tab.Screen
          name="History"
          component={History}
          options={{
            title: getString('history'),
          }}
        />
      ) : null}
      <Tab.Screen
        name="Browse"
        component={Browse}
        options={{
          title: getString('browse'),
          tabBarBadge: pluginsWithUpdate
            ? pluginsWithUpdate.toString()
            : undefined,
        }}
      />
      <Tab.Screen
        name="More"
        component={More}
        options={{
          title: getString('more'),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomNavigator;
