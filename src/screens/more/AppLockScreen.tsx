import Button from '@components/Button/Button';
import SafeAreaView from '@components/SafeAreaView/SafeAreaView';
import { useTheme } from '@hooks/persisted';
import {
  LockOnBackground,
  useSecuritySettings,
} from '@hooks/persisted/useSettings';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { getString } from '@strings/translations';
import { MMKVStorage } from '@utils/mmkv/mmkv';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, StyleSheet, Text, View } from 'react-native';

const LOCK_TIMEOUT_MS: Record<LockOnBackground, number> = {
  always: 0,
  '1min': 60 * 1000,
  '2min': 2 * 60 * 1000,
  '5min': 5 * 60 * 1000,
  '10min': 10 * 60 * 1000,
  never: Infinity,
};

const LAST_ACTIVE_KEY = 'SECURITY_LAST_ACTIVE_AT';

/**
 * Set last active timestamp when going to background.
 */
export const setLastActiveTimestamp = () => {
  MMKVStorage.set(LAST_ACTIVE_KEY, Date.now());
};

/**
 * Check if the app should be locked based on settings and elapsed time.
 */
export const shouldLockApp = (
  appLockEnabled: boolean,
  lockOnBackground: LockOnBackground,
  isColdStart: boolean,
): boolean => {
  if (!appLockEnabled) {
    return false;
  }
  if (lockOnBackground === 'always' || isColdStart) {
    return true;
  }
  if (lockOnBackground === 'never') {
    return false;
  }
  const lastActive = MMKVStorage.getNumber(LAST_ACTIVE_KEY);
  if (!lastActive) {
    return true; // First launch with lock enabled → lock
  }
  const elapsed = Date.now() - lastActive;
  const timeout = LOCK_TIMEOUT_MS[lockOnBackground] || 0;
  return elapsed >= timeout;
};

interface AppLockOverlayProps {
  isLocked: boolean;
  onAuthenticate: () => void;
  /** If true, show a "credentials removed" notice instead of the lock screen */
  isCredentialsRevoked: boolean;
  onDismissRevoked: () => void;
}

/**
 * Full-screen overlay shown on top of the app when locked.
 */
const AppLockOverlay: React.FC<AppLockOverlayProps> = ({
  isLocked,
  onAuthenticate,
  isCredentialsRevoked,
  onDismissRevoked,
}) => {
  const theme = useTheme();

  if (!isCredentialsRevoked && !isLocked) {
    return null;
  }

  const title = getString(
    isCredentialsRevoked
      ? 'securitySettingsScreen.credentialsRevokedTitle'
      : 'securitySettingsScreen.appLocked',
  );
  const description = getString(
    isCredentialsRevoked
      ? 'securitySettingsScreen.credentialsRevokedDesc'
      : 'securitySettingsScreen.appLockedDesc',
  );
  const actionLabel = getString(
    isCredentialsRevoked ? 'common.ok' : 'securitySettingsScreen.unlock',
  );
  const action = isCredentialsRevoked ? onDismissRevoked : onAuthenticate;
  const iconName = isCredentialsRevoked
    ? 'shield-alert-outline'
    : 'shield-lock-outline';
  const iconContainerColor = isCredentialsRevoked
    ? theme.errorContainer
    : theme.primaryContainer;
  const iconColor = isCredentialsRevoked
    ? theme.onErrorContainer
    : theme.onPrimaryContainer;

  return (
    <View
      accessibilityViewIsModal
      importantForAccessibility="yes"
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View
            accessible={false}
            style={[
              styles.iconContainer,
              { backgroundColor: iconContainerColor },
            ]}
          >
            <MaterialCommunityIcons
              accessible={false}
              color={iconColor}
              name={iconName}
              size={48}
            />
          </View>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: theme.onBackground }]}
          >
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: theme.onSurfaceVariant }]}>
            {description}
          </Text>
          <Button
            accessibilityLabel={actionLabel}
            buttonColor={theme.primary}
            contentStyle={styles.actionContent}
            icon={
              isCredentialsRevoked ? undefined : 'lock-open-variant-outline'
            }
            labelStyle={styles.actionLabel}
            mode="contained"
            onPress={action}
            rippleColor={theme.rippleColor}
            style={styles.action}
            textColor={theme.onPrimary}
          >
            {actionLabel}
          </Button>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default AppLockOverlay;

/**
 * Hook to manage app lock state.
 * - Locks on cold start if enabled.
 * - Locks on foreground return after timeout.
 * - Auto-disables if biometrics/passcode are removed from device.
 * - Shows a revoked-credentials notice when auto-disabled.
 */
export const useAppLock = () => {
  const { appLockEnabled, lockOnBackground, setSecuritySettings } =
    useSecuritySettings();

  // On cold start: check if we should lock immediately
  const [isLocked, setIsLocked] = useState(() =>
    shouldLockApp(appLockEnabled, lockOnBackground, true),
  );
  const [isCredentialsRevoked, setIsCredentialsRevoked] = useState(false);
  const isAuthenticatingRef = useRef(false);

  const authenticate = useCallback(async () => {
    if (isAuthenticatingRef.current) {
      return;
    }
    isAuthenticatingRef.current = true;

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        // Credentials were removed → auto-disable app lock
        setSecuritySettings({ appLockEnabled: false });
        setIsLocked(false);
        setIsCredentialsRevoked(true);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: getString('securitySettingsScreen.authPrompt'),
        fallbackLabel: getString('securitySettingsScreen.authFallback'),
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsLocked(false);
      }
    } catch {
      // Auth failed or cancelled — keep locked
    } finally {
      isAuthenticatingRef.current = false;
    }
  }, [setSecuritySettings]);

  const dismissRevoked = useCallback(() => {
    setIsCredentialsRevoked(false);
  }, []);

  // Auto-authenticate when lock screen appears
  useEffect(() => {
    if (isLocked && appLockEnabled) {
      authenticate();
    }
  }, [isLocked, appLockEnabled, authenticate]);

  // Listen for foreground/background transitions
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        setLastActiveTimestamp();
      } else if (nextState === 'active') {
        if (shouldLockApp(appLockEnabled, lockOnBackground, false)) {
          setIsLocked(true);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [appLockEnabled, lockOnBackground]);

  return {
    isLocked: isLocked && appLockEnabled,
    isCredentialsRevoked,
    authenticate,
    dismissRevoked,
  };
};

const styles = StyleSheet.create({
  action: {
    borderRadius: 24,
    minWidth: 174,
  },
  actionContent: {
    minHeight: 48,
    paddingHorizontal: 16,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  container: {
    bottom: 0,
    elevation: 9999,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 9999,
  },
  content: {
    alignItems: 'center',
    maxWidth: 360,
    paddingHorizontal: 32,
    paddingVertical: 40,
    width: '100%',
  },
  iconContainer: {
    alignItems: 'center',
    borderRadius: 32,
    height: 92,
    justifyContent: 'center',
    marginBottom: 28,
    width: 92,
  },
  safeArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 28,
    marginTop: 8,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    textAlign: 'center',
  },
});
