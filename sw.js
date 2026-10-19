// ═══════════════════════════════════════════════════════════════
// EDU-LINK — Service Worker (PWA)
// Version 3 — Cache étendu + mise à jour automatique
// ═══════════════════════════════════════════════════════════════

const CACHE_VERSION = 'v5';
const CACHE_NAME = 'edu-link-' + CACHE_VERSION;

// Fichiers essentiels (coquille de l'app)
const FICHIERS_ESSENTIELS = [
    './',
    './index.html',
    './eleve.html',
    './enseignant.html',
    './parent.html',
    './admin.html',
    './staff.html',
    './super-admin.html',
    './messagerie.html',
    './profil.html',
    './assistant-ia.html',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/apple-touch-icon.png',
    './icons/icon.svg'
];

// Fichiers optionnels (cachés au premier accès)
const FICHIERS_OPTIONNELS = [
    './dashboard.css',
    './config.js',
    './storage.js',
    './image-utils.js',
    './toast.js',
    './confirm.js',
    './skeleton.js',
    './charts.js',
    './badges.js',
    './theme.js',
    './ripple.js',
    './push.js',
    './social.js',
    './cahier-texte.js'
];

// ─────── INSTALLATION ───────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(FICHIERS_ESSENTIELS).catch((err) => {
                console.warn('SW : erreur cache initial', err);
            });
        })
    );
    // Force l'activation immédiate
    self.skipWaiting();
});

// ─────── ACTIVATION ───────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((noms) => {
            return Promise.all(
                noms
                    .filter((n) => n !== CACHE_NAME)
                    .map((n) => caches.delete(n))
            );
        }).then(() => {
            // Prend le contrôle des pages ouvertes
            return self.clients.claim();
        })
    );
});

// ─────── STRATÉGIE DE FETCH ───────
self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // ─── Ignorer certaines requêtes ───
    if (event.request.method !== 'GET') return;
    if (url.includes('supabase.co')) return;                    // API Supabase
    if (url.includes('cdn.jsdelivr.net')) return;               // CDN
    if (url.includes('cdn.tailwindcss.com')) return;            // Tailwind CDN
    if (url.includes('cdnjs.cloudflare.com')) return;           // HTML2PDF
    if (url.includes('fonts.googleapis.com')) return;           // Google Fonts
    if (url.includes('fonts.gstatic.com')) return;              // Google Fonts
    if (url.includes('pexels.com')) return;                     // Images fallback
    if (url.includes('openrouter.ai')) return;                  // IA

    // ─── Stratégie network-first avec fallback cache ───
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cacher les réponses valides (page, CSS, JS local)
                if (response && response.status === 200 && response.type === 'basic') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone).catch(() => {});
                    });
                }
                return response;
            })
            .catch(() => {
                // Hors-ligne → fallback cache
                return caches.match(event.request).then((cached) => {
                    if (cached) return cached;

                    // Navigation → retour à l'accueil
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }

                    return new Response('Hors ligne', {
                        status: 503,
                        statusText: 'Offline',
                        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                    });
                });
            })
    );
});

// ─────── MESSAGE : forcer la mise à jour ───────
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// ═══════════════════════════════════════════════════════════════
// WEB PUSH — Affichage des notifications
// ═══════════════════════════════════════════════════════════════

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
        icon: './icons/icon-192.png',
        badge: './icons/icon-192.png',
        tag: data.tag || 'edu-link-notif',
        renotify: true,
        vibrate: [200, 100, 200],
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