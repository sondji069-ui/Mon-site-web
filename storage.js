// ═══════════════════════════════════════════════════════════════
// EDU-LINK — Storage (upload d'images et fichiers vers Supabase)
// ═══════════════════════════════════════════════════════════════

(function() {
    'use strict';

    // ─────── Utilitaires internes ───────
    function nettoyerNom(texte) {
        return String(texte || 'fichier')
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9.-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    function extraireExtension(nom) {
        var m = nom.match(/\.([a-z0-9]+)$/i);
        return m ? m[1].toLowerCase() : 'bin';
    }

    function genererChemin(userId, nomOriginal) {
        var ext = extraireExtension(nomOriginal);
        var rand = Math.random().toString(36).substring(2, 8);
        var ts = Date.now();
        var dossier = userId || 'anonyme';
        return dossier + '/' + ts + '-' + rand + '.' + ext;
    }

    // ─────── dataURL → Blob ───────
    function dataUrlVersBlob(dataUrl) {
        var parts = dataUrl.split(',');
        var mimeMatch = parts[0].match(/data:(.*?);/);
        var mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        var bstr = atob(parts[1]);
        var u8 = new Uint8Array(bstr.length);
        for (var i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
        return new Blob([u8], { type: mime });
    }

    // ─────── Récupère le client Supabase ───────
    // (au moment de l'appel, pas au chargement du fichier)
    function getClient() {
        if (typeof supabaseClient !== 'undefined') return supabaseClient;
        if (typeof window !== 'undefined' && window.supabaseClient) return window.supabaseClient;
        throw new Error('Client Supabase introuvable');
    }

    // ─────── UPLOAD IMAGE (avec compression auto) ───────
    async function uploaderImage(file, bucket, options) {
        options = options || {};
        if (!file || !file.type.startsWith('image/')) {
            throw new Error('Fichier image requis');
        }
        if (typeof compresserImage !== 'function') {
            throw new Error('image-utils.js non chargé');
        }

        // 1. Compression
        var dataUrlCompresse = await compresserImage(file, {
            maxWidth: options.maxWidth || 1200,
            maxHeight: options.maxHeight || 1200,
            quality: options.quality || 0.8
        });

        // 2. Conversion en Blob
        var blob = dataUrlVersBlob(dataUrlCompresse);

        // 3. Upload avec timeout
        var client = getClient();
        var chemin = genererChemin(options.userId, file.name);

        var uploadPromise = client.storage
            .from(bucket)
            .upload(chemin, blob, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
                upsert: false
            });

        var timeoutPromise = new Promise(function(_, reject) {
            setTimeout(function() { reject(new Error('Délai dépassé (serveur lent)')); }, 30000);
        });

        var res = await Promise.race([uploadPromise, timeoutPromise]);
        if (res.error) throw new Error('Upload : ' + res.error.message);

        // 4. URL publique
        var pub = client.storage.from(bucket).getPublicUrl(res.data.path);
        return { url: pub.data.publicUrl, path: res.data.path };
    }

    // ─────── UPLOAD FICHIER (sans compression : PDF, vidéo…) ───────
    async function uploaderFichier(file, bucket, options) {
        options = options || {};
        if (!file) throw new Error('Fichier requis');

        var maxMo = options.maxSizeMo || 10;
        if (file.size > maxMo * 1024 * 1024) {
            throw new Error('Fichier trop lourd (max ' + maxMo + ' Mo)');
        }

        var client = getClient();
        var nomOrig = options.nomFichier || file.name || 'fichier.bin';
        var chemin = genererChemin(options.userId, nomOrig);

        var uploadPromise = client.storage
            .from(bucket)
            .upload(chemin, file, {
                contentType: file.type || 'application/octet-stream',
                cacheControl: '3600',
                upsert: false
            });

        var timeoutPromise = new Promise(function(_, reject) {
            setTimeout(function() { reject(new Error('Délai dépassé (serveur lent)')); }, 30000);
        });

        var res = await Promise.race([uploadPromise, timeoutPromise]);
        if (res.error) throw new Error('Upload : ' + res.error.message);

        var pub = client.storage.from(bucket).getPublicUrl(res.data.path);
        return { url: pub.data.publicUrl, path: res.data.path };
    }

    // ─────── SUPPRIMER UN FICHIER ───────
    async function supprimer(bucket, path) {
        if (!path) return;
        if (path.indexOf('data:') === 0 || path.indexOf('http') === 0) return;
        var client = getClient();
        await client.storage.from(bucket).remove([path]);
    }

    // ─────── dataURL → URL Storage (migration) ───────
    async function migrerDataUrl(dataUrl, bucket, options) {
        if (!dataUrl || dataUrl.indexOf('data:') !== 0) return dataUrl;
        options = options || {};
        var blob = dataUrlVersBlob(dataUrl);
        var fakeFile = new File([blob], 'migration.jpg', { type: blob.type });
        var result = await uploaderFichier(fakeFile, bucket, options);
        return result.url;
    }

    // ─────── EXPORT ───────
    window.EduStorage = {
        uploaderImage: uploaderImage,
        uploaderFichier: uploaderFichier,
        supprimer: supprimer,
        migrerDataUrl: migrerDataUrl,
        dataUrlVersBlob: dataUrlVersBlob
    };

    console.log('✅ EDU-LINK storage chargé');
})();