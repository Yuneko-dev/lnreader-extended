import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { IconButton, List as PaperList } from 'react-native-paper';
import {
  Appbar,
  List,
  SafeAreaView,
  Button,
  EmptyView,
} from '@components/index';
import { useTheme } from '@hooks/persisted';
import { SettingsAIScreenProps } from '@navigators/types';
import { useAIProviders } from '@hooks/persisted/useAIProviders';
import AIProviderModal from './components/AIProviderModal';
import { getString } from '@strings/translations';

const SettingsAIScreen = ({ navigation }: SettingsAIScreenProps) => {
  const theme = useTheme();
  const { providers, addProvider, updateProvider, removeProvider } =
    useAIProviders();

  const [providerModalVisible, setProviderModalVisible] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(
    null,
  );

  return (
    <SafeAreaView excludeTop>
      <Appbar
        title="AI Settings"
        handleGoBack={navigation.goBack}
        theme={theme}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <List.Section>
          <List.SubHeader theme={theme}>
            {getString('aiSettingsScreen.aiProvidersConfiguration')}
          </List.SubHeader>
          {providers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <EmptyView
                icon="(╥﹏╥)"
                description="No AI Providers configured"
                theme={theme}
              />
            </View>
          ) : (
            providers.map(p => (
              <PaperList.Item
                key={p.id}
                title={p.alias}
                description={`${p.provider} • ${p.model || 'Default model'}`}
                // eslint-disable-next-line react/no-unstable-nested-components
                left={props => (
                  <PaperList.Icon
                    {...props}
                    icon="robot-outline"
                    color={theme.primary}
                  />
                )}
                onPress={() => {
                  setEditingProviderId(p.id);
                  setProviderModalVisible(true);
                }}
                // eslint-disable-next-line react/no-unstable-nested-components
                right={props => (
                  <IconButton
                    {...props}
                    icon="trash-can-outline"
                    iconColor={theme.error}
                    size={24}
                    onPress={() => removeProvider(p.id)}
                    style={styles.deleteButton}
                  />
                )}
                titleStyle={{ color: theme.onSurface }}
                descriptionStyle={{ color: theme.onSurfaceVariant }}
                style={styles.listItem}
              />
            ))
          )}

          <View style={styles.addBtnContainer}>
            <Button
              title={getString('aiSettingsScreen.addProvider')}
              mode="contained"
              icon="plus"
              onPress={() => {
                setEditingProviderId(null);
                setProviderModalVisible(true);
              }}
              style={styles.addBtn}
            />
          </View>
        </List.Section>

        <List.Section>
          <List.SubHeader theme={theme}>
            {getString('aiSettingsScreen.systemPrompts')}
          </List.SubHeader>
          <PaperList.Item
            title={getString('aiSettingsScreen.translateSystemPrompts')}
            description={getString(
              'aiSettingsScreen.translateSystemPromptsDesc',
            )}
            // eslint-disable-next-line react/no-unstable-nested-components
            left={props => (
              <PaperList.Icon
                {...props}
                icon="text-box-edit-outline"
                color={theme.primary}
              />
            )}
            onPress={() => {
              navigation.navigate('AIPromptsSettings');
            }}
            titleStyle={{ color: theme.onSurface }}
            descriptionStyle={{ color: theme.onSurfaceVariant }}
            style={styles.listItem}
          />
        </List.Section>
      </ScrollView>

      <AIProviderModal
        visible={providerModalVisible}
        onDismiss={() => setProviderModalVisible(false)}
        initialProvider={providers.find(p => p.id === editingProviderId)}
        onSave={async (provider, apiKey) => {
          if (editingProviderId) {
            await updateProvider(editingProviderId, provider, apiKey);
          } else {
            await addProvider(provider, apiKey);
          }
          setProviderModalVisible(false);
        }}
      />
    </SafeAreaView>
  );
};

export default SettingsAIScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    paddingVertical: 32,
  },
  addBtnContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  addBtn: {
    width: '100%',
  },
  deleteButton: {
    margin: 0,
    backgroundColor: 'transparent',
  },
  listItem: {
    paddingVertical: 12,
  },
});
