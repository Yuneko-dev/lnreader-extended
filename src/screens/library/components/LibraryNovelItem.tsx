import React, { memo, useCallback } from 'react';
import NovelCover from '@components/NovelCover';
import { NovelInfo } from '@database/types';
import { ThemeColors } from '@theme/types';
import { ImageRequestInit } from '@plugins/types';

interface LibraryNovelItemProps {
  item: NovelInfo;
  theme: ThemeColors;
  isSelected: boolean;
  hasSelection: boolean;
  onSelect: (id: number) => void;
  onNavigate: (item: NovelInfo) => void;
  imageRequestInit: ImageRequestInit | undefined;
  // Layout props from parent (avoids per-item hook subscriptions)
  numColumns?: number;
  coverHeight?: number;
  displayMode?: number;
  showDownloadBadges?: boolean;
  showUnreadBadges?: boolean;
}

const LibraryNovelItem = memo(function LibraryNovelItem({
  item,
  theme,
  isSelected,
  hasSelection,
  onSelect,
  onNavigate,
  imageRequestInit,
  numColumns,
  coverHeight,
  displayMode,
  showDownloadBadges,
  showUnreadBadges,
}: LibraryNovelItemProps) {
  const handleLongPress = useCallback(() => {
    onSelect(item.id);
  }, [item.id, onSelect]);

  const handlePress = useCallback(() => {
    if (hasSelection) {
      onSelect(item.id);
    } else {
      onNavigate(item);
    }
  }, [hasSelection, item, onSelect, onNavigate]);

  return (
    <NovelCover
      item={item}
      theme={theme}
      isSelected={isSelected}
      hasSelection={hasSelection}
      onLongPress={handleLongPress}
      onPress={handlePress}
      libraryStatus={false}
      imageRequestInit={imageRequestInit}
      numColumns={numColumns}
      coverHeight={coverHeight}
      displayMode={displayMode}
      showDownloadBadges={showDownloadBadges}
      showUnreadBadges={showUnreadBadges}
    />
  );
});

export default LibraryNovelItem;
