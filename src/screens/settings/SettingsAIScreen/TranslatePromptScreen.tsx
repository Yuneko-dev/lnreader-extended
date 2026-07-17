import { Appbar, Button, EmptyView, List, SafeAreaView } from '@components';
import { useTheme } from '@hooks/persisted';
import { useTranslateSettings } from '@hooks/persisted/useSettings';
import { AIPromptsSettingsScreenProps } from '@navigators/types';
import { getString } from '@strings/translations';
import { showToast } from '@utils/showToast';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { IconButton, List as PaperList } from 'react-native-paper';

import PromptEditModal from './components/PromptEditModal';

const TranslatePromptScreen = ({
  navigation,
}: AIPromptsSettingsScreenProps) => {
  const theme = useTheme();
  const { llmSystemPrompts, setTranslateSettings } = useTranslateSettings();

  const [promptModalVisible, setPromptModalVisible] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);

  const prompts = llmSystemPrompts || [];

  const handleRemovePrompt = (id: string) => {
    if (id === 'default' || prompts.length <= 1) {
      showToast(getString('aiSettingsScreen.cannotDeleteDefaultPrompt'));
      return;
    }
    const newPrompts = prompts.filter(p => p.id !== id);
    setTranslateSettings({ llmSystemPrompts: newPrompts });
  };

  const handleSavePrompt = (
    id: string | null,
    title: string,
    content: string,
  ) => {
    if (!title.trim() || !content.trim()) {
      showToast(getString('aiSettingsScreen.promptFieldsRequired'));
      return;
    }

    if (id) {
      const newPrompts = prompts.map(p =>
        p.id === id ? { ...p, title, content } : p,
      );
      setTranslateSettings({ llmSystemPrompts: newPrompts });
    } else {
      const newId = Date.now().toString();
      const newPrompts = [...prompts, { id: newId, title, content }];
      setTranslateSettings({ llmSystemPrompts: newPrompts });
    }
  };

  return (
    <SafeAreaView excludeTop>
      <Appbar
        title={getString('aiSettingsScreen.translateSystemPrompts')}
        handleGoBack={navigation.goBack}
        theme={theme}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <List.Section>
          {prompts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <EmptyView
                icon="(╥﹏╥)"
                description="No Prompts configured"
                theme={theme}
              />
            </View>
          ) : (
            prompts.map(p => (
              <PaperList.Item
                key={p.id}
                title={p.title}
                description={
                  p.content.substring(0, 60) +
                  (p.content.length > 60 ? '...' : '')
                }
                // eslint-disable-next-line react/no-unstable-nested-components
                left={props => (
                  <PaperList.Icon
                    {...props}
                    icon="text-box-outline"
                    color={theme.primary}
                  />
                )}
                onPress={() => {
                  setEditingPromptId(p.id);
                  setPromptModalVisible(true);
                }}
                // eslint-disable-next-line react/no-unstable-nested-components
                right={props => (
                  <IconButton
                    {...props}
                    icon="trash-can-outline"
                    iconColor={
                      p.id === 'default' || prompts.length <= 1
                        ? theme.surfaceVariant
                        : theme.error
                    }
                    size={24}
                    onPress={() => handleRemovePrompt(p.id)}
                    disabled={p.id === 'default' || prompts.length <= 1}
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
              title={getString('aiSettingsScreen.addPrompt')}
              mode="contained"
              icon="plus"
              onPress={() => {
                setEditingPromptId(null);
                setPromptModalVisible(true);
              }}
              style={styles.addBtn}
            />
          </View>
        </List.Section>
      </ScrollView>

      <PromptEditModal
        visible={promptModalVisible}
        onDismiss={() => setPromptModalVisible(false)}
        initialPrompt={prompts.find(p => p.id === editingPromptId)}
        onSave={handleSavePrompt}
      />
    </SafeAreaView>
  );
};

export default TranslatePromptScreen;

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
