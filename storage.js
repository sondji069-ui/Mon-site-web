// ═══════════════════════════════════════════════════════════════
// EDU-LINK — Storage (Cloudflare R2 via Worker)
// ═══════════════════════════════════════════════════════════════

(function() {
    'use strict';

    // ─────── Configuration Cloudflare ───────
    const WORKER_URL = 'https://edu-link-storage-api.sondji069.workers.dev';
    const R2_PUBLIC_URL = 'https://pub-a2366ac592594708a7ab9e2194a86022.r2.dev';

    // ─────── Utilitaires ───────
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

    function dataUrlVersBlob(dataUrl) {
        var parts = dataUrl.split(',');
        var mimeMatch = parts[0].match(/data:(.*?);/);
        var mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        var bstr = atob(parts[1]);
        var u8 = new Uint8Array(bstr.length);
        for (var i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
        return new Blob([u8], { type: mime });
    }

    // ─────── Upload vers R2 via Worker ───────
    async function uploaderVersR2(blob, chemin, contentType) {
        var url = WORKER_URL + '/' + chemin;

        // Timeout de 30 secondes
        var controller = new AbortController();
        var timeoutId = setTimeout(function() { controller.abort(); }, 30000);

        try {
            var res = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': contentType || 'application/octet-stream'
                },
                body: blob,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                var errText = await res.text();
                throw new Error('Upload R2 échoué : ' + res.status + ' - ' + errText);
            }

            var data = await res.json();
            return {
                url: data.url || (R2_PUBLIC_URL + '/' + chemin),
                path: chemin
            };
        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                throw new Error('Délai dépassé (serveur lent)');
            }
            throw err;
        }
    }

    // ─────── UPLOAD IMAGE (avec compression) ───────
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
            quality: options.quality || 0.8,
            maxSizeKo: options.maxSizeKo || 200
        });

        // 2. Conversion en Blob
        var blob = dataUrlVersBlob(dataUrlCompresse);

        // 3. Chemin avec préfixe du bucket
        var chemin = bucket + '/' + genererChemin(options.userId, file.name);

        // 4. Upload
        return await uploaderVersR2(blob, chemin, 'image/jpeg');
    }

    // ─────── UPLOAD FICHIER (sans compression) ───────
    async function uploaderFichier(file, bucket, options) {
        options = options || {};
        if (!file) throw new Error('Fichier requis');

        var maxMo = options.maxSizeMo || 10;
        if (file.size > maxMo * 1024 * 1024) {
            throw new Error('Fichier trop lourd (max ' + maxMo + ' Mo)');
        }

        var nomOrig = options.nomFichier || file.name || 'fichier.bin';
        var chemin = bucket + '/' + genererChemin(options.userId, nomOrig);

        return await uploaderVersR2(file, chemin, file.type || 'application/octet-stream');
    }

    // ─────── SUPPRIMER UN FICHIER ───────
    async function supprimer(bucket, path) {
        if (!path) return;
        // Ignore les anciennes URLs (Supabase ou base64)
        if (path.indexOf('data:') === 0) return;
        if (path.indexOf('supabase.co') !== -1) return;

        // Extraire le chemin relatif si c'est une URL R2 complète
        var cheminRelatif = path;
        if (path.indexOf(R2_PUBLIC_URL) === 0) {
            cheminRelatif = path.substring(R2_PUBLIC_URL.length + 1);
        }

        try {
            await fetch(WORKER_URL + '/' + cheminRelatif, { method: 'DELETE' });
        } catch (err) {
            console.warn('Suppression R2 échouée :', err);
        }
    }

    // ─────── dataURL → URL R2 (migration) ───────
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
        dataUrlVersBlob: dataUrlVersBlob,
        WORKER_URL: WORKER_URL,
        R2_PUBLIC_URL: R2_PUBLIC_URL
    };

    console.log('✅ EDU-LINK storage R2 chargé');
})();