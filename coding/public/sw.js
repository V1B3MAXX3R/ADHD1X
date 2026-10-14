// Tiny notification-only service worker (T77: no caching, no background push)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body } = event.data;
    self.registration.showNotification(title, { body });
  }
});
