// ═══════════════════════════════════════════════════════════════
// EDU-LINK — PWA (enregistrement SW + bouton installer + màj auto)
// ═══════════════════════════════════════════════════════════════

(function() {
    'use strict';

    // ═══════════ DÉTECTIONS ═══════════
    var estIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    var estAndroid = /Android/.test(navigator.userAgent);
    var estStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        window.navigator.standalone === true;
    var deferredPrompt = null;
    var swRegistration = null;

    // ═══════════ BANDEAU INSTALLATION ═══════════
    function afficherBandeauInstall(raison) {
        // Ne pas afficher si déjà installé ou si bandeau déjà fermé
        if (estStandalone) return;
        if (sessionStorage.getItem('eduLinkPWABandeauFerme') === '1') return;
        if (document.getElementById('eduLinkPWABandeau')) return;

        var bandeau = document.createElement('div');
        bandeau.id = 'eduLinkPWABandeau';
        bandeau.style.cssText = [
            'position: fixed',
            'bottom: 16px',
            'left: 50%',
            'transform: translateX(-50%)',
            'background: #ffffff',
            'border-radius: 16px',
            'box-shadow: 0 10px 40px rgba(0,0,0,0.25)',
            'padding: 14px 16px',
            'z-index: 99990',
            'width: 92%',
            'max-width: 420px',
            'display: flex',
            'align-items: center',
            'gap: 10px',
            'font-family: Poppins, sans-serif',
            'animation: eduLinkPWASlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        ].join(';');

        var texte = '';
        if (raison === 'ios') {
            texte = '<p style="margin: 0; font-weight: bold; font-size: 12px; color: #1f2937;">Installer EDU-LINK</p>' +
                    '<p style="margin: 2px 0 0 0; font-size: 10px; color: #6b7280; line-height: 1.3;">Appuyez sur <b>Partager</b> ⬆️ puis <b>« Sur l\'écran d\'accueil »</b></p>';
        } else if (raison === 'android') {
            texte = '<p style="margin: 0; font-weight: bold; font-size: 12px; color: #1f2937;">Installer EDU-LINK</p>' +
                    '<p style="margin: 2px 0 0 0; font-size: 10px; color: #6b7280; line-height: 1.3;">Accédez plus vite à vos notes et messages depuis votre téléphone</p>';
        }

        var boutonAction = '';
        if (raison === 'android') {
            boutonAction = '<button id="eduLinkPWABtnInstaller" style="background: #004AAD; color: white; border: none; border-radius: 10px; padding: 8px 12px; font-weight: bold; font-size: 11px; cursor: pointer; flex-shrink: 0;">Installer</button>';
        }

        bandeau.innerHTML =
            '<div style="font-size: 26px; flex-shrink: 0;">📖</div>' +
            '<div style="flex: 1; min-width: 0;">' + texte + '</div>' +
            boutonAction +
            '<button id="eduLinkPWABtnFermer" style="background: transparent; border: none; font-size: 18px; cursor: pointer; color: #9ca3af; flex-shrink: 0; padding: 0;">✕</button>';

        document.body.appendChild(bandeau);

        // Animation CSS
        if (!document.getElementById('eduLinkPWAAnim')) {
            var style = document.createElement('style');
            style.id = 'eduLinkPWAAnim';
            style.innerHTML = '@keyframes eduLinkPWASlideUp { from { opacity: 0; transform: translate(-50%, 30px); } to { opacity: 1; transform: translate(-50%, 0); } }';
            document.head.appendChild(style);
        }

        // Bouton fermer
        document.getElementById('eduLinkPWABtnFermer').onclick = function() {
            sessionStorage.setItem('eduLinkPWABandeauFerme', '1');
            bandeau.remove();
        };

        // Bouton installer (Android)
        var btnInstaller = document.getElementById('eduLinkPWABtnInstaller');
        if (btnInstaller) {
            btnInstaller.onclick = async function() {
                if (!deferredPrompt) return;
                deferredPrompt.prompt();
                var choix = await deferredPrompt.userChoice;
                if (choix.outcome === 'accepted') {
                    if (typeof toast !== 'undefined') toast.success('EDU-LINK installé !');
                }
                deferredPrompt = null;
                bandeau.remove();
            };
        }
    }

    // ═══════════ BANDEAU MISE À JOUR ═══════════
    function afficherBandeauMaj(registration) {
        if (document.getElementById('eduLinkPWAMaj')) return;

        var bandeau = document.createElement('div');
        bandeau.id = 'eduLinkPWAMaj';
        bandeau.style.cssText = [
            'position: fixed',
            'bottom: 16px',
            'left: 50%',
            'transform: translateX(-50%)',
            'background: #0D9488',
            'border-radius: 16px',
            'box-shadow: 0 10px 40px rgba(0,0,0,0.3)',
            'padding: 14px 16px',
            'z-index: 99991',
            'width: 92%',
            'max-width: 420px',
            'display: flex',
            'align-items: center',
            'gap: 10px',
            'font-family: Poppins, sans-serif',
            'color: white'
        ].join(';');

        bandeau.innerHTML =
            '<div style="font-size: 24px; flex-shrink: 0;">🎉</div>' +
            '<div style="flex: 1; min-width: 0;">' +
                '<p style="margin: 0; font-weight: bold; font-size: 12px;">Nouvelle version disponible</p>' +
                '<p style="margin: 2px 0 0 0; font-size: 10px; opacity: 0.9;">Rechargez pour profiter des améliorations</p>' +
            '</div>' +
            '<button id="eduLinkPWABtnRecharger" style="background: white; color: #0D9488; border: none; border-radius: 10px; padding: 8px 12px; font-weight: bold; font-size: 11px; cursor: pointer; flex-shrink: 0;">Recharger</button>';

        document.body.appendChild(bandeau);

        document.getElementById('eduLinkPWABtnRecharger').onclick = function() {
            if (registration && registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            setTimeout(function() { window.location.reload(); }, 300);
        };
    }

    // ═══════════ ENREGISTREMENT DU SERVICE WORKER ═══════════
    function enregistrerSW() {
        if (!('serviceWorker' in navigator)) return;

        navigator.serviceWorker.register('sw.js', { scope: './' })
            .then(function(registration) {
                swRegistration = registration;

                // Détection d'une nouvelle version en attente
                if (registration.waiting) {
                    afficherBandeauMaj(registration);
                }

                // Écouter les nouvelles installations
                registration.addEventListener('updatefound', function() {
                    var nouveauSW = registration.installing;
                    if (!nouveauSW) return;
                    nouveauSW.addEventListener('statechange', function() {
                        if (nouveauSW.state === 'installed' && navigator.serviceWorker.controller) {
                            // Une nouvelle version est prête
                            afficherBandeauMaj(registration);
                        }
                    });
                });

                // Vérifier les mises à jour toutes les 30 minutes
                setInterval(function() {
                    registration.update().catch(function() {});
                }, 30 * 60 * 1000);
            })
            .catch(function(err) {
                console.log('Service Worker non enregistré :', err);
            });

        // Recharger automatiquement quand le SW prend le contrôle
        var refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', function() {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
        });
    }

    // ═══════════ BOUTON INSTALLER (Android/Chrome) ═══════════
    window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
        deferredPrompt = e;
        setTimeout(function() { afficherBandeauInstall('android'); }, 3000);
    });

    // ═══════════ BANDEAU iOS (manuel) ═══════════
    function initIOS() {
        if (!estIOS) return;
        if (estStandalone) return;  // déjà installé
        // Afficher après 5 secondes
        setTimeout(function() { afficherBandeauInstall('ios'); }, 5000);
    }

    // ═══════════ INITIALISATION ═══════════
    function init() {
        enregistrerSW();
        initIOS();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ═══════════ API PUBLIQUE (optionnelle) ═══════════
    window.EduLinkPWA = {
        afficherBandeauInstall: afficherBandeauInstall,
        estInstalle: function() { return estStandalone; },
        forcerMiseAJour: function() {
            if (swRegistration && swRegistration.waiting) {
                swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
        }
    };

})();