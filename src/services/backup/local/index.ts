import {
  keepLocalCopy,
  pick,
  saveDocuments,
  types,
} from '@react-native-documents/picker';
import DebugLogService from '@services/DebugLogService';
import { BackgroundTaskMetadata } from '@services/ServiceManager';
import NativeFile from '@specs/NativeFile';
import NativeZipArchive from '@specs/NativeZipArchive';
import { getString } from '@strings/translations';
import { showToast } from '@utils/showToast';
import { sleep } from '@utils/sleep';
import { ROOT_STORAGE } from '@utils/Storages';
import dayjs from 'dayjs';

import { ZipBackupName } from '../types';
import { CACHE_DIR_PATH, prepareBackupData, restoreData } from '../utils';

const BTAG = '[Backup]';

/**
 * Check if the abort signal has been triggered, and throw if so.
 */
const checkAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw new Error('Backup cancelled');
  }
};

export const createBackup = async (
  setMeta?: (
    transformer: (meta: BackgroundTaskMetadata) => BackgroundTaskMetadata,
  ) => void,
  signal?: AbortSignal,
) => {
  try {
    DebugLogService.addEntry('info', `${BTAG} Starting backup...`);
    setMeta?.(meta => ({
      ...meta,
      isRunning: true,
      progress: 0 / 4,
      progressText: getString('backupScreen.preparingData'),
    }));

    checkAborted(signal);

    DebugLogService.addEntry('log', `${BTAG} Preparing backup data...`);
    await prepareBackupData(CACHE_DIR_PATH);
    DebugLogService.addEntry('log', `${BTAG} Backup data prepared`);

    checkAborted(signal);

    setMeta?.(meta => ({
      ...meta,
      progress: 1 / 4,
      progressText: getString('backupScreen.uploadingDownloadedFiles'),
    }));

    await sleep(200);

    checkAborted(signal);

    DebugLogService.addEntry('log', `${BTAG} Zipping downloaded files...`);
    await NativeZipArchive.zip(
      ROOT_STORAGE,
      CACHE_DIR_PATH + '/' + ZipBackupName.DOWNLOAD,
    );
    DebugLogService.addEntry('log', `${BTAG} Downloaded files zipped`);

    checkAborted(signal);

    setMeta?.(meta => ({
      ...meta,
      progress: 2 / 4,
      progressText: getString('backupScreen.uploadingData'),
    }));

    await sleep(200);

    checkAborted(signal);

    DebugLogService.addEntry('log', `${BTAG} Creating final zip archive...`);
    await NativeZipArchive.zip(CACHE_DIR_PATH, CACHE_DIR_PATH + '.zip');
    DebugLogService.addEntry('log', `${BTAG} Final archive created`);

    checkAborted(signal);

    setMeta?.(meta => ({
      ...meta,
      progress: 3 / 4,
      progressText: getString('backupScreen.savingBackup'),
    }));

    const datetime = dayjs().format('YYYY-MM-DD_HH_mm');
    const fileName = 'lnreader_backup_' + datetime + '.zip';

    checkAborted(signal);

    DebugLogService.addEntry('log', `${BTAG} Saving as ${fileName}...`);
    await saveDocuments({
      sourceUris: ['file://' + CACHE_DIR_PATH + '.zip'],
      copy: false,
      mimeType: 'application/zip',
      fileName,
    });

    setMeta?.(meta => ({
      ...meta,
      progress: 4 / 4,
      isRunning: false,
    }));

    DebugLogService.addEntry(
      'info',
      `${BTAG} ✅ Backup completed successfully`,
    );
    showToast(getString('backupScreen.backupCreated'));
  } catch (error: any) {
    setMeta?.(meta => ({
      ...meta,
      isRunning: false,
    }));
    if (signal?.aborted) {
      DebugLogService.addEntry('warn', `${BTAG} ⚠️ Backup was cancelled`);
    } else {
      DebugLogService.addEntry(
        'error',
        `${BTAG} ❌ Backup failed: ${error.message}`,
      );
      showToast(error.message);
    }
  }
};

export const restoreBackup = async (
  setMeta?: (
    transformer: (meta: BackgroundTaskMetadata) => BackgroundTaskMetadata,
  ) => void,
) => {
  try {
    DebugLogService.addEntry('info', `${BTAG} Starting restore...`);
    setMeta?.(meta => ({
      ...meta,
      isRunning: true,
      progress: 0 / 4,
      progressText: getString('backupScreen.downloadingData'),
    }));

    DebugLogService.addEntry('log', `${BTAG} Picking backup file...`);
    const [result] = await pick({
      mode: 'import',
      type: [types.zip],
      allowVirtualFiles: true, // TODO: hopefully this just works
    });
    DebugLogService.addEntry('log', `${BTAG} File selected: ${result.uri}`);

    if (NativeFile.exists(CACHE_DIR_PATH)) {
      NativeFile.unlink(CACHE_DIR_PATH);
    }

    DebugLogService.addEntry('log', `${BTAG} Copying backup file...`);
    const [localRes] = await keepLocalCopy({
      files: [
        {
          uri: result.uri,
          fileName: 'backup.zip',
        },
      ],
      destination: 'cachesDirectory',
    });

    if (localRes.status === 'error') {
      throw new Error(localRes.copyError);
    }

    const localPath = localRes.localUri.replace(/^file:(\/{1,2})?\//, '/');

    setMeta?.(meta => ({
      ...meta,
      progress: 1 / 4,
      progressText: getString('backupScreen.restoringData'),
    }));

    await sleep(200);

    DebugLogService.addEntry('log', `${BTAG} Unzipping backup...`);
    await NativeZipArchive.unzip(localPath, CACHE_DIR_PATH);
    DebugLogService.addEntry('log', `${BTAG} Backup unzipped`);

    setMeta?.(meta => ({
      ...meta,
      progress: 2 / 4,
      progressText: getString('backupScreen.restoringData'),
    }));

    await sleep(200);

    DebugLogService.addEntry('log', `${BTAG} Restoring data to database...`);
    await restoreData(CACHE_DIR_PATH);
    DebugLogService.addEntry('log', `${BTAG} Data restored`);

    setMeta?.(meta => ({
      ...meta,
      progress: 3 / 4,
      progressText: getString('backupScreen.downloadingDownloadedFiles'),
    }));

    await sleep(200);

    DebugLogService.addEntry('log', `${BTAG} Restoring downloaded files...`);
    // TODO: unlink here too?
    await NativeZipArchive.unzip(
      CACHE_DIR_PATH + '/' + ZipBackupName.DOWNLOAD,
      ROOT_STORAGE,
    );
    DebugLogService.addEntry('log', `${BTAG} Downloaded files restored`);

    setMeta?.(meta => ({
      ...meta,
      progress: 4 / 4,
      isRunning: false,
    }));

    DebugLogService.addEntry(
      'info',
      `${BTAG} ✅ Restore completed successfully`,
    );
    showToast(getString('backupScreen.backupRestored'));
  } catch (error: any) {
    setMeta?.(meta => ({
      ...meta,
      isRunning: false,
    }));
    DebugLogService.addEntry(
      'error',
      `${BTAG} ❌ Restore failed: ${error.message}`,
    );
    showToast(error.message);
  }
};
