import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CategoriesScreen from '@screens/Categories/CategoriesScreen';
import DebugLogScreen from '@screens/more/DebugLogScreen';
import SettingsAIScreen from '@screens/settings/SettingsAIScreen';
import TranslatePromptScreen from '@screens/settings/SettingsAIScreen/TranslatePromptScreen';
import DiscordSettings from '@screens/settings/SettingsDiscordScreen';
import RespositorySettings from '@screens/settings/SettingsRepositoryScreen/SettingsRepositoryScreen';
import SecuritySettings from '@screens/settings/SettingsSecurityScreen';
import TranslateSettings from '@screens/settings/SettingsTranslateScreen/SettingsTranslateScreen';
import NovelReadingTimeStatsScreen from '@screens/StatsScreen/NovelReadingTimeStatsScreen';
import ReadingTimeStatsScreen from '@screens/StatsScreen/ReadingTimeStatsScreen';
// import LibrarySettings from '@screens/settings/SettingsLibraryScreen/SettingsLibraryScreen';
import StatsScreen from '@screens/StatsScreen/StatsScreen';
import React from 'react';

// Screens
import About from '../screens/more/About';
import Downloads from '../screens/more/DownloadsScreen';
import TaskQueue from '../screens/more/TaskQueueScreen';
import AdvancedSettings from '../screens/settings/SettingsAdvancedScreen';
import AppearanceSettings from '../screens/settings/SettingsAppearanceScreen/SettingsAppearanceScreen';
import BackupSettings from '../screens/settings/SettingsBackupScreen';
import GeneralSettings from '../screens/settings/SettingsGeneralScreen/SettingsGeneralScreen';
import ReaderSettings from '../screens/settings/SettingsReaderScreen/SettingsReaderScreen';
import Settings from '../screens/settings/SettingsScreen';
import TrackerSettings from '../screens/settings/SettingsTrackerScreen';
import { MoreStackParamList, SettingsStackParamList } from './types';

const Stack = createNativeStackNavigator<
  MoreStackParamList & SettingsStackParamList
>();

const stackNavigatorConfig = { headerShown: false };

const SettingsStack = () => (
  <Stack.Navigator screenOptions={stackNavigatorConfig}>
    <Stack.Screen name="Settings" component={Settings} />
    <Stack.Screen name="GeneralSettings" component={GeneralSettings} />
    <Stack.Screen name="ReaderSettings" component={ReaderSettings} />
    <Stack.Screen name="TranslateSettings" component={TranslateSettings} />
    <Stack.Screen name="TrackerSettings" component={TrackerSettings} />
    <Stack.Screen name="BackupSettings" component={BackupSettings} />
    <Stack.Screen name="AppearanceSettings" component={AppearanceSettings} />
    <Stack.Screen name="AdvancedSettings" component={AdvancedSettings} />
    <Stack.Screen name="RespositorySettings" component={RespositorySettings} />
    <Stack.Screen name="SecuritySettings" component={SecuritySettings} />
    <Stack.Screen name="DiscordSettings" component={DiscordSettings} />
    <Stack.Screen name="AISettings" component={SettingsAIScreen} />
    <Stack.Screen name="AIPromptsSettings" component={TranslatePromptScreen} />
    {/* <Stack.Screen name="LibrarySettings" component={LibrarySettings} /> */}
  </Stack.Navigator>
);

const MoreStack = () => (
  <Stack.Navigator screenOptions={stackNavigatorConfig}>
    <Stack.Screen name="SettingsStack" component={SettingsStack} />
    <Stack.Screen name="About" component={About} />
    <Stack.Screen name="TaskQueue" component={TaskQueue} />
    <Stack.Screen name="Downloads" component={Downloads} />
    <Stack.Screen name="Categories" component={CategoriesScreen} />
    <Stack.Screen name="Statistics" component={StatsScreen} />
    <Stack.Screen name="ReadingTimeStats" component={ReadingTimeStatsScreen} />
    <Stack.Screen
      name="NovelReadingTimeStats"
      component={NovelReadingTimeStatsScreen}
    />
    <Stack.Screen name="DebugLog" component={DebugLogScreen} />
  </Stack.Navigator>
);

export default MoreStack;
