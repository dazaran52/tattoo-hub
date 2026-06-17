/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope
export {}

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title || 'Tattoo HUB'
  const options = {
    body: data.body || 'Новое уведомление',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: data.data || {}
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  const url = event.notification.data?.url || '/'
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }
      // If not, open a new window/tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})
