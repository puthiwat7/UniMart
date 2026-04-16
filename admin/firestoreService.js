const COLLECTIONS = {
    users: 'unimartProfiles',
    listings: 'unimartListingsV1',
    reports: 'unimartAdminV1/reports',
    bans: 'unimartBans'
};

function getFirebaseAuth() {
    if (typeof firebase === 'undefined' || typeof firebase.auth !== 'function') {
        throw new Error('Firebase Auth SDK is not available.');
    }
    return firebase.auth();
}

function getRealtimeDb() {
    if (typeof firebase === 'undefined' || typeof firebase.database !== 'function') {
        throw new Error('Firebase Realtime Database SDK is not available.');
    }
    return firebase.database();
}

function mapObjectSnapshot(snapshot) {
    const value = snapshot && typeof snapshot.val === 'function' ? snapshot.val() : null;
    if (!value || typeof value !== 'object') {
        return [];
    }

    return Object.entries(value).map(([id, data]) => ({
        id,
        ...(data || {})
    }));
}

async function getUserById(uid) {
    if (!uid) return null;
    const db = getRealtimeDb();
    const snap = await db.ref(`${COLLECTIONS.users}/${uid}`).once('value');
    const data = snap.val();
    if (!data) return null;
    return { id: uid, ...data };
}

function subscribeUsers(onData, onError) {
    const db = getRealtimeDb();
    const ref = db.ref(COLLECTIONS.users);
    const handler = (snapshot) => onData(mapObjectSnapshot(snapshot));
    const errorHandler = (error) => {
        console.error('users subscription failed', error);
        if (typeof onError === 'function') onError(error);
    };

    ref.on('value', handler, errorHandler);
    return () => ref.off('value', handler);
}

function subscribeBans(onData, onError) {
    const db = getRealtimeDb();
    const ref = db.ref(COLLECTIONS.bans);
    const handler = (snapshot) => {
        const value = snapshot && typeof snapshot.val === 'function' ? snapshot.val() : null;
        onData(value && typeof value === 'object' ? value : {});
    };
    const errorHandler = (error) => {
        console.error('bans subscription failed', error);
        if (typeof onError === 'function') onError(error);
    };

    ref.on('value', handler, errorHandler);
    return () => ref.off('value', handler);
}

function subscribeListings(onData, onError) {
    const db = getRealtimeDb();
    const ref = db.ref(COLLECTIONS.listings);
    const handler = (snapshot) => onData(mapObjectSnapshot(snapshot));
    const errorHandler = (error) => {
        console.error('listings subscription failed', error);
        if (typeof onError === 'function') onError(error);
    };

    ref.on('value', handler, errorHandler);
    return () => ref.off('value', handler);
}

function subscribeReports(onData, onError) {
    const db = getRealtimeDb();
    const ref = db.ref(COLLECTIONS.reports);
    const handler = (snapshot) => onData(mapObjectSnapshot(snapshot));
    const errorHandler = (error) => {
        console.error('reports subscription failed', error);
        if (typeof onError === 'function') onError(error);
    };

    ref.on('value', handler, errorHandler);
    return () => ref.off('value', handler);
}

function subscribePasswordResetRequests(onData, onError) {
    const db = getRealtimeDb();
    const ref = db.ref('passwordResetRequests');
    const handler = (snapshot) => onData(mapObjectSnapshot(snapshot));
    const errorHandler = (error) => {
        console.error('password reset requests subscription failed', error);
        if (typeof onError === 'function') onError(error);
    };

    ref.on('value', handler, errorHandler);
    return () => ref.off('value', handler);
}

async function fetchReports() {
    const db = getRealtimeDb();
    const snapshot = await db.ref(COLLECTIONS.reports).once('value');
    return mapObjectSnapshot(snapshot);
}

async function deleteListing(id) {
    if (!id) throw new Error('Listing id is required');
    const db = getRealtimeDb();
    await db.ref(`${COLLECTIONS.listings}/${String(id)}`).remove();
}

async function updateListingStatus(id, status) {
    if (!id) throw new Error('Listing id is required');
    const db = getRealtimeDb();
    await db.ref(`${COLLECTIONS.listings}/${String(id)}`).update({
        status,
        updatedAt: new Date().toISOString()
    });
}

async function createReport({ listingId, reason, reporterId }) {
    if (!listingId || !reason || !reporterId) {
        throw new Error('listingId, reason, and reporterId are required');
    }

    const db = getRealtimeDb();
    await db.ref(COLLECTIONS.reports).push({
        listingId: String(listingId),
        reason: String(reason),
        reporterId: String(reporterId),
        createdAt: new Date().toISOString()
    });
}

async function deleteReport(id) {
    if (!id) throw new Error('Report id is required');
    const db = getRealtimeDb();
    await db.ref(`${COLLECTIONS.reports}/${String(id)}`).remove();
}

async function updatePasswordResetContacted(id, contacted) {
    if (!id) throw new Error('Password reset request id is required');
    const db = getRealtimeDb();
    await db.ref(`passwordResetRequests/${String(id)}`).update({
        contacted: Boolean(contacted)
    });
}

async function deletePasswordResetRequest(id) {
    if (!id) throw new Error('Password reset request id is required');
    const db = getRealtimeDb();
    await db.ref(`passwordResetRequests/${String(id)}`).remove();
}

async function banUser(userId) {
    if (!userId) throw new Error('User id is required');
    const db = getRealtimeDb();
    await db.ref(`${COLLECTIONS.users}/${String(userId)}`).update({
        banned: true,
        bannedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });
}

async function banUserFromSelling(userId) {
    if (!userId) throw new Error('User id is required');
    const db = getRealtimeDb();
    await db.ref(`${COLLECTIONS.bans}/${String(userId)}`).update({
        bannedFromSelling: true,
        updatedAt: new Date().toISOString()
    });
}

async function unbanUserFromSelling(userId) {
    if (!userId) throw new Error('User id is required');
    const db = getRealtimeDb();
    await db.ref(`${COLLECTIONS.bans}/${String(userId)}`).update({
        bannedFromSelling: false,
        updatedAt: new Date().toISOString()
    });
}

async function banUserFromLogin(userId) {
    if (!userId) throw new Error('User id is required');
    const db = getRealtimeDb();
    await db.ref(`${COLLECTIONS.bans}/${String(userId)}`).update({
        bannedFromLogin: true,
        updatedAt: new Date().toISOString()
    });
}

async function unbanUserFromLogin(userId) {
    if (!userId) throw new Error('User id is required');
    const db = getRealtimeDb();
    await db.ref(`${COLLECTIONS.bans}/${String(userId)}`).update({
        bannedFromLogin: false,
        updatedAt: new Date().toISOString()
    });
}

export {
    COLLECTIONS,
    getFirebaseAuth,
    getRealtimeDb,
    getUserById,
    subscribeUsers,
    subscribeBans,
    subscribeListings,
    subscribeReports,
    subscribePasswordResetRequests,
    fetchReports,
    deleteListing,
    updateListingStatus,
    createReport,
    deleteReport,
    updatePasswordResetContacted,
    deletePasswordResetRequest,
    banUser,
    banUserFromSelling,
    unbanUserFromSelling,
    banUserFromLogin,
    unbanUserFromLogin
};