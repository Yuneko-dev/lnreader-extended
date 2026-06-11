import { LibraryContextProvider } from '@components/Context/LibraryContext';
import { UpdateContextProvider } from '@components/Context/UpdateContext';
import { useGithubUpdateChecker } from '@hooks/common/useGithubUpdateChecker';
import { useAppSettings, usePlugins, useTheme } from '@hooks/persisted';
import { discordRPC } from '@modules/discord/DiscordRPC';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingScreen from '@screens/onboarding/OnboardingScreen';
import WebviewScreen from '@screens/WebviewScreen/WebviewScreen';
import ServiceManager from '@services/ServiceManager';
import { getString } from '@strings/translations';
import {
  changeNavigationBarColor,
  setStatusBarColor,
} from '@theme/utils/setBarColor';
import Color from 'color';
import * as NavigationBar from 'expo-navigation-bar';
import React, { useEffect } from 'react';
import { useMMKVBoolean } from 'react-native-mmkv';

import NewUpdateDialog from '../components/NewUpdateDialog';
import AniListTopNovels from '../screens/browse/discover/AniListTopNovels';
import MalTopNovels from '../screens/browse/discover/MalTopNovels';
import Migration from '../screens/browse/migration/Migration';
import MigrateNovel from '../screens/browse/migration/MigrationNovels';
import BrowseSettings from '../screens/browse/settings/BrowseSettings';
import SourceNovels from '../screens/browse/SourceNovels';
/**
 * Screens
 */
import BrowseSourceScreen from '../screens/BrowseSourceScreen/BrowseSourceScreen';
import GlobalSearchScreen from '../screens/GlobalSearchScreen/GlobalSearchScreen';
/**
 * Navigators
 */
import BottomNavigator from './BottomNavigator';
import MoreStack from './MoreStack';
import ReaderStack from './ReaderStack';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const MainNavigator = () => {
  const theme = useTheme();
  const { updateLibraryOnLaunch } = useAppSettings();
  const { refreshPlugins } = usePlugins();
  const [isOnboarded] = useMMKVBoolean('IS_ONBOARDED');

  useEffect(() => {
    const timer = setTimeout(() => {
      NavigationBar.setPositionAsync('relative').catch(() => undefined);
      setStatusBarColor(theme);
      changeNavigationBarColor(Color(theme.surface2).hex(), theme.isDark);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [theme]);

  useEffect(() => {
    if (updateLibraryOnLaunch) {
      ServiceManager.manager.addTask({ name: 'UPDATE_LIBRARY' });
    }
    if (isOnboarded) {
      // hack this helps app has enough time to initialize database;
      refreshPlugins();
      discordRPC.connect().then(() => {
        discordRPC.setAppOpen(getString('discord.openApp'));
      });
    }
  }, [isOnboarded, refreshPlugins, updateLibraryOnLaunch]);

  const { isNewVersion, latestRelease } = useGithubUpdateChecker();

  if (!isOnboarded) {
    return <OnboardingScreen />;
  }

  return (
    <NavigationContainer<RootStackParamList>
      theme={{
        colors: {
          ...DefaultTheme.colors,
          primary: theme.primary,
          background: theme.background,
          card: theme.surface,
          text: theme.onSurface,
          border: theme.outline,
        },
        dark: theme.isDark,
        fonts: DefaultTheme.fonts,
      }}
      linking={{
        prefixes: ['lnreader://'],
        config: {
          screens: {
            MoreStack: {
              screens: {
                SettingsStack: {
                  screens: {
                    RespositorySettings: '/repo/add',
                  },
                },
              },
            },
          },
        },
      }}
    >
      <LibraryContextProvider>
        <UpdateContextProvider>
          {isNewVersion && latestRelease && (
            <NewUpdateDialog newVersion={latestRelease} />
          )}
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="BottomNavigator" component={BottomNavigator} />
            <Stack.Screen name="ReaderStack" component={ReaderStack} />
            <Stack.Screen name="MoreStack" component={MoreStack} />
            <Stack.Screen name="SourceScreen" component={BrowseSourceScreen} />
            <Stack.Screen name="BrowseMal" component={MalTopNovels} />
            <Stack.Screen name="BrowseAL" component={AniListTopNovels} />
            <Stack.Screen name="BrowseSettings" component={BrowseSettings} />
            <Stack.Screen
              name="GlobalSearchScreen"
              component={GlobalSearchScreen}
            />
            <Stack.Screen name="Migration" component={Migration} />
            <Stack.Screen name="SourceNovels" component={SourceNovels} />
            <Stack.Screen name="MigrateNovel" component={MigrateNovel} />
            <Stack.Screen name="WebviewScreen" component={WebviewScreen} />
          </Stack.Navigator>
        </UpdateContextProvider>
      </LibraryContextProvider>
    </NavigationContainer>
  );
};

export default MainNavigator;
