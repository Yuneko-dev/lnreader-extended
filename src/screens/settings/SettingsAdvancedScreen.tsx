import {
  Appbar,
  KeyboardAvoidingModal,
  List,
  SafeAreaView,
  StableTextInput,
} from '@components';
import ConfirmationDialog from '@components/ConfirmationDialog/ConfirmationDialog';
import {
  clearUpdates,
  deleteAllReadingTime,
  deleteReadChaptersFromDb,
} from '@database/queries/ChapterQueries';
import { useBoolean } from '@hooks';
import {
  deleteCachedNovels,
  useAppSettings,
  useTheme,
  useUserAgent,
} from '@hooks/persisted';
import { NOVEL_UPDATE_RANDOM_KEY } from '@hooks/persisted/useUpdates';
import { AdvancedSettingsScreenProps } from '@navigators/types';
import { store } from '@plugins/helpers/storage';
import CookieManager from '@preeternal/react-native-cookie-manager';
import { useFocusEffect } from '@react-navigation/native';
import { getDohProviderName } from '@services/network/doh';
import { getNetworkMode, setNetworkMode } from '@services/network/settings';
import NativeLocalServer from '@specs/NativeLocalServer';
import NativeNetwork from '@specs/NativeNetwork';
import { getString } from '@strings/translations';
import { MMKVStorage } from '@utils/mmkv/mmkv';
import { showToast } from '@utils/showToast';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Portal, Text } from 'react-native-paper';

import DohProviderModal from './components/DohProviderModal';
import SettingSwitch from './components/SettingSwitch';
import StorageUsageSection from './components/StorageUsageSection';

const AdvancedSettings = ({ navigation }: AdvancedSettingsScreenProps) => {
  const theme = useTheme();
  const { userAgent, hasCustomUserAgent, setUserAgent } = useUserAgent();
  const appSettings = useAppSettings();
  const { verboseLogging, setAppSettings } = appSettings;
  const [userAgentInput, setUserAgentInput] = useState(userAgent);
  const [networkMode, setCurrentNetworkMode] = useState(getNetworkMode);

  useFocusEffect(
    useCallback(() => {
      setCurrentNetworkMode(getNetworkMode());
    }, []),
  );

  /**
   * Confirm Clear Database Dialog
   */
  const [clearDatabaseDialog, setClearDatabaseDialog] = useState(false);
  const showClearDatabaseDialog = () => setClearDatabaseDialog(true);
  const hideClearDatabaseDialog = () => setClearDatabaseDialog(false);

  const [clearUpdatesDialog, setClearUpdatesDialog] = useState(false);
  const showClearUpdatesDialog = () => setClearUpdatesDialog(true);
  const hideClearUpdatesDialog = () => setClearUpdatesDialog(false);

  const {
    value: deleteReadChaptersDialog,
    setTrue: showDeleteReadChaptersDialog,
    setFalse: hideDeleteReadChaptersDialog,
  } = useBoolean();

  const {
    value: clearCookiesDialog,
    setTrue: showClearCookiesDialog,
    setFalse: hideClearCookiesDialog,
  } = useBoolean();

  const {
    value: clearPluginSettingsDialog,
    setTrue: showClearPluginSettingsDialog,
    setFalse: hideClearPluginSettingsDialog,
  } = useBoolean();

  const {
    value: resetReadingTimeDialog,
    setTrue: showResetReadingTimeDialog,
    setFalse: hideResetReadingTimeDialog,
  } = useBoolean();

  const {
    value: userAgentModalVisible,
    setTrue: showUserAgentModal,
    setFalse: hideUserAgentModal,
  } = useBoolean();

  const {
    value: dohProviderModalVisible,
    setTrue: showDohProviderModal,
    setFalse: hideDohProviderModal,
  } = useBoolean();

  const openUserAgentModal = () => {
    setUserAgentInput(userAgent);
    showUserAgentModal();
  };

  const saveUserAgent = () => {
    const normalizedUserAgent = userAgentInput.trim();
    if (!NativeNetwork.isUserAgentValid(normalizedUserAgent)) {
      showToast(getString('advancedSettingsScreen.invalidUserAgent'));
      return false;
    }
    setUserAgent(normalizedUserAgent);
    showToast(
      getString('advancedSettingsScreen.userAgentRestartRequiredToast'),
    );
  };

  const resetUserAgent = () => {
    setUserAgent(undefined);
    showToast(
      getString('advancedSettingsScreen.userAgentRestartRequiredToast'),
    );
  };

  const clearWebViewData = async () => {
    try {
      await NativeNetwork.clearWebViewData();
      showToast(getString('advancedSettingsScreen.webViewDataCleared'));
    } catch {
      showToast(getString('advancedSettingsScreen.webViewDataClearFailed'));
    }
  };

  return (
    <SafeAreaView excludeTop>
      <Appbar
        title={getString('advancedSettings')}
        handleGoBack={() => navigation.goBack()}
        theme={theme}
      />
      <ScrollView>
        <StorageUsageSection />
        <List.Section>
          <List.SubHeader theme={theme}>
            {getString('advancedSettingsScreen.dataManagement')}
          </List.SubHeader>
          <List.Item
            title={getString('advancedSettingsScreen.clearCachedNovels')}
            description={getString(
              'advancedSettingsScreen.clearCachedNovelsDesc',
            )}
            onPress={showClearDatabaseDialog}
            theme={theme}
          />
          <List.Item
            title={getString('advancedSettingsScreen.clearUpdatesTab')}
            description={getString(
              'advancedSettingsScreen.clearUpdatesTabDesc',
            )}
            onPress={showClearUpdatesDialog}
            theme={theme}
          />
          <List.Item
            title={getString('advancedSettingsScreen.deleteReadChapters')}
            description={getString(
              'advancedSettingsScreen.deleteReadChaptersDesc',
            )}
            onPress={showDeleteReadChaptersDialog}
            theme={theme}
          />
          <List.Item
            title={getString('advancedSettingsScreen.clearPluginSettings')}
            description={getString(
              'advancedSettingsScreen.clearPluginSettingsDesc',
            )}
            onPress={showClearPluginSettingsDialog}
            theme={theme}
          />
          <List.Item
            title={getString('advancedSettingsScreen.resetReadingTime')}
            description={getString(
              'advancedSettingsScreen.resetReadingTimeDesc',
            )}
            onPress={showResetReadingTimeDialog}
            theme={theme}
          />
        </List.Section>
        <List.Section>
          <List.SubHeader theme={theme}>
            {getString('advancedSettingsScreen.network')}
          </List.SubHeader>
          <List.Item
            title={getString('advancedSettingsScreen.clearCookies')}
            description={getString('advancedSettingsScreen.clearCookiesDesc')}
            onPress={showClearCookiesDialog}
            theme={theme}
          />
          <List.Item
            title={getString('advancedSettingsScreen.clearWebViewData')}
            description={getString(
              'advancedSettingsScreen.clearWebViewDataDesc',
            )}
            onPress={clearWebViewData}
            theme={theme}
          />
          <List.Item
            title={getString('advancedSettingsScreen.dnsOverHttps')}
            description={
              appSettings.dohProvider === 'disabled'
                ? getString('advancedSettingsScreen.disabled')
                : getDohProviderName(appSettings.dohProvider)
            }
            onPress={showDohProviderModal}
            theme={theme}
          />
          <SettingSwitch
            label={getString('advancedSettingsScreen.bypassDpi')}
            description={getString('advancedSettingsScreen.bypassDpiDesc')}
            value={networkMode === 'dpi_bypass'}
            onPress={() => {
              const mode =
                networkMode === 'dpi_bypass' ? 'direct' : 'dpi_bypass';
              setNetworkMode(mode);
              setCurrentNetworkMode(mode);
            }}
            theme={theme}
          />
          <List.Item
            title={getString('advancedSettingsScreen.userAgent')}
            description={userAgent}
            onPress={openUserAgentModal}
            theme={theme}
          />
          <List.Item
            title={getString('advancedSettingsScreen.resetUserAgent')}
            onPress={resetUserAgent}
            disabled={!hasCustomUserAgent}
            theme={theme}
          />
        </List.Section>
        <List.Section>
          <List.SubHeader theme={theme}>
            {getString('advancedSettingsScreen.developer')}
          </List.SubHeader>
          <SettingSwitch
            label={getString('advancedSettingsScreen.verboseLogging')}
            description={getString('advancedSettingsScreen.verboseLoggingDesc')}
            value={verboseLogging}
            onPress={() => {
              setAppSettings({ verboseLogging: !verboseLogging });
              showToast(
                getString('advancedSettingsScreen.restartRequiredToast'),
              );
            }}
            theme={theme}
          />
          <SettingSwitch
            label={getString('advancedSettingsScreen.allowCloudflareBypass')}
            description={getString(
              'advancedSettingsScreen.allowCloudflareBypassDesc',
            )}
            value={appSettings.allowCloudflareBypass}
            onPress={() => {
              setAppSettings({
                allowCloudflareBypass: !appSettings.allowCloudflareBypass,
              });
              showToast(
                getString('advancedSettingsScreen.restartRequiredToast'),
              );
            }}
            theme={theme}
          />
          {appSettings.allowCloudflareBypass && (
            <SettingSwitch
              label={getString('advancedSettingsScreen.hideCloudflareOverlay')}
              description={getString(
                'advancedSettingsScreen.hideCloudflareOverlayDesc',
              )}
              value={appSettings.hideCloudflareOverlay}
              onPress={() => {
                setAppSettings({
                  hideCloudflareOverlay: !appSettings.hideCloudflareOverlay,
                });
              }}
              theme={theme}
            />
          )}
          <SettingSwitch
            label={getString('advancedSettingsScreen.allowProxyAPI')}
            description={getString('advancedSettingsScreen.allowProxyAPIDesc')}
            value={appSettings.allowProxyAPI}
            onPress={() => {
              const newValue = !appSettings.allowProxyAPI;
              setAppSettings({ allowProxyAPI: newValue });
              NativeLocalServer.setAllowProxyAPI(newValue);
            }}
            theme={theme}
          />
          <List.Item
            title={getString('debugLogScreen.title')}
            description={getString('debugLogScreen.desc')}
            onPress={() => {
              if (verboseLogging) {
                navigation.getParent()?.navigate('DebugLog');
              }
            }}
            disabled={!verboseLogging}
            theme={theme}
          />
        </List.Section>
      </ScrollView>
      <ConfirmationDialog
        message={getString(
          'advancedSettingsScreen.deleteReadChaptersDialogTitle',
        )}
        visible={deleteReadChaptersDialog}
        onSubmit={deleteReadChaptersFromDb}
        onDismiss={hideDeleteReadChaptersDialog}
        theme={theme}
      />
      <ConfirmationDialog
        message={getString('advancedSettingsScreen.clearDatabaseWarning')}
        visible={clearDatabaseDialog}
        onSubmit={deleteCachedNovels}
        onDismiss={hideClearDatabaseDialog}
        theme={theme}
      />
      <ConfirmationDialog
        message={getString('advancedSettingsScreen.clearUpdatesWarning')}
        visible={clearUpdatesDialog}
        onSubmit={async () => {
          await clearUpdates();
          MMKVStorage.set(
            NOVEL_UPDATE_RANDOM_KEY,
            Math.random().toString(36).substring(2, 15),
          );
          showToast(getString('advancedSettingsScreen.clearUpdatesMessage'));
          hideClearUpdatesDialog();
        }}
        onDismiss={hideClearUpdatesDialog}
        theme={theme}
      />
      <ConfirmationDialog
        message={getString('advancedSettingsScreen.clearCookiesWarning')}
        visible={clearCookiesDialog}
        onSubmit={async () => {
          await CookieManager.clearAll();
          showToast(getString('advancedSettingsScreen.clearCookiesCleared'));
        }}
        onDismiss={hideClearCookiesDialog}
        theme={theme}
      />
      <ConfirmationDialog
        message={getString('advancedSettingsScreen.clearPluginSettingsWarning')}
        visible={clearPluginSettingsDialog}
        onSubmit={() => {
          store.clearAll();
          showToast(
            getString('advancedSettingsScreen.clearPluginSettingsCleared'),
          );
        }}
        onDismiss={hideClearPluginSettingsDialog}
        theme={theme}
      />
      <ConfirmationDialog
        message={getString('advancedSettingsScreen.resetReadingTimeWarning')}
        visible={resetReadingTimeDialog}
        onSubmit={async () => {
          await deleteAllReadingTime();
          showToast(
            getString('advancedSettingsScreen.resetReadingTimeSuccess'),
          );
        }}
        onDismiss={hideResetReadingTimeDialog}
        theme={theme}
      />

      <KeyboardAvoidingModal
        visible={userAgentModalVisible}
        title={getString('advancedSettingsScreen.userAgent')}
        onDismiss={hideUserAgentModal}
        onConfirm={saveUserAgent}
      >
        <Text style={{ color: theme.onSurfaceVariant }}>{userAgent}</Text>
        <StableTextInput
          multiline
          mode="outlined"
          value={userAgentInput}
          onChangeText={setUserAgentInput}
          placeholderTextColor={theme.onSurfaceDisabled}
          underlineColor={theme.outline}
          style={[{ color: theme.onSurface }, styles.textInput]}
          theme={{ colors: { ...theme } }}
        />
      </KeyboardAvoidingModal>
      <Portal>
        <DohProviderModal
          currentProvider={appSettings.dohProvider}
          visible={dohProviderModalVisible}
          onDismiss={hideDohProviderModal}
          onSelect={providerId => {
            setAppSettings({ dohProvider: providerId });
            showToast(getString('advancedSettingsScreen.restartRequiredToast'));
            hideDohProviderModal();
          }}
        />
      </Portal>
    </SafeAreaView>
  );
};

export default AdvancedSettings;

const styles = StyleSheet.create({
  textInput: {
    borderRadius: 14,
    fontSize: 12,
    height: 120,
    marginBottom: 8,
    marginTop: 16,
  },
});
