import { Climber } from '@/src/types/climber';

const POCKETBASE_URL = `http://${process.env.EXPO_PUBLIC_IP}:8090`;

export interface UserPreference {
  climberId: string;
  action: 'accept' | 'reject';
  timestamp: number;
  intent?: 'dating' | 'partner'; // Track which intent this like was for
}

class PreferenceService {
  private acceptedClimbers: Set<string> = new Set();
  private acceptedClimbersForDating: Set<string> = new Set();
  private acceptedClimbersForPartner: Set<string> = new Set();
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
      
      // Parse dating likes
      let likedUsersDating: string[] = [];
      const likedUsersDatingRaw = userData.liked_users_dating;
      if (Array.isArray(likedUsersDatingRaw)) {
        likedUsersDating = likedUsersDatingRaw;
      } else if (typeof likedUsersDatingRaw === 'string') {
        try {
          likedUsersDating = JSON.parse(likedUsersDatingRaw);
        } catch (e) {
          likedUsersDating = [];
        }
      }

      // Parse partner likes
      let likedUsersPartner: string[] = [];
      const likedUsersPartnerRaw = userData.liked_users_partner;
      if (Array.isArray(likedUsersPartnerRaw)) {
        likedUsersPartner = likedUsersPartnerRaw;
      } else if (typeof likedUsersPartnerRaw === 'string') {
        try {
          likedUsersPartner = JSON.parse(likedUsersPartnerRaw);
        } catch (e) {
          likedUsersPartner = [];
        }
      }

      // For backward compatibility, also check legacy liked_users field
      let legacyLikedUsers: string[] = [];
      const likedUsersRaw = userData.liked_users;
      if (Array.isArray(likedUsersRaw)) {
        legacyLikedUsers = likedUsersRaw;
      } else if (typeof likedUsersRaw === 'string') {
        try {
          legacyLikedUsers = JSON.parse(likedUsersRaw);
        } catch (e) {
          legacyLikedUsers = [];
        }
      }

      // Update local state
      this.acceptedClimbersForDating = new Set(likedUsersDating);
      this.acceptedClimbersForPartner = new Set(likedUsersPartner);
      // For backward compatibility, merge legacy likes into both
      this.acceptedClimbers = new Set([...likedUsersDating, ...likedUsersPartner, ...legacyLikedUsers]);
      
      // Update preferences tracking
      this.preferences = [
        ...likedUsersDating.map((id: string) => ({
          climberId: id,
          action: 'accept' as const,
          timestamp: Date.now(),
          intent: 'dating' as const,
        })),
        ...likedUsersPartner.map((id: string) => ({
          climberId: id,
          action: 'accept' as const,
          timestamp: Date.now(),
          intent: 'partner' as const,
        })),
      ];
      
    } catch (error) {
      if (process.env.EXPO_DEV_MODE) console.error('❌ Failed to sync preferences:', error);
    }
  }

  // Save preference to server
  private async saveToServer(token: string, userId: string, intent?: 'dating' | 'partner'): Promise<void> {
    try {
      const updateData: Record<string, any> = {};

      if (intent === 'dating') {
        updateData.liked_users_dating = Array.from(this.acceptedClimbersForDating);
      } else if (intent === 'partner') {
        updateData.liked_users_partner = Array.from(this.acceptedClimbersForPartner);
      } else {
        // If no intent specified, update both
        updateData.liked_users_dating = Array.from(this.acceptedClimbersForDating);
        updateData.liked_users_partner = Array.from(this.acceptedClimbersForPartner);
      }

      const response = await fetch(
        `${POCKETBASE_URL}/api/collections/users/records/${userId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        if (process.env.EXPO_DEV_MODE) console.error('❌ Failed to save preferences:', response.status, errorText);
        throw new Error('Failed to save preferences');
      }
      
      // Verify the save worked
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
          if (process.env.EXPO_DEV_MODE) console.log('✅ Preferences saved successfully');
        }
      } catch (verifyError) {
        console.warn('⚠️ Could not verify save:', verifyError);
      }
    } catch (error) {
      if (process.env.EXPO_DEV_MODE) console.error('❌ Failed to save preferences to server:', error);
    }
  }

  async accept(climber: Climber, token?: string | null, userId?: string, intent?: 'dating' | 'partner'): Promise<void> {
    if (!userId) {
      if (process.env.EXPO_DEV_MODE) console.error('❌ No userId provided to accept method!');
      return;
    }
    
    // Track in appropriate set based on intent
    if (intent === 'dating') {
      this.acceptedClimbersForDating.add(climber.id);
      this.acceptedClimbersForPartner.delete(climber.id);
    } else if (intent === 'partner') {
      this.acceptedClimbersForPartner.add(climber.id);
      this.acceptedClimbersForDating.delete(climber.id);
    } else {
      // Default to dating if no intent specified (backward compatibility)
      this.acceptedClimbersForDating.add(climber.id);
    }
    
    // Also update the combined set
    this.acceptedClimbers.add(climber.id);
    this.rejectedClimbers.delete(climber.id);
    
    this.preferences.push({
      climberId: climber.id,
      action: 'accept',
      timestamp: Date.now(),
      intent: intent || 'dating',
    });

    // Save to server if token and userId provided
    if (token && userId) {
      await this.saveToServer(token, userId, intent);
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

  getAcceptedForDating(): string[] {
    return Array.from(this.acceptedClimbersForDating);
  }

  getAcceptedForPartner(): string[] {
    return Array.from(this.acceptedClimbersForPartner);
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

  isAcceptedForDating(climberId: string): boolean {
    return this.acceptedClimbersForDating.has(climberId);
  }

  isAcceptedForPartner(climberId: string): boolean {
    return this.acceptedClimbersForPartner.has(climberId);
  }

  isRejected(climberId: string): boolean {
    return this.rejectedClimbers.has(climberId);
  }

  isSeen(climberId: string): boolean {
    return this.isAccepted(climberId) || this.isRejected(climberId);
  }

  reset(): void {
    this.acceptedClimbers.clear();
    this.acceptedClimbersForDating.clear();
    this.acceptedClimbersForPartner.clear();
    this.rejectedClimbers.clear();
    this.preferences = [];
  }
}

export const preferenceService = new PreferenceService();
