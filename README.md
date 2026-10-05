# EDU-LINK — Plateforme scolaire

Plateforme de gestion scolaire pour les écoles du Sénégal.
**L'école connectée, l'éducation rapprochée.**

---

## 🎯 Fonctionnalités

### 🎓 Multi-rôles
5 rôles distincts avec leur espace dédié :
- **Élève** — notes, bulletin, devoirs, absences, badges
- **Enseignant** — appel, saisie notes, devoirs, statistiques, badges classe
- **Parent** — suivi enfants, bulletins, absences, comparaison
- **Admin** (Directeur) — gestion complète de l'école
- **Staff** — surveillants, censeurs, intendants, etc.
- **Super Admin** — gestion multi-écoles (plateforme)

### 🔑 Authentification & sécurité
- Connexion par email + mot de passe
- **Hachage PBKDF2-SHA256 (100 000 itérations)** — voir section "Sécurité"
- Migration automatique des anciens mots de passe en clair vers PBKDF2
- Validation des comptes par l'école (statut `en_attente`)
- Code d'accès unique par école (généré automatiquement)
- Récupération de mot de passe (demande → admin génère mdp temporaire)
- **Échappement HTML systématique (anti-XSS)** dans les affiches d'annonces

### 📚 Gestion scolaire
- Classes, élèves, enseignants, parents
- Notes par matière, trimestre et coefficient
- Bulletins PDF (avec signature du directeur)
- Statistiques enseignant (moyennes, taux de réussite, top 5)
- Bulletin de classe PDF (récapitulatif complet)
- Saisie de notes en masse
- Emploi du temps par classe
- Absences avec justification
- Système de devoirs (création, suivi, marquage "fait")
- Annonces avec affiches PDF (signature + logo)

### 🏆 Motivation
- Badges automatiques (10 badges) : Premier, Excellence, Assidu, etc.
- Carte "Mes récompenses" sur l'espace élève
- Affichage des badges côté enseignant et parent
- **Calcul optimisé en batch** : 5 requêtes pour toute une classe (au lieu de ~5 × N)

### 🎨 Expérience utilisateur
- Mode sombre 🌙 (persistant par appareil)
- Photos de profil (upload + affichage partout)
- Assistant IA pédagogique (via OpenRouter)
- Messagerie interne
- Notifications internes avec badge 🔔

---

## 🔐 Sécurité

### Mots de passe — PBKDF2-SHA256

Tous les mots de passe sont hashés avec **PBKDF2-SHA256, 100 000 itérations**, via l'API Web Crypto native du navigateur. Aucune librairie externe n'est nécessaire.

**Format de stockage** (colonne `utilisateurs.mot_de_passe`) :

**Migration automatique** :
- Si un ancien mot de passe en clair est détecté à la 1ère connexion → l'utilisateur se connecte normalement, puis le mot de passe est rehashé silencieusement.
- Aucun utilisateur existant n'est bloqué.

**Fonctions disponibles** (dans chaque HTML, bloc `<script>` "AUTH") :

| Fonction | Rôle |
|---|---|
| `hashPassword(plain)` | Retourne `"pbkdf2$100000$<hex>"` |
| `verifyPassword(plain, stored)` | Retourne `{ ok, needsRehash }` |
| `rehashSiNecessaire(client, id, plain, flag)` | Rehash silencieux |

**⚠️ Important** : `crypto.subtle` nécessite **HTTPS** ou **localhost**. En `file://`, l'authentification ne fonctionnera pas.

### Protection XSS

Les annonces sont échappées via `echapperHtml()` (dans `badges.js`) avant tout rendu HTML :

```javascript
function echapperHtml(texte) {
    return String(texte)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}