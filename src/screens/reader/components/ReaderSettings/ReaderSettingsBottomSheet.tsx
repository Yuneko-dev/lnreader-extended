import BottomSheet from '@components/BottomSheet/BottomSheet';
import type { BottomSheetModalMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { useTheme } from '@hooks/persisted';
import React, { type RefObject, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ReaderSettingsPanel from './ReaderSettingsPanel';

type Props = {
  bottomSheetRef: RefObject<BottomSheetModalMethods | null>;
};

const ReaderSettingsBottomSheet = ({ bottomSheetRef }: Props) => {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const { bottom, left, right } = useSafeAreaInsets();
  const snapPoints = useMemo(() => [height * 0.4, height * 0.75], [height]);

  return (
    <BottomSheet
      backgroundStyle={{ backgroundColor: theme.surface }}
      bottomInset={bottom}
      bottomSheetRef={bottomSheetRef}
      containerStyle={{ marginLeft: left, marginRight: right }}
      enableContentPanningGesture
      enablePanDownToClose
      snapPoints={snapPoints}
    >
      {/* BottomSheetView would override the active tab's scrollable registration. */}
      <View style={styles.container}>
        <View style={styles.handleContainer}>
          <View
            style={[styles.handle, { backgroundColor: theme.onSurfaceVariant }]}
          />
        </View>
        <ReaderSettingsPanel />
      </View>
    </BottomSheet>
  );
};

export default React.memo(ReaderSettingsBottomSheet);

const styles = StyleSheet.create({
  container: { flex: 1 },
  handle: { borderRadius: 2, height: 4, opacity: 0.4, width: 32 },
  handleContainer: { alignItems: 'center', paddingVertical: 10 },
});
