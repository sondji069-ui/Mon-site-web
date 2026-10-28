// ═══════════════════════════════════════════════════════════════
// EDU-LINK — RIPPLE EFFECT
// Version compatible iOS (iPhone / Safari)
// ═══════════════════════════════════════════════════════════════

(function() {
    'use strict';

    var SELECTEURS_RIPPLE = '.btn-float, .action-tile, .stat-card, .list-row, .list-btn, .tile-icon, .card-pro';
    var DUREE_ANIMATION = 1200;
    var TAILLE_RIPPLE = 24;

    function creerRipple(cible, clientX, clientY) {
        // Éviter les doublons
        if (cible.querySelector('.ripple')) return;

        var rect = cible.getBoundingClientRect();
        var x = clientX - rect.left;
        var y = clientY - rect.top;

        // Si les coordonnées sont invalides (iOS peut renvoyer 0), utiliser le centre
        if (isNaN(x) || isNaN(y) || (x === 0 && y === 0)) {
            x = rect.width / 2;
            y = rect.height / 2;
        }

        var ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.style.width = TAILLE_RIPPLE + 'px';
        ripple.style.height = TAILLE_RIPPLE + 'px';
        ripple.style.marginLeft = (-TAILLE_RIPPLE / 2) + 'px';
        ripple.style.marginTop = (-TAILLE_RIPPLE / 2) + 'px';

        cible.appendChild(ripple);

        setTimeout(function() {
            if (ripple && ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, DUREE_ANIMATION);
    }

    // ✅ pointerdown = meilleure compatibilité iOS + desktop
    // Se déclenche AU TOUCHER, pas au relâchement → le ripple a le temps de s'afficher
    if (window.PointerEvent) {
        document.addEventListener('pointerdown', function(e) {
            var cible = e.target.closest(SELECTEURS_RIPPLE);
            if (!cible) return;
            creerRipple(cible, e.clientX, e.clientY);
        }, { passive: true });
    } else {
        // Fallback pour très vieux navigateurs
        document.addEventListener('touchstart', function(e) {
            var cible = e.target.closest(SELECTEURS_RIPPLE);
            if (!cible) return;
            var t = e.touches[0];
            creerRipple(cible, t.clientX, t.clientY);
        }, { passive: true });

        document.addEventListener('mousedown', function(e) {
            var cible = e.target.closest(SELECTEURS_RIPPLE);
            if (!cible) return;
            creerRipple(cible, e.clientX, e.clientY);
        }, { passive: true });
    }

})();