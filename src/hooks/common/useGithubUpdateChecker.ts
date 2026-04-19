import { useState, useEffect, useCallback } from 'react';
import { version } from '../../../package.json';
import { newer } from '@utils/compareVersion';
import { MMKVStorage } from '@utils/mmkv/mmkv';
import { GITHUB_USER, GITHUB_REPO } from '@utils/constants/metadata';
import { GIT_HASH, BUILD_TYPE } from '@env';

export interface GithubUpdateRelease {
  tag_name: string;
  body: string;
  downloadUrl: string;
  commitHash?: string;
}

export interface GithubUpdate {
  isNewVersion: boolean;
  latestRelease: GithubUpdateRelease | undefined;
}

const LAST_UPDATE_CHECK_KEY = 'LAST_UPDATE_CHECK';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const BETA_RELEASE_URL = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/releases/tags/beta`;
const LATEST_RELEASE_URL = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/releases/latest`;

/**
 * Parse commit hash from beta release body.
 * Expected format: `- **Commit Hash**: [<hash>](<url>)`
 */
const parseCommitHash = (body: string): string | null => {
  const match = body?.match(/\*\*Commit Hash\*\*.*?\[([a-f0-9]+)\]/i);
  return match?.[1] ?? null;
};

/**
 * Check if current build is a nightly/beta build.
 */
const isNightlyBuild = (): boolean => {
  return !!GIT_HASH && BUILD_TYPE !== 'Release';
};

/**
 * Fetch and check for updates. Works for both nightly and stable builds.
 * - Nightly/beta: compares GIT_HASH with the latest beta release's commit hash
 * - Stable: compares semver version with the latest GitHub release
 */
export const fetchUpdateInfo = async (): Promise<GithubUpdate> => {
  try {
    // For nightly/beta builds: check the beta release tag
    if (isNightlyBuild()) {
      const res = await fetch(BETA_RELEASE_URL);
      if (res.ok) {
        const data = await res.json();
        const remoteCommitHash = parseCommitHash(data.body || '');

        if (remoteCommitHash && remoteCommitHash.slice(0, 8) !== GIT_HASH.slice(0, 8)) {
          return {
            isNewVersion: true,
            latestRelease: {
              tag_name: `beta (${remoteCommitHash})`,
              body: data.body || '',
              downloadUrl:
                data.assets?.[0]?.browser_download_url || '',
              commitHash: remoteCommitHash,
            },
          };
        }
      }
    }

    // Also check for stable version bumps (e.g. version > 2.0.3)
    const res = await fetch(LATEST_RELEASE_URL);
    if (res.ok) {
      const data = await res.json();
      if (data?.tag_name) {
        const currentVersion = `${version}`;
        const regex = /[^\d.]/g;
        const newVersion = data.tag_name.replace(regex, '');

        if (newer(newVersion, currentVersion)) {
          return {
            isNewVersion: true,
            latestRelease: {
              tag_name: data.tag_name,
              body: data.body || '',
              downloadUrl:
                data.assets?.[0]?.browser_download_url || '',
            },
          };
        }
      }
    }
  } catch {
    // Silently fail in offline mode or on network errors
  }

  return { isNewVersion: false, latestRelease: undefined };
};

/**
 * Hook that auto-checks for updates on mount (with 24h cooldown).
 * Used in Main.tsx to show the NewUpdateDialog.
 */
export const useGithubUpdateChecker = (): GithubUpdate => {
  const [result, setResult] = useState<GithubUpdate>({
    isNewVersion: false,
    latestRelease: undefined,
  });

  const shouldCheckForUpdate = (): boolean => {
    const lastCheckTime = MMKVStorage.getNumber(LAST_UPDATE_CHECK_KEY);
    if (!lastCheckTime) {
      return true;
    }
    return Date.now() - lastCheckTime >= ONE_DAY_MS;
  };

  const checkForRelease = useCallback(async () => {
    if (!shouldCheckForUpdate()) {
      return;
    }

    const updateInfo = await fetchUpdateInfo();
    MMKVStorage.set(LAST_UPDATE_CHECK_KEY, Date.now());
    setResult(updateInfo);
  }, []);

  useEffect(() => {
    checkForRelease();
  }, [checkForRelease]);

  return result;
};

// ---- Old useGithubUpdateChecker (semver-based only, for stable releases) ----
// This was replaced by the new version above that also supports nightly/beta
// builds by comparing GIT_HASH with the beta release tag's commit hash.
//
// export const useGithubUpdateChecker = (): GithubUpdate => {
//   const latestReleaseUrl =
//     `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/releases/latest`;
// 
//   const [checking, setChecking] = useState(true);
//   const [latestRelease, setLatestRelease] = useState<any>();
// 
//   const shouldCheckForUpdate = (): boolean => {
//     const lastCheckTime = MMKVStorage.getNumber(LAST_UPDATE_CHECK_KEY);
//     if (!lastCheckTime) {
//       return true;
//     }
// 
//     const now = Date.now();
//     const timeSinceLastCheck = now - lastCheckTime;
// 
//     return timeSinceLastCheck >= ONE_DAY_MS;
//   };
// 
//   const checkForRelease = useCallback(async () => {
//     if (!shouldCheckForUpdate()) {
//       setChecking(false);
//       return;
//     }
// 
//     try {
//       const res = await fetch(latestReleaseUrl);
// 
//       if (!res.ok) {
//         setChecking(false);
//         return;
//       }
// 
//       const data = await res.json();
// 
//       if (!data || !data.tag_name) {
//         setChecking(false);
//         return;
//       }
// 
//       const release = {
//         tag_name: data.tag_name,
//         body: data.body,
//         downloadUrl: data.assets?.[0]?.browser_download_url || undefined,
//       };
// 
//       MMKVStorage.set(LAST_UPDATE_CHECK_KEY, Date.now());
// 
//       setLatestRelease(release);
//       setChecking(false);
//     } catch {
//       // Silently fail in offline mode or on network errors
//       setChecking(false);
//     }
//   }, []);
// 
//   const isNewVersion = (versionTag: string) => {
//     const currentVersion = `${version}`;
//     const regex = /[^\d.]/;
// 
//     const newVersion = versionTag.replace(regex, '');
// 
//     return newer(newVersion, currentVersion);
//   };
// 
//   useEffect(() => {
//     checkForRelease();
//   }, [checkForRelease]);
// 
//   if (!checking && latestRelease?.tag_name) {
//     return {
//       latestRelease,
//       isNewVersion: isNewVersion(latestRelease.tag_name),
//     };
//   }
// 
//   return {
//     latestRelease: undefined,
//     isNewVersion: false,
//   };
// };
