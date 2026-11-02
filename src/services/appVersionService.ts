import { getPocketBaseUrl } from '@/src/utils/helperFunctions';
import Constants from 'expo-constants';

const POCKETBASE_URL = getPocketBaseUrl();

export const ANDROID_PACKAGE = 'com.takeclimbing.takeapp';
// market:// opens the Play Store app directly; the https link is the fallback
// for phones without it.
export const PLAY_STORE_APP_URL = `market://details?id=${ANDROID_PACKAGE}`;
export const PLAY_STORE_WEB_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

/** The version of the build running right now, e.g. "1.1.0". */
export const getCurrentVersion = (): string | null =>
  Constants.expoConfig?.version ?? null;

/**
 * Compares dotted versions number by number: "1.10.0" is newer than "1.9.2".
 * Returns 1 if a is newer, -1 if b is newer, 0 if equal. Missing parts count as 0.
 */
export const compareVersions = (a: string, b: string): number => {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
};

/**
 * The newer Play Store version if this build is behind it, otherwise null.
 *
 * Never throws: an update prompt is a nicety, and any failure (offline, server
 * down, Google changed their page) just means no prompt.
 */
export const getAvailableUpdate = async (): Promise<string | null> => {
  const current = getCurrentVersion();
  if (!current) return null;

  try {
    const response = await fetch(`${POCKETBASE_URL}/api/app-version`);
    if (!response.ok) return null;

    const data = await response.json();
    const latest = data?.android?.latest;
    if (typeof latest !== 'string' || !latest) return null;

    return compareVersions(latest, current) > 0 ? latest : null;
  } catch {
    return null;
  }
};
