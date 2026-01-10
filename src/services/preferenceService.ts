import { Climber } from '@/src/types/climber';

const POCKETBASE_URL = `http://${process.env.EXPO_PUBLIC_IP}:8090`;

export interface UserPreference {
  climberId: string;
  action: 'accept' | 'reject';
  timestamp: number;
}

class PreferenceService {
  private acceptedClimbers: Set<string> = new Set();
  private rejectedClimbers: Set<string> = new Set();
  private preferences: UserPreference[] = [];

  // Sync preferences with server
  async syncPreferences(token: string | null, userId: string): Promise<void> {
    if (!token) {
      if (process.env.EXPO_DEV_MODE) console.log('⚠️ No token for syncing preferences');
      return;
    }
    
    try {
      // Get current user data
      const response = await fetch(
        `${POCKETBASE_URL}/api/collections/users/records/${userId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await response.json();
      const likedUsersRaw = userData.liked_users;
      let likedUsers: string[] = [];
      if (Array.isArray(likedUsersRaw)) {
        likedUsers = likedUsersRaw;
      } else if (typeof likedUsersRaw === 'string') {
        try {
          likedUsers = JSON.parse(likedUsersRaw);
        } catch (e) {
          likedUsers = [];
        }
      } else {
        likedUsers = [];
      }
      // Update local state from server
      this.acceptedClimbers = new Set(likedUsers);
      this.preferences = likedUsers.map((id: string) => ({
        climberId: id,
        action: 'accept' as const,
        timestamp: Date.now(),
      }));
      
    } catch (error) {
      if (process.env.EXPO_DEV_MODE) console.error('❌ Failed to sync preferences:', error);
    }
  }

  // Save preference to server
  private async saveToServer(token: string, userId: string): Promise<void> {
    try {
      const likedUsers = Array.from(this.acceptedClimbers);

      const response = await fetch(
        `${POCKETBASE_URL}/api/collections/users/records/${userId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            liked_users: JSON.stringify(likedUsers),
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        if (process.env.EXPO_DEV_MODE) console.error('❌ Failed to save preferences:', response.status, errorText);
        throw new Error('Failed to save preferences');
      }
      
      // Verify the save worked by fetching the data back
      try {
        const verifyResponse = await fetch(
          `${POCKETBASE_URL}/api/collections/users/records/${userId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
        }
      } catch (verifyError) {
        console.warn('⚠️ Could not verify save:', verifyError);
      }
    } catch (error) {
      if (process.env.EXPO_DEV_MODE) console.error('❌ Failed to save preferences to server:', error);
    }
  }

  async accept(climber: Climber, token?: string | null, userId?: string): Promise<void> {
    if (!userId) {
      if (process.env.EXPO_DEV_MODE) console.error('❌ No userId provided to accept method!');
      return;
    }
    
    this.acceptedClimbers.add(climber.id);
    this.rejectedClimbers.delete(climber.id);
    this.preferences.push({
      climberId: climber.id,
      action: 'accept',
      timestamp: Date.now(),
    });

    // Save to server if token and userId provided
    if (token && userId) {
      await this.saveToServer(token, userId);
    } else {
      console.warn('⚠️ Not saving to server - missing token or userId');
    }
  }

  reject(climber: Climber): void {
    this.rejectedClimbers.add(climber.id);
    this.acceptedClimbers.delete(climber.id);
    this.preferences.push({
      climberId: climber.id,
      action: 'reject',
      timestamp: Date.now(),
    });
  }

  getAccepted(): string[] {
    return Array.from(this.acceptedClimbers);
  }

  getRejected(): string[] {
    return Array.from(this.rejectedClimbers);
  }

  getPreferences(): UserPreference[] {
    return [...this.preferences];
  }

  isAccepted(climberId: string): boolean {
    return this.acceptedClimbers.has(climberId);
  }

  isRejected(climberId: string): boolean {
    return this.rejectedClimbers.has(climberId);
  }

  isSeen(climberId: string): boolean {
    return this.isAccepted(climberId) || this.isRejected(climberId);
  }

  reset(): void {
    this.acceptedClimbers.clear();
    this.rejectedClimbers.clear();
    this.preferences = [];
  }
}

export const preferenceService = new PreferenceService();
