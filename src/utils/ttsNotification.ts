import NativeTTSMediaControl from '@specs/NativeTTSMediaControl';
import { NativeEventEmitter } from 'react-native';

export const ttsMediaEmitter = new NativeEventEmitter(NativeTTSMediaControl);

export interface TTSNotificationData {
  novelName: string;
  chapterName: string;
  coverUri: string;
  isPlaying: boolean;
}

export const showTTSNotification = (data: TTSNotificationData) => {
  NativeTTSMediaControl.showMediaNotification(
    data.novelName,
    data.chapterName,
    data.coverUri,
    data.isPlaying,
  );
};

export const updateTTSNotification = (data: TTSNotificationData) => {
  NativeTTSMediaControl.showMediaNotification(
    data.novelName,
    data.chapterName,
    data.coverUri,
    data.isPlaying,
  );
};

export const updateTTSPlaybackState = (isPlaying: boolean) => {
  NativeTTSMediaControl.updatePlaybackState(isPlaying);
};

export const updateTTSProgress = (current: number, total: number) => {
  NativeTTSMediaControl.updateProgress(current, total);
};

export const dismissTTSNotification = () => {
  NativeTTSMediaControl.dismiss();
};
