import { Appbar, SafeAreaView } from '@components';
import type { BottomSheetModalMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { useChapterReaderSettings, useTheme } from '@hooks/persisted';
import { useNavigation } from '@react-navigation/native';
import { getString } from '@strings/translations';
import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { FAB } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ReaderSettingsBottomSheet from '../../reader/components/ReaderSettings/ReaderSettingsBottomSheet';
import ReaderPreviewWebView from './ReaderPreviewWebView';

const SettingsReaderScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const readerSettings = useChapterReaderSettings();
  const bottomSheetRef = useRef<BottomSheetModalMethods>(null);
  const { bottom, right } = useSafeAreaInsets();

  return (
    <SafeAreaView
      excludeTop
      style={[styles.container, { backgroundColor: readerSettings.theme }]}
    >
      <Appbar
        handleGoBack={navigation.goBack}
        mode="small"
        theme={theme}
        title={getString('readerSettings.title')}
      />
      <View style={styles.preview}>
        <ReaderPreviewWebView />
      </View>
      <FAB
        color={theme.onPrimary}
        icon="cog"
        onPress={() => bottomSheetRef.current?.present()}
        style={[styles.fab, { backgroundColor: theme.primary, bottom, right }]}
      />
      <ReaderSettingsBottomSheet bottomSheetRef={bottomSheetRef} />
    </SafeAreaView>
  );
};

export default SettingsReaderScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  fab: { margin: 16, position: 'absolute' },
  preview: { flex: 1 },
});
