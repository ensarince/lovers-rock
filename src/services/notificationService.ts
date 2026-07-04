import { getPocketBaseUrl } from '@/src/utils/helperFunctions';
import PocketBase from 'pocketbase';
import { Platform } from 'react-native';

// Import conditionally to avoid Expo Go issues on Android
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (error) {
  // expo-notifications not available in Expo Go
}

export interface NotificationData {
  type: 'partner_request' | 'partner_match' | 'dating_match' | 'new_message' | 'match_accepted';
  userId?: string;
  userName?: string;
  chatId?: string;
  [key: string]: any;
}

// Configure how notifications are displayed while the app is in use
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async (notification: any) => {
      const data = notification?.request?.content?.data;
      // Suppress new-message notifications when the user is already in that chat
      if (data?.type === 'new_message' && data?.chatId && data.chatId === activeConversationPartnerId) {
        return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: false, shouldShowList: false };
      }
      return { shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true };
    },
  });
}

export let activeConversationPartnerId: string | null = null;
export function setActiveConversationPartnerId(id: string | null): void {
  activeConversationPartnerId = id;
}

export class NotificationService {
  private pb: PocketBase;
  private currentUserId: string;

  constructor(pb: PocketBase, userId: string) {
    this.pb = pb;
    this.currentUserId = userId;
  }

  /**
   * Request permission for notifications on device
   */
  async requestPermissions(): Promise<boolean> {
    if (!Notifications) {
      console.warn('Notifications not available in this environment');
      return false;
    }

    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance?.MAX ?? 5,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#ec4899',
          sound: 'default',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Send a local notification (for testing or in-app events)
   */
  async sendLocalNotification(
    title: string,
    body: string,
    data?: NotificationData
  ): Promise<void> {
    if (!Notifications) {
      console.warn('Notifications not available in this environment');
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          priority: Notifications.AndroidNotificationPriority?.HIGH,
          sound: 'default',
          vibrate: [0, 250, 250, 250],
          data: data || {},
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }

  /**
   * Set up all real-time listeners for notifications
   * Note: Real-time subscriptions are not supported in React Native
   * Notifications will be triggered from your app logic instead
   */
  async setupRealtimeListeners(): Promise<void> {
    // Real-time listeners are not supported in React Native
    // Instead, call sendLocalNotification() directly from your app logic
    // when you detect partner requests, matches, or messages
    if (__DEV__) {
      console.log('Real-time listeners not supported in React Native. Use polling or app logic to trigger notifications.');
    }
  }

  /**
   * Notify about new message
   */
  notifyNewMessage(senderName: string, messagePreview: string, senderId: string): void {
    const preview = messagePreview.trim() || 'Sent you a message';
    const body = preview.length > 60 ? preview.substring(0, 60) + '…' : preview;
    this.sendLocalNotification(
      senderName,
      body,
      {
        type: 'new_message',
        userId: senderId,
        userName: senderName,
        chatId: senderId,
      }
    );
  }

  /**
   * Notify about new dating match
   */
  notifyNewDatingMatch(matchName: string, matchId: string): void {
    this.sendLocalNotification(
      '❤️ New Dating Match!',
      `You matched with ${matchName}!`,
      {
        type: 'dating_match',
        userId: matchId,
        userName: matchName,
      }
    );
  }

  /**
   * Notify about new partner request
   */
  notifyNewPartnerRequest(senderName: string, senderId: string): void {
    this.sendLocalNotification(
      '💘 New Partner Request',
      `${senderName} sent you a partner request!`,
      {
        type: 'partner_request',
        userId: senderId,
        userName: senderName,
      }
    );
  }

  /**
   * Notify about partner match
   */
  notifyNewPartnerMatch(matchName: string, matchId: string): void {
    this.sendLocalNotification(
      '💑 Partner Match!',
      `You have a mutual partner match with ${matchName}!`,
      {
        type: 'partner_match',
        userId: matchId,
        userName: matchName,
      }
    );
  }

  /**
   * Notify about request acceptance
   */
  notifyRequestAccepted(acceptorName: string, acceptorId: string, type: 'partner' | 'dating' = 'partner'): void {
    const title = type === 'partner' ? '💑 Partner Request Accepted!' : '❤️ Dating Request Accepted!';
    const body = `${acceptorName} accepted your request!`;
    
    this.sendLocalNotification(title, body, {
      type: 'match_accepted',
      userId: acceptorId,
      userName: acceptorName,
    });
  }

  /**
   * Handle notification response (when user taps on notification)
   */
  handleNotificationResponse(
    response: any,
    onNavigate?: (data: NotificationData) => void
  ): void {
    if (!Notifications) return;

    const data = response.notification.request.content.data as NotificationData;

    if (onNavigate) {
      onNavigate(data);
    }

    // You can also navigate based on notification type here
    switch (data.type) {
      case 'partner_request':
      case 'partner_match':
        // Navigate to partner/discover screen
        break;
      case 'dating_match':
        // Navigate to matches screen
        break;
      case 'new_message':
      case 'match_accepted':
        // Navigate to messages screen
        break;
    }
  }

  /**
   * Clean up notifications
   */
  cleanup(): void {
    // No active subscriptions to clean up in React Native
  }
}

export const notificationService = new NotificationService(
  new PocketBase(getPocketBaseUrl()),
  ''
);

export async function registerPushToken(userId: string, authToken: string): Promise<void> {
  if (!Notifications) return;
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'fea56759-fdfc-46dd-a45c-5b61ff8af166',
    });
    const pushToken: string = tokenData.data;
    await fetch(`${getPocketBaseUrl()}/api/collections/users/records/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ push_token: pushToken }),
    });
  } catch {
    // simulator / web / permission denied — ignore
  }
}
