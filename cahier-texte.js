// ═══════════════════════════════════════════════════════════════
// EDU-LINK — Cahier de texte (journal pédagogique enseignant)
// ═══════════════════════════════════════════════════════════════

(function() {
    'use strict';

    // ═══════════ ÉTAT GLOBAL ═══════════
    var ctxCahier = {
        client: null,
        user: null,
        ecoleId: null,
        enseignantId: null,
        liste: [],
        filtreClasse: '',
        filtreMatiere: '',
        filtreDebut: '',
        filtreFin: '',
        _initialise: false
    };

    // ═══════════ INITIALISATION ═══════════
    window.cahierInit = function(client, user, ecoleId, enseignantId) {
        ctxCahier.client = client;
        ctxCahier.user = user;
        ctxCahier.ecoleId = ecoleId;
        ctxCahier.enseignantId = enseignantId || null;
        ctxCahier._initialise = true;
    };

    // ═══════════ CHARGER LA LISTE (enseignant) ═══════════
    window.cahierCharger = async function(containerId) {
        if (!ctxCahier._initialise) {
            console.error('cahierInit non appelée');
            return;
        }
        var conteneur = document.getElementById(containerId);
        if (!conteneur) return;

        conteneur.innerHTML = '<p class="text-center py-6 text-sm text-gray-500">Chargement...</p>';

        try {
            var q = ctxCahier.client
                .from('cahier_texte')
                .select('*, classes(nom), enseignants(utilisateurs!utilisateur_id(prenom, nom))')
                .eq('ecole_id', ctxCahier.ecoleId)
                .order('date_cours', { ascending: false })
                .order('id', { ascending: false })
                .limit(200);

            if (ctxCahier.enseignantId) {
                q = q.eq('enseignant_id', ctxCahier.enseignantId);
            }
            if (ctxCahier.filtreClasse) q = q.eq('classe_id', ctxCahier.filtreClasse);
            if (ctxCahier.filtreMatiere) q = q.eq('matiere', ctxCahier.filtreMatiere);
            if (ctxCahier.filtreDebut) q = q.gte('date_cours', ctxCahier.filtreDebut);
            if (ctxCahier.filtreFin) q = q.lte('date_cours', ctxCahier.filtreFin);

            var res = await q;
            if (res.error) throw res.error;
            ctxCahier.liste = res.data || [];
            cahierAfficherListe(containerId);
        } catch (err) {
            conteneur.innerHTML = '<div class="alert-banner danger"><div class="alert-icon">❌</div><div class="alert-content"><div class="alert-title">Erreur</div><div class="alert-desc">' + err.message + '</div></div></div>';
        }
    };

    // ═══════════ AFFICHER LA LISTE ═══════════
    function cahierAfficherListe(containerId) {
        var conteneur = document.getElementById(containerId);
        var liste = ctxCahier.liste;

        if (liste.length === 0) {
            conteneur.innerHTML = '<div class="empty-state"><div class="empty-icon">📓</div><div class="empty-title">Aucune entrée</div><div class="empty-desc">Créez votre première note de cours</div></div>';
            return;
        }

        // Grouper par date
        var parDate = {};
        liste.forEach(function(e) {
            var d = e.date_cours;
            if (!parDate[d]) parDate[d] = [];
            parDate[d].push(e);
        });

        var datesTriees = Object.keys(parDate).sort().reverse();
        var html = '';

        datesTriees.forEach(function(date) {
            var dateObj = new Date(date + 'T00:00:00');
            var dateLbl = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            html += '<div style="margin-bottom: 18px;">';
            html += '<p style="font-size: 11px; font-weight: 800; color: #0D9488; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; text-transform: capitalize;">' + dateLbl + '</p>';

            parDate[date].forEach(function(e) {
                var classeNom = e.classes ? e.classes.nom : 'Sans classe';
                var profNom = '';
                if (e.enseignants && e.enseignants.utilisateurs) {
                    profNom = e.enseignants.utilisateurs.prenom + ' ' + e.enseignants.utilisateurs.nom;
                }
                var contenu = (e.contenu || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                var peutEditer = ctxCahier.enseignantId && e.enseignant_id === ctxCahier.enseignantId;

                html += '<div class="card-pro" style="margin-bottom: 8px; border-left: 3px solid #0D9488;">';
                html += '<div style="display: flex; justify-content: space-between; align-items: start; gap: 8px; margin-bottom: 6px;">';
                html += '<div style="flex: 1; min-width: 0;">';
                html += '<p style="font-size: 13px; font-weight: 800; color: #0D9488; margin: 0;">' + e.matiere + '</p>';
                html += '<p style="font-size: 10px; color: #6b7280; margin: 2px 0 0 0;">🏫 ' + classeNom + (profNom ? ' • 👤 ' + profNom : '') + '</p>';
                html += '</div>';
                if (peutEditer) {
                    html += '<div style="display: flex; gap: 4px;">';
                    html += '<button onclick="cahierOuvrirFormEdition(' + e.id + ')" style="background: #dbeafe; border: none; border-radius: 8px; padding: 4px 8px; font-size: 14px; cursor: pointer;">✏️</button>';
                    html += '<button onclick="cahierSupprimer(' + e.id + ')" style="background: #fee2e2; border: none; border-radius: 8px; padding: 4px 8px; font-size: 14px; cursor: pointer;">🗑️</button>';
                    html += '</div>';
                }
                html += '</div>';
                html += '<p class="text-gray-800" style="font-size: 12px; white-space: pre-wrap; margin: 0; line-height: 1.5;">' + contenu + '</p>';
                html += '</div>';
            });

            html += '</div>';
        });

        conteneur.innerHTML = html;
    }
// ═══════════ OUVRIR LE FORMULAIRE EN MODE ÉDITION ═══════════
    window.cahierOuvrirFormEdition = function(id) {
        var entree = ctxCahier.liste.find(function(e) { return e.id === id; });
        if (!entree) {
            if (typeof toast !== 'undefined') toast.error('Note introuvable');
            return;
        }

        var overlay = document.createElement('div');
        overlay.id = 'cahier-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:flex-end;justify-content:center;padding:0;';

        var modal = document.createElement('div');
        modal.style.cssText = 'background:white;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;border-radius:24px 24px 0 0;padding:20px;';

        var contenuSecurise = (entree.contenu || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        var matiereSecurisee = (entree.matiere || '').replace(/"/g, '&quot;');

        var html = '';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #f3f4f6;">';
        html += '<h2 style="font-size:16px;font-weight:800;color:#1f2937;margin:0;">✏️ Modifier la note</h2>';
        html += '<button onclick="cahierFermerForm()" style="background:#f3f4f6;border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;font-size:14px;">✕</button>';
        html += '</div>';

        html += '<div style="margin-bottom:12px;">';
        html += '<label style="font-size:11px;font-weight:700;color:#6b7280;display:block;margin-bottom:4px;text-transform:uppercase;">Date du cours</label>';
        html += '<input type="date" id="cahier-date" value="' + entree.date_cours + '" style="width:100%;padding:10px;border-radius:10px;border:1px solid #d1d5db;font-size:13px;">';
        html += '</div>';

        html += '<div style="margin-bottom:12px;">';
        html += '<label style="font-size:11px;font-weight:700;color:#6b7280;display:block;margin-bottom:4px;text-transform:uppercase;">Classe</label>';
        html += '<select id="cahier-classe" style="width:100%;padding:10px;border-radius:10px;border:1px solid #d1d5db;background:white;font-size:13px;">';
        html += '<option value="">-- Chargement... --</option>';
        html += '</select>';
        html += '</div>';

        html += '<div style="margin-bottom:12px;">';
        html += '<label style="font-size:11px;font-weight:700;color:#6b7280;display:block;margin-bottom:4px;text-transform:uppercase;">Matière</label>';
        html += '<input type="text" id="cahier-matiere" value="' + matiereSecurisee + '" style="width:100%;padding:10px;border-radius:10px;border:1px solid #d1d5db;font-size:13px;">';
        html += '</div>';

        html += '<div style="margin-bottom:12px;">';
        html += '<label style="font-size:11px;font-weight:700;color:#6b7280;display:block;margin-bottom:4px;text-transform:uppercase;">Contenu du cours</label>';
        html += '<textarea id="cahier-contenu" rows="6" style="width:100%;padding:10px;border-radius:10px;border:1px solid #d1d5db;font-size:13px;font-family:inherit;resize:vertical;">' + contenuSecurise + '</textarea>';
        html += '</div>';

        html += '<input type="hidden" id="cahier-edit-id" value="' + id + '">';
        html += '<button onclick="cahierSauvegarderEdition()" id="cahier-btn-save" style="width:100%;padding:14px;border-radius:12px;border:none;background:linear-gradient(135deg,#3B82F6,#1D4ED8);color:white;font-weight:800;font-size:14px;cursor:pointer;box-shadow:0 4px 14px rgba(59,130,246,0.35);">💾 Mettre à jour</button>';
        html += '<div id="cahier-msg" style="text-align:center;font-size:12px;font-weight:600;margin-top:10px;"></div>';

        modal.innerHTML = html;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Charger les classes et pré-sélectionner
        cahierChargerClasses().then(function() {
            var sel = document.getElementById('cahier-classe');
            if (sel) sel.value = entree.classe_id;
        });
    };

    // ═══════════ OUVRIR LE FORMULAIRE ═══════════
    window.cahierOuvrirForm = function() {
        var overlay = document.createElement('div');
        overlay.id = 'cahier-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:flex-end;justify-content:center;padding:0;';

        var modal = document.createElement('div');
        modal.style.cssText = 'background:white;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;border-radius:24px 24px 0 0;padding:20px;';

        var html = '';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #f3f4f6;">';
        html += '<h2 style="font-size:16px;font-weight:800;color:#1f2937;margin:0;">📓 Nouvelle note</h2>';
        html += '<button onclick="cahierFermerForm()" style="background:#f3f4f6;border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;font-size:14px;">✕</button>';
        html += '</div>';

        html += '<div style="margin-bottom:12px;">';
        html += '<label style="font-size:11px;font-weight:700;color:#6b7280;display:block;margin-bottom:4px;text-transform:uppercase;">Date du cours</label>';
        var aujourdhui = new Date().toISOString().split('T')[0];
        html += '<input type="date" id="cahier-date" value="' + aujourdhui + '" style="width:100%;padding:10px;border-radius:10px;border:1px solid #d1d5db;font-size:13px;">';
        html += '</div>';

        html += '<div style="margin-bottom:12px;">';
        html += '<label style="font-size:11px;font-weight:700;color:#6b7280;display:block;margin-bottom:4px;text-transform:uppercase;">Classe</label>';
        html += '<select id="cahier-classe" style="width:100%;padding:10px;border-radius:10px;border:1px solid #d1d5db;background:white;font-size:13px;">';
        html += '<option value="">-- Chargement... --</option>';
        html += '</select>';
        html += '</div>';

        html += '<div style="margin-bottom:12px;">';
        html += '<label style="font-size:11px;font-weight:700;color:#6b7280;display:block;margin-bottom:4px;text-transform:uppercase;">Matière</label>';
        html += '<input type="text" id="cahier-matiere" placeholder="Ex: Mathématiques" style="width:100%;padding:10px;border-radius:10px;border:1px solid #d1d5db;font-size:13px;">';
        html += '</div>';

        html += '<div style="margin-bottom:12px;">';
        html += '<label style="font-size:11px;font-weight:700;color:#6b7280;display:block;margin-bottom:4px;text-transform:uppercase;">Contenu du cours</label>';
        html += '<textarea id="cahier-contenu" rows="6" placeholder="Ce qui a été fait en classe..." style="width:100%;padding:10px;border-radius:10px;border:1px solid #d1d5db;font-size:13px;font-family:inherit;resize:vertical;"></textarea>';
        html += '</div>';

        html += '<button onclick="cahierSauvegarder()" id="cahier-btn-save" style="width:100%;padding:14px;border-radius:12px;border:none;background:linear-gradient(135deg,#0D9488,#059669);color:white;font-weight:800;font-size:14px;cursor:pointer;box-shadow:0 4px 14px rgba(13,148,136,0.35);">💾 Enregistrer</button>';
        html += '<div id="cahier-msg" style="text-align:center;font-size:12px;font-weight:600;margin-top:10px;"></div>';

        modal.innerHTML = html;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Charger les classes
        cahierChargerClasses();
    };

    window.cahierFermerForm = function() {
        var o = document.getElementById('cahier-modal-overlay');
        if (o) o.remove();
    };

    async function cahierChargerClasses() {
        var sel = document.getElementById('cahier-classe');
        if (!sel) return;
        try {
            // Essaie de récupérer les affectations de l'enseignant
            if (ctxCahier.enseignantId) {
                var res = await ctxCahier.client
                    .from('affectations')
                    .select('classe_id, matiere, classes(nom)')
                    .eq('enseignant_id', ctxCahier.enseignantId);
                if (!res.error && res.data && res.data.length > 0) {
                    sel.innerHTML = '<option value="">-- Choisir --</option>';
                    var vues = {};
                    res.data.forEach(function(a) {
                        var key = a.classe_id + '|' + a.matiere;
                        if (vues[key]) return;
                        vues[key] = true;
                        var nomClasse = a.classes ? a.classes.nom : '?';
                        sel.innerHTML += '<option value="' + a.classe_id + '" data-matiere="' + a.matiere + '">' + nomClasse + ' — ' + a.matiere + '</option>';
                    });
                    // Auto-remplir la matière quand on change de classe
                    sel.onchange = function() {
                        var opt = sel.options[sel.selectedIndex];
                        var m = opt.getAttribute('data-matiere');
                        if (m) document.getElementById('cahier-matiere').value = m;
                    };
                    return;
                }
            }
            // Fallback : toutes les classes de l'école
            var resAll = await ctxCahier.client.from('classes').select('id, nom').eq('ecole_id', ctxCahier.ecoleId).order('nom');
            sel.innerHTML = '<option value="">-- Choisir --</option>';
            (resAll.data || []).forEach(function(c) {
                sel.innerHTML += '<option value="' + c.id + '">' + c.nom + '</option>';
            });
        } catch (err) {
            sel.innerHTML = '<option value="">Erreur de chargement</option>';
        }
    }

    // ═══════════ SAUVEGARDER ═══════════
    window.cahierSauvegarder = async function() {
        var btn = document.getElementById('cahier-btn-save');
        var msg = document.getElementById('cahier-msg');
        var date = document.getElementById('cahier-date').value;
        var classeId = document.getElementById('cahier-classe').value;
        var matiere = document.getElementById('cahier-matiere').value.trim();
        var contenu = document.getElementById('cahier-contenu').value.trim();

        if (!date || !classeId || !matiere || !contenu) {
            msg.innerText = 'Tous les champs sont obligatoires.';
            msg.style.color = '#EF4444';
            return;
        }

        btn.disabled = true;
        btn.innerText = 'Enregistrement...';
        msg.innerText = '';

        try {
            var res = await ctxCahier.client.from('cahier_texte').insert([{
                ecole_id: ctxCahier.ecoleId,
                classe_id: parseInt(classeId),
                enseignant_id: ctxCahier.enseignantId,
                matiere: matiere,
                date_cours: date,
                contenu: contenu
            }]);
            if (res.error) throw res.error;

            if (typeof toast !== 'undefined') toast.success('Note ajoutée au cahier de texte');
            cahierFermerForm();
            // Recharger la liste
            var cible = document.getElementById('liste-cahier-texte');
            if (cible) cahierCharger('liste-cahier-texte');
        } catch (err) {
            msg.innerText = 'Erreur : ' + err.message;
            msg.style.color = '#EF4444';
            btn.disabled = false;
            btn.innerText = '💾 Enregistrer';
        }
    };
// ═══════════ SAUVEGARDER ÉDITION ═══════════
    window.cahierSauvegarderEdition = async function() {
        var btn = document.getElementById('cahier-btn-save');
        var msg = document.getElementById('cahier-msg');
        var id = document.getElementById('cahier-edit-id').value;
        var date = document.getElementById('cahier-date').value;
        var classeId = document.getElementById('cahier-classe').value;
        var matiere = document.getElementById('cahier-matiere').value.trim();
        var contenu = document.getElementById('cahier-contenu').value.trim();

        if (!date || !classeId || !matiere || !contenu) {
            msg.innerText = 'Tous les champs sont obligatoires.';
            msg.style.color = '#EF4444';
            return;
        }

        btn.disabled = true;
        btn.innerText = 'Mise à jour...';
        msg.innerText = '';

        try {
            var res = await ctxCahier.client
                .from('cahier_texte')
                .update({
                    date_cours: date,
                    classe_id: parseInt(classeId),
                    matiere: matiere,
                    contenu: contenu,
                    date_modification: new Date().toISOString()
                })
                .eq('id', parseInt(id));

            if (res.error) throw res.error;

            if (typeof toast !== 'undefined') toast.success('Note mise à jour');
            cahierFermerForm();
            var cible = document.getElementById('liste-cahier-texte');
            if (cible) cahierCharger('liste-cahier-texte');
        } catch (err) {
            msg.innerText = 'Erreur : ' + err.message;
            msg.style.color = '#EF4444';
            btn.disabled = false;
            btn.innerText = '💾 Mettre à jour';
        }
    };

    // ═══════════ SUPPRIMER ═══════════
    window.cahierSupprimer = async function(id) {
        if (!confirm('Supprimer cette note du cahier de texte ?')) return;
        try {
            var res = await ctxCahier.client.from('cahier_texte').delete().eq('id', id);
            if (res.error) throw res.error;
            if (typeof toast !== 'undefined') toast.success('Note supprimée');
            var cible = document.getElementById('liste-cahier-texte');
            if (cible) cahierCharger('liste-cahier-texte');
        } catch (err) {
            if (typeof toast !== 'undefined') toast.error('Erreur : ' + err.message);
        }
    };

})();