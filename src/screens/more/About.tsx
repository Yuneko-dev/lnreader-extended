import { List, SafeAreaView } from '@components';
import NewUpdateDialog from '@components/NewUpdateDialog';
import Config from '@env';
import {
  fetchUpdateInfo,
  GithubUpdateRelease,
} from '@hooks/common/useGithubUpdateChecker';
import { useTheme } from '@hooks/persisted';
import { AboutScreenProps } from '@navigators/types';
import { getString } from '@strings/translations';
import {
  APP_GITHUB,
  APP_WEBSITE,
  DISCORD_INVITE,
  PLUGIN_GITHUB,
} from '@utils/constants/metadata';
import { showToast } from '@utils/showToast';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { version } from '../../../package.json';
import { MoreHeader } from './components/MoreHeader';

const { GIT_HASH, RELEASE_DATE, BUILD_TYPE } = Config;

const AboutScreen = ({ navigation }: AboutScreenProps) => {
  const theme = useTheme();
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState<GithubUpdateRelease>();

  function getBuildName() {
    if (!GIT_HASH || !RELEASE_DATE || !BUILD_TYPE) {
      return `Custom build ${version}`;
    } else {
      const localDateTime = isNaN(Number(RELEASE_DATE))
        ? RELEASE_DATE
        : new Date(Number(RELEASE_DATE)).toLocaleString();
      if (BUILD_TYPE === 'Release') {
        return `${BUILD_TYPE} ${version} (${localDateTime})`;
      }
      return `${BUILD_TYPE} ${version} (${localDateTime}) Commit: ${GIT_HASH}`;
    }
  }

  const handleCheckForUpdates = async () => {
    if (checkingUpdates) {
      return;
    }
    setCheckingUpdates(true);
    try {
      const result = await fetchUpdateInfo();
      if (result.isNewVersion && result.latestRelease) {
        setAvailableUpdate(result.latestRelease);
      } else {
        showToast(getString('aboutScreen.noUpdatesAvailable'));
      }
    } catch {
      showToast(getString('aboutScreen.updateCheckFailed'));
    } finally {
      setCheckingUpdates(false);
    }
  };

  return (
    <SafeAreaView excludeTop>
      <MoreHeader
        title={getString('common.about')}
        navigation={navigation}
        theme={theme}
        goBack={true}
      />
      <ScrollView style={styles.flex}>
        <List.Section>
          <List.Item
            title={getString('aboutScreen.version')}
            description={getBuildName()}
            theme={theme}
            onPress={() => {
              Clipboard.setStringAsync(getBuildName());
            }}
          />
          <List.Item
            title={getString('aboutScreen.checkForUpdates')}
            description={
              checkingUpdates ? getString('common.loading') : undefined
            }
            onPress={handleCheckForUpdates}
            theme={theme}
          />
          <List.Item
            title={getString('aboutScreen.whatsNew')}
            onPress={() =>
              Linking.openURL(`${APP_GITHUB}/releases/tag/v${version}`)
            }
            theme={theme}
          />
          <List.Divider theme={theme} />
          <List.Item
            title={getString('aboutScreen.website')}
            description={APP_WEBSITE}
            onPress={() => Linking.openURL(APP_WEBSITE)}
            theme={theme}
          />
          <List.Item
            title={getString('aboutScreen.discord')}
            description={DISCORD_INVITE}
            onPress={() => Linking.openURL(DISCORD_INVITE)}
            theme={theme}
          />
          <List.Item
            title={getString('aboutScreen.github')}
            description={APP_GITHUB}
            onPress={() => Linking.openURL(APP_GITHUB)}
            theme={theme}
          />
          <List.Item
            title={getString('aboutScreen.plugins')}
            description={PLUGIN_GITHUB}
            onPress={() => Linking.openURL(PLUGIN_GITHUB)}
            theme={theme}
          />
          <List.Item
            title={getString('aboutScreen.helpTranslate')}
            description="https://crowdin.com/project/lnreader"
            onPress={() =>
              Linking.openURL('https://crowdin.com/project/lnreader')
            }
            theme={theme}
          />
        </List.Section>
      </ScrollView>
      {availableUpdate ? (
        <NewUpdateDialog
          newVersion={availableUpdate}
          onDismiss={() => setAvailableUpdate(undefined)}
        />
      ) : null}
    </SafeAreaView>
  );
};

export default AboutScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
