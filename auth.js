// ═══════════════════════════════════════════════════════════════
// EDU-LINK — Helpers Authentification
// ═══════════════════════════════════════════════════════════════

(function() {
    'use strict';

    window.creerUtilisateur = async function(data) {
        console.log("Tentative de création via Edge Function pour:", data.email);
        
        try {
            // 1. Récupérer la session
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            
            if (!session) {
                throw new Error("Session expirée. Reconnectez-vous.");
            }

            // 2. URL EN DUR (pour éviter les bugs de localhost)
            var urlSupabase = 'https://abwguixclmxtzvlsmbby.supabase.co';
            var monUrl = urlSupabase + '/functions/v1/create-user';
            
            // 3. Appel réseau
            var response = await fetch(monUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + session.access_token,
                    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFid2d1aXhjbG14dHp2bHNtYmJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4OTg1OTMsImV4cCI6MjEwNjQ3NDU5M30.8MiG5YdoMIY69KYfBdlXHIB9Zisd5miX3slaCoqVcjM'
                },
                body: JSON.stringify(data)
            });

            // 4. Lire la réponse
            var textBrut = await response.text();
            var resultat;
            
            try {
                resultat = JSON.parse(textBrut);
            } catch (e) {
                throw new Error("Réponse invalide du serveur : " + textBrut);
            }

            if (!response.ok) {
                throw new Error(resultat.error || "Erreur serveur (HTTP " + response.status + ")");
            }

            console.log("Création réussie !", resultat);
            return resultat.user;

        } catch (err) {
            console.error("Erreur détaillée:", err);
            throw err;
        }
    };
})();