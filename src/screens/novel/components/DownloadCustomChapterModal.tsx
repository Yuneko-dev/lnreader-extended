import { KeyboardAvoidingModal, StableTextInput } from '@components';
import { ChapterInfo, NovelInfo } from '@database/types';
import { getString } from '@strings/translations';
import { ThemeColors } from '@theme/types';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton } from 'react-native-paper';

interface DownloadCustomChapterModalProps {
  theme: ThemeColors;
  hideModal: () => void;
  modalVisible: boolean;
  novel: NovelInfo;
  chapters: ChapterInfo[];
  downloadChapters: (novel: NovelInfo, chapters: ChapterInfo[]) => void;
}

const DownloadCustomChapterModal = ({
  theme,
  hideModal,
  modalVisible,
  novel,
  chapters,
  downloadChapters,
}: DownloadCustomChapterModalProps) => {
  const [text, setText] = useState(0);

  const onDismiss = () => {
    hideModal();
    setText(0);
  };

  const onSubmit = () => {
    downloadChapters(
      novel,
      chapters
        .filter(chapter => chapter.unread && !chapter.isDownloaded)
        .slice(0, text),
    );
  };

  const onChangeText = (txt: string) => {
    if (Number(txt) >= 0) {
      setText(Number(txt));
    }
  };

  return (
    <KeyboardAvoidingModal
      visible={modalVisible}
      title={getString('novelScreen.download.customAmount')}
      onDismiss={onDismiss}
      onConfirm={onSubmit}
      confirmLabel={getString('libraryScreen.bottomSheet.display.download')}
    >
      <View style={styles.row}>
        <IconButton
          icon="chevron-double-left"
          animated
          size={24}
          iconColor={theme.primary}
          onPress={() => text > 9 && setText(prevState => prevState - 10)}
        />
        <IconButton
          icon="chevron-left"
          animated
          size={24}
          iconColor={theme.primary}
          onPress={() => text > 0 && setText(prevState => prevState - 1)}
        />
        <StableTextInput
          value={text.toString()}
          style={[{ color: theme.onSurface }, styles.marginHorizontal]}
          keyboardType="numeric"
          onChangeText={onChangeText}
        />
        <IconButton
          icon="chevron-right"
          animated
          size={24}
          iconColor={theme.primary}
          onPress={() => setText(prevState => prevState + 1)}
        />
        <IconButton
          icon="chevron-double-right"
          animated
          size={24}
          iconColor={theme.primary}
          onPress={() => setText(prevState => prevState + 10)}
        />
      </View>
    </KeyboardAvoidingModal>
  );
};

export default DownloadCustomChapterModal;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center' },
  marginHorizontal: { marginHorizontal: 4 },
});
