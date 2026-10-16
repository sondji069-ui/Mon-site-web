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
        var maxSizeKo = options.maxSizeKo || 300; // Nouveau : plafond en Ko

        return new Promise(function(resolve, reject) {
            if (!file || !file.type.startsWith('image/')) {
                reject(new Error('Fichier non-image'));
                return;
            }

            var reader = new FileReader();
            reader.onload = function(e) {
                var img = new Image();
                img.onload = function() {
                    var essais = [
                        { q: quality,        w: maxWidth,        h: maxHeight },
                        { q: quality - 0.1,  w: maxWidth,        h: maxHeight },
                        { q: quality - 0.2,  w: maxWidth,        h: maxHeight },
                        { q: 0.6,            w: maxWidth * 0.8,  h: maxHeight * 0.8 },
                        { q: 0.5,            w: maxWidth * 0.6,  h: maxHeight * 0.6 },
                        { q: 0.4,            w: maxWidth * 0.5,  h: maxHeight * 0.5 }
                    ];

                    var meilleur = null;
                    var meilleureTaille = Infinity;

                    for (var i = 0; i < essais.length; i++) {
                        var essai = essais[i];
                        var resultat = _compresserUneFois(img, essai.w, essai.h, essai.q);
                        var tailleKo = (resultat.length * 3) / 4 / 1024;

                        if (tailleKo < meilleureTaille) {
                            meilleureTaille = tailleKo;
                            meilleur = resultat;
                        }
                        if (tailleKo <= maxSizeKo) {
                            break; // Objectif atteint
                        }
                    }

                    resolve(meilleur);
                };
                img.onerror = function() { reject(new Error('Impossible de lire l\'image')); };
                img.src = e.target.result;
            };
            reader.onerror = function() { reject(new Error('Impossible de lire le fichier')); };
            reader.readAsDataURL(file);
        });
    };

    // Fonction interne : compresse une fois avec des paramètres donnés
    function _compresserUneFois(img, maxWidth, maxHeight, quality) {
        var canvas = document.createElement('canvas');
        var width = img.width;
        var height = img.height;

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

        return canvas.toDataURL('image/jpeg', quality);
    }

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