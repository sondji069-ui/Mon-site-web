// EDU-LINK - Systeme de mode sombre + Notifications navigateur
(function() {
    // ===== 1. CSS MODE SOMBRE =====
    var style = document.createElement('style');
    style.innerHTML = `
        body.dark-mode { background-color: #0f172a; color: #e2e8f0; }
        body.dark-mode .bg-white { background-color: #1e293b; }
        body.dark-mode .bg-gray-50 { background-color: #0f172a; }
        body.dark-mode .bg-gray-100 { background-color: #334155; }
        body.dark-mode .text-gray-800 { color: #f1f5f9; }
        body.dark-mode .text-gray-700 { color: #e2e8f0; }
        body.dark-mode .text-gray-600 { color: #cbd5e1; }
        body.dark-mode .text-gray-500 { color: #94a3b8; }
        body.dark-mode .text-gray-400 { color: #64748b; }
        body.dark-mode .text-gray-300 { color: #475569; }
        body.dark-mode .border-gray-100 { border-color: #334155; }
        body.dark-mode .border-gray-200 { border-color: #334155; }
        body.dark-mode .border-gray-300 { border-color: #475569; }
        body.dark-mode input, body.dark-mode select, body.dark-mode textarea { background-color: #334155; color: #f1f5f9; border-color: #475569; }
        body.dark-mode input::placeholder, body.dark-mode textarea::placeholder { color: #94a3b8; }
        body.dark-mode input:read-only, body.dark-mode input[readonly] { background-color: #1e293b; color: #94a3b8; }
        body.dark-mode .bg-blue-50 { background-color: #1e3a5f; }
        body.dark-mode .bg-green-50 { background-color: #14532d; }
        body.dark-mode .bg-red-50 { background-color: #7f1d1d; }
        body.dark-mode .bg-orange-50 { background-color: #7c2d12; }
        body.dark-mode .bg-purple-50 { background-color: #4c1d95; }
        body.dark-mode .bg-pink-50 { background-color: #831843; }
        body.dark-mode .bg-amber-50 { background-color: #78350f; }
        body.dark-mode .bg-cyan-50 { background-color: #164e63; }
        body.dark-mode .bg-indigo-50 { background-color: #312e81; }
        body.dark-mode .bg-blue-50 .text-gray-700, body.dark-mode .bg-green-50 .text-gray-700, body.dark-mode .bg-red-50 .text-gray-700, body.dark-mode .bg-orange-50 .text-gray-700, body.dark-mode .bg-purple-50 .text-gray-700, body.dark-mode .bg-pink-50 .text-gray-700, body.dark-mode .bg-amber-50 .text-gray-700, body.dark-mode .bg-cyan-50 .text-gray-700, body.dark-mode .bg-indigo-50 .text-gray-700 { color: #e2e8f0; }
        .btn-theme-toggle { width: 36px; height: 36px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; cursor: pointer; border: none; color: white; transition: all 0.2s ease; flex-shrink: 0; }
        .btn-theme-toggle:hover { background: rgba(255,255,255,0.35); }
        .btn-theme-toggle:active { transform: scale(0.92); }
    `;
    document.head.appendChild(style);

    var themeSauve = localStorage.getItem('eduLinkTheme');
    if (themeSauve === 'dark') { document.body.classList.add('dark-mode'); }

    function injecterBouton() {
        if (document.getElementById('btn-theme-toggle')) return;
        var avatar = document.getElementById('avatar-header');
        if (!avatar) return;
        var btn = document.createElement('button');
        btn.id = 'btn-theme-toggle';
        btn.className = 'btn-theme-toggle';
        btn.type = 'button';
        btn.innerHTML = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
        btn.setAttribute('aria-label', 'Changer le theme');
        btn.onclick = function(e) { e.preventDefault(); e.stopPropagation(); toggleTheme(); };
        avatar.parentNode.insertBefore(btn, avatar);
    }

    function toggleTheme() {
        document.body.classList.toggle('dark-mode');
        var estDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('eduLinkTheme', estDark ? 'dark' : 'light');
        var btn = document.getElementById('btn-theme-toggle');
        if (btn) btn.innerHTML = estDark ? '☀️' : '🌙';
    }

    window.toggleThemeEduLink = toggleTheme;

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', injecterBouton); }
    else { injecterBouton(); }

    // ===== 2. NOTIFICATIONS NAVIGATEUR =====
    window.NotifEduLink = {
        dernierCompteur: null,
        initialise: false,
        bandeauAffiche: false,

        demanderPermission: async function() {
            if (!('Notification' in window)) return false;
            if (Notification.permission === 'granted') return true;
            if (Notification.permission === 'denied') return false;
            try {
                var perm = await Notification.requestPermission();
                return perm === 'granted';
            } catch(e) { return false; }
        },

        afficher: function(titre, contenu) {
            if (!('Notification' in window)) return;
            if (Notification.permission !== 'granted') return;
            try {
                var n = new Notification(titre, {
                    body: contenu,
                    icon: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4d6.png',
                    badge: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4d6.png',
                    tag: 'edulink-' + Date.now()
                });
                n.onclick = function() { window.focus(); n.close(); };
                setTimeout(function() { try { n.close(); } catch(e) {} }, 10000);
            } catch(e) { console.log('Notif erreur:', e); }
        },

        init: async function(supabaseClient, userId) {
            if (this.initialise) return;
            this.initialise = true;
            try {
                var res = await supabaseClient.from('notifications').select('*', { count: 'exact', head: true }).eq('utilisateur_id', userId).eq('lu', false);
                this.dernierCompteur = res.count || 0;
            } catch(e) { this.dernierCompteur = 0; }
            if ('Notification' in window && Notification.permission === 'default') {
                this.afficherBandeau();
            }
        },

        verifier: async function(supabaseClient, userId) {
            try {
                var res = await supabaseClient.from('notifications').select('*', { count: 'exact', head: true }).eq('utilisateur_id', userId).eq('lu', false);
                var nouveauCount = res.count || 0;
                if (this.dernierCompteur !== null && nouveauCount > this.dernierCompteur) {
                    var derniere = await supabaseClient.from('notifications').select('*').eq('utilisateur_id', userId).eq('lu', false).order('date_creation', { ascending: false }).limit(1).maybeSingle();
                    if (derniere.data) {
                        this.afficher(derniere.data.titre, derniere.data.contenu);
                    }
                }
                this.dernierCompteur = nouveauCount;
            } catch(e) { console.log('Verif notif erreur:', e); }
        },

        afficherBandeau: function() {
            if (this.bandeauAffiche) return;
            if (document.getElementById('bandeau-notif-permission')) return;
            this.bandeauAffiche = true;

            var bandeau = document.createElement('div');
            bandeau.id = 'bandeau-notif-permission';
            bandeau.style.cssText = 'position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); background: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.25); padding: 14px 16px; z-index: 10000; width: 92%; max-width: 400px; display: flex; align-items: center; gap: 10px; font-family: Poppins, sans-serif;';
            bandeau.innerHTML = ''
                + '<div style="font-size: 26px; flex-shrink: 0;">🔔</div>'
                + '<div style="flex: 1; min-width: 0;">'
                + '<p style="margin: 0; font-weight: bold; font-size: 12px; color: #1f2937;">Activer les notifications</p>'
                + '<p style="margin: 2px 0 0 0; font-size: 10px; color: #6b7280; line-height: 1.3;">Recevez une alerte pour les notes, absences, devoirs et messages.</p>'
                + '</div>'
                + '<button id="btn-notif-accepter" style="background: #004AAD; color: white; border: none; border-radius: 10px; padding: 8px 12px; font-weight: bold; font-size: 11px; cursor: pointer; flex-shrink: 0;">Activer</button>'
                + '<button id="btn-notif-refuser" style="background: transparent; border: none; font-size: 18px; cursor: pointer; color: #9ca3af; flex-shrink: 0; padding: 0;">✕</button>';

            document.body.appendChild(bandeau);

            if (document.body.classList.contains('dark-mode')) {
                bandeau.style.background = '#1e293b';
                bandeau.querySelector('p').style.color = '#f1f5f9';
                bandeau.querySelectorAll('p')[1].style.color = '#94a3b8';
            }

            var self = this;
            document.getElementById('btn-notif-accepter').onclick = async function() {
                var ok = await self.demanderPermission();
                bandeau.remove();
                if (ok) {
                    self.afficher('EDU-LINK', 'Notifications activees ! Vous serez prevenu des nouveautes.');
                }
            };
            document.getElementById('btn-notif-refuser').onclick = function() {
                bandeau.remove();
            };
        }
    };
})();