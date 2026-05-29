import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Portal } from 'react-native-paper';
import { Modal, LogViewer } from '@components';
import { BaseLogEntry } from '@components/LogViewer';
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
  const [logs, setLogs] = useState<BaseLogEntry[]>([]);

  // Ref to handle cancellation inside the async loop
  const isCancelledRef = useRef(false);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [
      ...prev,
      {
        id: `${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .substring(2)}`,
        message: msg,
        timestamp: new Date(),
        level: 'info',
      },
    ]);
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
          <Text style={[styles.description, { color: theme.onSurfaceVariant }]}>
            {getString('novelScreen.exportEpubLogsModal.description')}
          </Text>

          <LogViewer
            logs={logs}
            theme={theme}
            style={{ backgroundColor: theme.surfaceVariant, ...styles.list }}
            contentContainerStyle={styles.listContent}
          />
        </View>

        <View style={styles.footer}>
          <View style={styles.footerRight}>
            <Pressable
              style={[
                styles.footerBtn,
                { borderColor: isExporting ? theme.outline : theme.primary },
                isExporting
                  ? styles.bgTransparent
                  : { backgroundColor: theme.primary },
              ]}
              onPress={handleDismiss}
            >
              <Text
                style={[
                  styles.footerBtnText,
                  { color: isExporting ? theme.onSurface : theme.onPrimary },
                ]}
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
  description: {
    marginBottom: 16,
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
  footerBtnText: {
    fontSize: 13,
  },
  bgTransparent: {
    backgroundColor: 'transparent',
  },
  footerRight: {
    flexDirection: 'row',
  },
});
