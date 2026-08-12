/* Service worker push handlers (imported by Workbox via importScripts). */
/* global self, clients */

self.addEventListener('push', (event) => {
  let payload = {
    title: 'Arc Todo',
    body: '',
    url: '/board',
    taskId: undefined,
  };

  try {
    if (event.data) {
      const data = event.data.json();
      payload = {
        title: data.title || payload.title,
        body: data.body || '',
        url: data.url || payload.url,
        taskId: data.taskId,
      };
    }
  } catch {
    try {
      const text = event.data?.text?.();
      if (text) payload.body = text;
    } catch {
      // ignore malformed payloads
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: {
        url: payload.url,
        taskId: payload.taskId,
      },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawUrl = event.notification.data?.url || '/board';
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            if ('navigate' in client) {
              return client.navigate(targetUrl).then((navigated) => {
                return (navigated || client).focus();
              });
            }
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
        return undefined;
      }),
  );
});
