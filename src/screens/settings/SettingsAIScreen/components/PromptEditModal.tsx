import { KeyboardAvoidingModal, StableTextInput } from '@components';
import { useTheme } from '@hooks/persisted';
import { getString } from '@strings/translations';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

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
  };

  return (
    <KeyboardAvoidingModal
      visible={visible}
      title={
        initialPrompt
          ? getString('aiSettingsScreen.editPrompt')
          : getString('aiSettingsScreen.addPrompt')
      }
      confirmDisabled={!title.trim() || !content.trim()}
      onDismiss={onDismiss}
      onConfirm={handleSave}
    >
      <StableTextInput
        label={getString('aiSettingsScreen.promptTitle')}
        value={title}
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

      <StableTextInput
        label={getString('aiSettingsScreen.promptContent')}
        value={content}
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
    </KeyboardAvoidingModal>
  );
};

export default PromptEditModal;

const styles = StyleSheet.create({
  input: {
    marginBottom: 16,
  },
  contentInput: {
    minHeight: 150,
    maxHeight: 250,
    textAlignVertical: 'top',
  },
});
