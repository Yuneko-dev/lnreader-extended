import React, { useCallback } from 'react';
import { StyleSheet, View, Pressable, Text, ListRenderItem } from 'react-native';
import { BottomSheetFlatList, BottomSheetView } from '@gorhom/bottom-sheet';
import color from 'color';

import BottomSheet from '@components/BottomSheet/BottomSheet';
import { ThemeColors } from '@theme/types';
import { BottomSheetModalMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { overlay } from 'react-native-paper';

interface PageNavigationBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModalMethods | null>;
  theme: ThemeColors;
  pages: string[];
  pageIndex: number;
  openPage: (index: number) => void;
}

export default function PageNavigationBottomSheet({
  bottomSheetRef,
  theme,
  pages,
  pageIndex,
  openPage,
}: PageNavigationBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { left, right } = insets;

  const renderItem: ListRenderItem<string> = useCallback(
    ({ item, index }) => {
      const isSelected = index === pageIndex;
      const usingVolume = isNaN(Number(item));
      return (
        <View
          style={[
            styles.pageItemContainer,
            isSelected && {
              backgroundColor: theme.isDark
                ? color(theme.primary).alpha(0.2).string()
                : color(theme.primaryContainer).alpha(0.5).string(),
            },
          ]}
        >
          <Pressable
            android_ripple={{
              color: isSelected
                ? color(theme.primary).alpha(0.2).string()
                : theme.rippleColor,
            }}
            style={styles.pageItem}
            onPress={() => {
              openPage(index);
              bottomSheetRef.current?.close();
            }}
          >
            <View style={styles.pageItemContent}>
              <Text
                style={[
                  styles.pageText,
                  {
                    color: isSelected ? theme.primary : theme.onSurfaceVariant,
                  },
                ]}
              >
                {usingVolume ? 'Volume' : 'Page'} {item}
              </Text>
            </View>
          </Pressable>
        </View>
      );
    },
    [theme, pageIndex, openPage, bottomSheetRef],
  );

  return (
    <BottomSheet
      bottomSheetRef={bottomSheetRef}
      snapPoints={[Math.min(400, pages.length * 56 + 12 + insets.bottom)]}
      backgroundStyle={styles.transparent}
    >
      <BottomSheetView
        style={[
          styles.contentContainer,
          {
            backgroundColor: overlay(2, theme.surface),
            marginStart: left,
            marginEnd: right,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <BottomSheetFlatList
          data={pages}
          extraData={pageIndex}
          renderItem={renderItem}
          keyExtractor={(item: string, index: number) => `page_${index}_${item}`}
          contentContainerStyle={styles.listContent}
          initialNumToRender={15}
        />
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    flex: 1,
    maxHeight: 400,
  },
  listContent: {
    paddingBottom: 8,
    paddingTop: 4,
  },
  pageItem: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  pageItemContainer: {
    borderRadius: 0,
    marginHorizontal: 0,
    overflow: 'hidden',
  },
  pageItemContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pageText: {},
  selectedIndicator: {
    borderRadius: 2,
    height: 20,
    width: 3,
  },
  transparent: {
    backgroundColor: 'transparent',
  },
});
