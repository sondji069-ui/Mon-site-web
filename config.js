// ═══════════════════════════════════════════════════════════════
// EDU-LINK — Configuration centrale
// Chargé EN PREMIER dans toutes les pages
// ═══════════════════════════════════════════════════════════════

(function() {
    'use strict';

    // ─────── CONFIG SUPABASE ───────
    const SUPABASE_URL = 'https://abwguixclmxtzvlsmbby.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFid2d1aXhjbG14dHp2bHNtYmJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4OTg1OTMsImV4cCI6MjEwNjQ3NDU5M30.8MiG5YdoMIY69KYfBdlXHIB9Zisd5miX3slaCoqVcjM';

    // Client global partagé
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.SUPABASE_URL = SUPABASE_URL;
    window.SUPABASE_KEY = SUPABASE_KEY;

    // ─────── CONSTANTES AUTH ───────
    // Ancien sel global — utilisé UNIQUEMENT pour vérifier les anciens hash
    const AUTH_SALT_LEGACY = 'EDU-LINK::v1::S3n3g4l::2024';
    const AUTH_ITERATIONS = 100000;
    const AUTH_PREFIX = 'pbkdf2$';

    // ─────── HELPERS CRYPTO ───────
    function bytesToHex(bytes) {
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    function hexToBytes(hex) {
        const arr = new Uint8Array(hex.length / 2);
        for (let i = 0; i < arr.length; i++) {
            arr[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        return arr;
    }

    /**
     * Hash un mot de passe avec un sel aléatoire par utilisateur.
     * Format : pbkdf2$100000$<sel_hex>$<hash_hex>
     */
    async function hashPassword(plainPassword) {
        const enc = new TextEncoder();
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const keyMaterial = await crypto.subtle.importKey(
            'raw', enc.encode(plainPassword),
            { name: 'PBKDF2' }, false, ['deriveBits']
        );
        const hashBuffer = await crypto.subtle.deriveBits(
            { name: 'PBKDF2', salt, iterations: AUTH_ITERATIONS, hash: 'SHA-256' },
            keyMaterial, 256
        );
        return AUTH_PREFIX + AUTH_ITERATIONS + '$' + bytesToHex(salt) + '$' + bytesToHex(new Uint8Array(hashBuffer));
    }

    /**
     * Vérifie un mot de passe.
     * Gère 3 formats :
     *  - pbkdf2$100000$<sel>$<hash>  → nouveau (sel unique)
     *  - pbkdf2$100000$<hash>        → ancien (sel fixe) → needsRehash=true
     *  - <plaintext>                 → très ancien → needsRehash=true
     */
    async function verifyPassword(plainPassword, storedPassword) {
        if (!storedPassword) return { ok: false, needsRehash: false };

        // ─── Ancien : mot de passe en clair
        if (!storedPassword.startsWith(AUTH_PREFIX)) {
            return { ok: storedPassword === plainPassword, needsRehash: true };
        }

        const parts = storedPassword.split('$');
        // parts = ['pbkdf2', '100000', ...]

        const enc = new TextEncoder();

        // ─── Nouveau format (5 parties) : sel unique
        if (parts.length === 4) {
            const iterations = parseInt(parts[1], 10);
            const salt = hexToBytes(parts[2]);
            const expectedHash = parts[3];

            const keyMaterial = await crypto.subtle.importKey(
                'raw', enc.encode(plainPassword),
                { name: 'PBKDF2' }, false, ['deriveBits']
            );
            const hashBuffer = await crypto.subtle.deriveBits(
                { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
                keyMaterial, 256
            );
            const computed = bytesToHex(new Uint8Array(hashBuffer));
            return { ok: computed === expectedHash, needsRehash: false };
        }

        // ─── Ancien format (3 parties) : sel fixe
        if (parts.length === 3) {
            const iterations = parseInt(parts[1], 10);
            const expectedHash = parts[2];

            const keyMaterial = await crypto.subtle.importKey(
                'raw', enc.encode(plainPassword),
                { name: 'PBKDF2' }, false, ['deriveBits']
            );
            const hashBuffer = await crypto.subtle.deriveBits(
                { name: 'PBKDF2', salt: enc.encode(AUTH_SALT_LEGACY), iterations, hash: 'SHA-256' },
                keyMaterial, 256
            );
            const computed = bytesToHex(new Uint8Array(hashBuffer));
            // Si ok → on demande un rehash (migration vers sel unique)
            return { ok: computed === expectedHash, needsRehash: true };
        }

        return { ok: false, needsRehash: false };
    }

    // ─────── XSS ───────
    function echapperHtml(texte) {
        if (texte === null || texte === undefined) return '';
        return String(texte)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ─────── SESSION (SANS mot de passe) ───────
    /**
     * Stocke l'utilisateur en session SANS le mot de passe.
     * À utiliser partout à la place de sessionStorage.setItem brut.
     */
    function setSessionUser(user) {
        if (!user) { sessionStorage.removeItem('eduLinkUser'); return; }
        const { mot_de_passe, ...safe } = user;
        sessionStorage.setItem('eduLinkUser', JSON.stringify(safe));
    }

    function getSessionUser() {
        const raw = sessionStorage.getItem('eduLinkUser');
        return raw ? JSON.parse(raw) : null;
    }

    function clearSessionUser() {
        sessionStorage.removeItem('eduLinkUser');
    }

    // ─────── AFFICHE OFFICIELLE (XSS-safe) ───────
    function construireAfficheSecurisee(a, ecoleNom, signatureEcole) {
        const titre = echapperHtml(a.titre);
        const contenu = echapperHtml(a.contenu);
        const signatureTxt = a.signature ? echapperHtml(a.signature) : '';
        const ecoleNomSec = echapperHtml(ecoleNom || '');
        const datePub = new Date(a.date_publication).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        const logoUrl = (typeof a.logo_annonce === 'string' && (a.logo_annonce.indexOf('data:image/') === 0 || a.logo_annonce.indexOf('https://') === 0)) ? a.logo_annonce : null;
        const sigUrl = (typeof signatureEcole === 'string' && (signatureEcole.indexOf('data:image/') === 0 || signatureEcole.indexOf('https://') === 0)) ? signatureEcole : null;
        const blocLogo = logoUrl
            ? '<img src="' + logoUrl + '" style="width:70px;height:70px;object-fit:cover;border-radius:50%;border:3px solid white;margin-bottom:8px;">'
            : '<div style="font-size:40px;margin-bottom:5px;">📖</div>';
        const blocSignatureImg = sigUrl
            ? '<img src="' + sigUrl + '" style="max-height:55px;max-width:180px;margin-top:8px;display:block;margin-left:auto;">'
            : '';
        const blocSignatureTxt = signatureTxt
            ? '<p style="font-size:13px;font-weight:bold;color:#004AAD;margin:5px 0 0 0;">' + signatureTxt + '</p>'
            : '';
        return '<div style="background:white;border:3px solid #004AAD;border-radius:15px;overflow:hidden;font-family:Arial,sans-serif;">'
            + '<div style="background:linear-gradient(135deg,#004AAD 0%,#0066CC 100%);padding:20px 15px;text-align:center;">'
            + blocLogo + '<h1 style="color:white;font-size:20px;font-weight:bold;margin:5px 0;letter-spacing:1px;">EDU-LINK</h1>'
            + '<p style="color:rgba(255,255,255,0.9);font-size:12px;margin:0;">' + ecoleNomSec + '</p></div>'
            + '<div style="padding:20px;"><div style="text-align:center;background:#f0f7ff;padding:12px;border-radius:10px;margin-bottom:20px;border-left:4px solid #004AAD;">'
            + '<p style="font-size:11px;color:#004AAD;font-weight:bold;margin:0 0 5px 0;letter-spacing:2px;">📢 COMMUNICATION OFFICIELLE</p>'
            + '<h2 style="font-size:18px;font-weight:bold;color:#004AAD;margin:0;">' + titre + '</h2></div>'
            + '<div style="background:#f9fafb;padding:15px;border-radius:10px;margin-bottom:20px;">'
            + '<p style="font-size:13px;color:#1f2937;line-height:1.8;margin:0;white-space:pre-wrap;text-align:justify;">' + contenu + '</p></div>'
            + '<div style="text-align:right;margin-top:25px;padding-top:15px;border-top:1px solid #e5e7eb;">'
            + '<p style="font-size:11px;color:#6b7280;margin:0;">Publiee le ' + datePub + '</p>'
            + blocSignatureImg + blocSignatureTxt + '</div></div>'
            + '<div style="background:#004AAD;padding:8px;text-align:center;"><p style="color:white;font-size:9px;margin:0;">Document officiel - EDU-LINK</p></div></div>';
    }

    // ─────── THÈME ───────
    function initTheme() {
        if (localStorage.getItem('eduLinkTheme') === 'dark') {
            document.body.classList.add('dark-mode');
        }
        const avatar = document.getElementById('avatar-header');
        if (avatar && !document.getElementById('btn-theme-toggle')) {
            const btn = document.createElement('button');
            btn.id = 'btn-theme-toggle';
            btn.className = 'btn-theme-toggle';
            btn.type = 'button';
            btn.innerHTML = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
            btn.onclick = function(e) {
                e.preventDefault(); e.stopPropagation();
                toggleThemeEduLink();
            };
            avatar.parentNode.insertBefore(btn, avatar);
        }
    }
    function toggleThemeEduLink() {
        document.body.classList.toggle('dark-mode');
        const estDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('eduLinkTheme', estDark ? 'dark' : 'light');
        const btn = document.getElementById('btn-theme-toggle');
        if (btn) btn.innerHTML = estDark ? '☀️' : '🌙';
    }

    // ─────── AVATAR HEADER ───────
    function afficherAvatarHeader(user) {
        const btn = document.getElementById('avatar-header');
        if (!btn) return;
        if (user && user.photo_url) {
            btn.innerHTML = '<img src="' + user.photo_url + '" style="width:100%;height:100%;object-fit:cover;">';
        }
    }

    // ─────── UTILITAIRE CHARGEMENT BOUTON ───────
    /**
     * Encapsule une action async avec un état de chargement.
     * Usage : avecChargement(btn, async () => { ... })
     */
    async function avecChargement(btn, action) {
        if (!btn) return action();
        const orig = btn.innerHTML;
        const wasDisabled = btn.disabled;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Chargement...';
        try {
            return await action();
        } finally {
            btn.disabled = wasDisabled;
            btn.innerHTML = orig;
        }
    }

    // ─────── EXPORTS GLOBAUX ───────
    window.EduLink = {
        hashPassword,
        verifyPassword,
        echapperHtml,
        setSessionUser,
        getSessionUser,
        clearSessionUser,
        construireAfficheSecurisee,
        initTheme,
        toggleThemeEduLink,
        afficherAvatarHeader,
        avecChargement
    };

    // Alias directs pour compatibilité avec le code existant
    window.hashPassword = hashPassword;
    window.verifyPassword = verifyPassword;
    window.echapperHtml = echapperHtml;
    window.construireAfficheSecurisee = construireAfficheSecurisee;
    window.initTheme = initTheme;
    window.toggleThemeEduLink = toggleThemeEduLink;
    window.afficherAvatarHeader = afficherAvatarHeader;
    window.avecChargement = avecChargement;

    console.log('✅ EDU-LINK config chargée');
})();