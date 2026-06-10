import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Portal, Modal, TextInput } from 'react-native-paper';
import { Button } from '@components/index';
import { useTheme } from '@hooks/persisted';
import { getString } from '@strings/translations';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

interface PromptEditModalProps {
  visible: boolean;
  onDismiss: () => void;
  initialPrompt?: { id: string; title: string; content: string };
  onSave: (id: string | null, title: string, content: string) => void;
}

const PromptEditModal: React.FC<PromptEditModalProps> = ({
  visible,
  onDismiss,
  initialPrompt,
  onSave,
}) => {
  const theme = useTheme();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (visible) {
      if (initialPrompt) {
        setTitle(initialPrompt.title);
        setContent(initialPrompt.content);
      } else {
        setTitle('');
        setContent('');
      }
    }
  }, [visible, initialPrompt]);

  const handleSave = () => {
    onSave(initialPrompt?.id || null, title, content);
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modalContent,
          { backgroundColor: theme.surface },
        ]}
      >
        <KeyboardAwareScrollView showsVerticalScrollIndicator={false}>
          <Text style={[styles.modalTitle, { color: theme.onSurface }]}>
            {initialPrompt
              ? getString('aiSettingsScreen.editPrompt')
              : getString('aiSettingsScreen.addPrompt')}
          </Text>

          <TextInput
            label={getString('aiSettingsScreen.promptTitle')}
            defaultValue={title}
            onChangeText={setTitle}
            mode="outlined"
            disabled={initialPrompt?.id === 'default'}
            textColor={theme.onSurface}
            style={[styles.input, { backgroundColor: theme.surface }]}
            theme={{
              colors: {
                primary: theme.primary,
                background: theme.surface,
                onSurface: theme.onSurface,
                onSurfaceVariant: theme.onSurfaceVariant,
              },
            }}
          />

          <TextInput
            label={getString('aiSettingsScreen.promptContent')}
            defaultValue={content}
            onChangeText={setContent}
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
              title={getString('common.cancel')}
              mode="text"
              onPress={onDismiss}
              style={styles.flexBtn}
            />
            <View style={styles.spacer} />
            <Button
              title={getString('common.save')}
              mode="contained"
              onPress={handleSave}
              style={styles.flexBtn}
              disabled={!title.trim() || !content.trim()}
            />
          </View>
        </KeyboardAwareScrollView>
      </Modal>
    </Portal>
  );
};

export default PromptEditModal;

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
  input: {
    marginBottom: 16,
  },
  contentInput: {
    minHeight: 150,
    maxHeight: 250,
    textAlignVertical: 'top',
    marginBottom: 24,
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
