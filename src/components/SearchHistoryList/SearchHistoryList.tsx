import { useSearchHistory } from '@hooks/persisted';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { FlashList } from '@shopify/flash-list';
import { ThemeColors } from '@theme/types';
import React, { memo, useCallback } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';

interface SearchHistoryListProps {
  theme: ThemeColors;
  onSearch: (keyword: string) => void;
}

const SearchHistoryList: React.FC<SearchHistoryListProps> = ({
  theme,
  onSearch,
}) => {
  const { searchHistory, enableSearchHistory, addSearchKey, removeSearchKey } =
    useSearchHistory();

  const handleItemPress = useCallback(
    (keyword: string) => {
      Keyboard.dismiss();
      addSearchKey(keyword);
      onSearch(keyword);
    },
    [addSearchKey, onSearch],
  );

  const handleItemRemove = useCallback(
    (keyword: string) => {
      removeSearchKey(keyword);
    },
    [removeSearchKey],
  );

  const renderItem = useCallback(
    ({ item }: { item: string }) => {
      return (
        <SearchHistoryItem
          keyword={item}
          theme={theme}
          onPress={handleItemPress}
          onRemove={handleItemRemove}
        />
      );
    },
    [theme, handleItemPress, handleItemRemove],
  );

  if (!enableSearchHistory || searchHistory.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={searchHistory}
        renderItem={renderItem}
        keyExtractor={item => item}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.listContent}
        extraData={theme}
      />
    </View>
  );
};

export default memo(SearchHistoryList);

// Item Component separated and memoized for list-performance
interface SearchHistoryItemProps {
  keyword: string;
  theme: ThemeColors;
  onPress: (keyword: string) => void;
  onRemove: (keyword: string) => void;
}

const SearchHistoryItemRaw: React.FC<SearchHistoryItemProps> = ({
  keyword,
  theme,
  onPress,
  onRemove,
}) => {
  return (
    <Pressable
      style={styles.itemContainer}
      onPress={() => onPress(keyword)}
      android_ripple={{ color: theme.rippleColor }}
    >
      <View style={styles.leftContent}>
        <MaterialCommunityIcons
          name="history"
          color={theme.onSurfaceVariant}
          size={22}
          style={styles.icon}
        />
        <Text
          style={[styles.keywordText, { color: theme.onSurface }]}
          numberOfLines={1}
        >
          {keyword}
        </Text>
      </View>
      <Pressable
        style={styles.removeButton}
        onPress={() => onRemove(keyword)}
        android_ripple={{ color: theme.rippleColor, borderless: true }}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <MaterialCommunityIcons
          name="delete-outline"
          color={theme.onSurfaceVariant}
          size={22}
        />
      </Pressable>
    </Pressable>
  );
};

const SearchHistoryItem = memo(SearchHistoryItemRaw);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    paddingHorizontal: 16,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 16,
  },
  keywordText: {
    fontSize: 16,
    flex: 1,
  },
  removeButton: {
    padding: 8,
    marginRight: -8, // compensate for padding to align right
  },
});
