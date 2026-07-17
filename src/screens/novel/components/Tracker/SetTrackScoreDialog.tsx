import { KeyboardAvoidingModal } from '@components';
import React, { useEffect, useMemo, useState } from 'react';

import {
  AniListScoreSelector,
  KitsuScoreSelector,
  MangaUpdatesScoreSelector,
  MyAnimeListScoreSelector,
} from './ScoreSelectors';
import { TrackScoreDialogProps } from './types';

const SetTrackScoreDialog: React.FC<TrackScoreDialogProps> = ({
  tracker,
  trackItem,
  visible,
  onDismiss,
  onUpdateScore,
}) => {
  const [selectedScore, setSelectedScore] = useState(trackItem.score);

  useEffect(() => {
    if (visible) {
      setSelectedScore(trackItem.score);
    }
  }, [visible, trackItem.score]);

  const handleSave = () => {
    onUpdateScore(selectedScore);
  };

  const ScoreSelector = useMemo(() => {
    switch (tracker.name) {
      case 'MyAnimeList':
        return (
          <MyAnimeListScoreSelector
            trackItem={{ ...trackItem, score: selectedScore }}
            onUpdateScore={setSelectedScore}
          />
        );
      case 'MangaUpdates':
        return (
          <MangaUpdatesScoreSelector
            trackItem={{ ...trackItem, score: selectedScore }}
            onUpdateScore={setSelectedScore}
          />
        );
      case 'Kitsu':
        return (
          <KitsuScoreSelector
            trackItem={{ ...trackItem, score: selectedScore }}
            onUpdateScore={setSelectedScore}
          />
        );
      case 'AniList':
      default:
        return (
          <AniListScoreSelector
            trackItem={{ ...trackItem, score: selectedScore }}
            scoreFormat={tracker.auth.meta.scoreFormat}
            onUpdateScore={setSelectedScore}
          />
        );
    }
  }, [tracker, trackItem, selectedScore]);

  return (
    <KeyboardAvoidingModal
      visible={visible}
      title="Score"
      onDismiss={onDismiss}
      onConfirm={handleSave}
    >
      {ScoreSelector}
    </KeyboardAvoidingModal>
  );
};

export default SetTrackScoreDialog;
