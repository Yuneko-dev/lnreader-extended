import { useLibraryContext } from '@components/Context/LibraryContext';
import ServiceManager, { BackgroundTask } from '@services/ServiceManager';
import NativeFile from '@specs/NativeFile';
import { getString } from '@strings/translations';
import { showToast } from '@utils/showToast';
import { DocumentPickerResult } from 'expo-document-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';
import { useMMKVObject } from 'react-native-mmkv';
import { randomUUID } from 'react-native-quick-crypto';

export type PendingFileImport = { uri: string; filename: string };

/** Display name via ContentResolver (native), with a random fallback. */
const getFilename = (url: string): string => {
  const fallback = `${randomUUID().slice(0, 8)}.epub`;
  try {
    return NativeFile.getFileName(url, fallback);
  } catch {
    return fallback;
  }
};

/**
 * Resolve an EPUB intent into a pending import, or null if it isn't one.
 *
 * Only content:// and file:// VIEW intents reach us (see AndroidManifest).
 * The URI path is unreliable for content:// (e.g. .../document/1234 has no
 * extension), so we also accept it when the resolved display name is .epub.
 */
const resolveEpubIntent = (url: string): PendingFileImport | null => {
  const lower = url.toLowerCase();
  if (!lower.startsWith('content://') && !lower.startsWith('file://')) {
    return null;
  }
  const filename = getFilename(url);
  const pathIsEpub = lower.split(/[?#]/, 1)[0].endsWith('.epub');
  if (!pathIsEpub && !filename.toLowerCase().endsWith('.epub')) {
    return null;
  }
  return { uri: url, filename };
};

export default function useImport() {
  const { refetchLibrary } = useLibraryContext();
  const [queue] = useMMKVObject<BackgroundTask[]>(
    ServiceManager.manager.STORE_KEY,
  );
  const importQueue = useMemo(
    () => queue?.filter(t => t.name === 'IMPORT_EPUB') || [],
    [queue],
  );

  useEffect(() => {
    refetchLibrary();
  }, [importQueue, refetchLibrary]);

  const importNovel = useCallback((pickedNovel: DocumentPickerResult) => {
    if (pickedNovel.canceled) return;
    ServiceManager.manager.addTask(
      pickedNovel.assets.map(asset => ({
        name: 'IMPORT_EPUB',
        data: {
          filename: asset.name,
          uri: asset.uri,
        },
      })),
    );
  }, []);

  const resumeImport = () => ServiceManager.manager.resume();

  const pauseImport = () => ServiceManager.manager.pause();

  const cancelImport = () =>
    ServiceManager.manager.removeTasksByName('IMPORT_EPUB');

  return {
    importQueue,
    importNovel,
    resumeImport,
    pauseImport,
    cancelImport,
  };
}

/**
 * The launch intent persists for the activity's whole lifetime, so
 * Linking.getInitialURL() keeps returning a URL on every call (and after
 * onNewIntent, the latest intent's URL). We consume it exactly once per
 * process at module scope (survives remounts and Fast Refresh) so a remount
 * never re-opens the dialog for the launch intent. Live `url` events are
 * always genuine new intents and are handled independently.
 */
let initialUrlConsumed = false;

/** @internal Test-only: reset the module-level dedupe state. */
export const __resetEpubIntentState = () => {
  initialUrlConsumed = false;
};

/**
 * Handles EPUB files opened from external apps via VIEW intents.
 *
 * Mount once (EpubFileIntentDialog in Main.tsx): it registers a global
 * Linking listener. Re-processing the same intent is harmless — it just
 * re-opens the same confirmation dialog; the import runs only on confirm.
 */
export function useEpubFileIntent() {
  const [pendingFileImport, setPendingFileImport] =
    useState<PendingFileImport | null>(null);

  useEffect(() => {
    const handleUrl = (url: string) => {
      const pending = resolveEpubIntent(url);
      if (pending) {
        setPendingFileImport(pending);
      }
    };
    Linking.getInitialURL()
      .then(url => {
        // Consume the launch intent once, so remounts don't re-prompt.
        if (!initialUrlConsumed) {
          initialUrlConsumed = true;
          if (url) {
            handleUrl(url);
          }
        }
      })
      .catch(() => undefined);
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  const confirmFileImport = useCallback(() => {
    if (!pendingFileImport) {
      return;
    }
    ServiceManager.manager.addTask({
      name: 'IMPORT_EPUB',
      data: pendingFileImport,
    });
    showToast(
      `${getString('notifications.IMPORT_EPUB')}: ${
        pendingFileImport.filename
      }`,
    );
    setPendingFileImport(null);
  }, [pendingFileImport]);

  const cancelFileImport = useCallback(() => setPendingFileImport(null), []);

  return { pendingFileImport, confirmFileImport, cancelFileImport };
}
