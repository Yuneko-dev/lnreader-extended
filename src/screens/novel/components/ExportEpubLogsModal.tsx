import { Button, TaskLogDialog } from '@components';
import { getNovelDownloadedChapters } from '@database/queries/ChapterQueries';
import { NovelInfo } from '@database/types';
import { useBufferedLogs } from '@hooks';
import EpubBuilder from '@modules/react-native-epub-creator';
import { resolveUrl } from '@services/plugin/fetch';
import NativeFile from '@specs/NativeFile';
import { getString } from '@strings/translations';
import { APP_NAME } from '@utils/constants/metadata';
import { showToast } from '@utils/showToast';
import { NOVEL_STORAGE } from '@utils/Storages';
import * as Notifications from 'expo-notifications';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { version as appVersion } from '../../../../package.json';

interface ExportEpubLogsModalProps {
  visible: boolean;
  onDismiss: () => void;
  novel: NovelInfo;
  destinationUri: string;
  fileName: string;
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
  fileName,
  startChapter,
  endChapter,
  epubStylesheet,
  epubJavaScript,
  epubUseCustomJS,
}: ExportEpubLogsModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { logs, addLog, clearLogs, flushLogs } = useBufferedLogs();

  // Ref to handle cancellation inside the async loop
  const isCancelledRef = useRef(false);
  const exportStartedRef = useRef(false);

  const handleDismiss = useCallback(() => {
    if (isExporting) {
      isCancelledRef.current = true;
    } else {
      clearLogs();
      onDismiss();
    }
  }, [clearLogs, isExporting, onDismiss]);

  const startExport = useCallback(async () => {
    if (!novel) return;

    setIsExporting(true);
    isCancelledRef.current = false;
    clearLogs();
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
          fileName,
          language: 'en',
          cover: novel.cover ?? undefined,
          description: novel.summary ?? undefined,
          author: novel.author ?? undefined,
          bookId: novel.pluginId.toString(),
          stylesheet: epubStylesheet || undefined,
          js: epubUseCustomJS ? epubJavaScript : undefined,
          genres: novel.genres
            ? novel.genres
                .split(',')
                .map(g => g.trim())
                .filter(Boolean)
            : undefined,
          publisher: novel.pluginId,
          generator: `${APP_NAME} v${appVersion}`,
          novelUrl: novel.pluginId
            ? resolveUrl(novel.pluginId, novel.path, true)
            : '',
          novelStatus: novel.status ?? undefined,
          artists: novel.artist ? [novel.artist] : undefined,
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

          epub.addChapter({
            title:
              chapter.name?.trim() || `Chapter ${chapter.chapterNumber || i}`,
            fileName: `Chapter${i}`,
            htmlBody: `<section epub:type="chapter" data-epub-chapter data-novel-id="${novel.pluginId}" data-chapter-id="${chapter.id}">${chapterContent}</section>`,
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

      addLog(getString('novelScreen.exportEpubLogsModal.logZipping'));

      const outputFile = await epub.save();

      const successLog = getString(
        'novelScreen.exportEpubLogsModal.logSuccess',
        {
          count: addedChapters,
        },
      );
      addLog(successLog);
      addLog(
        getString('novelScreen.exportEpubLogsModal.logFilePath', {
          path: outputFile,
        }),
      );
      showToast(successLog);

      // Send push notification
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: getString(
              'novelScreen.exportEpubLogsModal.notificationTitle',
            ),
            body: getString(
              'novelScreen.exportEpubLogsModal.notificationBody',
              { name: novel.name },
            ),
          },
          trigger: null,
        });
      } catch {
        // Notification permission denied or unavailable — non-critical
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const failedLog = getString('novelScreen.exportEpubLogsModal.logFailed', {
        error: errorMsg,
      });
      addLog(failedLog);
      showToast(failedLog);
      await epub?.discardChanges();
    } finally {
      flushLogs();
      setIsExporting(false);
    }
  }, [
    novel,
    destinationUri,
    fileName,
    startChapter,
    endChapter,
    epubStylesheet,
    epubJavaScript,
    epubUseCustomJS,
    addLog,
    clearLogs,
    flushLogs,
  ]);

  useEffect(() => {
    if (!visible) {
      exportStartedRef.current = false;
      return;
    }

    if (!exportStartedRef.current) {
      exportStartedRef.current = true;
      startExport();
    }
  }, [visible, startExport]);

  useEffect(
    () => () => {
      isCancelledRef.current = true;
    },
    [],
  );

  return (
    <TaskLogDialog
      visible={visible}
      title={getString('novelScreen.exportEpubLogsModal.title')}
      description={getString('novelScreen.exportEpubLogsModal.description')}
      running={isExporting}
      logs={logs}
      onDismiss={handleDismiss}
      actions={
        <View>
          <Button mode="contained-tonal" onPress={handleDismiss}>
            {getString(isExporting ? 'common.cancel' : 'common.ok')}
          </Button>
        </View>
      }
    />
  );
}
