import { KeyboardAvoidingModal, StableTextInput } from '@components';
import { useTheme } from '@hooks/persisted';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

interface TrackerLoginDialogProps {
  visible: boolean;
  trackerName: string;
  onDismiss: () => void;
  onSubmit: (username: string, password: string) => Promise<void>;
  usernameLabel?: string;
}

const TrackerLoginDialog: React.FC<TrackerLoginDialogProps> = ({
  visible,
  trackerName,
  onDismiss,
  onSubmit,
  usernameLabel = 'Username',
}) => {
  const theme = useTheme();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      setError(`${usernameLabel} and password are required`);
      return false;
    }

    setIsLoading(true);
    setError('');

    try {
      await onSubmit(username.trim(), password);
      setUsername('');
      setPassword('');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setUsername('');
    setPassword('');
    setError('');
    onDismiss();
  };

  return (
    <KeyboardAvoidingModal
      visible={visible}
      title={`Login to ${trackerName}`}
      confirmLabel={isLoading ? 'Logging in...' : 'Login'}
      confirmLoading={isLoading}
      onDismiss={handleCancel}
      onConfirm={handleSubmit}
    >
      <StableTextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.surface,
            color: theme.onSurface,
            borderColor: theme.outline,
          },
        ]}
        placeholder={usernameLabel}
        placeholderTextColor={theme.onSurfaceVariant}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!isLoading}
      />

      <StableTextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.surface,
            color: theme.onSurface,
            borderColor: theme.outline,
          },
        ]}
        placeholder="Password"
        placeholderTextColor={theme.onSurfaceVariant}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        editable={!isLoading}
      />

      {error ? (
        <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
      ) : null}
    </KeyboardAvoidingModal>
  );
};

export default TrackerLoginDialog;

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 16,
    marginTop: -8,
  },
});
