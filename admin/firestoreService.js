const COLLECTIONS = {
    users: 'users',
    listings: 'listings',
    reports: 'reports'
};

function getFirebaseAuth() {
    if (typeof firebase === 'undefined' || typeof firebase.auth !== 'function') {
        throw new Error('Firebase Auth SDK is not available.');
    }
    return firebase.auth();
}

function getFirestoreDb() {
    if (typeof firebase === 'undefined' || typeof firebase.firestore !== 'function') {
        throw new Error('Firestore SDK is not available.');
    }
    return firebase.firestore();
}

function mapSnapshot(snapshot) {
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
    }));
}

function nowServerTimestamp() {
    return firebase.firestore.FieldValue.serverTimestamp();
}

async function getUserById(uid) {
    if (!uid) return null;
    const db = getFirestoreDb();
    const snap = await db.collection(COLLECTIONS.users).doc(uid).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
}

function subscribeUsers(onData, onError) {
    const db = getFirestoreDb();
    return db.collection(COLLECTIONS.users).onSnapshot(
        (snapshot) => onData(mapSnapshot(snapshot)),
        (error) => {
            console.error('users subscription failed', error);
            if (typeof onError === 'function') onError(error);
        }
    );
}

function subscribeListings(onData, onError) {
    const db = getFirestoreDb();
    return db.collection(COLLECTIONS.listings).onSnapshot(
        (snapshot) => onData(mapSnapshot(snapshot)),
        (error) => {
            console.error('listings subscription failed', error);
            if (typeof onError === 'function') onError(error);
        }
    );
}

function subscribeReports(onData, onError) {
    const db = getFirestoreDb();
    return db.collection(COLLECTIONS.reports).onSnapshot(
        (snapshot) => onData(mapSnapshot(snapshot)),
        (error) => {
            console.error('reports subscription failed', error);
            if (typeof onError === 'function') onError(error);
        }
    );
}

async function fetchReports() {
    const db = getFirestoreDb();
    const snapshot = await db.collection(COLLECTIONS.reports).get();
    return mapSnapshot(snapshot);
}

async function deleteListing(id) {
    if (!id) throw new Error('Listing id is required');
    const db = getFirestoreDb();
    await db.collection(COLLECTIONS.listings).doc(String(id)).delete();
}

async function updateListingStatus(id, status) {
    if (!id) throw new Error('Listing id is required');
    const db = getFirestoreDb();
    await db.collection(COLLECTIONS.listings).doc(String(id)).update({
        status,
        updatedAt: nowServerTimestamp()
    });
}

async function createReport({ listingId, reason, reporterId }) {
    if (!listingId || !reason || !reporterId) {
        throw new Error('listingId, reason, and reporterId are required');
    }

    const db = getFirestoreDb();
    await db.collection(COLLECTIONS.reports).add({
        listingId: String(listingId),
        reason: String(reason),
        reporterId: String(reporterId),
        createdAt: nowServerTimestamp()
    });
}

async function deleteReport(id) {
    if (!id) throw new Error('Report id is required');
    const db = getFirestoreDb();
    await db.collection(COLLECTIONS.reports).doc(String(id)).delete();
}

async function banUser(userId) {
    if (!userId) throw new Error('User id is required');
    const db = getFirestoreDb();
    await db.collection(COLLECTIONS.users).doc(String(userId)).set({
        banned: true,
        bannedAt: nowServerTimestamp(),
        updatedAt: nowServerTimestamp()
    }, { merge: true });
}

export {
    COLLECTIONS,
    getFirebaseAuth,
    getFirestoreDb,
    getUserById,
    subscribeUsers,
    subscribeListings,
    subscribeReports,
    fetchReports,
    deleteListing,
    updateListingStatus,
    createReport,
    deleteReport,
    banUser
};