import { SafeAreaView } from '@components';
import {
  getAllUndownloadedAndUnreadChapters,
  getAllUndownloadedChapters,
  updateChapterProgressByIds,
} from '@database/queries/ChapterQueries';
import { ChapterInfo, NovelInfo } from '@database/types';
import { useBoolean } from '@hooks';
import { useDownload, useTheme } from '@hooks/persisted';
import { LegendListRef } from '@legendapp/list';
import { discordRPC } from '@modules/discord/DiscordRPC';
import { NovelScreenProps } from '@navigators/types';
import { useFocusEffect } from '@react-navigation/native';
import { resolveUrl } from '@services/plugin/fetch';
import { getString } from '@strings/translations';
import { ThemeColors } from '@theme/types';
import { MaterialDesignIconName } from '@type/icon';
import { showToast } from '@utils/showToast';
import { isNumber } from 'lodash-es';
import React, { Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { Share, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Appbar, Portal, Snackbar } from 'react-native-paper';
import Animated, {
  SlideInUp,
  SlideOutUp,
  useSharedValue,
} from 'react-native-reanimated';

import { Actionbar } from '../../components/Actionbar/Actionbar';
import { pickCustomNovelCover } from '../../database/queries/NovelQueries';
import DownloadCustomChapterModal from './components/DownloadCustomChapterModal';
import EditInfoModal from './components/EditInfoModal';
import ForceResetModal from './components/ForceResetModal';
import JumpToChapterModal from './components/JumpToChapterModal';
import NovelScreenLoading from './components/LoadingAnimation/NovelScreenLoading';
import NovelAppbar from './components/NovelAppbar';
import NovelScreenList from './components/NovelScreenList';
import { useNovelActions, useNovelValue } from './NovelContext';

const FLOATING_BUTTON_CLEARANCE = 88;

const Novel = ({ route, navigation }: NovelScreenProps) => {
  const novel = useNovelValue('novel');
  const chapters = useNovelValue('chapters');
  const {
    setNovel,
    bookmarkChapters,
    markChaptersRead,
    markChaptersUnread,
    markPreviouschaptersRead,
    markPreviousChaptersUnread,
    refreshChapters,
    deleteChapters,
    followNovel,
  } = useNovelActions();

  const theme = useTheme();
  const { downloadChapter, downloadChapters } = useDownload();

  const [selected, setSelected] = useState<ChapterInfo[]>([]);
  const [editInfoModal, showEditInfoModal] = useState(false);
  const [addToLibraryPromptVisible, setAddToLibraryPromptVisible] =
    useState(false);
  const [hasFloatingButtons, setHasFloatingButtons] = useState(false);
  const hasPromptedToAddToLibrary = useRef(false);

  const chapterListRef = useRef<LegendListRef | null>(null);

  const deleteDownloadsSnackbar = useBoolean();

  const headerOpacity = useSharedValue(0);
  const [forceResetModal, showForceResetModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const novelName = novel?.name || route.params?.name || '';
      if (novelName) {
        const url = novel
          ? resolveUrl(novel.pluginId, novel.path, true)
          : undefined;
        discordRPC.setBrowsingNovel(
          novelName,
          getString('discord.browseNovel'),
          novel?.cover,
          url,
        );
      }
    }, [route.params?.name, novel]),
  );

  const promptToAddToLibrary = useCallback(() => {
    if (novel?.inLibrary || hasPromptedToAddToLibrary.current) {
      return;
    }

    hasPromptedToAddToLibrary.current = true;
    setAddToLibraryPromptVisible(true);
  }, [novel?.inLibrary]);

  const downloadChapterWithPrompt = useCallback(
    (chapter: ChapterInfo) => {
      if (!novel) {
        return;
      }

      downloadChapter(novel, chapter);
      promptToAddToLibrary();
    },
    [downloadChapter, novel, promptToAddToLibrary],
  );

  const downloadChaptersWithPrompt = useCallback(
    (novelToDownload: NovelInfo, chaptersToDownload: ChapterInfo[]) => {
      if (chaptersToDownload.length === 0) {
        return;
      }

      downloadChapters(novelToDownload, chaptersToDownload);
      promptToAddToLibrary();
    },
    [downloadChapters, promptToAddToLibrary],
  );

  const downloadChs = useCallback(
    async (amount: number | 'all' | 'unread') => {
      if (!novel) {
        return;
      }

      let chaptersToUse = chapters;

      if (amount === 'all') {
        const allChapters = await getAllUndownloadedChapters(novel.id);
        chaptersToUse = allChapters;
      }

      if (amount === 'unread') {
        const allUnreadChapters = await getAllUndownloadedAndUnreadChapters(
          novel.id,
        );
        chaptersToUse = allUnreadChapters;
      }

      let filtered = chaptersToUse;

      if (isNumber(amount)) {
        filtered = filtered
          .filter(chapter => !chapter.isDownloaded)
          .slice(0, amount);
      }

      if (filtered.length > 0) {
        downloadChaptersWithPrompt(novel, filtered);
      }
    },
    [chapters, downloadChaptersWithPrompt, novel],
  );

  const deleteChs = useCallback(() => {
    deleteChapters(chapters.filter(c => c.isDownloaded));
  }, [chapters, deleteChapters]);

  const shareNovel = useCallback(() => {
    if (!novel) {
      return;
    }
    Share.share({
      message: resolveUrl(novel.pluginId, novel.path, true),
    });
  }, [novel]);

  const [jumpToChapterModal, showJumpToChapterModal] = useState(false);
  const {
    value: dlChapterModalVisible,
    setTrue: openDlChapterModal,
    setFalse: closeDlChapterModal,
  } = useBoolean();

  const actions = useMemo(() => {
    const list: { icon: MaterialDesignIconName; onPress: () => void }[] = [];

    if (!novel?.isLocal && selected.some(obj => !obj.isDownloaded)) {
      list.push({
        icon: 'download-outline',
        onPress: () => {
          if (novel) {
            downloadChaptersWithPrompt(
              novel,
              selected.filter(chapter => !chapter.isDownloaded),
            );
          }
          setSelected([]);
        },
      });
    }
    if (!novel?.isLocal && selected.some(obj => obj.isDownloaded)) {
      list.push({
        icon: 'trash-can-outline',
        onPress: () => {
          deleteChapters(selected.filter(chapter => chapter.isDownloaded));
          setSelected([]);
        },
      });
    }

    list.push({
      icon: 'bookmark-outline',
      onPress: () => {
        bookmarkChapters(selected);
        setSelected([]);
      },
    });

    if (selected.some(obj => obj.unread)) {
      list.push({
        icon: 'check',
        onPress: () => {
          markChaptersRead(selected);
          setSelected([]);
        },
      });
    }

    if (selected.some(obj => !obj.unread)) {
      const chapterIds = selected.map(chapter => chapter.id);

      list.push({
        icon: 'check-outline',
        onPress: () => {
          markChaptersUnread(selected);
          updateChapterProgressByIds(chapterIds, 0);
          setSelected([]);
          refreshChapters();
        },
      });
    }

    if (selected.length === 1) {
      if (selected[0].unread) {
        list.push({
          icon: 'playlist-check',
          onPress: () => {
            markPreviouschaptersRead(selected[0].id);
            setSelected([]);
          },
        });
      } else {
        list.push({
          icon: 'playlist-remove',
          onPress: () => {
            markPreviousChaptersUnread(selected[0].id);
            setSelected([]);
          },
        });
      }
    }

    return list;
  }, [
    bookmarkChapters,
    deleteChapters,
    downloadChaptersWithPrompt,
    markChaptersRead,
    markChaptersUnread,
    markPreviousChaptersUnread,
    markPreviouschaptersRead,
    novel,
    refreshChapters,
    selected,
  ]);

  const setCustomNovelCover = useCallback(async () => {
    if (!novel) {
      return;
    }
    const newCover = await pickCustomNovelCover(novel);
    if (newCover) {
      setNovel({
        ...novel,
        cover: newCover,
      });
    }
  }, [novel, setNovel]);

  const hideJumpToChapterModal = useCallback(
    () => showJumpToChapterModal(false),
    [],
  );
  const hideEditInfoModal = useCallback(() => showEditInfoModal(false), []);
  const handleFloatingButtonsVisibilityChange = useCallback(
    (visible: boolean) => setHasFloatingButtons(visible),
    [],
  );
  const hideAddToLibraryPrompt = useCallback(
    () => setAddToLibraryPromptVisible(false),
    [],
  );
  const addNovelToLibrary = useCallback(() => {
    hideAddToLibraryPrompt();
    if (!novel?.inLibrary) {
      followNovel().catch(error =>
        showToast('Failed updating: ' + (error as Error).message),
      );
    }
  }, [followNovel, hideAddToLibraryPrompt, novel?.inLibrary]);
  const clearSelection = useCallback(() => setSelected([]), []);
  const selectAll = useCallback(() => setSelected(chapters), [chapters]);

  const snackbarTheme = useMemo(
    () => ({
      colors: {
        ...theme,
        inverseOnSurface: theme.onSurface,
      },
    }),
    [theme],
  );
  const snackbarTextStyle = useMemo(
    () => ({ color: theme.onSurface }),
    [theme.onSurface],
  );
  const titleStyle = useMemo(
    () => ({ color: theme.onSurface }),
    [theme.onSurface],
  );
  const snackbarAction = useMemo(
    () => ({
      label: getString('common.delete'),
      onPress: () => {
        deleteChapters(chapters.filter(c => c.isDownloaded));
      },
    }),
    [chapters, deleteChapters],
  );

  const styles = useMemo(() => createStyles(theme), [theme]);
  const containerStyle = useMemo(
    () => [styles.container, { backgroundColor: theme.background }],
    [styles.container, theme.background],
  );

  return (
    <Portal.Host>
      <View style={containerStyle}>
        <Portal>
          {selected.length === 0 ? (
            <NovelAppbar
              novel={novel}
              deleteChapters={deleteChs}
              downloadChapters={downloadChs}
              showEditInfoModal={showEditInfoModal}
              setCustomNovelCover={setCustomNovelCover}
              downloadCustomChapterModal={openDlChapterModal}
              showJumpToChapterModal={showJumpToChapterModal}
              showForceResetModal={showForceResetModal}
              shareNovel={shareNovel}
              theme={theme}
              isLocal={novel?.isLocal ?? route.params?.isLocal ?? false}
              goBack={navigation.goBack}
              headerOpacity={headerOpacity}
            />
          ) : (
            <Animated.View
              entering={SlideInUp.duration(250)}
              exiting={SlideOutUp.duration(250)}
              style={styles.appbar}
            >
              <Appbar.Action
                icon="close"
                iconColor={theme.onBackground}
                onPress={clearSelection}
              />
              <Appbar.Content
                title={`${selected.length}`}
                titleStyle={titleStyle}
              />
              <Appbar.Action
                icon="select-all"
                iconColor={theme.onBackground}
                onPress={selectAll}
              />
            </Animated.View>
          )}
        </Portal>
        <SafeAreaView excludeTop>
          <Suspense fallback={<NovelScreenLoading theme={theme} />}>
            <NovelScreenList
              headerOpacity={headerOpacity}
              listRef={chapterListRef}
              navigation={navigation}
              routeBaseNovel={route.params}
              selected={selected}
              setSelected={setSelected}
              deleteDownloadSnackbar={deleteDownloadsSnackbar}
              onDownloadChapter={downloadChapterWithPrompt}
              onFloatingButtonsVisibilityChange={
                handleFloatingButtonsVisibilityChange
              }
            />
          </Suspense>
        </SafeAreaView>

        <Portal>
          <Actionbar active={selected.length > 0} actions={actions} />
          <Snackbar
            testID="delete-downloads-snackbar"
            visible={deleteDownloadsSnackbar.value}
            onDismiss={deleteDownloadsSnackbar.setFalse}
            onIconPress={deleteDownloadsSnackbar.setFalse}
            iconAccessibilityLabel={getString('common.cancel')}
            action={snackbarAction}
            theme={snackbarTheme}
            style={styles.snackbar}
            wrapperStyle={
              hasFloatingButtons ? styles.snackbarAboveFloatingButtons : null
            }
          >
            <Text style={snackbarTextStyle}>
              {getString('novelScreen.deleteMessage')}
            </Text>
          </Snackbar>
          <Snackbar
            testID="add-to-library-snackbar"
            visible={addToLibraryPromptVisible}
            onDismiss={hideAddToLibraryPrompt}
            onIconPress={hideAddToLibraryPrompt}
            iconAccessibilityLabel={getString('common.cancel')}
            action={{
              label: getString('common.add'),
              onPress: addNovelToLibrary,
            }}
            theme={snackbarTheme}
            style={styles.snackbar}
            wrapperStyle={
              hasFloatingButtons ? styles.snackbarAboveFloatingButtons : null
            }
          >
            <Text style={snackbarTextStyle}>
              {getString('novelScreen.promptAddToLibrary')}
            </Text>
          </Snackbar>
        </Portal>
        <Portal>
          {novel ? (
            <>
              <JumpToChapterModal
                modalVisible={jumpToChapterModal}
                hideModal={hideJumpToChapterModal}
                novel={novel}
                chapterListRef={chapterListRef}
                navigation={navigation}
              />
              <EditInfoModal
                modalVisible={editInfoModal}
                hideModal={hideEditInfoModal}
                novel={novel}
                setNovel={setNovel}
                theme={theme}
              />
              <DownloadCustomChapterModal
                modalVisible={dlChapterModalVisible}
                hideModal={closeDlChapterModal}
                novel={novel}
                chapters={chapters}
                theme={theme}
                downloadChapters={downloadChaptersWithPrompt}
              />
              <ForceResetModal
                visible={forceResetModal}
                onDismiss={() => showForceResetModal(false)}
                novel={novel}
                theme={theme}
              />
            </>
          ) : null}
        </Portal>
      </View>
    </Portal.Host>
  );
};

export default React.memo(Novel);

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    appbar: {
      alignItems: 'center',
      backgroundColor: theme.surface2,
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      flexDirection: 'row',
      paddingBottom: 8,
      paddingTop: StatusBar.currentHeight || 0,
      position: 'absolute',
      width: '100%',
    },
    container: { flex: 1 },
    rowBack: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    snackbar: { backgroundColor: theme.surface },
    snackbarAboveFloatingButtons: { bottom: FLOATING_BUTTON_CLEARANCE },
  });
}
