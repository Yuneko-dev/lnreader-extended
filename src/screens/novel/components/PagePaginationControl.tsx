import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { IconButton } from 'react-native-paper';
import color from 'color';
import { ThemeColors } from '@theme/types';

interface PagePaginationControlProps {
  pages: string[];
  currentPageIndex: number;
  onPageChange: (pageIndex: number) => void;
  onOpenDrawer: () => void;
  theme: ThemeColors;
}

const PagePaginationControl: React.FC<PagePaginationControlProps> = ({
  pages,
  currentPageIndex,
  onPageChange,
  onOpenDrawer,
  theme,
}) => {
  const totalPages = pages.length;

  const canGoPrevious = currentPageIndex > 0;
  const canGoNext = currentPageIndex < totalPages - 1;

  const handlePrevious = () => {
    if (canGoPrevious) {
      onPageChange(currentPageIndex - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onPageChange(currentPageIndex + 1);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.navButton, !canGoPrevious && styles.disabledButton]}
        onPress={handlePrevious}
        disabled={!canGoPrevious}
        android_ripple={{
          color: theme.rippleColor,
          borderless: true,
          radius: 24,
        }}
      >
        <IconButton
          icon="chevron-left"
          iconColor={canGoPrevious ? theme.onSurface : theme.onSurfaceDisabled}
          size={24}
        />
      </Pressable>

      <Pressable
        style={[
          styles.volumeButton,
          {
            backgroundColor: color(theme.primary).alpha(0.12).string(),
            borderColor: 'transparent',
          },
        ]}
        onPress={onOpenDrawer}
        android_ripple={{
          color: theme.rippleColor,
        }}
      >
        <Text
          style={[
            styles.volumeText,
            {
              color: theme.primary,
            },
          ]}
          numberOfLines={1}
        >
          {pages[currentPageIndex]}
        </Text>
        <IconButton
          icon="chevron-down"
          iconColor={theme.primary}
          size={16}
          style={styles.dropdownIcon}
        />
      </Pressable>

      <Pressable
        style={[styles.navButton, !canGoNext && styles.disabledButton]}
        onPress={handleNext}
        disabled={!canGoNext}
        android_ripple={{
          color: theme.rippleColor,
          borderless: true,
          radius: 24,
        }}
      >
        <IconButton
          icon="chevron-right"
          iconColor={canGoNext ? theme.onSurface : theme.onSurfaceDisabled}
          size={24}
        />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  volumeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1,
    height: 44,
    marginHorizontal: 8,
    paddingHorizontal: 16,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  disabledButton: {
    opacity: 0.3,
  },
  volumeText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
    marginRight: -4,
  },
  dropdownIcon: {
    margin: 0,
    padding: 0,
  },
});

export default PagePaginationControl;
