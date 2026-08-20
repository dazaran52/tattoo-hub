self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  // Define premium haptic vibration pattern for push
  // Two soft pulses followed by a slightly longer pulse
  const vibratePattern = [15, 80, 15, 80, 25];

  const options = {
    body: data.body || 'Новое уведомление',
    icon: '/icon-512x512.png',
    badge: '/icon.svg',
    vibrate: vibratePattern,
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Tattoo HUB', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const url = event.notification.data.url;
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
