
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
  async blockUser(userId: string, blockedUserId: string, token: string): Promise<void> {
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
      const blockedUsers = Array.isArray(user.blocked_users) ? [...user.blocked_users] : [];

      // Add new blocked user if not already blocked
      if (!blockedUsers.includes(blockedUserId)) {
        blockedUsers.push(blockedUserId);
      }

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
            blocked_users: blockedUsers,
          }),
        }
      );

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to block user');
      }
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
      const blockedUsers = Array.isArray(user.blocked_users)
        ? user.blocked_users.filter((id: string) => id !== blockedUserId)
        : [];

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
            blocked_users: blockedUsers,
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
        const errorData = await response.json().catch(() => ({}));
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
      return Array.isArray(user.blocked_users) ? user.blocked_users : [];
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
