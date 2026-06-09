import React, { useEffect, useState, useRef, useCallback } from 'react';
import Svg, { Path } from 'react-native-svg';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { Appbar, EmptyView } from '@components';
import { useTheme, useAppSettings } from '@hooks/persisted';
import { Button, List, Avatar } from 'react-native-paper';
import { DiscordAuth, StoredTokenData } from '@modules/discord/DiscordAuth';
import { discordRPC } from '@modules/discord/DiscordRPC';
import { Util } from '@modules/discord/utils';
import { getString } from '@strings/translations';
import { showToast } from '@utils/showToast';
import SettingSwitch from './components/SettingSwitch';

export const DiscordSVG = ({ color, size, ...props }: any) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    width={size || 24}
    height={size || 24}
    fill={color || "currentColor"}
    className="bi bi-discord"
    {...props}
  >
    <Path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612" />
  </Svg>
);

const SettingsDiscordScreen = ({ navigation }: any) => {
  const theme = useTheme();
  const {
    discordRPCEnabled,
    discordRPCAppOpen,
    discordRPCBrowsing,
    discordRPCReading,
    setAppSettings,
  } = useAppSettings();
  const [tokenData, setTokenData] = useState<StoredTokenData | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState(getString('common.loading'));

  const isMounted = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadToken = useCallback(async () => {
    try {
      const data = await DiscordAuth.getToken();
      if (data && isMounted.current) {
        setTokenData(data);
        const profile = await DiscordAuth.getUserProfile(data);
        if (profile && isMounted.current) {
          setUserProfile(profile);
          discordRPC.connect();
        } else if (isMounted.current) {
          await DiscordAuth.logout();
          setTokenData(null);
        }
      }
    } catch (error: any) {
      console.error('Error loading discord token', error);
      if (isMounted.current) {
        showToast(
          `${getString('discord.error')}: ${error.message || 'Unknown error'}`,
        );
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    loadToken();
    return () => {
      isMounted.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [loadToken]);

  const handleLogin = useCallback(async () => {
    setIsLoading(true);
    setAuthMessage(getString('common.loading'));

    let isTimeout = false;

    timeoutRef.current = setTimeout(() => {
      isTimeout = true;
      if (isMounted.current) {
        setIsLoading(false);
        showToast(getString('discord.timeout'));
      }
    }, 60000);

    try {
      const data = await DiscordAuth.login();
      if (!isTimeout && data) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const profile = await DiscordAuth.getUserProfile(data);
        if (isMounted.current) {
          setTokenData(data);
          setUserProfile(profile);
          setIsLoading(false);
          discordRPC.connect();
        }
      }
    } catch (error: any) {
      if (!isTimeout) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (isMounted.current) {
          setIsLoading(false);
          if (
            error.message &&
            !error.message.includes('cancel') &&
            !error.message.includes('dismiss')
          ) {
            showToast(`${getString('discord.error')}: ${error.message}`);
          }
        }
      }
    }
  }, []);

  const handleLogout = useCallback(async () => {
    setIsLoading(true);
    setAuthMessage(getString('common.loading'));
    try {
      discordRPC.disconnect();
      await DiscordAuth.logout();
      if (isMounted.current) {
        setTokenData(null);
        setUserProfile(null);
      }
    } catch (e: any) {
      console.error(e);
      showToast(`${getString('discord.error')}: ${e.message}`);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const renderProfile = () => {
    if (!userProfile) return null;

    const avatarUrl = userProfile.avatar
      ? `https://cdn.discordapp.com/avatars/${userProfile.id}/${userProfile.avatar}.png?size=256`
      : `https://cdn.discordapp.com/embed/avatars/${Util.calculateUserDefaultAvatarIndex(
          userProfile.id,
        )}.png`;

    const bannerUrl = userProfile.banner
      ? `https://cdn.discordapp.com/banners/${userProfile.id}/${userProfile.banner}.png?size=512`
      : null;

    const accentColor = userProfile.accent_color
      ? `#${userProfile.accent_color.toString(16).padStart(6, '0')}`
      : theme.surfaceVariant;

    return (
      <View style={[styles.profileCard, { backgroundColor: theme.surface }]}>
        <View style={[styles.banner, { backgroundColor: accentColor }]}>
          {bannerUrl && (
            <Image source={{ uri: bannerUrl }} style={styles.bannerImage} />
          )}
        </View>
        <View style={styles.avatarContainer}>
          <Avatar.Image
            source={{ uri: avatarUrl }}
            size={80}
            style={{ backgroundColor: theme.surface }}
          />
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.username, { color: theme.onSurface }]}>
            {getString('discord.connectedAs', {
              name: `@${userProfile.username}`,
            })}
          </Text>
        </View>
        <Button
          mode="outlined"
          onPress={handleLogout}
          style={styles.logoutButton}
          textColor={theme.error}
          icon="logout"
        >
          {getString('discord.logout')}
        </Button>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Appbar
        title={getString('discord.title')}
        handleGoBack={navigation.goBack}
        theme={theme}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {!tokenData ? (
          <View style={styles.emptyContainer}>
            <EmptyView
              icon="(｡ŏ_ŏ)"
              description={getString('discord.notConnected')}
              theme={theme}
            />
            <Button
              mode="contained"
              onPress={handleLogin}
              style={styles.loginButton}
              icon={DiscordSVG}
            >
              {getString('discord.login')}
            </Button>
          </View>
        ) : (
          <View style={styles.connectedContainer}>
            {renderProfile()}

            <List.Section>
              <List.Subheader style={{ color: theme.primary }}>
                {getString('discord.rpcSettings')}
              </List.Subheader>

              <SettingSwitch
                label={getString('discord.enableRPC')}
                description={getString('discord.enableRPCDesc')}
                value={discordRPCEnabled ?? true}
                onPress={() => {
                  const newVal = !(discordRPCEnabled ?? true);
                  setAppSettings({
                    discordRPCEnabled: newVal,
                  });
                  if (!newVal) {
                    discordRPC.setActivity(null);
                  } else {
                    discordRPC.setAppOpen(getString('discord.openApp'));
                  }
                }}
                theme={theme}
              />

              {(discordRPCEnabled ?? true) && (
                <>
                  <SettingSwitch
                    label={getString('discord.showAppOpen')}
                    description={getString('discord.showAppOpenDesc')}
                    value={discordRPCAppOpen ?? true}
                    onPress={() => {
                      const newVal = !(discordRPCAppOpen ?? true);
                      setAppSettings({
                        discordRPCAppOpen: newVal,
                      });
                      if (!newVal) {
                        discordRPC.setActivity(null);
                      } else {
                        discordRPC.setAppOpen(getString('discord.openApp'));
                      }
                    }}
                    theme={theme}
                  />

                  <SettingSwitch
                    label={getString('discord.showBrowsing')}
                    description={getString('discord.showBrowsingDesc')}
                    value={discordRPCBrowsing ?? true}
                    onPress={() =>
                      setAppSettings({
                        discordRPCBrowsing: !(discordRPCBrowsing ?? true),
                      })
                    }
                    theme={theme}
                  />

                  <SettingSwitch
                    label={getString('discord.showReading')}
                    description={getString('discord.showReadingDesc')}
                    value={discordRPCReading ?? true}
                    onPress={() =>
                      setAppSettings({
                        discordRPCReading: !(discordRPCReading ?? true),
                      })
                    }
                    theme={theme}
                  />
                </>
              )}
            </List.Section>
          </View>
        )}
      </ScrollView>

      <Modal
        transparent={true}
        visible={isLoading}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.overlay}>
          <View style={[styles.loadingBox, { backgroundColor: theme.surface }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.onSurface }]}>
              {authMessage}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default SettingsDiscordScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  loginButton: {
    marginTop: 24,
  },
  connectedContainer: {
    paddingBottom: 24,
  },
  profileCard: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  banner: {
    height: 100,
    width: '100%',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  avatarContainer: {
    marginTop: -40,
    marginLeft: 16,
    padding: 4,
    backgroundColor: 'transparent',
    borderRadius: 44,
  },
  profileInfo: {
    padding: 16,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutButton: {
    margin: 16,
    marginTop: 0,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});
