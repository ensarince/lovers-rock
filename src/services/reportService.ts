
export type ReportReason = 'harassment' | 'inappropriate_photos' | 'spam' | 'fake_profile' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved';

export interface Report {
  id: string;
  from_user: string;
  to_user: string;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  created: string;
  updated: string;
}

class ReportService {
  private pb: any;

  constructor(pb: any) {
    this.pb = pb;
  }

  /**
   * Block a user
   */
  async blockUser(userId: string, blockedUserId: string, token: string): Promise<any> {
    try {
      const POCKETBASE_URL = `http://${process.env.EXPO_PUBLIC_IP}:8090`;
      
      // Get current user to get existing blocked_users
      const response = await fetch(
        `${POCKETBASE_URL}/api/collections/users/records/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }

      const user = await response.json();
      let blockedUsers: string[] = [];
      
      // Handle string (single user), array, or objects
      if (typeof user.blocked_users === 'string' && user.blocked_users) {
        blockedUsers = [user.blocked_users];
      } else if (Array.isArray(user.blocked_users)) {
        blockedUsers = user.blocked_users.map((item: any) => {
          if (typeof item === 'object' && item !== null && item.id) {
            return item.id;
          }
          return String(item);
        });
      }

      // Add new blocked user if not already blocked
      if (!blockedUsers.includes(blockedUserId)) {
        blockedUsers.push(blockedUserId);
      }

      // Send as JSON string since blocked_users is now a TEXT field
      const blockedUsersJson = JSON.stringify(blockedUsers);

      // Update user with new blocked list
      const updateResponse = await fetch(
        `${POCKETBASE_URL}/api/collections/users/records/${userId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            blocked_users: blockedUsersJson,
          }),
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        let errorData: { message?: string } = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new Error(errorData?.message || 'Failed to block user');
      }

      const updatedUser = await updateResponse.json();
      
      // Return updated user data so caller can update context
      return updatedUser;
    } catch (error: any) {
      console.error('Block user error:', error);
      throw error;
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string, blockedUserId: string, token: string): Promise<void> {
    try {
      const POCKETBASE_URL = `http://${process.env.EXPO_PUBLIC_IP}:8090`;
      
      // Get current user
      const response = await fetch(
        `${POCKETBASE_URL}/api/collections/users/records/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }

      const user = await response.json();
      let blockedUsers: string[] = [];
      
      // Handle string (single user), array, or objects
      if (typeof user.blocked_users === 'string' && user.blocked_users) {
        blockedUsers = [user.blocked_users];
      } else if (Array.isArray(user.blocked_users)) {
        blockedUsers = user.blocked_users.map((item: any) => {
          if (typeof item === 'object' && item !== null && item.id) {
            return item.id;
          }
          return String(item);
        });
      }

      // Remove from blocked list
      blockedUsers = blockedUsers.filter((id: string) => id !== blockedUserId);

      // Send as JSON string since blocked_users is now a TEXT field
      const blockedUsersJson = JSON.stringify(blockedUsers);

      // Update user with new blocked list
      const updateResponse = await fetch(
        `${POCKETBASE_URL}/api/collections/users/records/${userId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            blocked_users: blockedUsersJson,
          }),
        }
      );

      if (!updateResponse.ok) {
        throw new Error('Failed to unblock user');
      }
    } catch (error: any) {
      console.error('Unblock user error:', error);
      throw error;
    }
  }

  /**
   * Report a user
   */
  async reportUser(
    fromUserId: string,
    toUserId: string,
    reason: ReportReason,
    description: string,
    token: string
  ): Promise<Report> {
    try {
      const POCKETBASE_URL = `http://${process.env.EXPO_PUBLIC_IP}:8090`;
      
      const response = await fetch(
        `${POCKETBASE_URL}/api/collections/reports/records`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from_user: fromUserId,
            to_user: toUserId,
            reason,
            description: description || '',
            status: 'pending',
          }),
        }
      );

      if (!response.ok) {
        const errorData: { message?: string } = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to submit report');
      }

      const report = await response.json();
      return report as Report;
    } catch (error: any) {
      console.error('Report user error:', error);
      throw error;
    }
  }

  /**
   * Get blocked users for current user
   */
  async getBlockedUsers(userId: string, token: string): Promise<string[]> {
    try {
      const POCKETBASE_URL = `http://${process.env.EXPO_PUBLIC_IP}:8090`;
      
      // Fetch with expand to get full relation data
      const response = await fetch(
        `${POCKETBASE_URL}/api/collections/users/records/${userId}?expand=blocked_users`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }

      const user = await response.json();
      
      // Try expanded relation first, then fall back to raw field
      let blockedArray = user.expand?.blocked_users || user.blocked_users;
      
      if (!blockedArray) {
        return [];
      }

      // If it's already an array, return it as-is
      if (Array.isArray(blockedArray)) {
        return blockedArray.map(item => {
          if (typeof item === 'object' && item?.id) return item.id;
          return String(item);
        });
      }

      // Handle string case - try JSON parse first
      if (typeof blockedArray === 'string') {
        try {
          const parsed = JSON.parse(blockedArray);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        } catch (e) {
          // If JSON parse fails, treat as comma-separated
          const result = blockedArray
            .split(',')
            .map(id => id.trim())
            .filter(id => id.length > 0);
          return result;
        }
      }
      return [];
    } catch (error: any) {
      console.error('Get blocked users error:', error);
      return [];
    }
  }

  /**
   * Check if user is blocked
   */
  async isUserBlocked(userId: string, targetUserId: string, token: string): Promise<boolean> {
    try {
      const blockedUsers = await this.getBlockedUsers(userId, token);
      return blockedUsers.includes(targetUserId);
    } catch {
      return false;
    }
  }

  /**
   * Get user's reports
   */
  async getUserReports(userId: string, token: string): Promise<Report[]> {
    try {
      const POCKETBASE_URL = `http://${process.env.EXPO_PUBLIC_IP}:8090`;
      
      const response = await fetch(
        `${POCKETBASE_URL}/api/collections/reports/records?filter=(from_user='${userId}')`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      const data = await response.json();
      return data.items || [];
    } catch (error: any) {
      console.error('Get reports error:', error);
      return [];
    }
  }
}

let serviceInstance: ReportService | null = null;

export function initReportService(pb: any) {
  serviceInstance = new ReportService(pb);
  return serviceInstance;
}

export function getReportService(): ReportService {
  if (!serviceInstance) {
    throw new Error('ReportService not initialized');
  }
  return serviceInstance;
}

export default ReportService;
