// ═══════════════════════════════════════════════════════════════
// EDU-LINK — CHARTS
// Graphiques CSS réutilisables (barres, cercles, mini-lignes)
// ═══════════════════════════════════════════════════════════════

(function() {
    'use strict';

    // ═══════════ BARRES HORIZONTALES ═══════════
    function barresHtml(data, options) {
        if (!data || data.length === 0) {
            return '<div class="empty-state" style="padding: 20px;"><div class="empty-icon" style="font-size: 32px;">📊</div><div class="empty-title">Aucune donnée</div></div>';
        }
        options = options || {};
        var max = options.max || Math.max.apply(null, data.map(function(d) { return d.valeur; })) || 1;
        var suffixe = options.suffixe || '';
        var html = '';
        data.forEach(function(d) {
            var pct = max > 0 ? Math.min(100, Math.round((d.valeur / max) * 100)) : 0;
            var couleur = d.couleur || '#004AAD';
            html += '<div class="chart-bar-row">';
            html += '<div class="chart-bar-label">' + d.label + '</div>';
            html += '<div class="chart-bar-track"><div class="chart-bar-fill" style="width:' + pct + '%; background:' + couleur + ';"></div></div>';
            html += '<div class="chart-bar-value">' + d.valeur + suffixe + '</div>';
            html += '</div>';
        });
        return html;
    }

    // ═══════════ CERCLE DE PROGRESSION ═══════════
    function cercleHtml(pourcentage, couleur, texte, unite) {
        pourcentage = Math.max(0, Math.min(100, pourcentage || 0));
        couleur = couleur || '#004AAD';
        texte = (texte !== undefined && texte !== null) ? texte : pourcentage;
        unite = unite || '%';
        var rayon = 36;
        var circonference = 2 * Math.PI * rayon;
        var offset = circonference - (pourcentage / 100) * circonference;
        return '<div class="progress-ring">' +
            '<svg viewBox="0 0 90 90">' +
                '<circle class="ring-bg" cx="45" cy="45" r="' + rayon + '"></circle>' +
                '<circle class="ring-fg" cx="45" cy="45" r="' + rayon + '" ' +
                    'stroke="' + couleur + '" ' +
                    'stroke-dasharray="' + circonference + '" ' +
                    'stroke-dashoffset="' + circonference + '" ' +
                    'data-offset="' + offset + '"></circle>' +
            '</svg>' +
            '<div class="ring-text">' +
                '<div class="val">' + texte + '</div>' +
                '<div class="unit">' + unite + '</div>' +
            '</div>' +
        '</div>';
    }

    function animerCercles() {
        var cercles = document.querySelectorAll('.progress-ring .ring-fg');
        cercles.forEach(function(cercle) {
            var offset = cercle.getAttribute('data-offset');
            if (!offset) return;
            setTimeout(function() {
                cercle.style.strokeDashoffset = offset;
            }, 100);
        });
    }

    // ═══════════ MINI-LIGNE (sparkline) ═══════════
    function sparklineHtml(valeurs, couleur) {
        if (!valeurs || valeurs.length === 0) return '';
        couleur = couleur || '#004AAD';
        var max = Math.max.apply(null, valeurs) || 1;
        var min = Math.min.apply(null, valeurs);
        var range = max - min || 1;
        var width = 100;
        var height = 40;
        var points = valeurs.map(function(v, i) {
            var x = (i / (valeurs.length - 1)) * width;
            var y = height - ((v - min) / range) * height;
            return x + ',' + y;
        }).join(' ');
        return '<svg viewBox="0 0 100 40" preserveAspectRatio="none" style="width: 100%; height: 40px;">' +
            '<polyline points="' + points + '" fill="none" stroke="' + couleur + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>';
    }

    // ═══════════ PALETTE ═══════════
    var COULEURS = {
        excellent: '#004AAD',
        bien: '#2EAD5E',
        moyen: '#F59E0B',
        faible: '#EF4444',
        neutre: '#6b7280',
        rose: '#EC4899',
        violet: '#8B5CF6',
        teal: '#0D9488'
    };

    function couleurNote(note) {
        if (note >= 16) return COULEURS.excellent;
        if (note >= 14) return COULEURS.bien;
        if (note >= 12) return '#10B981';
        if (note >= 10) return COULEURS.moyen;
        return COULEURS.faible;
    }

    function couleurPct(pct) {
        if (pct >= 80) return COULEURS.bien;
        if (pct >= 50) return COULEURS.moyen;
        return COULEURS.faible;
    }

    // ═══════════ API PUBLIQUE ═══════════
    window.charts = {
        barres: barresHtml,
        cercle: cercleHtml,
        animerCercles: animerCercles,
        sparkline: sparklineHtml,
        couleurs: COULEURS,
        couleurNote: couleurNote,
        couleurPct: couleurPct
    };

    // Auto-animation des cercles
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', animerCercles);
    } else {
        animerCercles();
    }
    if (window.MutationObserver) {
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(m) {
                m.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1 && node.querySelector && node.querySelector('.progress-ring')) {
                        animerCercles();
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

})();