const PRIVATE_IP_PATTERN = /^https?:\/\/(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/;

// Helper function to get correct PocketBase URL (handles both local and deployed)
export const getPocketBaseUrl = (): string => {
  const ip = process.env.EXPO_PUBLIC_IP;
  if (ip?.startsWith('http')) {
    if (!__DEV__ && !ip.startsWith('https://')) {
      throw new Error('Production PocketBase URL must use HTTPS');
    }
    if (!__DEV__ && PRIVATE_IP_PATTERN.test(ip)) {
      throw new Error('Production PocketBase URL must not be a local or private IP address');
    }
    return ip;
  }
  if (!__DEV__) {
    throw new Error('Production PocketBase URL is missing — set EXPO_PUBLIC_IP in eas.json');
  }
  return `http://${ip}:8090`; // Local development only
};

// Helper function to get first image URL
export const getFirstImageUrl = (images: string[] | undefined, userId: string) => {
    if (images && images.length > 0 && userId) {
      const baseUrl = getPocketBaseUrl();
      return `${baseUrl}/api/files/users/${userId}/${images[0]}?thumb=100x100`;
    }
    return undefined;
  };

export const normalizeIntentValue = (value?: string): 'date' | 'partner' | undefined => {
  if (!value) return undefined;
  if (value === 'dating') return 'date';
  if (value === 'partnering') return 'partner';
  if (value === 'date' || value === 'partner') return value;
  return undefined;
};

export const intentIncludes = (
  intent: string | string[] | undefined,
  target: 'date' | 'partner'
): boolean => {
  const list = Array.isArray(intent) ? intent : intent ? [intent] : [];
  return list.map((value) => normalizeIntentValue(value)).includes(target);
};
