import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  AppState,
  AppStateStatus,
  Pressable,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '@hooks/persisted';
import { getString } from '@strings/translations';
import {
  useSecuritySettings,
  LockOnBackground,
} from '@hooks/persisted/useSettings';
import { MMKVStorage } from '@utils/mmkv/mmkv';

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
): boolean => {
  if (!appLockEnabled) {
    return false;
  }
  if (lockOnBackground === 'never') {
    return false;
  }
  if (lockOnBackground === 'always') {
    return true;
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

  // Credentials revoked notice (shown after auto-disable)
  if (isCredentialsRevoked) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.content}>
          <Text style={[styles.lockIcon]}>⚠️</Text>
          <Text style={[styles.title, { color: theme.onSurface }]}>
            {getString('securitySettingsScreen.credentialsRevokedTitle')}
          </Text>
          <Text style={[styles.subtitle, { color: theme.onSurfaceVariant }]}>
            {getString('securitySettingsScreen.credentialsRevokedDesc')}
          </Text>
          <Pressable
            style={[styles.unlockBtn, { backgroundColor: theme.primary }]}
            onPress={onDismissRevoked}
            android_ripple={{ color: theme.rippleColor }}
          >
            <Text style={[styles.unlockBtnText, { color: theme.onPrimary }]}>
              {getString('common.ok')}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!isLocked) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={[styles.lockIcon]}>🔒</Text>
        <Text style={[styles.title, { color: theme.onSurface }]}>
          {getString('securitySettingsScreen.appLocked')}
        </Text>
        <Text style={[styles.subtitle, { color: theme.onSurfaceVariant }]}>
          {getString('securitySettingsScreen.appLockedDesc')}
        </Text>
        <Pressable
          style={[styles.unlockBtn, { backgroundColor: theme.primary }]}
          onPress={onAuthenticate}
          android_ripple={{ color: theme.rippleColor }}
        >
          <Text style={[styles.unlockBtnText, { color: theme.onPrimary }]}>
            {getString('securitySettingsScreen.unlock')}
          </Text>
        </Pressable>
      </View>
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
    shouldLockApp(appLockEnabled, lockOnBackground),
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
        if (shouldLockApp(appLockEnabled, lockOnBackground)) {
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
  container: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  content: {
    alignItems: 'center',
    padding: 32,
  },
  lockIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 32,
    textAlign: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  unlockBtn: {
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  unlockBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
