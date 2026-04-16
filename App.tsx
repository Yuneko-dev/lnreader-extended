import 'react-native-url-polyfill/auto';
import { enableFreeze } from 'react-native-screens';

enableFreeze(true);

import React, { Suspense, useEffect } from 'react';
import { AppState, NativeModules, StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LottieSplashScreen from 'react-native-lottie-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import * as Notifications from 'expo-notifications';

import AppErrorBoundary, {
  ErrorFallback,
} from '@components/AppErrorBoundary/AppErrorBoundary';

import Main from './src/navigators/Main';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useInitDatabase } from '@database/db';
import AppLockOverlay, { useAppLock } from '@screens/more/AppLockScreen';
import { useSecuritySettings, useLibrarySettings, useAppSettings } from '@hooks/persisted/useSettings';
import NativeFile from '@specs/NativeFile';

Notifications.setNotificationHandler({
  handleNotification: async () => {
    return {
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

/**
 * Manages FLAG_SECURE for screen protection.
 */
const useScreenProtection = () => {
  const { screenProtection } = useSecuritySettings();
  const { incognitoMode } = useLibrarySettings();

  useEffect(() => {
    try {
      const FlagSecure = NativeModules.FlagSecure;
      if (!FlagSecure) {
        return;
      }

      const shouldProtect =
        screenProtection === 'always' ||
        (screenProtection === 'incognito' && incognitoMode);

      if (shouldProtect) {
        FlagSecure.activate();
      } else {
        FlagSecure.deactivate();
      }
    } catch {
      // Module not available
    }
  }, [screenProtection, incognitoMode]);
};

/**
 * Clear chapter cache on app exit/backgrounded
 */
const useClearCacheOnExit = () => {
  const { clearCacheOnExit } = useAppSettings();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState.match(/inactive|background/) && clearCacheOnExit) {
        try {
          const constants = NativeFile.getConstants();
          NativeFile.unlink(constants.ExternalCachesDirectoryPath);
          NativeFile.mkdir(constants.ExternalCachesDirectoryPath);
        } catch (e) {
          console.error(e);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [clearCacheOnExit]);
};

const AppContent = () => {
  const { isLocked, isCredentialsRevoked, authenticate, dismissRevoked } =
    useAppLock();
  useScreenProtection();
  useClearCacheOnExit();

  return (
    <>
      <Main />
      <AppLockOverlay
        isLocked={isLocked}
        onAuthenticate={authenticate}
        isCredentialsRevoked={isCredentialsRevoked}
        onDismissRevoked={dismissRevoked}
      />
    </>
  );
};

const App = () => {
  const state = useInitDatabase();

  useEffect(() => {
    if (state.success || state.error) {
      LottieSplashScreen.hide();
    }
  }, [state.success, state.error]);

  if (state.error) {
    return <ErrorFallback error={state.error} resetError={() => null} />;
  }

  return (
    <Suspense fallback={null}>
      <GestureHandlerRootView style={styles.flex}>
        <AppErrorBoundary>
          <SafeAreaProvider>
            <PaperProvider>
              <BottomSheetModalProvider>
                <StatusBar translucent={true} backgroundColor="transparent" />
                <AppContent />
              </BottomSheetModalProvider>
            </PaperProvider>
          </SafeAreaProvider>
        </AppErrorBoundary>
      </GestureHandlerRootView>
    </Suspense>
  );
};

export default App;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
