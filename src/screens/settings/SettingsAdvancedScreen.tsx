import { Appbar, Button, List, Modal, SafeAreaView } from '@components';
import ConfirmationDialog from '@components/ConfirmationDialog/ConfirmationDialog';
import {
  clearUpdates,
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
import NativeLocalServer from '@specs/NativeLocalServer';
import { getString } from '@strings/translations';
import { MMKVStorage } from '@utils/mmkv/mmkv';
import { showToast } from '@utils/showToast';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { getUserAgentSync } from 'react-native-device-info';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Portal, Text, TextInput } from 'react-native-paper';

import SettingSwitch from './components/SettingSwitch';
import StorageUsageSection from './components/StorageUsageSection';

const AdvancedSettings = ({ navigation }: AdvancedSettingsScreenProps) => {
  const theme = useTheme();
  const clearCookies = () => {
    CookieManager.clearAll();
    showToast(getString('webview.cookiesCleared'));
  };

  const clearStorage = () => {
    store.clearAll();
    showToast(getString('webview.storageCleared'));
  };

  const { userAgent, setUserAgent } = useUserAgent();
  const appSettings = useAppSettings();
  const { verboseLogging, setAppSettings } = appSettings;
  const [userAgentInput, setUserAgentInput] = useState(userAgent);
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
    value: userAgentModalVisible,
    setTrue: showUserAgentModal,
    setFalse: hideUserAgentModal,
  } = useBoolean();

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
              'advancedSettingsScreen.clearupdatesTabDesc',
            )}
            onPress={showClearUpdatesDialog}
            theme={theme}
          />
          <List.Item
            title={getString('advancedSettingsScreen.deleteReadChapters')}
            onPress={showDeleteReadChaptersDialog}
            theme={theme}
          />
          <List.Item
            title={getString('webview.clearCookies')}
            onPress={clearCookies}
            theme={theme}
          />
          <List.Item
            title={getString('webview.clearStorage')}
            onPress={clearStorage}
            theme={theme}
          />
          <List.Item
            title={getString('advancedSettingsScreen.userAgent')}
            description={userAgent}
            onPress={showUserAgentModal}
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
      <Portal>
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

        <Modal visible={userAgentModalVisible} onDismiss={hideUserAgentModal}>
          <KeyboardAwareScrollView>
            <Text style={[styles.modalTitle, { color: theme.onSurface }]}>
              {getString('advancedSettingsScreen.userAgent')}
            </Text>
            <Text style={{ color: theme.onSurfaceVariant }}>{userAgent}</Text>
            <TextInput
              multiline
              mode="outlined"
              defaultValue={userAgent}
              onChangeText={text => setUserAgentInput(text.trim())}
              placeholderTextColor={theme.onSurfaceDisabled}
              underlineColor={theme.outline}
              style={[{ color: theme.onSurface }, styles.textInput]}
              theme={{ colors: { ...theme } }}
            />
            <View style={styles.buttonGroup}>
              <Button
                onPress={() => {
                  setUserAgent(userAgentInput);
                  hideUserAgentModal();
                }}
                style={styles.button}
                title={getString('common.save')}
                mode="contained"
              />
              <Button
                style={styles.button}
                onPress={() => {
                  setUserAgent(getUserAgentSync());
                  hideUserAgentModal();
                }}
                title={getString('common.reset')}
              />
            </View>
          </KeyboardAwareScrollView>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

export default AdvancedSettings;

const styles = StyleSheet.create({
  button: {
    flex: 1,
    marginHorizontal: 8,
    marginTop: 16,
  },
  buttonGroup: {
    flexDirection: 'row-reverse',
  },
  modalTitle: {
    fontSize: 24,
    marginBottom: 16,
  },
  textInput: {
    borderRadius: 14,
    fontSize: 12,
    height: 120,
    marginBottom: 8,
    marginTop: 16,
  },
});
