// Helper function to get correct PocketBase URL (handles both local and deployed)
export const getPocketBaseUrl = (): string => {
  const ip = process.env.EXPO_PUBLIC_IP;
  if (ip?.startsWith('http')) {
    return ip; // Already a full URL (deployed)
  }
  return `http://${ip}:8090`; // Local development
};

// Helper function to get first image URL
export const getFirstImageUrl = (images: string[] | undefined, userId: string) => {
    if (images && images.length > 0 && userId) {
      const baseUrl = getPocketBaseUrl();
      return `${baseUrl}/api/files/users/${userId}/${images[0]}?thumb=100x100`;
    }
    return undefined;
  };