import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { Portal, Modal, TextInput, Menu, IconButton } from 'react-native-paper';
import { Button } from '@components/index';
import { useTheme } from '@hooks/persisted';
import { SystemPrompt } from '@hooks/persisted/useSettings';
import * as Clipboard from 'expo-clipboard';
import { getString } from '@strings/translations';
import { showToast } from '@utils/showToast';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

interface PromptManagerModalProps {
  visible: boolean;
  onDismiss: () => void;
  prompts: SystemPrompt[];
  activePromptId: string;
  onUpdatePrompts: (prompts: SystemPrompt[]) => void;
  onSelectPrompt: (id: string) => void;
}

const PromptManagerModal: React.FC<PromptManagerModalProps> = ({
  visible,
  onDismiss,
  prompts,
  activePromptId,
  onUpdatePrompts,
  onSelectPrompt,
}) => {
  const theme = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const [editTitleMode, setEditTitleMode] = useState(false);
  const [tempTitle, setTempTitle] = useState('');

  const activePrompt = prompts.find(p => p.id === activePromptId) || prompts[0];

  useEffect(() => {
    if (visible) {
      setEditTitleMode(false);
      setMenuVisible(false);
    }
  }, [visible, activePromptId]);

  const handleContentChange = (text: string) => {
    const newPrompts = prompts.map(p =>
      p.id === activePromptId ? { ...p, content: text } : p,
    );
    onUpdatePrompts(newPrompts);
  };

  const copyContent = async () => {
    await Clipboard.setStringAsync(activePrompt.content);
    showToast('Copied to clipboard');
  };

  const startEditTitle = () => {
    setTempTitle(activePrompt.title);
    setEditTitleMode(true);
  };

  const saveTitle = () => {
    const newTitle = tempTitle.trim() || 'Untitled';
    const newPrompts = prompts.map(p =>
      p.id === activePromptId ? { ...p, title: newTitle } : p,
    );
    onUpdatePrompts(newPrompts);
    setEditTitleMode(false);
  };

  const deletePrompt = () => {
    if (activePromptId === 'default' || prompts.length <= 1) {
      showToast('Cannot delete the default prompt');
      return;
    }
    const newPrompts = prompts.filter(p => p.id !== activePromptId);
    onUpdatePrompts(newPrompts);
    onSelectPrompt(newPrompts[0].id);
  };

  const addPrompt = () => {
    const newId = Date.now().toString();
    const newPrompt: SystemPrompt = {
      id: newId,
      title: `Prompt #${prompts.length + 1}`,
      content: '',
    };
    onUpdatePrompts([...prompts, newPrompt]);
    onSelectPrompt(newId);
  };

  return (
    <Portal>
      <KeyboardAwareScrollView>
        <Modal
          visible={visible}
          onDismiss={onDismiss}
          contentContainerStyle={[
            styles.modalContent,
            { backgroundColor: theme.surface },
          ]}
        >
          <Text style={[styles.modalTitle, { color: theme.onSurface }]}>
            System Prompt Manager
          </Text>

          <View style={styles.toolbar}>
            {editTitleMode ? (
              <View style={styles.editTitleContainer}>
                <TextInput
                  value={tempTitle}
                  onChangeText={setTempTitle}
                  style={[
                    styles.titleInput,
                    { backgroundColor: theme.surfaceVariant },
                  ]}
                  mode="outlined"
                  dense
                  autoFocus
                  onBlur={saveTitle}
                  onSubmitEditing={saveTitle}
                  textColor={theme.onSurface}
                  theme={{
                    colors: {
                      primary: theme.primary,
                      background: theme.surfaceVariant,
                      onSurface: theme.onSurface,
                      onSurfaceVariant: theme.onSurfaceVariant,
                    },
                  }}
                />
              </View>
            ) : (
              <View style={styles.dropdownWrapper}>
                <Menu
                  visible={menuVisible}
                  onDismiss={() => setMenuVisible(false)}
                  contentStyle={{ backgroundColor: theme.surface }}
                  anchor={
                    <Pressable
                      style={[styles.dropdown, { borderColor: theme.outline }]}
                      onPress={() => setMenuVisible(true)}
                    >
                      <Text
                        style={{ color: theme.onSurface, flex: 1 }}
                        numberOfLines={1}
                      >
                        {activePrompt?.title || 'Unknown'}
                      </Text>
                      <Text
                        style={{ color: theme.onSurfaceVariant, marginLeft: 8 }}
                      >
                        ▼
                      </Text>
                    </Pressable>
                  }
                >
                  {prompts.map(p => (
                    <Menu.Item
                      key={p.id}
                      title={p.title}
                      onPress={() => {
                        onSelectPrompt(p.id);
                        setMenuVisible(false);
                      }}
                      titleStyle={[
                        { color: theme.onSurface },
                        p.id === activePromptId
                          ? { color: theme.primary, fontWeight: 'bold' }
                          : {},
                      ]}
                    />
                  ))}
                </Menu>
              </View>
            )}

            <View style={styles.actionsRow}>
              <IconButton
                icon="content-copy"
                size={20}
                iconColor={theme.onSurfaceVariant}
                onPress={copyContent}
                style={styles.iconBtn}
              />
              <IconButton
                icon="pencil"
                size={20}
                iconColor={theme.onSurfaceVariant}
                onPress={startEditTitle}
                style={styles.iconBtn}
              />
              <IconButton
                icon="delete"
                size={20}
                iconColor={
                  activePromptId === 'default' || prompts.length <= 1
                    ? theme.surfaceVariant
                    : theme.error
                }
                onPress={deletePrompt}
                disabled={activePromptId === 'default' || prompts.length <= 1}
                style={[styles.iconBtn, { marginRight: -8 }]}
              />
            </View>
          </View>

          <TextInput
            label="Prompt Content"
            value={activePrompt.content}
            onChangeText={handleContentChange}
            mode="outlined"
            multiline
            textColor={theme.onSurface}
            style={[styles.contentInput, { backgroundColor: theme.surface }]}
            theme={{
              colors: {
                primary: theme.primary,
                background: theme.surface,
                onSurface: theme.onSurface,
                onSurfaceVariant: theme.onSurfaceVariant,
              },
            }}
          />

          <View style={styles.footer}>
            <Button
              title={getString('common.add') || 'Add'}
              mode="outlined"
              onPress={addPrompt}
              style={styles.flexBtn}
            />
            <View style={styles.spacer} />
            <Button
              title={getString('common.cancel') || 'Cancel'}
              mode="contained"
              onPress={onDismiss}
              style={styles.flexBtn}
            />
          </View>
        </Modal>
      </KeyboardAwareScrollView>
    </Portal>
  );
};

export default PromptManagerModal;

const styles = StyleSheet.create({
  modalContent: {
    margin: 20,
    borderRadius: 8,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dropdownWrapper: {
    flex: 1,
    marginRight: 8,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  editTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  titleInput: {
    height: 40,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    margin: 0,
    marginLeft: 8,
  },
  contentInput: {
    minHeight: 150,
    maxHeight: 250,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
  },
  flexBtn: {
    flex: 1,
  },
  spacer: {
    width: 12,
  },
});
