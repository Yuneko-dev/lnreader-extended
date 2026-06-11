import { Button } from '@components';
import { ChapterInfo } from '@database/types';
import { useAppSettings } from '@hooks/persisted';
import { getString } from '@strings/translations';
import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

interface ReadButtonProps {
  firstUnreadChapter?: ChapterInfo;
  lastRead?: ChapterInfo;
  navigateToChapter: (chapter: ChapterInfo) => void;
}

const ReadButton = ({
  firstUnreadChapter,
  lastRead,
  navigateToChapter,
}: ReadButtonProps) => {
  const { useFabForContinueReading = false } = useAppSettings();

  const targetChapter = lastRead ?? firstUnreadChapter;

  const navigateToTargetChapter = () => {
    if (targetChapter) {
      navigateToChapter(targetChapter);
    }
  };

  if (!useFabForContinueReading) {
    return targetChapter ? (
      <Animated.View entering={ZoomIn.duration(150)}>
        <Button
          title={
            lastRead
              ? `${getString('novelScreen.continueReading')} ${lastRead.name}`
              : getString('novelScreen.startReadingChapters', {
                  name: targetChapter.name,
                })
          }
          style={styles.margin}
          onPress={navigateToTargetChapter}
          mode="contained"
        />
      </Animated.View>
    ) : null;
  } else {
    return null;
  }
};

export default ReadButton;

const styles = StyleSheet.create({
  margin: { margin: 16 },
});
