import { getPocketBaseUrl } from '@/src/utils/helperFunctions';
import { createBlock, getBlockedAgainstUser, getBlockedByUser, removeBlock } from '@/src/services/socialGraphService';

const safeId = (id: string): string => String(id).replace(/[^a-zA-Z0-9]/g, '');

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
      await createBlock(userId, blockedUserId, token);
      const blockedByMe = await this.getBlockedUsersByMe(userId, token);
      return { blocked_users: blockedByMe };
    } catch (error: any) {
      if (__DEV__) console.error('Block user error:', error);
      throw error;
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string, blockedUserId: string, token: string): Promise<void> {
    try {
      await removeBlock(userId, blockedUserId, token);
    } catch (error: any) {
      if (__DEV__) console.error('Unblock user error:', error);
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
      const POCKETBASE_URL = getPocketBaseUrl();

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
      if (__DEV__) console.error('Report user error:', error);
      throw error;
    }
  }

  /**
   * Get blocked users for current user (both directions)
   */
  async getBlockedUsers(userId: string, token: string): Promise<string[]> {
    try {
      const [blockedByMe, blockedAgainstMe] = await Promise.all([
        getBlockedByUser(userId, token),
        getBlockedAgainstUser(userId, token),
      ]);

      return Array.from(new Set([
        ...blockedByMe.map((record) => record.to_user),
        ...blockedAgainstMe.map((record) => record.from_user),
      ])).filter(Boolean);
    } catch (error: any) {
      if (__DEV__) console.error('Get blocked users error:', error);
      return [];
    }
  }

  /**
   * Get blocked users by the current user only
   */
  async getBlockedUsersByMe(userId: string, token: string): Promise<string[]> {
    try {
      const blockedByMe = await getBlockedByUser(userId, token);
      return blockedByMe.map((record) => record.to_user).filter(Boolean);
    } catch (error: any) {
      if (__DEV__) console.error('Get blocked users by me error:', error);
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
      const POCKETBASE_URL = getPocketBaseUrl();

      const response = await fetch(
        `${POCKETBASE_URL}/api/collections/reports/records?filter=(from_user='${safeId(userId)}')`,
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
      if (__DEV__) console.error('Get reports error:', error);
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
