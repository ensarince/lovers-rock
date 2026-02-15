 // Helper function to get first image URL
export const getFirstImageUrl = (images: string[] | undefined, userId: string) => {
    if (images && images.length > 0 && userId) {
      const baseUrl = `http://${process.env.EXPO_PUBLIC_IP}:8090`;
      return `${baseUrl}/api/files/users/${userId}/${images[0]}?thumb=100x100`;
    }
    return undefined;
  };