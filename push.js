// ==========================================
// EDU-LINK — Web Push (notifications navigateur)
// ==========================================

const VAPID_PUBLIC_KEY = 'BAOFtGAJhV-iYNEGQf-ASYYGwgJmBjQ5wbcxRvY1Sn63GB2pw91cqpVkuUS5YCnPccy3fcpRUdkx7UnMyNslhEs';

// Convertir la cle publique base64 en Uint8Array
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Demander la permission et s'abonner
async function activerNotificationsPush(supabaseClient, currentUser) {
    // 1. Verifier le support
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert('Les notifications push ne sont pas supportees par ce navigateur.');
        return false;
    }

    // 2. Verifier qu'on est bien installe (iOS)
    const estInstalle = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (!estInstalle) {
        alert('Sur iPhone, vous devez d\'abord ajouter cette app a votre ecran d\'accueil.\n\n1. Ouvrez Safari\n2. Appuyez sur Partager\n3. "Sur l\'ecran d\'accueil"\n4. Ouvrez l\'app depuis l\'icone');
        return false;
    }

    try {
        // 3. Demander la permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            alert('Permission refusee. Vous ne recevrez pas de notifications.');
            return false;
        }

        // 4. Attendre le service worker
        const registration = await navigator.serviceWorker.ready;

        // 5. S'abonner au push
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        // 6. Extraire les donnees
        const subJson = subscription.toJSON();
        const endpoint = subJson.endpoint;
        const p256dh = subJson.keys.p256dh;
        const auth = subJson.keys.auth;

        // 7. Detecter l'appareil
        const deviceLabel = /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'iOS' :
                            /Android/.test(navigator.userAgent) ? 'Android' :
                            'Desktop';

        // 8. Sauvegarder en base
        const { error } = await supabaseClient.from('push_subscriptions').upsert([{
            utilisateur_id: currentUser.id,
            endpoint: endpoint,
            p256dh: p256dh,
            auth: auth,
            device_label: deviceLabel,
            last_seen_at: new Date().toISOString()
        }], { onConflict: 'endpoint' });

        if (error) throw error;

        alert('Notifications activees ! Vous recevrez des alertes.');
        return true;
    } catch (err) {
        console.error('Erreur push:', err);
        alert('Erreur : ' + err.message);
        return false;
    }
}

// Verifier si deja abonne
async function estDejaAbonne() {
    if (!('serviceWorker' in navigator)) return false;
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        return subscription !== null;
    } catch { return false; }
}