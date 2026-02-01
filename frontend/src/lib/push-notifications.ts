/**
 * Push Notifications Helper
 * 
 * Easy-to-use module for integrating push notifications into any page.
 * 
 * @example
 * ```typescript
 * import { PushNotifications } from './lib/push-notifications';
 * 
 * // Initialize (once on app start)
 * await PushNotifications.init();
 * 
 * // Subscribe user to notifications
 * const subscription = await PushNotifications.subscribe('user-123');
 * 
 * // Check subscription status
 * if (PushNotifications.isSubscribed()) {
 *   console.log('User is subscribed to notifications');
 * }
 * 
 * // Unsubscribe
 * await PushNotifications.unsubscribe('user-123');
 * ```
 */

// Get endpoint from environment or use default
const PUSH_ENDPOINT = import.meta.env.VITE_PUSH_NOTIFICATIONS_ENDPOINT || '';
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface SubscriptionResult {
  success: boolean;
  subscription?: PushSubscriptionData;
  error?: string;
}

class PushNotificationsManager {
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  private vapidPublicKey: string | null = null;
  private initialized = false;

  /**
   * Check if push notifications are supported in this browser
   */
  isSupported(): boolean {
    return 'serviceWorker' in navigator && 
           'PushManager' in window && 
           'Notification' in window;
  }

  /**
   * Get current notification permission status
   */
  getPermission(): NotificationPermission {
    return Notification.permission;
  }

  /**
   * Check if user is currently subscribed
   */
  isSubscribed(): boolean {
    return this.subscription !== null;
  }

  /**
   * Initialize push notifications
   * Call this once when your app starts
   */
  async init(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    if (!this.isSupported()) {
      console.warn('[Push] Push notifications not supported in this browser');
      return false;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('[Push] Service worker registered');

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;

      // Check for existing subscription
      this.subscription = await this.registration.pushManager.getSubscription();
      if (this.subscription) {
        console.log('[Push] Existing subscription found');
      }

      // Fetch VAPID public key
      await this.fetchVapidKey();

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('[Push] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Fetch VAPID public key from the server
   */
  private async fetchVapidKey(): Promise<void> {
    // First try environment variable
    if (VAPID_PUBLIC_KEY) {
      this.vapidPublicKey = VAPID_PUBLIC_KEY;
      return;
    }

    // Then try fetching from API
    if (PUSH_ENDPOINT) {
      try {
        const response = await fetch(`${PUSH_ENDPOINT}/vapid-public-key`);
        if (response.ok) {
          const data = await response.json();
          this.vapidPublicKey = data.publicKey;
        }
      } catch (error) {
        console.warn('[Push] Failed to fetch VAPID key from API:', error);
      }
    }
  }

  /**
   * Request notification permission from the user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Push notifications not supported');
    }

    const permission = await Notification.requestPermission();
    console.log('[Push] Permission:', permission);
    return permission;
  }

  /**
   * Subscribe the user to push notifications
   * 
   * @param userId - The user's ID for targeting notifications
   * @param deviceId - Optional device identifier for multiple devices
   */
  async subscribe(userId: string, deviceId?: string): Promise<SubscriptionResult> {
    if (!this.initialized) {
      await this.init();
    }

    if (!this.registration) {
      return { success: false, error: 'Service worker not registered' };
    }

    if (!this.vapidPublicKey) {
      return { success: false, error: 'VAPID public key not available' };
    }

    try {
      // Request permission if not granted
      if (Notification.permission === 'default') {
        const permission = await this.requestPermission();
        if (permission !== 'granted') {
          return { success: false, error: 'Notification permission denied' };
        }
      } else if (Notification.permission === 'denied') {
        return { success: false, error: 'Notification permission denied' };
      }

      // Convert VAPID key to Uint8Array
      const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);

      // Subscribe to push
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });

      console.log('[Push] Subscribed:', this.subscription.endpoint);

      // Get subscription data
      const subscriptionData = this.getSubscriptionData();
      if (!subscriptionData) {
        return { success: false, error: 'Failed to get subscription data' };
      }

      // Register with backend
      if (PUSH_ENDPOINT) {
        const response = await fetch(`${PUSH_ENDPOINT}/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            deviceId,
            subscription: subscriptionData,
          }),
        });

        if (!response.ok) {
          console.error('[Push] Failed to register with backend');
        }
      }

      return { success: true, subscription: subscriptionData };
    } catch (error) {
      console.error('[Push] Subscribe failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Unsubscribe from push notifications
   * 
   * @param userId - The user's ID
   */
  async unsubscribe(userId: string): Promise<boolean> {
    if (!this.subscription) {
      return true; // Already unsubscribed
    }

    try {
      const endpoint = this.subscription.endpoint;

      // Unsubscribe from browser
      await this.subscription.unsubscribe();
      this.subscription = null;

      // Remove from backend
      if (PUSH_ENDPOINT) {
        await fetch(`${PUSH_ENDPOINT}/subscribe`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, endpoint }),
        });
      }

      console.log('[Push] Unsubscribed');
      return true;
    } catch (error) {
      console.error('[Push] Unsubscribe failed:', error);
      return false;
    }
  }

  /**
   * Get current subscription data
   */
  getSubscriptionData(): PushSubscriptionData | null {
    if (!this.subscription) {
      return null;
    }

    const json = this.subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return null;
    }

    return {
      endpoint: json.endpoint,
      keys: {
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
    };
  }

  /**
   * Convert a base64 URL string to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// Export singleton instance
export const PushNotifications = new PushNotificationsManager();

// Export types for consumers
export type { PushSubscriptionData, SubscriptionResult };
