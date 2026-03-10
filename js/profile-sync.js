// ======================== Profile Sync (Firebase Realtime Database) ========================
// Saves user profile data (college, student ID, phone, WeChat, bio, QR code, policy agreement) to Firebase
// Persists across devices and browsers for the authenticated user

const UNIMART_PROFILES_DB_PATH = 'unimartProfiles';
const UNIMART_PROFILE_TIMEOUT_MS = 10000;

function getProfileCacheKey(uid) {
    return `unimart_profile_${uid}`;
}

function readProfileCache(uid) {
    if (!uid) return null;
    try {
        const raw = localStorage.getItem(getProfileCacheKey(uid));
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        return null;
    }
}

function writeProfileCache(uid, profileData) {
    if (!uid || !profileData) return;
    try {
        localStorage.setItem(getProfileCacheKey(uid), JSON.stringify(profileData));
    } catch (error) {
        console.warn('Unable to cache profile locally:', error);
    }
}

function getProfilesDbRef() {
    if (typeof firebase === 'undefined' || typeof firebase.database !== 'function') {
        return null;
    }

    try {
        return firebase.database().ref(UNIMART_PROFILES_DB_PATH);
    } catch (error) {
        console.warn('Realtime Database is unavailable:', error);
        return null;
    }
}

function withProfileTimeout(promise, timeoutMs = UNIMART_PROFILE_TIMEOUT_MS) {
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

function normalizeProfile(profile, uid) {
    if (!profile || typeof profile !== 'object') {
        return {
            uid,
            college: '',
            studentId: '',
            phone: '',
            wechat: '',
            bio: '',
            paymentQR: null,
            agreedToPolicies: false,
            updatedAt: new Date().toISOString()
        };
    }

    return {
        uid,
        college: String(profile.college || ''),
        studentId: String(profile.studentId || ''),
        phone: String(profile.phone || ''),
        wechat: String(profile.wechat || ''),
        bio: String(profile.bio || ''),
        paymentQR: profile.paymentQR || null,
        agreedToPolicies: Boolean(profile.agreedToPolicies || false),
        updatedAt: profile.updatedAt || new Date().toISOString()
    };
}

async function getProfileFromCloud(uid) {
    if (!uid) {
        return null;
    }

    const ref = getProfilesDbRef();
    if (!ref) {
        console.warn('Database not available; returning null profile');
        return null;
    }

    try {
        const snapshot = await withProfileTimeout(ref.child(uid).once('value'));
        const data = snapshot.val();

        // If there is no cloud profile yet, prefer an existing local cache
        // instead of creating a default profile that can reset agreement flags.
        if (!data) {
            const cached = readProfileCache(uid);
            return cached ? normalizeProfile(cached, uid) : null;
        }

        const normalized = normalizeProfile(data, uid);
        writeProfileCache(uid, normalized);
        return normalized;
    } catch (error) {
        console.warn(`Error loading profile for ${uid}:`, error);
        const cached = readProfileCache(uid);
        return cached ? normalizeProfile(cached, uid) : null;
    }
}

async function saveProfileToCloud(uid, profileData) {
    if (!uid) {
        console.warn('Cannot save profile: no user UID provided');
        return false;
    }

    const ref = getProfilesDbRef();
    if (!ref) {
        console.warn('Database not available; profile not saved to cloud');
        return false;
    }

    try {
        const normalized = normalizeProfile(profileData, uid);
        normalized.updatedAt = new Date().toISOString();

        await withProfileTimeout(ref.child(uid).set(normalized));
        writeProfileCache(uid, normalized);
        return true;
    } catch (error) {
        console.error(`Error saving profile for ${uid}:`, error);
        throw error;
    }
}

async function updateProfileField(uid, field, value) {
    if (!uid) {
        console.warn('Cannot update profile: no user UID provided');
        return false;
    }

    const ref = getProfilesDbRef();
    if (!ref) {
        console.warn('Database not available; profile field not updated');
        return false;
    }

    try {
        const updateData = {
            [field]: value,
            updatedAt: new Date().toISOString()
        };
        await withProfileTimeout(ref.child(uid).update(updateData));
        return true;
    } catch (error) {
        console.error(`Error updating profile field ${field} for ${uid}:`, error);
        throw error;
    }
}

// Clear legacy localStorage profile data for a uid
function clearLegacyLocalProfile(uid) {
    try {
        localStorage.removeItem(`unimart_profile_${uid}`);
    } catch (error) {
        console.warn('Unable to clear legacy local profile:', error);
    }
}

// Expose on window for access from profile.js
window.unimartProfileSync = {
    getProfileFromCloud,
    saveProfileToCloud,
    updateProfileField,
    clearLegacyLocalProfile,
    readProfileCache,
    writeProfileCache,
    normalizeProfile
};
