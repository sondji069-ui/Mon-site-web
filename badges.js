// ==========================================
// EDU-LINK — Système de badges
// ==========================================

const BADGES_DEFINITIONS = [
    { id: 'premier', emoji: '🥇', label: 'Premier de la classe', desc: 'Meilleure moyenne de la classe', couleur: '#F59E0B' },
    { id: 'deuxieme', emoji: '🥈', label: 'Deuxième', desc: '2ème meilleure moyenne', couleur: '#94A3B8' },
    { id: 'troisieme', emoji: '🥉', label: 'Troisième', desc: '3ème meilleure moyenne', couleur: '#B45309' },
    { id: 'excellence', emoji: '💯', label: 'Excellence', desc: 'Moyenne ≥ 16/20', couleur: '#004AAD' },
    { id: 'tres_serieux', emoji: '🎯', label: 'Très sérieux', desc: 'Moyenne ≥ 14/20', couleur: '#2EAD5E' },
    { id: 'assidu', emoji: '⭐', label: 'Assidu(e)', desc: 'Aucune absence non justifiée', couleur: '#F59E0B' },
    { id: 'regulier', emoji: '🔥', label: 'Régulier(ère)', desc: 'Au moins 8 notes ce trimestre', couleur: '#EF4444' },
    { id: 'devoirs_a_jour', emoji: '📚', label: 'Devoirs à jour', desc: 'Tous les devoirs faits', couleur: '#8B5CF6' },
    { id: 'progression', emoji: '📈', label: 'En progression', desc: 'Moyenne en hausse vs trimestre précédent', couleur: '#0D9488' },
    { id: 'super_eleve', emoji: '🌟', label: 'Super élève', desc: '3 badges ou plus', couleur: '#EC4899' }
];

function echapperHtml(texte) {
    if (texte === null || texte === undefined) return '';
    return String(texte)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function calculerBadgesEleve(supabaseClient, eleveId, classeId, trimestre) {
    const badges = {};
    const { data: notes } = await supabaseClient.from('notes').select('note, coefficient').eq('eleve_id', eleveId).eq('trimestre', trimestre);
    let totalPoints = 0, totalCoef = 0, nbNotes = 0;
    (notes || []).forEach(n => { totalPoints += parseFloat(n.note) * n.coefficient; totalCoef += n.coefficient; nbNotes++; });
    const maMoyenne = totalCoef > 0 ? totalPoints / totalCoef : 0;
    let monRang = null;
    if (nbNotes > 0 && classeId) {
        const { data: eleves } = await supabaseClient.from('eleves').select('id').eq('classe_id', classeId);
        const ids = (eleves || []).map(e => e.id);
        const { data: toutesNotes } = await supabaseClient.from('notes').select('eleve_id, note, coefficient').in('eleve_id', ids).eq('trimestre', trimestre);
        const moyennes = {};
        (toutesNotes || []).forEach(n => {
            if (!moyennes[n.eleve_id]) moyennes[n.eleve_id] = { p: 0, c: 0 };
            moyennes[n.eleve_id].p += parseFloat(n.note) * n.coefficient;
            moyennes[n.eleve_id].c += n.coefficient;
        });
        const classement = Object.keys(moyennes).map(id => ({ id: parseInt(id), moy: moyennes[id].c > 0 ? moyennes[id].p / moyennes[id].c : 0 })).sort((a, b) => b.moy - a.moy);
        const idx = classement.findIndex(e => e.id === eleveId);
        monRang = idx >= 0 ? idx + 1 : null;
    }
    const { data: absences } = await supabaseClient.from('absences').select('justifiee').eq('eleve_id', eleveId);
    const nbAbsNonJust = (absences || []).filter(a => !a.justifiee).length;
    let totalDevoirs = 0, faits = 0;
    if (classeId) {
        const { data: devoirs } = await supabaseClient.from('devoirs').select('id').eq('classe_id', classeId);
        totalDevoirs = (devoirs || []).length;
        if (totalDevoirs > 0) {
            const ids = devoirs.map(d => d.id);
            const { data: f } = await supabaseClient.from('devoirs_faits').select('devoir_id').eq('eleve_id', eleveId).in('devoir_id', ids);
            faits = (f || []).length;
        }
    }
    let progression = false;
    if (trimestre > 1) {
        const { data: notesPrec } = await supabaseClient.from('notes').select('note, coefficient').eq('eleve_id', eleveId).eq('trimestre', trimestre - 1);
        let tp = 0, tc = 0;
        (notesPrec || []).forEach(n => { tp += parseFloat(n.note) * n.coefficient; tc += n.coefficient; });
        const moyPrec = tc > 0 ? tp / tc : 0;
        if (tc > 0 && maMoyenne > moyPrec + 0.5) progression = true;
    }
    if (monRang === 1) badges.premier = true;
    if (monRang === 2) badges.deuxieme = true;
    if (monRang === 3) badges.troisieme = true;
    if (nbNotes > 0 && maMoyenne >= 16) badges.excellence = true;
    if (nbNotes > 0 && maMoyenne >= 14) badges.tres_serieux = true;
    if (nbAbsNonJust === 0) badges.assidu = true;
    if (nbNotes >= 8) badges.regulier = true;
    if (totalDevoirs > 0 && faits === totalDevoirs) badges.devoirs_a_jour = true;
    if (progression) badges.progression = true;
    if (Object.keys(badges).length >= 3) badges.super_eleve = true;
    return badges;
}

async function calculerBadgesClasse(supabaseClient, eleveIds, classeId, trimestre) {
    const resultats = {};
    if (!eleveIds || eleveIds.length === 0) return resultats;
    const { data: notesTrim } = await supabaseClient.from('notes').select('eleve_id, note, coefficient').in('eleve_id', eleveIds).eq('trimestre', trimestre);
    let notesPrec = [];
    if (trimestre > 1) {
        const { data } = await supabaseClient.from('notes').select('eleve_id, note, coefficient').in('eleve_id', eleveIds).eq('trimestre', trimestre - 1);
        notesPrec = data || [];
    }
    const { data: absences } = await supabaseClient.from('absences').select('eleve_id, justifiee').in('eleve_id', eleveIds);
    const { data: devoirs } = await supabaseClient.from('devoirs').select('id').eq('classe_id', classeId);
    const devoirIds = (devoirs || []).map(d => d.id);
    const totalDevoirs = devoirIds.length;
    let devoirsFaits = [];
    if (devoirIds.length > 0) {
        const { data } = await supabaseClient.from('devoirs_faits').select('eleve_id, devoir_id').in('eleve_id', eleveIds).in('devoir_id', devoirIds);
        devoirsFaits = data || [];
    }
    const notesParEleve = {};
    (notesTrim || []).forEach(n => {
        if (!notesParEleve[n.eleve_id]) notesParEleve[n.eleve_id] = { p: 0, c: 0, nb: 0 };
        notesParEleve[n.eleve_id].p += parseFloat(n.note) * n.coefficient;
        notesParEleve[n.eleve_id].c += n.coefficient;
        notesParEleve[n.eleve_id].nb++;
    });
    const notesPrecParEleve = {};
    notesPrec.forEach(n => {
        if (!notesPrecParEleve[n.eleve_id]) notesPrecParEleve[n.eleve_id] = { p: 0, c: 0 };
        notesPrecParEleve[n.eleve_id].p += parseFloat(n.note) * n.coefficient;
        notesPrecParEleve[n.eleve_id].c += n.coefficient;
    });
    const absencesNonJustParEleve = {};
    (absences || []).forEach(a => {
        if (!a.justifiee) absencesNonJustParEleve[a.eleve_id] = (absencesNonJustParEleve[a.eleve_id] || 0) + 1;
    });
    const devoirsFaitsParEleve = {};
    devoirsFaits.forEach(f => {
        devoirsFaitsParEleve[f.eleve_id] = (devoirsFaitsParEleve[f.eleve_id] || 0) + 1;
    });
    const moyennesListe = eleveIds.map(id => {
        const d = notesParEleve[id];
        return { id, moy: d && d.c > 0 ? d.p / d.c : null, nbNotes: d ? d.nb : 0 };
    });
    const classement = moyennesListe.filter(m => m.moy !== null).sort((a, b) => b.moy - a.moy);
    const rangParEleve = {};
    classement.forEach((m, idx) => { rangParEleve[m.id] = idx + 1; });
    eleveIds.forEach(eleveId => {
        const badges = {};
        const d = notesParEleve[eleveId];
        const maMoyenne = d && d.c > 0 ? d.p / d.c : 0;
        const nbNotes = d ? d.nb : 0;
        const monRang = rangParEleve[eleveId] || null;
        const nbAbsNonJust = absencesNonJustParEleve[eleveId] || 0;
        const faits = devoirsFaitsParEleve[eleveId] || 0;
        let progression = false;
        if (trimestre > 1) {
            const dp = notesPrecParEleve[eleveId];
            if (dp && dp.c > 0) {
                const moyPrec = dp.p / dp.c;
                if (maMoyenne > moyPrec + 0.5) progression = true;
            }
        }
        if (monRang === 1) badges.premier = true;
        if (monRang === 2) badges.deuxieme = true;
        if (monRang === 3) badges.troisieme = true;
        if (nbNotes > 0 && maMoyenne >= 16) badges.excellence = true;
        if (nbNotes > 0 && maMoyenne >= 14) badges.tres_serieux = true;
        if (nbAbsNonJust === 0) badges.assidu = true;
        if (nbNotes >= 8) badges.regulier = true;
        if (totalDevoirs > 0 && faits === totalDevoirs) badges.devoirs_a_jour = true;
        if (progression) badges.progression = true;
        if (Object.keys(badges).length >= 3) badges.super_eleve = true;
        resultats[eleveId] = badges;
    });
    return resultats;
}

function obtenirBadgesObtenus(badges) {
    return BADGES_DEFINITIONS.filter(b => badges[b.id]);
}

function afficherCarteBadgesAccueil(containerId, badges) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const obtenus = obtenirBadgesObtenus(badges);
    if (obtenus.length === 0) { container.classList.add('hidden'); return; }
    container.classList.remove('hidden');
    const compteur = document.getElementById('badges-compteur');
    if (compteur) compteur.innerText = obtenus.length + ' badge' + (obtenus.length > 1 ? 's' : '') + ' obtenu' + (obtenus.length > 1 ? 's' : '');
    const top3 = obtenus.slice(0, 3);
    const htmlBadges = top3.map(b => `<div class="bg-white bg-opacity-25 rounded-xl p-2 flex flex-col items-center flex-1"><span class="text-2xl">${b.emoji}</span><span class="text-[8px] font-bold text-center leading-tight mt-1">${b.label}</span></div>`).join('');
    const el = document.getElementById('badges-top3');
    if (el) el.innerHTML = htmlBadges;
}

function afficherVueBadges(containerId, badges, trimestre) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const html = BADGES_DEFINITIONS.map(b => {
        const obtenu = !!badges[b.id];
        const bgColor = obtenu ? 'background: linear-gradient(135deg, ' + b.couleur + '20, ' + b.couleur + '10);' : '';
        const borderColor = obtenu ? 'border-color: ' + b.couleur + ';' : '';
        const opacity = obtenu ? '' : 'opacity: 0.5;';
        const statutIcon = obtenu ? '✅' : '🔒';
        return `<div class="rounded-2xl p-4 border-2 shadow-sm" style="${bgColor}${borderColor}${opacity}background-color: ${obtenu ? 'transparent' : '#f9fafb'};"><div class="flex items-center gap-3"><div class="text-4xl">${b.emoji}</div><div class="flex-1 min-w-0"><div class="flex items-center gap-2"><p class="text-sm font-bold text-gray-800">${b.label}</p><span class="text-xs">${statutIcon}</span></div><p class="text-[11px] text-gray-600">${b.desc}</p></div></div></div>`;
    }).join('');
    container.innerHTML = html;
}

function construireAfficheSecurisee(a, ecoleNom, signatureEcole) {
    const titre = echapperHtml(a.titre);
    const contenu = echapperHtml(a.contenu);
    const signatureTxt = a.signature ? echapperHtml(a.signature) : '';
    const ecoleNomSec = echapperHtml(ecoleNom || '');
    const datePub = new Date(a.date_publication).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const logoUrl = (typeof a.logo_annonce === 'string' && (a.logo_annonce.startsWith('data:image/') || a.logo_annonce.startsWith('https://'))) ? a.logo_annonce : null;
    const sigUrl = (typeof signatureEcole === 'string' && (signatureEcole.startsWith('data:image/') || signatureEcole.startsWith('https://'))) ? signatureEcole : null;
    return `<div style="background: white; border: 3px solid #004AAD; border-radius: 15px; overflow: hidden; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #004AAD 0%, #0066CC 100%); padding: 20px 15px; text-align: center;">
            ${logoUrl ? `<img src="${logoUrl}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 50%; border: 3px solid white; margin-bottom: 8px;">` : '<div style="font-size: 40px; margin-bottom: 5px;">📖</div>'}
            <h1 style="color: white; font-size: 20px; font-weight: bold; margin: 5px 0; letter-spacing: 1px;">EDU-LINK</h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 12px; margin: 0;">${ecoleNomSec}</p>
        </div>
        <div style="padding: 20px;">
            <div style="text-align: center; background: #f0f7ff; padding: 12px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #004AAD;">
                <p style="font-size: 11px; color: #004AAD; font-weight: bold; margin: 0 0 5px 0; letter-spacing: 2px;">📢 COMMUNICATION OFFICIELLE</p>
                <h2 style="font-size: 18px; font-weight: bold; color: #004AAD; margin: 0;">${titre}</h2>
            </div>
            <div style="background: #f9fafb; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                <p style="font-size: 13px; color: #1f2937; line-height: 1.8; margin: 0; white-space: pre-wrap; text-align: justify;">${contenu}</p>
            </div>
            <div style="text-align: right; margin-top: 25px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 11px; color: #6b7280; margin: 0;">Publiee le ${datePub}</p>
                ${sigUrl ? `<img src="${sigUrl}" style="max-height: 55px; max-width: 180px; margin-top: 8px; display: block; margin-left: auto;">` : ''}
                ${signatureTxt ? `<p style="font-size: 13px; font-weight: bold; color: #004AAD; margin: 5px 0 0 0;">${signatureTxt}</p>` : ''}
            </div>
        </div>
        <div style="background: #004AAD; padding: 8px; text-align: center;">
            <p style="color: white; font-size: 9px; margin: 0;">Document officiel - EDU-LINK</p>
        </div>
    </div>`;
}