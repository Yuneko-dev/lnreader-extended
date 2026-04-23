import React from 'react';
import { StyleSheet, View, Text, StatusBar } from 'react-native';
import ErrorBoundary from 'react-native-error-boundary';

import { Button, List } from '@components';
import { useTheme } from '@hooks/persisted';
import { SafeAreaView } from 'react-native-safe-area-context';
import NativeFile from '@specs/NativeFile';
import * as Clipboard from 'expo-clipboard';
import { showToast } from '@utils/showToast';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
}) => {
  const theme = useTheme();

  return (
    <SafeAreaView
      style={[styles.mainCtn, { backgroundColor: theme.background }]}
    >
      <StatusBar translucent={true} backgroundColor="transparent" />
      <View style={styles.errorInfoCtn}>
        <Text style={[styles.errorTitle, { color: theme.onSurface }]}>
          An Unexpected Error Ocurred
        </Text>
        <Text style={[styles.errorDesc, { color: theme.onSurface }]}>
          The application ran into an unexpected error. We suggest you
          screenshot this message and then share it in our support channel on
          Discord.
        </Text>
        <Text
          style={[
            styles.errorCtn,
            {
              backgroundColor: theme.surfaceVariant,
              color: theme.onSurfaceVariant,
            },
          ]}
          numberOfLines={20}
        >
          {`${error.message}\n\n${error.stack}`}
        </Text>
      </View>
      <List.Divider theme={theme} />
      <Button
        onPress={resetError}
        title={'Restart the application'}
        style={styles.buttonCtn}
        mode="contained"
      />
    </SafeAreaView>
  );
};

interface AppErrorBoundaryProps {
  children: React.ReactElement;
}

const AppErrorBoundary: React.FC<AppErrorBoundaryProps> = ({ children }) => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>{children}</ErrorBoundary>
  );
};

export const NativeCrashFallback: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const theme = useTheme();
  const [crashLog, setCrashLog] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const externalCachesDir =
        NativeFile.getConstants().ExternalCachesDirectoryPath;
      if (externalCachesDir) {
        const crashLogPath = externalCachesDir + '/crash_log.txt';
        if (NativeFile.exists(crashLogPath)) {
          const log = NativeFile.readFile(crashLogPath);
          if (log) {
            setCrashLog(log);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleCopyAndDismiss = React.useCallback(async () => {
    if (crashLog) {
      await Clipboard.setStringAsync(crashLog);
      showToast('Copied to clipboard');
    }
    try {
      const externalCachesDir =
        NativeFile.getConstants().ExternalCachesDirectoryPath;
      if (externalCachesDir) {
        const crashLogPath = externalCachesDir + '/crash_log.txt';
        if (NativeFile.exists(crashLogPath)) {
          NativeFile.unlink(crashLogPath);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setCrashLog(null);
  }, [crashLog]);

  if (crashLog) {
    return (
      <SafeAreaView
        style={[styles.mainCtn, { backgroundColor: theme.background }]}
      >
        <StatusBar translucent={true} backgroundColor="transparent" />
        <View style={styles.errorInfoCtn}>
          <Text style={[styles.errorTitle, { color: theme.onSurface }]}>
            Application Crashed Previously
          </Text>
          <Text style={[styles.errorDesc, { color: theme.onSurface }]}>
            The application ran into a fatal native error during the last
            session. Please copy the crash log and report it in our Discord.
          </Text>
          <Text
            style={[
              styles.errorCtn,
              {
                backgroundColor: theme.surfaceVariant,
                color: theme.onSurfaceVariant,
              },
            ]}
            numberOfLines={20}
          >
            {crashLog}
          </Text>
        </View>
        <List.Divider theme={theme} />
        <Button
          onPress={handleCopyAndDismiss}
          title={'Copy and Dismiss'}
          style={styles.buttonCtn}
          mode="contained"
        />
      </SafeAreaView>
    );
  }

  return <>{children}</>;
};

export default AppErrorBoundary;

const styles = StyleSheet.create({
  buttonCtn: {
    margin: 16,
    marginBottom: 32,
  },
  errorCtn: {
    borderRadius: 8,
    lineHeight: 20,
    marginVertical: 16,
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  errorDesc: {
    lineHeight: 20,
    marginVertical: 8,
  },
  errorInfoCtn: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  errorTitle: {
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  mainCtn: {
    flex: 1,
  },
});
