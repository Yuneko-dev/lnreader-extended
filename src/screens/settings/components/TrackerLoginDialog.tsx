import React, { useState } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { Modal } from '@components';
import { useTheme } from '@hooks/persisted';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

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
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onSubmit(username.trim(), password);
      /* Clear form on success */
      setUsername('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
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
    <Modal visible={visible} onDismiss={handleCancel}>
      <KeyboardAwareScrollView>
        <View style={styles.container}>
          <Text style={[styles.title, { color: theme.onSurface }]}>
            Login to {trackerName}
          </Text>

          <TextInput
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

          <TextInput
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
            <Text style={[styles.errorText, { color: theme.error }]}>
              {error}
            </Text>
          ) : null}

          <View style={styles.buttonRow}>
            <Button
              style={styles.button}
              labelStyle={[{ color: theme.primary }, styles.buttonLabel]}
              onPress={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              style={styles.button}
              labelStyle={[{ color: theme.primary }, styles.buttonLabel]}
              onPress={handleSubmit}
              disabled={isLoading}
              loading={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </Modal>
  );
};

export default TrackerLoginDialog;

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    marginBottom: 24,
    fontWeight: '500',
  },
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  button: {
    marginLeft: 8,
  },
  buttonLabel: {
    letterSpacing: 0,
    textTransform: 'none',
  },
});
