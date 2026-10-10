// ==========================================
// EDU-LINK — Service Worker (PWA)
// ==========================================

const CACHE_NAME = 'edu-link-v1';

// Fichiers essentiels a mettre en cache au demarrage
const FICHIERS_ESSENTIELS = [
    './',
    './index.html',
    './manifest.json'
];

// Installation : mise en cache des fichiers essentiels
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(FICHIERS_ESSENTIELS).catch((err) => {
                console.warn('SW : erreur cache initial', err);
            });
        })
    );
    self.skipWaiting();
});

// Activation : suppression des anciens caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((noms) => {
            return Promise.all(
                noms.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
            );
        })
    );
    self.clients.claim();
});

// Fetch : network-first avec fallback cache
self.addEventListener('fetch', (event) => {
    // Ignorer les requetes non-GET et Supabase
    if (event.request.method !== 'GET') return;
    if (event.request.url.includes('supabase.co')) return;
    if (event.request.url.includes('cdn.jsdelivr.net')) return;
    if (event.request.url.includes('cdn.tailwindcss.com')) return;
    if (event.request.url.includes('cdnjs.cloudflare.com')) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Mettre en cache les reponses OK pour les pages HTML
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone).catch(() => {});
                    });
                }
                return response;
            })
            .catch(() => {
                // Fallback sur le cache si offline
                return caches.match(event.request).then((cached) => {
                    if (cached) return cached;
                    // Si c'est une navigation, retour a l'accueil
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                    return new Response('Hors ligne', { status: 503, statusText: 'Offline' });
                });
            })
    );
});
// ==========================================
// WEB PUSH — Affichage des notifications
// ==========================================

self.addEventListener('push', function(event) {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = { title: 'EDU-LINK', body: event.data ? event.data.text() : '' };
    }

    const title = data.title || 'EDU-LINK';
    const options = {
        body: data.body || 'Nouvelle notification',
        icon: './icons/icon.png',
        badge: './icons/icon.png',
        tag: data.tag || 'edu-link-notif',
        renotify: true,
        data: { url: data.url || './index.html' }
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url) || './index.html';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});