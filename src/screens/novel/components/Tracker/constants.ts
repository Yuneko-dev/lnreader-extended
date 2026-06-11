import { TrackerName, UserListStatus } from '@services/Trackers';
import { ImageSourcePropType } from 'react-native';

import { ScoreFormat, ScoreFormatting } from './types';

export const TRACKER_ICONS: Record<TrackerName, ImageSourcePropType> = {
  MyAnimeList: require('../../../../../assets/mal.png'),
  MangaUpdates: require('../../../../../assets/mangaupdates.png'),
  AniList: require('../../../../../assets/anilist.png'),
  Kitsu: require('../../../../../assets/kitsu.png'),
};

export const STATUS_LABELS: Record<UserListStatus, string> = {
  CURRENT: 'Reading',
  PLANNING: 'Plan to read',
  COMPLETED: 'Completed',
  DROPPED: 'Dropped',
  PAUSED: 'On Hold',
  REPEATING: 'Rereading',
};

export const MYANIMELIST_SCORES: Record<number, string> = {
  0: 'No Score',
  1: 'Apalling',
  2: 'Horrible',
  3: 'Very Bad',
  4: 'Bad',
  5: 'Average',
  6: 'Fine',
  7: 'Good',
  8: 'Very Good',
  9: 'Great',
  10: 'Masterpiece',
};

export const getTrackerIcon = (trackerName: TrackerName): ImageSourcePropType =>
  TRACKER_ICONS[trackerName];

export const getStatusLabel = (status: string): string | undefined =>
  STATUS_LABELS[status as UserListStatus];

export const getMyAnimeListScoreLabel = (score: number): string =>
  `(${score}) ${MYANIMELIST_SCORES[score]}`;

export const getAniListScoreFormatting = (
  scoreFormat: ScoreFormat,
  shorten?: boolean,
): ScoreFormatting => {
  switch (scoreFormat) {
    case 'POINT_100':
      return {
        count: 101,
        label: score => (score ? score.toLocaleString() : '-'),
      };
    case 'POINT_10_DECIMAL':
      return {
        count: 101,
        label: score => (score ? (score / 10).toLocaleString() : '-'),
      };
    case 'POINT_10':
      return {
        count: 11,
        label: score => (score ? score.toLocaleString() : '-'),
      };
    case 'POINT_5':
      return {
        count: 6,
        label: score => {
          if (shorten) {
            return score ? `${score}★` : '-';
          }
          return '★'.repeat(score) || '-';
        },
      };
    case 'POINT_3':
      return {
        count: 4,
        label: score => {
          switch (score) {
            case 0:
              return '-';
            case 1:
              return '☹️';
            case 2:
              return '😐';
            case 3:
              return '😃';
            default:
              return '-';
          }
        },
      };
  }
};

/**
 * Kitsu uses a 0.5-10 scale (displayed as half-increments).
 * Internally stored as ratingTwenty (2-20), displayed as ratingTwenty/2.
 * This provides 21 options: 0 (no score), 0.5, 1.0, 1.5, ... 10.0
 */
export const getKitsuScoreFormatting = (): ScoreFormatting => {
  return {
    count: 21,
    label: score => {
      if (score === 0) {
        return '-';
      }
      /* Convert index to Kitsu's half-point scale (0.5-10) */
      const displayScore = score / 2;
      return displayScore.toLocaleString(undefined, {
        minimumFractionDigits: displayScore % 1 === 0 ? 0 : 1,
        maximumFractionDigits: 1,
      });
    },
  };
};
