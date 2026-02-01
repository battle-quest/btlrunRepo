/**
 * btl.run Service Worker
 * 
 * Handles push notifications for the PWA.
 * Register this service worker from any page to enable push notifications.
 */

// Cache version for offline support (optional)
const CACHE_VERSION = 'btl-run-v1';

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    Promise.all([
      // Claim all clients immediately
      self.clients.claim(),
      // Clean up old caches
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      ),
    ])
  );
});

// Push notification received
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let data = {
    title: 'btl.run',
    body: 'You have a new notification',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: {},
  };

  // Parse push data if available
  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        data: payload.data || {},
        tag: payload.tag,
      };
    } catch (e) {
      // If not JSON, use text as body
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    data: data.data,
    tag: data.tag,
    // Vibration pattern for mobile
    vibrate: [100, 50, 100],
    // Actions (customize per notification type)
    actions: getActionsForNotification(data),
    // Keep notification until user interacts
    requireInteraction: data.data?.requireInteraction || false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/';

  // Handle action buttons
  if (event.action === 'view-game') {
    targetUrl = data.gameUrl || `/game/${data.matchId}`;
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else if (data.url) {
    // Default: open URL from notification data
    targetUrl = data.url;
  }

  // Focus existing window or open new one
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Try to find an existing window to focus
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // No existing window, open new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// Notification close handler (for analytics)
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed without action');
  // Could send analytics here
});

// Helper: Get actions based on notification type
function getActionsForNotification(data) {
  const type = data.data?.type;

  switch (type) {
    case 'turn-reminder':
    case 'match-update':
      return [
        { action: 'view-game', title: 'View Game' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
    case 'match-ended':
      return [
        { action: 'view-game', title: 'See Results' },
      ];
    default:
      return [];
  }
}

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
