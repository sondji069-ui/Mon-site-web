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

async function calculerBadgesEleve(supabaseClient, eleveId, classeId, trimestre) {
    const badges = {};

    // 1. Notes et moyenne
    const { data: notes } = await supabaseClient.from('notes').select('note, coefficient').eq('eleve_id', eleveId).eq('trimestre', trimestre);
    let totalPoints = 0, totalCoef = 0, nbNotes = 0;
    (notes || []).forEach(n => { totalPoints += parseFloat(n.note) * n.coefficient; totalCoef += n.coefficient; nbNotes++; });
    const maMoyenne = totalCoef > 0 ? totalPoints / totalCoef : 0;

    // 2. Rang dans la classe
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
        const classement = Object.keys(moyennes)
            .map(id => ({ id: parseInt(id), moy: moyennes[id].c > 0 ? moyennes[id].p / moyennes[id].c : 0 }))
            .sort((a, b) => b.moy - a.moy);
        const idx = classement.findIndex(e => e.id === eleveId);
        monRang = idx >= 0 ? idx + 1 : null;
    }

    // 3. Absences non justifiées
    const { data: absences } = await supabaseClient.from('absences').select('justifiee').eq('eleve_id', eleveId);
    const nbAbsNonJust = (absences || []).filter(a => !a.justifiee).length;

    // 4. Devoirs faits
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

    // 5. Progression vs trimestre précédent
    let progression = false;
    if (trimestre > 1) {
        const { data: notesPrec } = await supabaseClient.from('notes').select('note, coefficient').eq('eleve_id', eleveId).eq('trimestre', trimestre - 1);
        let tp = 0, tc = 0;
        (notesPrec || []).forEach(n => { tp += parseFloat(n.note) * n.coefficient; tc += n.coefficient; });
        const moyPrec = tc > 0 ? tp / tc : 0;
        if (tc > 0 && maMoyenne > moyPrec + 0.5) progression = true;
    }

    // Attribution
    if (monRang === 1) badges.premier = true;
    if (monRang === 2) badges.deuxieme = true;
    if (monRang === 3) badges.troisieme = true;
    if (nbNotes > 0 && maMoyenne >= 16) badges.excellence = true;
    if (nbNotes > 0 && maMoyenne >= 14) badges.tres_serieux = true;
    if (nbAbsNonJust === 0) badges.assidu = true;
    if (nbNotes >= 8) badges.regulier = true;
    if (totalDevoirs > 0 && faits === totalDevoirs) badges.devoirs_a_jour = true;
    if (progression) badges.progression = true;

    // Super élève si 3 badges ou plus (hors super_eleve)
    if (Object.keys(badges).length >= 3) badges.super_eleve = true;

    return badges;
}

function obtenirBadgesObtenus(badges) {
    return BADGES_DEFINITIONS.filter(b => badges[b.id]);
}

function afficherCarteBadgesAccueil(containerId, badges) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const obtenus = obtenirBadgesObtenus(badges);

    if (obtenus.length === 0) {
        container.classList.add('hidden');
        return;
    }
    container.classList.remove('hidden');

    const compteur = document.getElementById('badges-compteur');
    if (compteur) compteur.innerText = obtenus.length + ' badge' + (obtenus.length > 1 ? 's' : '') + ' obtenu' + (obtenus.length > 1 ? 's' : '');

    const top3 = obtenus.slice(0, 3);
    const htmlBadges = top3.map(b => `
        <div class="bg-white bg-opacity-25 rounded-xl p-2 flex flex-col items-center flex-1">
            <span class="text-2xl">${b.emoji}</span>
            <span class="text-[8px] font-bold text-center leading-tight mt-1">${b.label}</span>
        </div>
    `).join('');
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

        return `
            <div class="rounded-2xl p-4 border-2 shadow-sm" style="${bgColor}${borderColor}${opacity}background-color: ${obtenu ? 'transparent' : '#f9fafb'};">
                <div class="flex items-center gap-3">
                    <div class="text-4xl">${b.emoji}</div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <p class="text-sm font-bold text-gray-800">${b.label}</p>
                            <span class="text-xs">${statutIcon}</span>
                        </div>
                        <p class="text-[11px] text-gray-600">${b.desc}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}