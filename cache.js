// ═══════════════════════════════════════════════════════════════
// EDU-LINK — Cache client (mémoire + TTL)
// Évite les requêtes répétées inutiles
// ═══════════════════════════════════════════════════════════════

(function() {
    'use strict';

    var _store = {}; // { key: { value, expire } }

    // ─────── Récupérer une valeur ───────
    function get(key) {
        var item = _store[key];
        if (!item) return null;
        if (Date.now() > item.expire) {
            delete _store[key];
            return null;
        }
        return item.value;
    }

    // ─────── Stocker une valeur ───────
    function set(key, value, ttlMs) {
        ttlMs = ttlMs || 60000; // 60 secondes par défaut
        _store[key] = {
            value: value,
            expire: Date.now() + ttlMs
        };
    }

    // ─────── Invalider une clé ───────
    function invalidate(key) {
        delete _store[key];
    }

    // ─────── Invalider par préfixe ───────
    function invalidatePattern(prefix) {
        Object.keys(_store).forEach(function(k) {
            if (k.indexOf(prefix) === 0) delete _store[k];
        });
    }

    // ─────── Vider tout ───────
    function clear() {
        _store = {};
    }

    // ─────── Récupérer ou calculer ───────
    // Usage: await Cache.remember('stats_admin', async () => { ... }, 60000)
    async function remember(key, fetchFn, ttlMs) {
        var cached = get(key);
        if (cached !== null) return cached;
        var value = await fetchFn();
        set(key, value, ttlMs);
        return value;
    }

    window.Cache = {
        get: get,
        set: set,
        invalidate: invalidate,
        invalidatePattern: invalidatePattern,
        clear: clear,
        remember: remember
    };

    console.log('✅ EDU-LINK cache chargé');
})();