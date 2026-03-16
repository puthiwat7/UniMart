const UNIMART_LISTINGS_DB_PATH = 'unimartListingsV1';
const UNIMART_LISTINGS_META_PATH = 'unimartListingsMeta';
const UNIMART_LISTINGS_RESET_VERSION = '2026-03-10-reset-01';
const UNIMART_DEFAULT_TIMEOUT_MS = 10000;
const UNIMART_RETRY_TIMEOUT_MS = 15000;
const UNIMART_FALLBACK_LIMIT = 200;

function unimartNormalizeListing(item, index = 0) {
    if (!item || typeof item !== 'object') return null;

    const rawStatus = String(item.status || 'active').toLowerCase();
    const status = rawStatus === 'withdrawed' ? 'withdrawn' : rawStatus;

    const id = item.id || Date.now() + index;
    const images = Array.isArray(item.images) ? item.images.filter(Boolean) : [];

    return {
        ...item,
        id,
        title: String(item.title || 'Untitled Item'),
        price: String(item.price || '¥0.00'),
        category: String(item.category || 'Other'),
        seller: String(item.seller || 'Campus Seller'),
        sellerUid: item.sellerUid || null,
        sellerEmail: item.sellerEmail ? String(item.sellerEmail).toLowerCase() : '',
        image: String(item.image || '📦'),
        imageUrl: item.imageUrl || images[0] || '',
        images,
        badge: String(item.badge || 'Used'),
        description: String(item.description || ''),
        quantity: Number(item.quantity) || 1,
        status,
        listedAt: item.listedAt || item.listedDate || new Date().toISOString(),
        listedDate: item.listedDate || item.listedAt || new Date().toISOString(),
        soldDate: item.soldDate || null
    };
}

function unimartDedupeListings(listings) {
    const seen = new Set();
    const deduped = [];

    listings.forEach((item, index) => {
        const normalized = unimartNormalizeListing(item, index);
        if (!normalized) return;

        const key = `${normalized.id}-${normalized.title}`;
        if (seen.has(key)) return;

        seen.add(key);
        deduped.push(normalized);
    });

    return deduped;
}

function getListingsDbRef() {
    if (typeof firebase === 'undefined' || typeof firebase.database !== 'function') {
        return null;
    }

    try {
        return firebase.database().ref(UNIMART_LISTINGS_DB_PATH);
    } catch (error) {
        console.warn('Realtime Database is unavailable:', error);
        return null;
    }
}

function getListingsMetaRef() {
    if (typeof firebase === 'undefined' || typeof firebase.database !== 'function') {
        return null;
    }

    try {
        return firebase.database().ref(UNIMART_LISTINGS_META_PATH);
    } catch (error) {
        console.warn('Realtime Database metadata path is unavailable:', error);
        return null;
    }
}

function clearLegacyLocalListingCache() {
    try {
        localStorage.removeItem('unimartListings');
        localStorage.removeItem('listings');
    } catch (error) {
        console.warn('Unable to clear legacy local listing cache:', error);
    }
}

function withTimeout(promise, timeoutMs = UNIMART_DEFAULT_TIMEOUT_MS) {
    let timeoutId = null;

    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(`Database request timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
        if (timeoutId) clearTimeout(timeoutId);
    });
}

function setLastReadState(state) {
    window.unimartListingsSyncLastReadState = {
        ...state,
        at: new Date().toISOString()
    };
}

function isTimeoutError(error) {
    const message = String(error && error.message ? error.message : error || '').toLowerCase();
    return message.includes('timed out');
}

function parseSnapshotToListings(snapshot) {
    const value = snapshot.val();
    if (!value) return [];
    const list = Array.isArray(value) ? value : Object.values(value);
    return unimartDedupeListings(list);
}

async function ensureListingsResetApplied() {
    const metaRef = getListingsMetaRef();
    const listingsRef = getListingsDbRef();
    if (!metaRef || !listingsRef) return;

    try {
        const snapshot = await withTimeout(metaRef.child('resetVersion').once('value'));
        const currentVersion = snapshot.val() || null;
        if (currentVersion === UNIMART_LISTINGS_RESET_VERSION) {
            clearLegacyLocalListingCache();
            return;
        }

        await withTimeout(listingsRef.set(null));
        await withTimeout(metaRef.update({
            resetVersion: UNIMART_LISTINGS_RESET_VERSION,
            resetAt: new Date().toISOString()
        }));
        clearLegacyLocalListingCache();
    } catch (error) {
        console.warn('Unable to apply one-time listings reset:', error);
    }
}

async function readCloudListings() {
    const ref = getListingsDbRef();
    if (!ref) return [];

    try {
        await ensureListingsResetApplied();
        const snapshot = await withTimeout(ref.once('value'), UNIMART_DEFAULT_TIMEOUT_MS);
        const listings = parseSnapshotToListings(snapshot);
        setLastReadState({ mode: 'full', count: listings.length });
        return listings;
    } catch (error) {
        console.warn('Primary listing read failed:', error);

        try {
            const retrySnapshot = await withTimeout(ref.once('value'), UNIMART_RETRY_TIMEOUT_MS);
            const retryListings = parseSnapshotToListings(retrySnapshot);
            setLastReadState({ mode: 'retry-full', count: retryListings.length });
            return retryListings;
        } catch (retryError) {
            console.warn('Retry listing read failed:', retryError);

            if (!isTimeoutError(error) && !isTimeoutError(retryError)) {
                setLastReadState({ mode: 'failed', count: 0, reason: String(retryError && retryError.message ? retryError.message : retryError) });
                console.warn('Failed to read listings from cloud:', retryError);
                return [];
            }

            try {
                const limitedSnapshot = await withTimeout(
                    ref.orderByKey().limitToLast(UNIMART_FALLBACK_LIMIT).once('value'),
                    UNIMART_RETRY_TIMEOUT_MS
                );
                const limitedListings = parseSnapshotToListings(limitedSnapshot);
                setLastReadState({ mode: 'fallback-limited', count: limitedListings.length, limit: UNIMART_FALLBACK_LIMIT });
                console.warn(`Loaded a limited listing set (${limitedListings.length}) after timeout.`);
                return limitedListings;
            } catch (limitedError) {
                setLastReadState({ mode: 'failed', count: 0, reason: String(limitedError && limitedError.message ? limitedError.message : limitedError) });
                console.warn('Failed to read listings from cloud:', limitedError);
                return [];
            }
        }
    }
}

async function saveListingToCloud(listing) {
    const ref = getListingsDbRef();
    if (!ref || !listing) return false;

    const normalized = unimartNormalizeListing(listing);
    if (!normalized) return false;

    const id = String(normalized.id || Date.now());

    try {
        await ensureListingsResetApplied();
        await withTimeout(ref.child(id).set({
            ...normalized,
            updatedAt: new Date().toISOString()
        }));
        return true;
    } catch (error) {
        console.warn('Failed to save listing to cloud:', error);
        return false;
    }
}

async function upsertListingToCloud(listing, options = {}) {
    const timeoutMs = Number(options.timeoutMs) || UNIMART_DEFAULT_TIMEOUT_MS;
    return withTimeout(saveListingToCloud(listing), timeoutMs)
        .catch((error) => {
            console.warn('Failed to upsert listing to cloud:', error);
            return false;
        });
}

async function writeCloudListings(listings) {
    const ref = getListingsDbRef();
    if (!ref) return false;

    const deduped = unimartDedupeListings(listings);
    const payload = {};

    deduped.forEach((item) => {
        const id = String(item.id || Date.now());
        payload[id] = {
            ...item,
            updatedAt: new Date().toISOString()
        };
    });

    try {
        await ensureListingsResetApplied();
        await withTimeout(ref.set(payload));
        return true;
    } catch (error) {
        console.warn('Failed to backfill listings to cloud:', error);
        return false;
    }
}

async function replaceAllListingsInCloud(listings) {
    return writeCloudListings(listings);
}

async function getAllListingsFromCloud() {
    return readCloudListings();
}

async function getActiveListingsFromCloud() {
    const all = await getAllListingsFromCloud();
    return all.filter((item) => String(item.status || 'active').toLowerCase() === 'active');
}

async function clearAllListingsInCloud() {
    const ref = getListingsDbRef();
    if (!ref) return false;

    try {
        await withTimeout(ref.set(null));
        return true;
    } catch (error) {
        console.warn('Failed to clear listings in cloud:', error);
        return false;
    }
}

async function hydrateLocalFromCloud() {
    return readCloudListings();
}

window.unimartListingsSync = {
    ensureListingsResetApplied,
    getAllListingsFromCloud,
    getActiveListingsFromCloud,
    readCloudListings,
    saveListingToCloud,
    upsertListingToCloud,
    writeCloudListings,
    replaceAllListingsInCloud,
    clearAllListingsInCloud,
    hydrateLocalFromCloud
};
