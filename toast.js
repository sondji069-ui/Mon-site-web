// ═══════════════════════════════════════════════════════════════
// EDU-LINK — TOAST SYSTEM
// Notifications modernes non-bloquantes
// ═══════════════════════════════════════════════════════════════

(function() {
    'use strict';

    var conteneur = null;
    var DUREE_DEFAUT = 3800;
    var DUREE_ERREUR = 5000;

    function creerConteneur() {
        if (conteneur && document.body.contains(conteneur)) return conteneur;
        conteneur = document.createElement('div');
        conteneur.id = 'toast-container';
        document.body.appendChild(conteneur);
        return conteneur;
    }

    function detecterType(message) {
        var msg = String(message).toLowerCase();
        if (msg.indexOf('erreur') !== -1 || msg.indexOf('❌') !== -1 || msg.indexOf('échoué') !== -1 || msg.indexOf('impossible') !== -1 || msg.indexOf('refusé') !== -1 || msg.indexOf('incorrect') !== -1 || msg.indexOf('invalide') !== -1) {
            return 'error';
        }
        if (msg.indexOf('✅') !== -1 || msg.indexOf('réussi') !== -1 || msg.indexOf('succès') !== -1 || msg.indexOf('enregistré') !== -1 || msg.indexOf('partagé') !== -1 || msg.indexOf('publié') !== -1 || msg.indexOf('bienvenue') !== -1 || msg.indexOf('ajouté') !== -1 || msg.indexOf('validé') !== -1 || msg.indexOf('approuvée') !== -1 || msg.indexOf('mis à jour') !== -1) {
            return 'success';
        }
        if (msg.indexOf('⚠️') !== -1 || msg.indexOf('attention') !== -1 || msg.indexOf('annulé') !== -1 || msg.indexOf('déjà') !== -1 || msg.indexOf('aucun') !== -1 || msg.indexOf('sélectionnez') !== -1) {
            return 'warning';
        }
        return 'info';
    }

    function getIcone(type) {
        var icones = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        return icones[type] || 'ℹ️';
    }

    function afficher(message, type, duree) {
        type = type || detecterType(message);
        duree = duree || (type === 'error' ? DUREE_ERREUR : DUREE_DEFAUT);

        var c = creerConteneur();
        var toast = document.createElement('div');
        toast.className = 'toast toast-' + type;

        var icone = document.createElement('div');
        icone.className = 'toast-icon';
        icone.textContent = getIcone(type);

        var contenu = document.createElement('div');
        contenu.className = 'toast-content';
        contenu.textContent = String(message);

        var close = document.createElement('button');
        close.className = 'toast-close';
        close.textContent = '✕';
        close.setAttribute('aria-label', 'Fermer');
        close.onclick = function() { retirerToast(toast); };

        var progress = document.createElement('div');
        progress.className = 'toast-progress';
        progress.style.animationDuration = duree + 'ms';

        toast.appendChild(icone);
        toast.appendChild(contenu);
        toast.appendChild(close);
        toast.appendChild(progress);

        c.appendChild(toast);

        // Limiter à 3 toasts visibles simultanément
        while (c.children.length > 3) {
            c.removeChild(c.firstChild);
        }

        // Auto-dismiss
        var timer = setTimeout(function() { retirerToast(toast); }, duree);

        // Annuler le timer si on ferme manuellement
        close.addEventListener('click', function() { clearTimeout(timer); });

        return toast;
    }

    function retirerToast(toast) {
        if (!toast || !toast.parentNode) return;
        toast.classList.add('toast-out');
        setTimeout(function() {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }

    // ─────── API publique ───────
    window.toast = {
        success: function(msg, duree) { return afficher(msg, 'success', duree); },
        error: function(msg, duree) { return afficher(msg, 'error', duree); },
        warning: function(msg, duree) { return afficher(msg, 'warning', duree); },
        info: function(msg, duree) { return afficher(msg, 'info', duree); }
    };

    // ─────── Override window.alert() ───────
    // Tous les alert() existants deviennent automatiquement des toasts
    window.alert = function(message) {
        afficher(message, detecterType(message));
    };

})();