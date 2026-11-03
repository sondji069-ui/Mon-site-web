// ═══════════════════════════════════════════════════════════════
// EDU-LINK — Helpers Authentification (Version iOS compatible)
// ═══════════════════════════════════════════════════════════════

(function() {
    'use strict';

    window.creerUtilisateur = async function(data) {
        console.log("Tentative de création d'utilisateur:", data.email);
        
        try {
            // 1. Récupérer la session
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            
            if (!session) {
                throw new Error("Vous n'êtes pas connecté. Reconnectez-vous.");
            }

            // 2. Appel manuel via fetch (plus stable sur iOS que le SDK)
            var monUrl = window.SUPABASE_URL + '/functions/v1/create-user';
            
            var response = await fetch(monUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + session.access_token,
                    'apikey': window.SUPABASE_KEY
                },
                body: JSON.stringify(data)
            });

            // 3. Lire la réponse
            var resultat = await response.json();

            if (!response.ok) {
                throw new Error(resultat.error || "Erreur serveur (HTTP " + response.status + ")");
            }

            console.log("Succès !", resultat);
            return resultat.user;

        } catch (err) {
            console.error("Erreur détaillée:", err);
            throw err;
        }
    };
})();