self.addEventListener('push', function(event) {
  let data = { title: '🚨 SOS ROAD RACER', body: 'Alerta de Emergência!', url: '/' };
  if (event.data) {
    try { data = event.data.json(); } catch (e) { data.body = event.data.text(); }
  }

  const options = {
    body: data.body,
    icon: '/attachment/39ba9f98-0228-483e-9e90-efedb5f73770',
    badge: '/attachment/39ba9f98-0228-483e-9e90-efedb5f73770',
    vibrate: [500, 100, 500, 100, 500],
    tag: 'emergency-alert',
    renotify: true,
    requireInteraction: true,
    data: { url: data.url || '/' },
    actions: [{ action: 'open', title: 'ABRIR MAPA' }]
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      if (windowClients.length > 0) return windowClients[0].focus();
      return clients.openWindow(event.notification.data.url);
    })
  );
});