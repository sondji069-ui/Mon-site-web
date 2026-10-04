# EDU-LINK — Plateforme scolaire

Plateforme de gestion scolaire pour les écoles du Sénégal.
L'école connectée, l'éducation rapprochée.

## 🎯 Fonctionnalités

- 4 rôles : élève, enseignant, parent, administrateur
- Gestion complète par école (multi-tenant via ecole_id)
- Notes, bulletins PDF, absences, emploi du temps
- Paiements, annonces avec affiches, messagerie interne
- Carte scolaire PDF, assistant IA pédagogique

## 🛠️ Stack technique

- HTML + Tailwind CSS (CDN)
- JavaScript vanilla
- Supabase (base de données PostgreSQL)
- html2pdf.js (génération PDF)
- OpenRouter API (assistant IA)

## 📁 Structure des fichiers

- `index.html` — Page de connexion
- `inscription.html` — Inscription élève / prof / parent
- `inscription-ecole.html` — Création d'une école + compte admin
- `admin.html` — Tableau de bord administrateur
- `eleve.html` — Espace élève
- `enseignant.html` — Espace enseignant
- `parent.html` — Espace parent
- `profil.html` — Profil + carte scolaire PDF
- `messagerie.html` — Messagerie interne
- `assistant-ia.html` — Assistant IA (OpenRouter)

## 🗄️ Base de données Supabase

Tables principales :
- `ecoles`, `utilisateurs`, `eleves`, `enseignants`, `parents`
- `classes`, `affectations`, `emploi_du_temps`, `notes`, `absences`
- `paiements`, `annonces`, `messages`, `notifications`

## ✅ Comptes de démonstration

| Rôle | Email | Mot de passe |
|---|---|---|
| Élève | aissatou.diop@horizons.sn | MotDePasse123! |
| Enseignant | fatou.sow@horizons.sn | Prof123! |
| Parent | aminata.ndiaye@gmail.com | Parent123! |
| Admin | moussa.diallo@horizons.sn | Admin123! |

## ⚠️ À faire avant mise en ligne officielle

- [ ] Activer Row Level Security (RLS) sur toutes les tables Supabase
- [ ] Migrer vers Supabase Auth (hachage des mots de passe)
- [ ] Héberger sur Vercel / Netlify
- [ ] Acheter un nom de domaine
- [ ] Créer un dossier /assets pour les images

## 📌 Dernières corrections

- ✅ Champ mot de passe masqué dans profil.html
- ✅ Compteur "absents du jour" corrigé dans admin.html
- ✅ Messagerie sans double connexion
- ✅ Clé OpenRouter configurée pour l'IA



Version stable du 04/10/2026
- admin.html fonctionne avec recherche + auto-refresh
- Pas de toasts (alert basiques)