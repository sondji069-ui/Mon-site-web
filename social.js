// ═══════════════════════════════════════════════════════════════
// EDU-LINK — RÉSEAU SOCIAL
// Feed Instagram-like : posts, likes, commentaires, vidéos
// Limites : Photos 800 Ko • Vidéos 10 Mo
// ═══════════════════════════════════════════════════════════════

(function() {
    'use strict';

    window.socialCtx = {
        client: null,
        user: null,
        ecoleId: null,
        filtreRole: 'tous',
        filtreType: 'tous',
        posts: [],
        currentType: 'photo',
        currentImage: null,
        feedContainerId: 'feed-liste'
    };

    var LIMITE_IMAGE = 800 * 1024;
    var LIMITE_VIDEO = 10 * 1024 * 1024;

    window.socialInit = function(client, user, ecoleId) {
        window.socialCtx.client = client;
        window.socialCtx.user = user;
        window.socialCtx.ecoleId = ecoleId;
    };

    // ═══════════ HELPERS ═══════════
    function formatTempsRelatif(dateStr) {
        var date = new Date(dateStr);
        var now = new Date();
        var diff = Math.floor((now - date) / 1000);
        if (diff < 60) return 'à l\'instant';
        if (diff < 3600) return 'il y a ' + Math.floor(diff / 60) + ' min';
        if (diff < 86400) return 'il y a ' + Math.floor(diff / 3600) + 'h';
        if (diff < 604800) return 'il y a ' + Math.floor(diff / 86400) + 'j';
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }

    function initiales(prenom, nom) {
        var p = (prenom || '?').charAt(0).toUpperCase();
        var n = (nom || '').charAt(0).toUpperCase();
        return p + (n ? n : '');
    }

    function classeRole(role) {
        return 'role-' + (role || 'eleve');
    }

    function badgeType(type) {
        var labels = {
            annonce: '📢 Annonce',
            reussite: '🏆 Réussite',
            photo: '📸 Photo',
            motivation: '💬 Motivation',
            video: '🎬 Vidéo'
        };
        return labels[type] || '📸 Post';
    }

    function peutSupprimerPost(post) {
        var role = window.socialCtx.user.role;
        if (role === 'admin' || role === 'super_admin') return true;
        return post.auteur_id === window.socialCtx.user.id;
    }

    function peutEpingler() {
        return window.socialCtx.user.role === 'admin' || window.socialCtx.user.role === 'super_admin';
    }

    function echapperTexte(texte) {
        if (texte === null || texte === undefined) return '';
        return String(texte).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // ═══════════ CHARGER LE FEED ═══════════
    window.socialChargerFeed = async function(containerId) {
        var conteneur = document.getElementById(containerId);
        if (!conteneur) return;

        window.socialCtx.feedContainerId = containerId;
        conteneur.innerHTML = skeleton.cartes(4);

        try {
            var res = await window.socialCtx.client
                .from('posts')
                .select('*, utilisateurs!auteur_id(prenom, nom, role, photo_url)')
                .eq('ecole_id', window.socialCtx.ecoleId)
                .order('epingle', { ascending: false })
                .order('date_creation', { ascending: false })
                .limit(50);

            if (res.error) throw res.error;
            window.socialCtx.posts = res.data || [];

            if (window.socialCtx.posts.length > 0) {
                var postIds = window.socialCtx.posts.map(function(p) { return p.id; });

                var resLikes = await window.socialCtx.client
                    .from('likes').select('post_id')
                    .eq('utilisateur_id', window.socialCtx.user.id)
                    .in('post_id', postIds);

                var mesLikes = {};
                (resLikes.data || []).forEach(function(l) { mesLikes[l.post_id] = true; });

                var resCompteurs = await window.socialCtx.client
                    .from('likes').select('post_id').in('post_id', postIds);

                var compteursLikes = {};
                (resCompteurs.data || []).forEach(function(l) {
                    compteursLikes[l.post_id] = (compteursLikes[l.post_id] || 0) + 1;
                });

                var resComms = await window.socialCtx.client
                    .from('commentaires').select('post_id').in('post_id', postIds);

                var compteursComms = {};
                (resComms.data || []).forEach(function(c) {
                    compteursComms[c.post_id] = (compteursComms[c.post_id] || 0) + 1;
                });

                window.socialCtx.posts.forEach(function(p) {
                    p._liked = mesLikes[p.id] === true;
                    p.nb_likes = compteursLikes[p.id] || 0;
                    p.nb_commentaires = compteursComms[p.id] || 0;
                });
            }

            window.socialAfficherPosts(containerId);
        } catch (err) {
            conteneur.innerHTML = '<div class="empty-feed"><div class="empty-feed-icon">⚠️</div><div class="empty-feed-title">Erreur</div><div class="empty-feed-desc">' + (err.message || 'Impossible de charger le feed') + '</div></div>';
        }
    };

    window.socialAfficherPosts = function(containerId) {
        var conteneur = document.getElementById(containerId);
        if (!conteneur) return;

        var posts = window.socialCtx.posts.slice();

        if (window.socialCtx.filtreRole !== 'tous') {
            posts = posts.filter(function(p) {
                return p.utilisateurs && p.utilisateurs.role === window.socialCtx.filtreRole;
            });
        }

        if (window.socialCtx.filtreType !== 'tous') {
            posts = posts.filter(function(p) { return p.type === window.socialCtx.filtreType; });
        }

        var role = window.socialCtx.user.role;
        posts = posts.filter(function(p) {
            if (p.cible === 'tous' || !p.cible) return true;
            if (p.cible === 'eleves' && role === 'eleve') return true;
            if (p.cible === 'parents' && role === 'parent') return true;
            if (p.cible === 'enseignants' && role === 'enseignant') return true;
            if (role === 'admin' || role === 'super_admin') return true;
            return false;
        });

        if (posts.length === 0) {
            conteneur.innerHTML = '<div class="empty-feed">' +
                '<div class="empty-feed-icon">📰</div>' +
                '<div class="empty-feed-title">Aucun post pour le moment</div>' +
                '<div class="empty-feed-desc">Soyez le premier à partager quelque chose avec l\'école !</div>' +
                '</div>';
            return;
        }

        var html = '';
        posts.forEach(function(p, idx) {
            html += window.socialConstruirePostHtml(p, idx);
        });
        conteneur.innerHTML = html;
    };

    window.socialConstruirePostHtml = function(p, idx) {
        var u = p.utilisateurs || {};
        var prenom = u.prenom || '?';
        var nom = u.nom || '?';
        var role = u.role || 'eleve';
        var temps = formatTempsRelatif(p.date_creation);
        var liked = p._liked === true;
        var inits = initiales(prenom, nom);

        var avatarHtml = u.photo_url
            ? '<img src="' + u.photo_url + '" alt="">'
            : inits;

        var html = '<div class="post-card" data-post-id="' + p.id + '" style="animation-delay: ' + Math.min(idx * 0.05, 0.4) + 's;">';

        if (p.epingle) {
            html += '<div class="post-epingle">📌 Épinglé par l\'administration</div>';
        }

        html += '<div class="post-header" style="position: relative;">';
        html += '<div class="post-avatar ' + classeRole(role) + '">' + avatarHtml + '</div>';
        html += '<div class="post-meta">';
        html += '<div class="post-auteur">' + prenom + ' ' + nom + '</div>';
        html += '<div class="post-sous-info">';
        html += '<span class="post-badge-role ' + role + '">' + role + '</span>';
        html += '<span class="post-type-badge ' + p.type + '">' + badgeType(p.type) + '</span>';
        html += '<span>• ' + temps + '</span>';
        html += '</div></div>';
        html += '<button class="post-options" onclick="socialOuvrirMenu(event, ' + p.id + ')">⋯</button>';
        html += '</div>';

        if (p.video_url) {
            html += '<div class="post-video">';
            html += '<div class="post-video-badge">🎬 VIDÉO</div>';
            html += '<video controls preload="metadata" playsinline';
            if (p.image_url) html += ' poster="' + p.image_url + '"';
            html += '>';
            html += '<source src="' + p.video_url + '" type="video/mp4">';
            html += 'Votre navigateur ne supporte pas les vidéos.';
            html += '</video>';
            html += '</div>';
        } else if (p.image_url) {
            html += '<div class="post-image"><img src="' + p.image_url + '" alt="" loading="lazy" onclick="socialVoirImage(\'' + p.image_url.replace(/'/g, "\\'") + '\')"></div>';
        }

        if (p.contenu) {
            html += '<div class="post-contenu">' + echapperTexte(p.contenu) + '</div>';
        }

        html += '<div class="post-actions">';
        html += '<button class="post-action-btn ' + (liked ? 'liked' : '') + '" onclick="socialToggleLike(' + p.id + ', this)">';
        html += '<span class="action-icon">' + (liked ? '❤️' : '🤍') + '</span>';
        html += '<span class="action-nb">' + (p.nb_likes || 0) + '</span>';
        html += '</button>';

        html += '<button class="post-action-btn" onclick="socialFocusCommentaire(' + p.id + ')">';
        html += '<span class="action-icon">💬</span>';
        html += '<span class="action-nb">' + (p.nb_commentaires || 0) + '</span>';
        html += '</button>';

        if (navigator.share) {
            html += '<button class="post-action-btn" onclick="socialPartager(' + p.id + ')">';
            html += '<span class="action-icon">📤</span>';
            html += '<span class="action-nb">Partager</span>';
            html += '</button>';
        }

        html += '</div>';

        if (p.nb_likes > 0) {
            html += '<div class="post-likes-info">Aimé par <span class="nb-likes">' + p.nb_likes + ' personne(s)</span></div>';
        }

        html += '<div class="post-commentaires-bloc" id="commentaires-' + p.id + '" style="display: none;"></div>';

        html += '<div class="ajouter-commentaire">';
        html += '<input type="text" id="input-commentaire-' + p.id + '" placeholder="Ajouter un commentaire..." onkeydown="if(event.key===\'Enter\'){socialAjouterCommentaire(' + p.id + ');}">';
        html += '<button onclick="socialAjouterCommentaire(' + p.id + ')">Envoyer</button>';
        html += '</div>';

        html += '</div>';
        return html;
    };

    // ═══════════ FILTRES ═══════════
    window.socialFiltrerRole = function(role) {
        window.socialCtx.filtreRole = role;
        document.querySelectorAll('[data-filtre-role]').forEach(function(f) {
            if (f.getAttribute('data-filtre-role') === role) f.classList.add('active');
            else f.classList.remove('active');
        });
        window.socialAfficherPosts(window.socialCtx.feedContainerId || 'feed-liste');
    };

    window.socialFiltrerType = function(type) {
        window.socialCtx.filtreType = type;
        document.querySelectorAll('[data-filtre-type]').forEach(function(f) {
            if (f.getAttribute('data-filtre-type') === type) f.classList.add('active');
            else f.classList.remove('active');
        });
        window.socialAfficherPosts(window.socialCtx.feedContainerId || 'feed-liste');
    };

    // ═══════════ LIKES ═══════════
    window.socialToggleLike = async function(postId, btn) {
        var post = window.socialCtx.posts.find(function(p) { return p.id === postId; });
        if (!post) return;

        var estLike = post._liked === true;
        post._liked = !estLike;
        post.nb_likes = (post.nb_likes || 0) + (estLike ? -1 : 1);

        var icon = btn.querySelector('.action-icon');
        var nbEl = btn.querySelector('.action-nb');

        if (post._liked) {
            btn.classList.add('liked');
            icon.innerText = '❤️';
            icon.style.animation = 'none';
            setTimeout(function() { icon.style.animation = ''; }, 10);
        } else {
            btn.classList.remove('liked');
            icon.innerText = '🤍';
        }
        nbEl.innerText = post.nb_likes;

        try {
            if (estLike) {
                await window.socialCtx.client.from('likes').delete().eq('post_id', postId).eq('utilisateur_id', window.socialCtx.user.id);
            } else {
                await window.socialCtx.client.from('likes').insert([{ post_id: postId, utilisateur_id: window.socialCtx.user.id }]);
            }
        } catch (err) {
            post._liked = estLike;
            post.nb_likes = (post.nb_likes || 0) + (estLike ? 1 : -1);
            toast.error('Erreur : ' + err.message);
        }
    };

    // ═══════════ COMMENTAIRES ═══════════
    window.socialFocusCommentaire = async function(postId) {
        var bloc = document.getElementById('commentaires-' + postId);
        if (!bloc) return;
        if (bloc.style.display === 'none') {
            bloc.style.display = 'block';
            await window.socialChargerCommentaires(postId);
        } else {
            bloc.style.display = 'none';
        }
    };

    window.socialChargerCommentaires = async function(postId) {
        var bloc = document.getElementById('commentaires-' + postId);
        if (!bloc) return;
        bloc.innerHTML = '<div style="padding: 10px; text-align: center;"><div class="spinner" style="border-top-color: #004AAD; border-color: rgba(0,74,173,0.2); border-top-color: #004AAD; margin: auto;"></div></div>';

        try {
            var res = await window.socialCtx.client
                .from('commentaires')
                .select('*, utilisateurs!auteur_id(prenom, nom, role, photo_url)')
                .eq('post_id', postId)
                .order('date_creation', { ascending: true })
                .limit(50);

            if (res.error) throw res.error;
            var commentaires = res.data || [];

            if (commentaires.length === 0) {
                bloc.innerHTML = '<p style="font-size: 11px; color: #9ca3af; text-align: center; padding: 6px 0;">Aucun commentaire pour le moment</p>';
                return;
            }

            var html = '';
            commentaires.forEach(function(c) {
                var u = c.utilisateurs || {};
                var temps = formatTempsRelatif(c.date_creation);
                var inits = initiales(u.prenom, u.nom);
                var avatarHtml = u.photo_url
                    ? '<img src="' + u.photo_url + '" alt="" style="width:100%;height:100%;object-fit:cover;">'
                    : inits;

                html += '<div class="commentaire-item">';
                html += '<div class="commentaire-avatar ' + classeRole(u.role) + '">' + avatarHtml + '</div>';
                html += '<div class="commentaire-content">';
                html += '<div><span class="commentaire-auteur">' + (u.prenom || '?') + ' ' + (u.nom || '?') + '</span><span class="commentaire-texte">' + echapperTexte(c.contenu) + '</span></div>';
                html += '<div class="commentaire-date">' + temps + '</div>';
                html += '</div></div>';
            });

            bloc.innerHTML = html;
        } catch (err) {
            bloc.innerHTML = '<p style="font-size: 11px; color: #EF4444; text-align: center; padding: 6px 0;">Erreur de chargement</p>';
        }
    };

    window.socialAjouterCommentaire = async function(postId) {
        var input = document.getElementById('input-commentaire-' + postId);
        if (!input) return;
        var contenu = input.value.trim();
        if (!contenu) return;

        var btn = input.parentNode.querySelector('button');
        btn.disabled = true;
        input.disabled = true;

        try {
            var res = await window.socialCtx.client.from('commentaires').insert([{
                post_id: postId,
                auteur_id: window.socialCtx.user.id,
                contenu: contenu
            }]);

            if (res.error) throw res.error;

            input.value = '';
            input.disabled = false;
            btn.disabled = false;

            var post = window.socialCtx.posts.find(function(p) { return p.id === postId; });
            if (post) post.nb_commentaires = (post.nb_commentaires || 0) + 1;

            var carte = document.querySelector('[data-post-id="' + postId + '"]');
            if (carte) {
                var btns = carte.querySelectorAll('.post-actions .post-action-btn');
                if (btns[1]) {
                    var nbEl = btns[1].querySelector('.action-nb');
                    if (nbEl) nbEl.innerText = post.nb_commentaires;
                }
            }

            await window.socialChargerCommentaires(postId);

            if (post && post.auteur_id !== window.socialCtx.user.id) {
                try {
                    await window.socialCtx.client.from('notifications').insert([{
                        utilisateur_id: post.auteur_id,
                        titre: '💬 Nouveau commentaire',
                        contenu: window.socialCtx.user.prenom + ' a commenté votre publication.',
                        type: 'message',
                        lu: false,
                        ecole_id: window.socialCtx.ecoleId
                    }]);
                } catch (e) { /* Silencieux */ }
            }
        } catch (err) {
            input.disabled = false;
            btn.disabled = false;
            toast.error('Erreur : ' + err.message);
        }
    };

    // ═══════════ CRÉATION DE POST ═══════════
    window.socialOuvrirCreateur = function() {
        var overlay = document.createElement('div');
        overlay.className = 'post-modal-overlay';
        overlay.id = 'post-modal-overlay';

        var role = window.socialCtx.user.role;
        var peutAnnonce = role === 'admin' || role === 'super_admin';
        var peutReussite = role === 'admin' || role === 'enseignant';

        var html = '<div class="post-modal">';
        html += '<div class="post-modal-header">';
        html += '<div class="post-modal-title">✏️ Nouvelle publication</div>';
        html += '<button class="post-modal-close" onclick="socialFermerCreateur()">✕</button>';
        html += '</div>';

        html += '<div class="type-selector">';
        if (peutAnnonce) {
            html += '<div class="type-option" data-type="annonce" onclick="socialSelectType(this, \'annonce\')">';
            html += '<span class="type-option-emoji">📢</span>';
            html += '<span class="type-option-label">Annonce</span>';
            html += '</div>';
        }
        if (peutReussite) {
            html += '<div class="type-option" data-type="reussite" onclick="socialSelectType(this, \'reussite\')">';
            html += '<span class="type-option-emoji">🏆</span>';
            html += '<span class="type-option-label">Réussite</span>';
            html += '</div>';
        }
        html += '<div class="type-option selected" data-type="photo" onclick="socialSelectType(this, \'photo\')">';
        html += '<span class="type-option-emoji">📸</span>';
        html += '<span class="type-option-label">Photo</span>';
        html += '</div>';
        html += '<div class="type-option" data-type="video" onclick="socialSelectType(this, \'video\')">';
        html += '<span class="type-option-emoji">🎬</span>';
        html += '<span class="type-option-label">Vidéo</span>';
        html += '</div>';
        html += '<div class="type-option" data-type="motivation" onclick="socialSelectType(this, \'motivation\')">';
        html += '<span class="type-option-emoji">💬</span>';
        html += '<span class="type-option-label">Motivation</span>';
        html += '</div>';
        html += '</div>';

        html += '<div class="upload-zone" id="upload-zone" onclick="document.getElementById(\'post-file-input\').click()">';
        html += '<div class="upload-zone-icon" id="upload-zone-icon">📷</div>';
        html += '<div class="upload-zone-text" id="upload-zone-text">Ajouter une photo</div>';
        html += '<div class="file-info" id="file-info"></div>';
        html += '<input type="file" id="post-file-input" accept="image/*" style="display:none;" onchange="socialChargerFichierPost(event)">';
        html += '</div>';

        html += '<div id="post-image-preview" class="upload-preview" style="display:none;">';
        html += '<img id="post-image-preview-img" src="" alt="" style="display:none;">';
        html += '<video id="post-video-preview-vid" controls playsinline style="display:none;"></video>';
        html += '<button class="upload-remove" onclick="socialSupprimerImagePost(event)">✕</button>';
        html += '</div>';

        html += '<textarea class="post-textarea" id="post-contenu" placeholder="Écrivez quelque chose..." style="margin-top: 12px;"></textarea>';

        if (peutAnnonce) {
            html += '<div style="margin-top: 12px;">';
            html += '<label style="font-size: 11px; font-weight: 700; color: #6b7280; display: block; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Destinataires</label>';
            html += '<select id="post-cible" class="post-textarea" style="min-height: auto; padding: 10px;">';
            html += '<option value="tous">Toute l\'école</option>';
            html += '<option value="eleves">Élèves uniquement</option>';
            html += '<option value="parents">Parents uniquement</option>';
            html += '<option value="enseignants">Enseignants uniquement</option>';
            html += '</select>';
            html += '</div>';
        }

        html += '<button class="btn-publier" id="btn-publier-post" onclick="socialPublier()">📤 Publier</button>';
        html += '</div>';

        overlay.innerHTML = html;
        document.body.appendChild(overlay);

        window.socialCtx.currentType = 'photo';
        window.socialCtx.currentImage = null;

        setTimeout(function() { overlay.classList.add('visible'); }, 10);
    };

    window.socialFermerCreateur = function() {
        var overlay = document.getElementById('post-modal-overlay');
        if (!overlay) return;
        overlay.classList.remove('visible');
        setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 300);
    };
// ═══════════ PUBLICATION ═══════════
    window.socialPublier = async function() {
        var btn = document.getElementById('btn-publier-post');
        var contenu = document.getElementById('post-contenu').value.trim();
        var type = window.socialCtx.currentType || 'photo';
        var media = window.socialCtx.currentImage;
        var cibleEl = document.getElementById('post-cible');
        var cible = cibleEl ? cibleEl.value : 'tous';

        if (!contenu && !media) {
            toast.warning('Ajoutez du texte, une photo ou une vidéo.');
            return;
        }

        var origText = btn.innerText;
        btn.disabled = true;
        btn.innerText = 'Publication...';

        // Timeout global de 30 secondes
        var timeoutId = setTimeout(function() {
            if (btn.disabled) {
                btn.disabled = false;
                btn.innerText = origText;
                toast.error('Délai dépassé. Vérifiez votre connexion.');
            }
        }, 30000);

        try {
            var insertData = {
                ecole_id: window.socialCtx.ecoleId,
                auteur_id: window.socialCtx.user.id,
                auteur_role: window.socialCtx.user.role,
                type: type,
                contenu: contenu || null,
                cible: cible
            };

            if (type === 'video') {
                insertData.video_url = media || null;
            } else {
                insertData.image_url = media || null;
            }

            var res = await window.socialCtx.client
                .from('posts')
                .insert([insertData])
                .select()
                .single();

            if (res.error) throw new Error(res.error.message);

            clearTimeout(timeoutId);
            toast.success('Publication ajoutée !');
            window.socialFermerCreateur();

            var feedId = window.socialCtx.feedContainerId || 'feed-liste';
            await window.socialChargerFeed(feedId);

        } catch (err) {
            clearTimeout(timeoutId);
            toast.error('Erreur : ' + (err.message || 'inconnue'));
        } finally {
            clearTimeout(timeoutId);
            var btnStill = document.getElementById('btn-publier-post');
            if (btnStill) {
                btnStill.disabled = false;
                btnStill.innerText = origText;
            }
        }
    };
    window.socialSelectType = function(el, type) {
        document.querySelectorAll('.type-option').forEach(function(o) { o.classList.remove('selected'); });
        el.classList.add('selected');
        window.socialCtx.currentType = type;

        var zone = document.getElementById('upload-zone');
        var icon = document.getElementById('upload-zone-icon');
        var texte = document.getElementById('upload-zone-text');
        var input = document.getElementById('post-file-input');

        if (!zone || !input) return;

        window.socialSupprimerImagePost();

        if (type === 'video') {
            zone.classList.add('video');
            if (icon) icon.innerText = '🎬';
            if (texte) texte.innerText = 'Ajouter une vidéo (max 10 Mo)';
            input.accept = 'video/mp4,video/quicktime,video/webm,video/*';
        } else {
            zone.classList.remove('video');
            if (icon) icon.innerText = '📷';
            if (texte) texte.innerText = 'Ajouter une photo';
            input.accept = 'image/*';
        }
    };

    window.socialChargerFichierPost = async function(event) {
    var file = event.target.files[0];
    if (!file) return;

    var type = window.socialCtx.currentType || 'photo';
    var info = document.getElementById('file-info');
    var tailleMo = (file.size / (1024 * 1024)).toFixed(2);

    // ─── Vérifications ───
    if (type === 'video') {
        if (file.size > LIMITE_VIDEO) {
            if (info) {
                info.innerText = '❌ Vidéo trop lourde (' + tailleMo + ' Mo). Max 10 Mo.';
                info.className = 'file-info error';
            }
            toast.warning('Vidéo trop lourde. Compressez-la (max 10 Mo).');
            event.target.value = '';
            return;
        }
    } else {
        if (file.size > LIMITE_IMAGE * 3) {
            // On accepte jusqu'à 2.4 Mo car la compression va réduire
            if (info) {
                info.innerText = '❌ Image trop lourde (' + tailleMo + ' Mo). Max 2.4 Mo.';
                info.className = 'file-info error';
            }
            toast.warning('Image trop lourde (max 2.4 Mo).');
            event.target.value = '';
            return;
        }
    }

    if (info) {
        info.innerText = '⏳ Envoi en cours (' + tailleMo + ' Mo)...';
        info.className = 'file-info';
    }

    try {
        var bucket = 'social';
        var resultat;

        if (type === 'video') {
            resultat = await EduStorage.uploaderFichier(file, bucket, {
                userId: window.socialCtx.user.id,
                maxSizeMo: 10
            });
        } else {
            resultat = await EduStorage.uploaderImage(file, bucket, {
    maxWidth: 1000,
    maxHeight: 1000,
    quality: 0.75,
    maxSizeKo: 200,
    userId: window.socialCtx.user.id
});
        }

        // On stocke l'URL pour la publication
        window.socialCtx.currentImage = resultat.url;

        // ─── Aperçu ───
        var imgPreview = document.getElementById('post-image-preview-img');
        var vidPreview = document.getElementById('post-video-preview-vid');

        if (imgPreview) { imgPreview.style.display = 'none'; imgPreview.src = ''; }
        if (vidPreview) { vidPreview.style.display = 'none'; vidPreview.src = ''; }

        if (type === 'video') {
            if (vidPreview) {
                vidPreview.src = resultat.url;
                vidPreview.style.display = 'block';
            }
        } else {
            if (imgPreview) {
                imgPreview.src = resultat.url;
                imgPreview.style.display = 'block';
            }
        }

        var preview = document.getElementById('post-image-preview');
        var zone = document.getElementById('upload-zone');
        if (preview) preview.style.display = 'block';
        if (zone) zone.style.display = 'none';

        if (info) {
            info.innerText = '✅ ' + tailleMo + ' Mo — prêt';
            info.className = 'file-info success';
        }
    } catch (err) {
        if (info) {
            info.innerText = '❌ ' + err.message;
            info.className = 'file-info error';
        }
        toast.error('Erreur : ' + err.message);
    }
};

    // ═══════════ MENU OPTIONS ═══════════
    window.socialOuvrirMenu = function(event, postId) {
        event.stopPropagation();
        document.querySelectorAll('.post-menu').forEach(function(m) { m.remove(); });

        var post = window.socialCtx.posts.find(function(p) { return p.id === postId; });
        if (!post) return;

        var btn = event.currentTarget;
        var rect = btn.getBoundingClientRect();

        var menu = document.createElement('div');
        menu.className = 'post-menu';

        var html = '';
        if (peutEpingler()) {
            html += '<button class="post-menu-item" onclick="socialEpingler(' + postId + ', ' + (post.epingle ? 'false' : 'true') + ')">';
            html += (post.epingle ? '📌 Désépingler' : '📌 Épingler') + '</button>';
        }
        if (peutSupprimerPost(post)) {
            html += '<button class="post-menu-item danger" onclick="socialSupprimerPost(' + postId + ')">';
            html += '🗑️ Supprimer</button>';
        }
        html += '<button class="post-menu-item" onclick="socialCopierLien(' + postId + ')">';
        html += '🔗 Copier le lien</button>';

        menu.innerHTML = html;
        document.body.appendChild(menu);

        var top = rect.bottom + 6;
        var right = window.innerWidth - rect.right;
        menu.style.position = 'fixed';
        menu.style.top = top + 'px';
        menu.style.right = right + 'px';

        setTimeout(function() {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 10);
    };

    window.socialSupprimerPost = async function(postId) {
        if (!confirm('Supprimer définitivement cette publication ?')) return;
        try {
            var res = await window.socialCtx.client.from('posts').delete().eq('id', postId);
            if (res.error) throw res.error;
            toast.success('Publication supprimée');
            window.socialCtx.posts = window.socialCtx.posts.filter(function(p) { return p.id !== postId; });
            window.socialAfficherPosts(window.socialCtx.feedContainerId || 'feed-liste');
        } catch (err) {
            toast.error('Erreur : ' + err.message);
        }
    };

    window.socialEpingler = async function(postId, epingle) {
        try {
            var res = await window.socialCtx.client.from('posts').update({ epingle: epingle }).eq('id', postId);
            if (res.error) throw res.error;
            toast.success(epingle ? 'Publication épinglée' : 'Publication désépinglée');
            var feedId = window.socialCtx.feedContainerId || 'feed-liste';
            await window.socialChargerFeed(feedId);
        } catch (err) {
            toast.error('Erreur : ' + err.message);
        }
    };

    window.socialPartager = async function(postId) {
        var post = window.socialCtx.posts.find(function(p) { return p.id === postId; });
        if (!post) return;
        var texte = 'Publication EDU-LINK : ' + (post.contenu || '').substring(0, 100);
        if (navigator.share) {
            try { await navigator.share({ title: 'EDU-LINK', text: texte }); } catch (e) { /* annulé */ }
        }
    };

    window.socialCopierLien = function(postId) {
        var url = window.location.origin + window.location.pathname + '#post-' + postId;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(function() { toast.success('Lien copié !'); });
        } else {
            toast.info('Lien : ' + url);
        }
    };

    window.socialVoirImage = function(url) {
        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;cursor:zoom-out;';
        overlay.onclick = function() { overlay.remove(); };
        var img = document.createElement('img');
        img.src = url;
        img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;';
        overlay.appendChild(img);
        document.body.appendChild(overlay);
    };

    // ═══════════ PROFIL SOCIAL ═══════════
    window.socialVoirProfil = async function(userId, containerId) {
        var conteneur = document.getElementById(containerId);
        if (!conteneur) return;
        conteneur.innerHTML = skeleton.cartes(3);

        try {
            var resUser = await window.socialCtx.client
                .from('utilisateurs')
                .select('id, prenom, nom, role, photo_url, bio')
                .eq('id', userId).single();

            if (resUser.error) throw resUser.error;
            var u = resUser.data;

            var resPosts = await window.socialCtx.client
                .from('posts').select('*', { count: 'exact', head: true }).eq('auteur_id', userId);

            var resAbo = await window.socialCtx.client
                .from('abonnements').select('*', { count: 'exact', head: true }).eq('suivi_id', userId);

            var resSuivi = await window.socialCtx.client
                .from('abonnements').select('*', { count: 'exact', head: true }).eq('suiveur_id', userId);

            var estMoi = userId === window.socialCtx.user.id;
            var estSuivi = false;
            if (!estMoi) {
                var resCheck = await window.socialCtx.client
                    .from('abonnements').select('id')
                    .eq('suiveur_id', window.socialCtx.user.id)
                    .eq('suivi_id', userId).maybeSingle();
                estSuivi = !!resCheck.data;
            }

            var resPostsList = await window.socialCtx.client
                .from('posts').select('*').eq('auteur_id', userId)
                .order('date_creation', { ascending: false }).limit(30);

            var posts = resPostsList.data || [];
            var inits = initiales(u.prenom, u.nom);
            var avatarHtml = u.photo_url ? '<img src="' + u.photo_url + '">' : inits;

            var html = '<div class="profil-header-social">';
            html += '<div class="profil-avatar-xl ' + classeRole(u.role) + '">' + avatarHtml + '</div>';
            html += '<div class="profil-nom-xl">' + u.prenom + ' ' + u.nom + '</div>';
            html += '<div class="profil-role-xl">' + (u.role || '') + '</div>';
            if (u.bio) html += '<div class="profil-bio">' + echapperTexte(u.bio) + '</div>';

            html += '<div class="profil-stats">';
            html += '<div class="profil-stat"><div class="profil-stat-value">' + (resPosts.count || 0) + '</div><div class="profil-stat-label">Posts</div></div>';
            html += '<div class="profil-stat"><div class="profil-stat-value">' + (resAbo.count || 0) + '</div><div class="profil-stat-label">Abonnés</div></div>';
            html += '<div class="profil-stat"><div class="profil-stat-value">' + (resSuivi.count || 0) + '</div><div class="profil-stat-label">Abonnements</div></div>';
            html += '</div>';

            if (!estMoi) {
                html += '<div class="profil-actions">';
                html += '<button class="profil-btn ' + (estSuivi ? 'profil-btn-secondaire' : 'profil-btn-primaire') + '" onclick="socialToggleSuivre(' + userId + ', this)">';
                html += (estSuivi ? '✓ Suivi' : '+ Suivre');
                html += '</button>';
                html += '</div>';
            }
            html += '</div>';

            if (posts.length > 0) {
                html += '<div class="profil-grid">';
                posts.forEach(function(p) {
                    var imageHtml = p.video_url
                        ? '<div style="position:relative;width:100%;height:100%;background:#000;display:flex;align-items:center;justify-content:center;"><span style="font-size:24px;">🎬</span></div>'
                        : (p.image_url
                            ? '<img src="' + p.image_url + '" alt="" loading="lazy">'
                            : '<div class="profil-grid-item-emoji">' + (p.type === 'annonce' ? '📢' : p.type === 'reussite' ? '🏆' : p.type === 'motivation' ? '💬' : '📝') + '</div>');
                    html += '<div class="profil-grid-item" onclick="socialOuvrirPost(' + p.id + ')">' + imageHtml + '</div>';
                });
                html += '</div>';
            } else {
                html += '<div class="empty-feed" style="margin-top: 16px;"><div class="empty-feed-icon">📷</div><div class="empty-feed-title">Aucune publication</div></div>';
            }

            conteneur.innerHTML = html;
        } catch (err) {
            conteneur.innerHTML = '<div class="empty-feed"><div class="empty-feed-icon">⚠️</div><div class="empty-feed-title">Erreur</div></div>';
        }
    };

    window.socialToggleSuivre = async function(userId, btn) {
        try {
            var resCheck = await window.socialCtx.client
                .from('abonnements').select('id')
                .eq('suiveur_id', window.socialCtx.user.id)
                .eq('suivi_id', userId).maybeSingle();

            if (resCheck.data) {
                await window.socialCtx.client.from('abonnements').delete().eq('id', resCheck.data.id);
                btn.innerText = '+ Suivre';
                btn.classList.remove('profil-btn-secondaire');
                btn.classList.add('profil-btn-primaire');
                toast.info('Vous ne suivez plus cet utilisateur');
            } else {
                await window.socialCtx.client.from('abonnements').insert([{
                    suiveur_id: window.socialCtx.user.id,
                    suivi_id: userId
                }]);
                btn.innerText = '✓ Suivi';
                btn.classList.add('profil-btn-secondaire');
                btn.classList.remove('profil-btn-primaire');
                toast.success('Vous suivez cet utilisateur');
            }
        } catch (err) {
            toast.error('Erreur : ' + err.message);
        }
    };

    window.socialOuvrirPost = function(postId) {
        var post = window.socialCtx.posts.find(function(p) { return p.id === postId; });
        if (post && post.video_url) {
            var overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;cursor:zoom-out;';
            overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
            var vid = document.createElement('video');
            vid.src = post.video_url;
            vid.controls = true;
            vid.autoplay = true;
            vid.playsInline = true;
            vid.style.cssText = 'max-width:100%;max-height:100%;border-radius:12px;';
            overlay.appendChild(vid);
            document.body.appendChild(overlay);
        } else if (post && post.image_url) {
            window.socialVoirImage(post.image_url);
        }
    };

})();