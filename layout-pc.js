// ═══════════════════════════════════════════════════════════════
// EDU-LINK — Layout PC (desktop)
// Génère la sidebar à partir du menu d'accueil
// ═══════════════════════════════════════════════════════════════

(function() {
    'use strict';

    // ═══════════ DÉTECTION ═══════════
    function estDesktop() {
        return window.matchMedia('(min-width: 1024px)').matches;
    }

    // ═══════════ EXTRAIRE LES ÉLÉMENTS DE MENU ═══════════
    function extraireMenu() {
        var view = document.getElementById('view-accueil');
        if (!view) return [];

        var items = [];

        // ─── Boutons flottants (.btn-float) ───
        view.querySelectorAll('.btn-float').forEach(function(btn) {
            var onclick = btn.getAttribute('onclick');
            var title = btn.querySelector('.btn-title');
            var icon = btn.querySelector('.btn-icon');
            var label = title ? title.textContent.trim() : '';
            var icone = icon ? icon.textContent.trim() : '•';
            var badge = btn.querySelector('.chip');

            if (onclick && label && onclick.indexOf('window.location') === -1 && onclick.indexOf('activerNotifications') === -1) {
                items.push({
                    onclick: onclick,
                    label: label,
                    icone: icone,
                    badge: badge && !badge.classList.contains('hidden') ? badge.textContent.trim() : null
                });
            }
        });

        // ─── Action tiles (.action-tile) ───
        view.querySelectorAll('.action-tile').forEach(function(tile) {
            var onclick = tile.getAttribute('onclick');
            var label = tile.querySelector('.tile-label');
            var icon = tile.querySelector('.tile-icon');
            var lbl = label ? label.textContent.trim() : '';
            var icone = icon ? icon.textContent.trim() : '•';

            if (onclick && lbl && onclick.indexOf('window.location') === -1) {
                items.push({
                    onclick: onclick,
                    label: lbl,
                    icone: icone,
                    badge: null
                });
            }
        });

        // ─── Liens directs (window.location.href) ───
        view.querySelectorAll('button[onclick*="messagerie.html"], a[href*="messagerie.html"]').forEach(function(el) {
            if (!items.find(function(i) { return i.label.toLowerCase().indexOf('messagerie') !== -1; })) {
                items.push({
                    onclick: "window.location.href='messagerie.html'",
                    label: 'Messagerie',
                    icone: '💬',
                    badge: null
                });
            }
        });

        return items;
    }

    // ═══════════ CONSTRUIRE LA SIDEBAR ═══════════
    function construireSidebar() {
        if (!estDesktop()) return;

        var dashboard = document.getElementById('page-dashboard');
        if (!dashboard) return;

        // Éviter de créer la sidebar 2 fois
        if (document.querySelector('.pc-sidebar')) return;

        var sidebar = document.createElement('aside');
        sidebar.className = 'pc-sidebar';

        // Récupérer les infos utilisateur
        var welcomeEl = document.getElementById('welcome-message');
        var ecoleEl = document.getElementById('ecole-nom-affiche');
        var nomUser = welcomeEl ? welcomeEl.textContent.trim() : '';
        var nomEcole = ecoleEl ? ecoleEl.textContent.replace('🏫 ', '').trim() : '';

        // Header de la sidebar
        var headerHtml = '<div class="pc-sidebar-header">';
        headerHtml += '<div class="pc-sidebar-logo"><span>📖</span><span>EDU-LINK</span></div>';
        if (nomEcole) headerHtml += '<div class="pc-sidebar-ecole">' + nomEcole + '</div>';
        headerHtml += '</div>';

        // Section principale
        var menuHtml = '<div class="pc-sidebar-section">Navigation</div>';
        menuHtml += '<div class="pc-sidebar-item actif" data-onclick="retourAccueil()">';
        menuHtml += '<span class="pc-icon">🏠</span>';
        menuHtml += '<span class="pc-label">Accueil</span>';
        menuHtml += '</div>';

        // Extraire le menu
        var items = extraireMenu();
        items.forEach(function(item, idx) {
            var onclickAttr = item.onclick.replace(/"/g, '&quot;');
            menuHtml += '<div class="pc-sidebar-item" data-onclick="' + onclickAttr + '">';
            menuHtml += '<span class="pc-icon">' + item.icone + '</span>';
            menuHtml += '<span class="pc-label">' + item.label + '</span>';
            if (item.badge) {
                menuHtml += '<span class="pc-badge">' + item.badge + '</span>';
            }
            menuHtml += '</div>';
        });

        // Footer
        var footerHtml = '<div class="pc-sidebar-footer">';
        footerHtml += '<div class="pc-sidebar-deconnexion" data-onclick="seDeconnecter()">';
        footerHtml += '<span style="font-size: 18px;">🚪</span>';
        footerHtml += '<span>Déconnexion</span>';
        footerHtml += '</div>';
        footerHtml += '</div>';

        sidebar.innerHTML = headerHtml + menuHtml + footerHtml;

        // Insérer au début de #page-dashboard
        dashboard.insertBefore(sidebar, dashboard.firstChild);

        // Événements clic
        sidebar.querySelectorAll('[data-onclick]').forEach(function(el) {
            el.addEventListener('click', function() {
                var action = el.getAttribute('data-onclick');
                // Retirer tous les actifs
                sidebar.querySelectorAll('.pc-sidebar-item').forEach(function(i) {
                    i.classList.remove('actif');
                });
                // Marquer comme actif
                if (el.classList.contains('pc-sidebar-item')) {
                    el.classList.add('actif');
                }
                // Exécuter l'action
                try {
                    eval(action);
                } catch (e) {
                    console.warn('Action sidebar échouée:', e);
                }
            });
        });

        console.log('✅ Sidebar PC générée (' + items.length + ' items)');
    }

    // ═══════════ SURVEILLER LE CHANGEMENT DE TAILLE ═══════════
    var mediaQuery = window.matchMedia('(min-width: 1024px)');
    mediaQuery.addEventListener('change', function(e) {
        if (e.matches) {
            construireSidebar();
        } else {
            // Retirer la sidebar si on repasse en mobile
            var sidebar = document.querySelector('.pc-sidebar');
            if (sidebar) sidebar.remove();
        }
    });

    // ═══════════ INITIALISATION ═══════════
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(construireSidebar, 500);
        });
    } else {
        setTimeout(construireSidebar, 500);
    }

    // Exposer pour usage manuel
    window.pcConstruireSidebar = construireSidebar;

})();