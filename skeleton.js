// ═══════════════════════════════════════════════════════════════
// EDU-LINK — SKELETON LOADING
// ═══════════════════════════════════════════════════════════════

(function() {
    'use strict';

    function ligneHtml() {
        return '<div class="list-row skeleton-row">' +
            '<div class="skeleton" style="width: 44px; height: 44px; border-radius: 14px; flex-shrink: 0;"></div>' +
            '<div class="list-content">' +
                '<div class="skeleton" style="width: 65%; height: 12px; margin-bottom: 6px;"></div>' +
                '<div class="skeleton" style="width: 40%; height: 9px;"></div>' +
            '</div>' +
        '</div>';
    }

    function carteHtml() {
        return '<div class="card-pro skeleton-card">' +
            '<div class="skeleton" style="width: 50%; height: 12px; margin-bottom: 10px;"></div>' +
            '<div class="skeleton" style="width: 100%; height: 60px; margin-bottom: 10px;"></div>' +
            '<div class="skeleton" style="width: 30%; height: 10px;"></div>' +
        '</div>';
    }

    function devoirHtml() {
        return '<div class="card-pro skeleton-card">' +
            '<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">' +
                '<div class="skeleton" style="width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;"></div>' +
                '<div style="flex: 1;">' +
                    '<div class="skeleton" style="width: 70%; height: 12px; margin-bottom: 6px;"></div>' +
                    '<div class="skeleton" style="width: 45%; height: 9px;"></div>' +
                '</div>' +
            '</div>' +
            '<div class="skeleton" style="width: 100%; height: 40px; border-radius: 10px;"></div>' +
        '</div>';
    }

    function statHtml() {
        return '<div class="stat-card" style="background: #f9fafb; border-color: #e5e7eb;">' +
            '<div class="skeleton" style="width: 40%; height: 9px; margin-bottom: 8px;"></div>' +
            '<div class="skeleton" style="width: 60%; height: 22px;"></div>' +
        '</div>';
    }

    function heroHtml() {
        return '<div class="skeleton" style="width: 100%; height: 130px; border-radius: 22px;"></div>';
    }

    window.skeleton = {
        lignes: function(n) {
            var html = '';
            for (var i = 0; i < (n || 4); i++) html += ligneHtml();
            return html;
        },
        cartes: function(n) {
            var html = '';
            for (var i = 0; i < (n || 3); i++) html += carteHtml();
            return html;
        },
        devoirs: function(n) {
            var html = '';
            for (var i = 0; i < (n || 3); i++) html += devoirHtml();
            return html;
        },
        stats: function(n) {
            var html = '';
            for (var i = 0; i < (n || 2); i++) html += statHtml();
            return html;
        },
        hero: function() {
            return heroHtml();
        },
        appliquer: function(elementId, type, nombre) {
            var el = document.getElementById(elementId);
            if (!el) return;
            var methodes = {
                lignes: function() { return window.skeleton.lignes(nombre); },
                cartes: function() { return window.skeleton.cartes(nombre); },
                devoirs: function() { return window.skeleton.devoirs(nombre); },
                stats: function() { return window.skeleton.stats(nombre); },
                hero: function() { return window.skeleton.hero(); }
            };
            var fn = methodes[type] || methodes.lignes;
            el.innerHTML = fn();
        }
    };

})();