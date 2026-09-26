/* No fetch handler: authenticated pages and financial responses are never cached offline. */
self.addEventListener('push', event => {
    let payload = {};
    try { payload = event.data?.json() || {}; } catch { /* Display a generic notification. */ }
    event.waitUntil(self.registration.showNotification('Portal Financeiro', {
        body: 'Há uma atualização nos seus compartilhamentos.',
        icon: '/app-icon-192.png', badge: '/app-icon-192.png',
        tag: typeof payload.tag === 'string' ? payload.tag : 'portal-update',
        data: {url: '/#sharing'},
    }));
});
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil((async () => {
        const windows = await self.clients.matchAll({type:'window',includeUncontrolled:true});
        for (const client of windows) {
            if (new URL(client.url).origin === self.location.origin) {
                await client.navigate('/#sharing'); return client.focus();
            }
        }
        return self.clients.openWindow('/#sharing');
    })());
});
