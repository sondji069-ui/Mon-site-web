// ═══════════════════════════════════════════════════════════════
// EDU-LINK — CONFIRM MODERNE
// Remplace window.confirm() par une modale élégante
// ═══════════════════════════════════════════════════════════════

(function() {
    'use strict';

    var dernierElementClique = null;
    var skipNextConfirm = false;
    var enTrainDeRejouer = false;
    var modaleActive = null;

    // ─────── Capturer les clics ───────
    document.addEventListener('click', function(e) {
        if (enTrainDeRejouer) return;
        var cible = e.target.closest('button, [onclick], .btn-float, .action-tile, .list-btn, .list-row, [role="button"]') || e.target;
        dernierElementClique = cible;
    }, true);

    // ─────── Créer la modale ───────
    function creerModale(message, callback) {
        // Nettoyer l'ancienne
        if (modaleActive && modaleActive.parentNode) {
            modaleActive.parentNode.removeChild(modaleActive);
        }

        var overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';

        var box = document.createElement('div');
        box.className = 'confirm-box';

        var icon = document.createElement('div');
        icon.className = 'confirm-icon';
        icon.textContent = '❓';

        var title = document.createElement('div');
        title.className = 'confirm-title';
        title.textContent = 'Confirmation';

        var msg = document.createElement('div');
        msg.className = 'confirm-message';
        msg.textContent = String(message || '');

        var actions = document.createElement('div');
        actions.className = 'confirm-actions';

        var btnNon = document.createElement('button');
        btnNon.className = 'confirm-btn confirm-btn-non';
        btnNon.textContent = 'Annuler';

        var btnOui = document.createElement('button');
        btnOui.className = 'confirm-btn confirm-btn-oui';
        btnOui.textContent = 'Confirmer';

        actions.appendChild(btnNon);
        actions.appendChild(btnOui);

        box.appendChild(icon);
        box.appendChild(title);
        box.appendChild(msg);
        box.appendChild(actions);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        modaleActive = overlay;

        // Animation d'entrée
        requestAnimationFrame(function() {
            overlay.classList.add('visible');
        });

        function fermer(resultat) {
            overlay.classList.remove('visible');
            setTimeout(function() {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                if (modaleActive === overlay) modaleActive = null;
            }, 250);
            callback(resultat);
        }

        btnOui.onclick = function(e) { e.stopPropagation(); fermer(true); };
        btnNon.onclick = function(e) { e.stopPropagation(); fermer(false); };
        overlay.onclick = function(e) {
            if (e.target === overlay) fermer(false);
        };
    }
