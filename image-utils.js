// ═══════════════════════════════════════════════════════════════
// EDU-LINK — UTILITAIRES IMAGE
// Compression automatique côté client avant upload
// ═══════════════════════════════════════════════════════════════

(function() {
    'use strict';

    /**
     * Compresse une image avant upload
     * @param {File} file - Le fichier image
     * @param {object} options - { maxWidth, maxHeight, quality }
     * @returns {Promise<string>} - Base64 compressé
     */
    window.compresserImage = function(file, options) {
        options = options || {};
        var maxWidth = options.maxWidth || 1200;
        var maxHeight = options.maxHeight || 1200;
        var quality = options.quality || 0.75;

        return new Promise(function(resolve, reject) {
            if (!file || !file.type.startsWith('image/')) {
                reject(new Error('Fichier non-image'));
                return;
            }

            var reader = new FileReader();
            reader.onload = function(e) {
                var img = new Image();
                img.onload = function() {
                    var canvas = document.createElement('canvas');
                    var width = img.width;
                    var height = img.height;

                    // Calculer nouvelles dimensions en gardant le ratio
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    var ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);

                    var compressed = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressed);
                };
                img.onerror = function() {
                    reject(new Error('Impossible de lire l\'image'));
                };
                img.src = e.target.result;
            };
            reader.onerror = function() {
                reject(new Error('Impossible de lire le fichier'));
            };
            reader.readAsDataURL(file);
        });
    };

    /**
     * Formate une taille en octets en texte lisible
     */
    window.formaterTaille = function(octets) {
        if (octets < 1024) return octets + ' o';
        if (octets < 1024 * 1024) return Math.round(octets / 1024) + ' Ko';
        return (octets / (1024 * 1024)).toFixed(1) + ' Mo';
    };

    /**
     * Ouvre un sélecteur de fichier et retourne le fichier choisi
     */
    window.selectionnerFichier = function(accept) {
        return new Promise(function(resolve) {
            var input = document.createElement('input');
            input.type = 'file';
            input.accept = accept || 'image/*';
            input.onchange = function(e) {
                resolve(e.target.files[0] || null);
            };
            input.click();
        });
    };

})();