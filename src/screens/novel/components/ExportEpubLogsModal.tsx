import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Portal } from 'react-native-paper';
import { Modal } from '@components';
import { useTheme } from '@hooks/persisted';
import { getString } from '@strings/translations';
import { NovelInfo } from '@database/types';
import EpubBuilder from '@modules/react-native-epub-creator';
import NativeFile from '@specs/NativeFile';
import { getNovelDownloadedChapters } from '@database/queries/ChapterQueries';
import { NOVEL_STORAGE } from '@utils/Storages';
import { showToast } from '@utils/showToast';

interface ExportEpubLogsModalProps {
  visible: boolean;
  onDismiss: () => void;
  novel: NovelInfo;
  destinationUri: string;
  startChapter?: number;
  endChapter?: number;
  epubStylesheet?: string;
  epubJavaScript?: string;
  epubUseCustomJS?: boolean;
}

export default function ExportEpubLogsModal({
  visible,
  onDismiss,
  novel,
  destinationUri,
  startChapter,
  endChapter,
  epubStylesheet,
  epubJavaScript,
  epubUseCustomJS,
}: ExportEpubLogsModalProps) {
  const theme = useTheme();

  const [isExporting, setIsExporting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const flatListRef = useRef<FlatList>(null);

  // Ref to handle cancellation inside the async loop
  const isCancelledRef = useRef(false);

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${time}] ${msg}`]);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);
  }, []);

  const handleDismiss = useCallback(() => {
    if (isExporting) {
      isCancelledRef.current = true;
    } else {
      onDismiss();
      setTimeout(() => {
        setLogs([]);
      }, 500);
    }
  }, [isExporting, onDismiss]);

  const startExport = useCallback(async () => {
    if (!novel) return;

    setIsExporting(true);
    isCancelledRef.current = false;
    setLogs([]);
    addLog(getString('novelScreen.exportEpubLogsModal.logStart'));

    let epub: EpubBuilder | undefined;

    try {
      addLog(getString('novelScreen.exportEpubLogsModal.logFetchChapters'));
      const chapters = await getNovelDownloadedChapters(
        novel.id,
        startChapter,
        endChapter,
      );

      if (chapters.length === 0) {
        addLog(getString('novelScreen.exportEpubLogsModal.logNoChapters'));
        setIsExporting(false);
        return;
      }

      addLog(getString('novelScreen.exportEpubLogsModal.logPreparing'));
      epub = new EpubBuilder(
        {
          title: novel.name,
          fileName: novel.name.replace(/[\\/:*?"<>|\s]/g, '') || 'novel',
          language: 'en',
          cover: novel.cover ?? undefined,
          description: novel.summary ?? undefined,
          author: novel.author ?? undefined,
          bookId: novel.pluginId.toString(),
          stylesheet: epubStylesheet || undefined,
          js: epubUseCustomJS ? epubJavaScript : undefined,
        },
        destinationUri,
      );

      await epub.prepare();

      let addedChapters = 0;
      for (let i = 0; i < chapters.length; i++) {
        if (isCancelledRef.current) {
          addLog(getString('novelScreen.exportEpubLogsModal.logCancelled'));
          await epub.discardChanges();
          setIsExporting(false);
          return;
        }

        const chapter = chapters[i];

        addLog(
          getString('novelScreen.exportEpubLogsModal.logAddingChapter', {
            chapterNumber: (i + 1).toString(),
            chapterName: chapter.name,
          }),
        );

        const chapterFilePath = `${NOVEL_STORAGE}/${novel.pluginId}/${novel.id}/${chapter.id}/index.html`;

        if (NativeFile.exists(chapterFilePath)) {
          let chapterContent = NativeFile.readFile(chapterFilePath);

          const chapterDir = `${NOVEL_STORAGE}/${novel.pluginId}/${novel.id}/${chapter.id}`;
          const escapedDir = chapterDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const imagePathRegex = new RegExp(
            `file://(${escapedDir}/[^"'\\s]+)`,
            'g',
          );

          for (const match of chapterContent.matchAll(imagePathRegex)) {
            const imagePath = match[1];
            if (imagePath && !NativeFile.exists(imagePath)) {
              const escapedPath = imagePath.replace(
                /[.*+?^${}()|[\]\\]/g,
                '\\$&',
              );
              const figureRegex = new RegExp(
                `<figure[^>]*>.*?${escapedPath}.*?</figure>`,
                'gs',
              );

              chapterContent = chapterContent.replace(figureRegex, '');

              const imgRegex = new RegExp(
                `<img[^>]*${escapedPath}[^>]*\\/?>`,
                'g',
              );

              chapterContent = chapterContent.replace(imgRegex, '');
            }
          }

          await epub.addChapter({
            title:
              chapter.name?.trim() || `Chapter ${chapter.chapterNumber || i}`,
            fileName: `Chapter${i}`,
            htmlBody: `<chapter data-novel-id='${novel.pluginId}' data-chapter-id='${chapter.id}'>${chapterContent}</chapter>`,
          });

          addedChapters++;
        }
      }

      if (addedChapters === 0) {
        addLog(getString('novelScreen.exportEpubLogsModal.logNoChapters'));
        await epub.discardChanges();
        setIsExporting(false);
        return;
      }

      await epub.save();

      const successLog = getString(
        'novelScreen.exportEpubLogsModal.logSuccess',
        {
          count: addedChapters,
        },
      );
      addLog(successLog);
      showToast(successLog);
    } catch (error: any) {
      const errorMsg = error?.message || error;
      const failedLog = getString('novelScreen.exportEpubLogsModal.logFailed', {
        error: errorMsg,
      });
      addLog(failedLog);
      showToast(failedLog);
      await epub?.discardChanges();
    } finally {
      setIsExporting(false);
    }
  }, [
    novel,
    destinationUri,
    startChapter,
    endChapter,
    epubStylesheet,
    epubJavaScript,
    epubUseCustomJS,
    addLog,
  ]);

  useEffect(() => {
    if (visible && logs.length === 0 && !isExporting) {
      startExport();
    }
  }, [visible, logs.length, isExporting, startExport]);

  const renderItem = useCallback(
    ({ item }: { item: string }) => (
      <View style={styles.logEntry}>
        <Text
          style={[styles.logMessage, { color: theme.onSurface }]}
          selectable
        >
          {item}
        </Text>
      </View>
    ),
    [theme],
  );

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        dismissable={!isExporting}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.onSurface }]}>
            {getString('novelScreen.exportEpubLogsModal.title')}
          </Text>
          {isExporting && (
            <Text style={[styles.runningText, { color: theme.primary }]}>
              ● {getString('common.loading')}
            </Text>
          )}
        </View>

        <View>
          <Text style={[{ color: theme.onSurfaceVariant, marginBottom: 16 }]}>
            {getString('novelScreen.exportEpubLogsModal.description')}
          </Text>

          <FlatList
            ref={flatListRef}
            data={logs}
            keyExtractor={(item, index) => String(index)}
            renderItem={renderItem}
            style={[styles.list, { backgroundColor: '#0D1117' }]}
            contentContainerStyle={styles.listContent}
            initialNumToRender={30}
          />
        </View>

        <View style={styles.footer}>
          <View style={styles.footerRight}>
            <Pressable
              style={[
                styles.footerBtn,
                {
                  borderColor: isExporting ? theme.outline : theme.primary,
                  backgroundColor: isExporting ? 'transparent' : theme.primary,
                },
              ]}
              onPress={handleDismiss}
            >
              <Text
                style={{
                  color: isExporting ? theme.onSurface : theme.onPrimary,
                  fontSize: 13,
                }}
              >
                {getString(isExporting ? 'common.cancel' : 'common.ok')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  runningText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  list: {
    borderRadius: 8,
    maxHeight: 350,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  logEntry: {
    flexDirection: 'row',
    paddingVertical: 3,
  },
  logMessage: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 11,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  footerBtn: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  footerRight: {
    flexDirection: 'row',
  },
});
