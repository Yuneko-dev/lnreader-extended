import type { ChapterReaderSettings } from '@hooks/persisted/useSettings';
import * as Speech from 'expo-speech';
import { NativeEventEmitter, NativeModules } from 'react-native';

import { isTikTokVoice } from '../ReaderSettings/TTSVoices';

type TTSSettings = NonNullable<ChapterReaderSettings['tts']>;

export type TTSPlaybackError =
  | 'tiktok-unavailable'
  | 'voice-required'
  | 'playback-error';

export type TTSPlaybackCallbacks = {
  onWillPlay?: () => void;
  onStart?: () => void;
  onDone?: () => void;
  onError?: (error: TTSPlaybackError, message?: string) => void;
  onInterrupted?: () => void;
};

type ActiveSession = {
  callbacks: TTSPlaybackCallbacks;
  engine: 'native' | 'tiktok';
  id: symbol;
  playbackId: symbol;
  started: boolean;
};

const { TikTokTTS } = NativeModules;

class TTSPlaybackManager {
  private activeSession: ActiveSession | null = null;

  constructor() {
    if (!TikTokTTS) return;

    const emitter = new NativeEventEmitter(TikTokTTS);
    emitter.addListener('TikTokTTS_onStart', () => {
      if (this.activeSession?.engine !== 'tiktok') return;
      this.activeSession.started = true;
      this.activeSession.callbacks.onStart?.();
    });
    emitter.addListener('TikTokTTS_onDone', () => {
      if (
        this.activeSession?.engine !== 'tiktok' ||
        !this.activeSession.started
      ) {
        return;
      }
      const session = this.activeSession;
      this.activeSession = null;
      session?.callbacks.onDone?.();
    });
    emitter.addListener('TikTokTTS_onError', (error: { message?: string }) => {
      if (this.activeSession?.engine !== 'tiktok') return;
      const session = this.activeSession;
      this.activeSession = null;
      session?.callbacks.onError?.('playback-error', error.message);
    });
  }

  speak(
    id: symbol,
    text: string,
    settings: TTSSettings,
    callbacks: TTSPlaybackCallbacks,
  ): boolean {
    const engine = settings.engine ?? 'native';
    const voice = isTikTokVoice(settings.voice)
      ? engine === 'tiktok'
        ? settings.voice?.identifier
        : undefined
      : engine === 'native'
      ? settings.voice?.identifier
      : undefined;

    if (engine === 'tiktok') {
      if (!TikTokTTS) {
        callbacks.onError?.('tiktok-unavailable');
        return false;
      }
      if (!voice) {
        callbacks.onError?.('voice-required');
        return false;
      }
    }

    const playbackId = Symbol('tts-playback');
    this.activate(id, playbackId, engine, callbacks);
    callbacks.onWillPlay?.();

    try {
      if (engine === 'tiktok') {
        const result = TikTokTTS.speak(
          text,
          voice,
          settings.queueSize || 3,
          settings.rate || 1,
          settings.pitch || 1,
        );
        if (result && typeof result.catch === 'function') {
          result.catch((error: unknown) =>
            this.fail(
              id,
              playbackId,
              error instanceof Error ? error.message : String(error),
            ),
          );
        }
        return true;
      }

      Speech.speak(text, {
        onStart: () => this.start(id, playbackId),
        onDone: () => this.finish(id, playbackId),
        onError: error => this.fail(id, playbackId, error.message),
        voice,
        pitch: settings.pitch || 1,
        rate: settings.rate || 1,
      });
      return true;
    } catch (error) {
      this.fail(
        id,
        playbackId,
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }

  pause(id: symbol) {
    if (this.activeSession?.id !== id) return;
    if (this.activeSession.engine === 'tiktok') {
      TikTokTTS?.pause();
      return;
    }
    this.activeSession = null;
    Speech.stop();
  }

  stop(id: symbol) {
    if (this.activeSession?.id !== id) return;
    this.stopNativeEngines();
    this.activeSession = null;
  }

  stopAll() {
    const session = this.activeSession;
    this.stopNativeEngines();
    this.activeSession = null;
    session?.callbacks.onInterrupted?.();
  }

  updateQueue(id: symbol, queue: string[], settings: TTSSettings) {
    const { voice } = settings;
    if (
      this.activeSession?.id !== id ||
      settings.engine !== 'tiktok' ||
      !voice?.identifier ||
      !isTikTokVoice(voice)
    ) {
      return;
    }
    try {
      TikTokTTS?.updateQueue(queue, voice.identifier);
    } catch {
      // Queue preloading is optional; the current utterance can continue.
    }
  }

  private activate(
    id: symbol,
    playbackId: symbol,
    engine: 'native' | 'tiktok',
    callbacks: TTSPlaybackCallbacks,
  ) {
    const previous = this.activeSession;
    if (previous) {
      // TikTok's speak() replaces the current track itself and plays from its
      // buffer cache; TikTokTTS.stop() would wipe that cache, forcing a full
      // re-synthesis on pause→resume and seek within the same session.
      const keepTikTokBuffers =
        previous.id === id &&
        previous.engine === 'tiktok' &&
        engine === 'tiktok';
      if (!keepTikTokBuffers) {
        this.stopNativeEngines();
      }
      this.activeSession = null;
      if (previous.id !== id) {
        previous.callbacks.onInterrupted?.();
      }
    }
    this.activeSession = {
      callbacks,
      engine,
      id,
      playbackId,
      started: engine === 'native',
    };
  }

  private finish(id: symbol, playbackId: symbol) {
    if (
      this.activeSession?.id !== id ||
      this.activeSession.playbackId !== playbackId
    ) {
      return;
    }
    const session = this.activeSession;
    this.activeSession = null;
    session.callbacks.onDone?.();
  }

  private start(id: symbol, playbackId: symbol) {
    if (
      this.activeSession?.id !== id ||
      this.activeSession.playbackId !== playbackId
    ) {
      return;
    }
    this.activeSession.started = true;
    this.activeSession.callbacks.onStart?.();
  }

  private fail(id: symbol, playbackId: symbol, message?: string) {
    if (
      this.activeSession?.id !== id ||
      this.activeSession.playbackId !== playbackId
    ) {
      return;
    }
    const session = this.activeSession;
    this.activeSession = null;
    session.callbacks.onError?.('playback-error', message);
  }

  private stopNativeEngines() {
    Speech.stop();
    TikTokTTS?.stop();
  }
}

export default new TTSPlaybackManager();
