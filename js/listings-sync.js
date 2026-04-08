const UNIMART_LISTINGS_DB_PATH = 'unimartListingsV1';
const UNIMART_LISTINGS_META_PATH = 'unimartListingsMeta';
const UNIMART_LISTINGS_RESET_VERSION = '2026-03-10-reset-01';
const UNIMART_DEFAULT_TIMEOUT_MS = 10000;
const UNIMART_RETRY_TIMEOUT_MS = 15000;
const UNIMART_FALLBACK_LIMIT = 200;
const UNIMART_DEFAULT_QUERY_LIMIT = 240;
const UNIMART_DEFAULT_ACTIVE_LIMIT = 160;
const UNIMART_DEFAULT_CACHE_TTL_MS = 30000;
const UNIMART_LOCAL_CACHE_TTL_MS = 180000;
const UNIMART_CACHE_KEY_PREFIX = 'unimart_listings_query_cache_v1_';

const listingsReadCache = new Map();
const listingsReadPromises = new Map();

function unimartNormalizeListing(item, index = 0) {
    if (!item || typeof item !== 'object') return null;

    const rawStatus = String(item.status || 'active').toLowerCase();
    const status = rawStatus === 'withdrawed' ? 'withdrawn' : rawStatus;

    const id = String(item.id || Date.now() + index);
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
        college: String(item.college || ''),
        image: String(item.image || '📦'),
        imageUrl: item.imageUrl || images[0] || '',
        images,
        badge: String(item.badge || 'Used'),
        condition: Number.isFinite(Number(item.condition)) ? Number(item.condition) : (Number.isFinite(Number(item.conditionPercentage)) ? Number(item.conditionPercentage) : null),
        description: String(item.description || ''),
        quantity: Number(item.quantity) || 1,
        status,
        listedAt: item.listedAt || item.listedDate || new Date().toISOString(),
        listedDate: item.listedDate || item.listedAt || new Date().toISOString(),
        soldDate: item.soldDate || null,
        userId: item.userId || item.sellerUid || null,
        reserved: Boolean(item.reserved)
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

    // Keep stable IDs for legacy records by using RTDB child keys when item.id is missing.
    if (Array.isArray(value)) {
        return unimartDedupeListings(value.map((item, index) => {
            if (!item || typeof item !== 'object') return item;
            return {
                ...item,
                id: item.id || String(index)
            };
        }));
    }

    const list = Object.entries(value).map(([key, item]) => {
        if (!item || typeof item !== 'object') {
            return item;
        }

        return {
            ...item,
            id: item.id || key
        };
    });

    return unimartDedupeListings(list);
}

function normalizeQueryOptions(options = {}) {
    const normalized = {
        status: null,
        sellerUid: null,
        limit: null
    };

    if (options && options.status) {
        const rawStatus = String(options.status).toLowerCase();
        normalized.status = rawStatus === 'withdrawed' ? 'withdrawn' : rawStatus;
    }

    if (options && options.sellerUid) {
        normalized.sellerUid = String(options.sellerUid);
    }

    if (Number.isFinite(Number(options && options.limit))) {
        const parsedLimit = Math.max(1, Math.floor(Number(options.limit)));
        normalized.limit = parsedLimit;
    }

    return normalized;
}

function getQueryCacheKey(options = {}) {
    const normalized = normalizeQueryOptions(options);
    return JSON.stringify(normalized);
}

function getStorageCacheKey(queryKey) {
    return `${UNIMART_CACHE_KEY_PREFIX}${queryKey}`;
}

function saveQueryCache(queryKey, listings) {
    const payload = {
        at: Date.now(),
        listings
    };

    listingsReadCache.set(queryKey, payload);

    try {
        localStorage.setItem(getStorageCacheKey(queryKey), JSON.stringify(payload));
    } catch (error) {
        console.warn('Failed to persist listings query cache:', error);
    }
}

function getCachedQueryListings(queryKey, maxAgeMs = UNIMART_DEFAULT_CACHE_TTL_MS) {
    const now = Date.now();
    const inMemory = listingsReadCache.get(queryKey);
    if (inMemory && (now - inMemory.at) <= maxAgeMs) {
        return inMemory.listings;
    }

    try {
        const raw = localStorage.getItem(getStorageCacheKey(queryKey));
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.listings) || !Number.isFinite(parsed.at)) {
            return null;
        }

        if ((now - parsed.at) > Math.min(maxAgeMs, UNIMART_LOCAL_CACHE_TTL_MS)) {
            return null;
        }

        listingsReadCache.set(queryKey, parsed);
        return parsed.listings;
    } catch (error) {
        return null;
    }
}

function getStaleCachedQueryListings(queryKey) {
    const inMemory = listingsReadCache.get(queryKey);
    if (inMemory && Array.isArray(inMemory.listings)) {
        return inMemory.listings;
    }

    try {
        const raw = localStorage.getItem(getStorageCacheKey(queryKey));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.listings)) return null;
        listingsReadCache.set(queryKey, parsed);
        return parsed.listings;
    } catch (error) {
        return null;
    }
}

function buildListingsQuery(ref, options = {}) {
    const normalized = normalizeQueryOptions(options);
    let query = ref;

    if (normalized.sellerUid) {
        query = query.orderByChild('sellerUid').equalTo(normalized.sellerUid);
    } else if (normalized.status) {
        query = query.orderByChild('status').equalTo(normalized.status);
    } else {
        query = query.orderByChild('listedAt');
    }

    if (normalized.limit) {
        query = query.limitToLast(normalized.limit);
    }

    return query;
}

function sortListingsByRecent(listings) {
    return [...listings].sort((a, b) => {
        const aTime = Date.parse(a.updatedAt || a.listedAt || a.listedDate || 0) || 0;
        const bTime = Date.parse(b.updatedAt || b.listedAt || b.listedDate || 0) || 0;
        return bTime - aTime;
    });
}

function parseChildSnapshotToListing(snapshot) {
    const value = snapshot && typeof snapshot.val === 'function' ? snapshot.val() : null;
    if (!value || typeof value !== 'object') return null;
    const normalized = unimartNormalizeListing({ id: snapshot.key, ...value });
    return normalized;
}

function invalidateListingsQueryCaches() {
    listingsReadCache.clear();
    try {
        Object.keys(localStorage).forEach((key) => {
            if (key.startsWith(UNIMART_CACHE_KEY_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
    } catch (error) {
        console.warn('Failed to invalidate listings query cache:', error);
    }
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

async function readCloudListings(options = {}) {
    const ref = getListingsDbRef();
    if (!ref) return [];

    const normalizedOptions = normalizeQueryOptions(options);
    const timeoutMs = Number(options.timeoutMs) || UNIMART_DEFAULT_TIMEOUT_MS;
    const retryTimeoutMs = Number(options.retryTimeoutMs) || UNIMART_RETRY_TIMEOUT_MS;
    const cacheTtlMs = Number(options.cacheTtlMs) || UNIMART_DEFAULT_CACHE_TTL_MS;
    const queryKey = getQueryCacheKey(normalizedOptions);

    const cached = getCachedQueryListings(queryKey, cacheTtlMs);
    if (cached) {
        setLastReadState({ mode: 'cache', count: cached.length, query: normalizedOptions });
        return cached;
    }

    const inFlight = listingsReadPromises.get(queryKey);
    if (inFlight) {
        return inFlight;
    }

    const query = buildListingsQuery(ref, normalizedOptions);

    const readPromise = (async () => {
        try {
            await ensureListingsResetApplied();
            const snapshot = await withTimeout(query.once('value'), timeoutMs);
            const listings = sortListingsByRecent(parseSnapshotToListings(snapshot));
            saveQueryCache(queryKey, listings);
            setLastReadState({ mode: 'query', count: listings.length, query: normalizedOptions });
            return listings;
        } catch (error) {
            console.warn('Primary listing read failed:', error);

            try {
                const retrySnapshot = await withTimeout(query.once('value'), retryTimeoutMs);
                const retryListings = sortListingsByRecent(parseSnapshotToListings(retrySnapshot));
                saveQueryCache(queryKey, retryListings);
                setLastReadState({ mode: 'retry-query', count: retryListings.length, query: normalizedOptions });
                return retryListings;
            } catch (retryError) {
                console.warn('Retry listing read failed:', retryError);

                const stale = getStaleCachedQueryListings(queryKey);
                if (stale && stale.length) {
                    setLastReadState({
                        mode: 'stale-cache',
                        count: stale.length,
                        query: normalizedOptions,
                        reason: String(retryError && retryError.message ? retryError.message : retryError)
                    });
                    return stale;
                }

                if (!isTimeoutError(error) && !isTimeoutError(retryError)) {
                    setLastReadState({ mode: 'failed', count: 0, query: normalizedOptions, reason: String(retryError && retryError.message ? retryError.message : retryError) });
                    console.warn('Failed to read listings from cloud:', retryError);
                    return [];
                }

                try {
                    const fallbackLimit = normalizedOptions.limit || UNIMART_FALLBACK_LIMIT;
                    const limitedSnapshot = await withTimeout(
                        buildListingsQuery(ref, { ...normalizedOptions, limit: fallbackLimit }).once('value'),
                        retryTimeoutMs
                    );
                    const limitedListings = sortListingsByRecent(parseSnapshotToListings(limitedSnapshot));
                    saveQueryCache(queryKey, limitedListings);
                    setLastReadState({ mode: 'fallback-limited', count: limitedListings.length, limit: fallbackLimit, query: normalizedOptions });
                    console.warn(`Loaded a limited listing set (${limitedListings.length}) after timeout.`);
                    return limitedListings;
                } catch (limitedError) {
                    setLastReadState({ mode: 'failed', count: 0, query: normalizedOptions, reason: String(limitedError && limitedError.message ? limitedError.message : limitedError) });
                    console.warn('Failed to read listings from cloud:', limitedError);
                    return [];
                }
            }
        }
    })().finally(() => {
        listingsReadPromises.delete(queryKey);
    });

    listingsReadPromises.set(queryKey, readPromise);
    return readPromise;
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
        invalidateListingsQueryCaches();
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

async function updateListingStatusInCloud(listingId, newStatus, additionalData = {}) {
    const ref = getListingsDbRef();
    if (!ref || !listingId) return false;

    try {
        await ensureListingsResetApplied();
        const updateData = {
            status: newStatus,
            updatedAt: new Date().toISOString(),
            ...additionalData
        };
        await withTimeout(ref.child(listingId).update(updateData));
        invalidateListingsQueryCaches();
        return true;
    } catch (error) {
        console.warn('Failed to update listing status in cloud:', error);
        return false;
    }
}

async function updateListingInCloud(listingId, updateData) {
    const ref = getListingsDbRef();
    if (!ref || !listingId) return false;

    try {
        await ensureListingsResetApplied();
        const fullUpdateData = {
            ...updateData,
            updatedAt: new Date().toISOString()
        };
        await withTimeout(ref.child(listingId).update(fullUpdateData));
        invalidateListingsQueryCaches();
        return true;
    } catch (error) {
        console.warn('Failed to update listing in cloud:', error);
        return false;
    }
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
        invalidateListingsQueryCaches();
        return true;
    } catch (error) {
        console.warn('Failed to backfill listings to cloud:', error);
        return false;
    }
}

async function replaceAllListingsInCloud(listings) {
    return writeCloudListings(listings);
}

async function getAllListingsFromCloud(options = {}) {
    const limit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : UNIMART_DEFAULT_QUERY_LIMIT;
    return readCloudListings({ ...options, limit });
}

async function getActiveListingsFromCloud(options = {}) {
    const limit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : UNIMART_DEFAULT_ACTIVE_LIMIT;
    const items = await readCloudListings({ ...options, status: 'active', limit });
    return items.filter((item) => String(item.status || 'active').toLowerCase() === 'active');
}

async function getListingsForSellerFromCloud(sellerUid, options = {}) {
    if (!sellerUid) return [];
    const limit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : UNIMART_DEFAULT_QUERY_LIMIT;
    return readCloudListings({ ...options, sellerUid: String(sellerUid), limit });
}

async function getListingByIdFromCloud(listingId, options = {}) {
    const ref = getListingsDbRef();
    if (!ref || !listingId) return null;

    const cacheTtlMs = Number(options.cacheTtlMs) || UNIMART_DEFAULT_CACHE_TTL_MS;
    const queryKey = `id:${String(listingId)}`;
    const cached = getCachedQueryListings(queryKey, cacheTtlMs);
    if (cached && cached.length) return cached[0];

    try {
        await ensureListingsResetApplied();
        const snapshot = await withTimeout(ref.child(String(listingId)).once('value'), Number(options.timeoutMs) || UNIMART_DEFAULT_TIMEOUT_MS);
        const value = snapshot.val();
        if (!value) return null;
        const normalized = unimartNormalizeListing({ id: snapshot.key, ...value });
        if (normalized) saveQueryCache(queryKey, [normalized]);
        return normalized;
    } catch (error) {
        const stale = getStaleCachedQueryListings(queryKey);
        if (stale && stale.length) return stale[0];
        return null;
    }
}

async function getListingsByIdsFromCloud(ids = [], options = {}) {
    const normalizedIds = Array.from(new Set((Array.isArray(ids) ? ids : []).map((id) => String(id)).filter(Boolean)));
    if (!normalizedIds.length) return [];

    const results = await Promise.all(normalizedIds.map((id) => getListingByIdFromCloud(id, options)));
    return results.filter(Boolean);
}

async function clearAllListingsInCloud() {
    const ref = getListingsDbRef();
    if (!ref) return false;

    try {
        await withTimeout(ref.set(null));
        invalidateListingsQueryCaches();
        return true;
    } catch (error) {
        console.warn('Failed to clear listings in cloud:', error);
        return false;
    }
}

async function hydrateLocalFromCloud() {
    return readCloudListings();
}

function setupRealtimeListingsListener(callback, options = {}) {
    const ref = getListingsDbRef();
    if (!ref) {
        console.warn('Cannot setup realtime listener: database unavailable');
        return null;
    }

    const normalizedOptions = normalizeQueryOptions({
        ...options,
        limit: Number.isFinite(Number(options.limit)) ? Number(options.limit) : UNIMART_DEFAULT_QUERY_LIMIT
    });
    const query = buildListingsQuery(ref, normalizedOptions);
    const listingMap = new Map();

    function emitCurrent() {
        try {
            const listings = sortListingsByRecent(Array.from(listingMap.values()));
            callback(listings);
        } catch (error) {
            console.warn('Error in realtime listings listener:', error);
        }
    }

    const onAdded = query.on('child_added', (snapshot) => {
        const listing = parseChildSnapshotToListing(snapshot);
        if (!listing) return;
        listingMap.set(String(listing.id), listing);
        emitCurrent();
    }, (error) => {
        console.warn('Realtime listings listener error:', error);
    });

    const onChanged = query.on('child_changed', (snapshot) => {
        const listing = parseChildSnapshotToListing(snapshot);
        if (!listing) return;
        listingMap.set(String(listing.id), listing);
        emitCurrent();
    }, (error) => {
        console.warn('Realtime listings listener error:', error);
    });

    const onRemoved = query.on('child_removed', (snapshot) => {
        const id = String(snapshot.key || '');
        if (!id) return;
        listingMap.delete(id);
        emitCurrent();
    }, (error) => {
        console.warn('Realtime listings listener error:', error);
    });

    query.once('value').then((snapshot) => {
        const initialListings = sortListingsByRecent(parseSnapshotToListings(snapshot));
        initialListings.forEach((listing) => {
            listingMap.set(String(listing.id), listing);
        });
        emitCurrent();
    }).catch((error) => {
        console.warn('Initial realtime listings snapshot failed:', error);
    });

    return () => {
        query.off('child_added', onAdded);
        query.off('child_changed', onChanged);
        query.off('child_removed', onRemoved);
    };
}

window.unimartListingsSync = {
    ensureListingsResetApplied,
    getAllListingsFromCloud,
    getActiveListingsFromCloud,
    getListingsForSellerFromCloud,
    getListingByIdFromCloud,
    getListingsByIdsFromCloud,
    readCloudListings,
    saveListingToCloud,
    upsertListingToCloud,
    updateListingStatusInCloud,
    updateListingInCloud,
    writeCloudListings,
    replaceAllListingsInCloud,
    clearAllListingsInCloud,
    hydrateLocalFromCloud,
    setupRealtimeListingsListener
};
