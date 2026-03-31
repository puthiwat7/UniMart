import { getFirebaseAuth } from './firestoreService.js';

const ADMIN_EMAILS_KEY = 'unimart_admin_emails';
const DEFAULT_ADMIN_EMAILS = ['puthiwat7@gmail.com'];

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function getEmailAllowlist() {
    const base = DEFAULT_ADMIN_EMAILS.map(normalizeEmail).filter(Boolean);

    try {
        const raw = localStorage.getItem(ADMIN_EMAILS_KEY);
        if (!raw) return new Set(base);

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return new Set(base);

        const merged = [...base, ...parsed.map(normalizeEmail).filter(Boolean)];
        return new Set(merged);
    } catch {
        return new Set(base);
    }
}

function isEmailAllowlistedAsAdmin(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return false;
    return getEmailAllowlist().has(normalized);
}

function redirectTo(path) {
    window.location.href = path;
}

function getLoginPath() {
    return 'login.html';
}

function getNonAdminPath() {
    return '../index.html';
}

function requireAdminAccess({ onPending, onAllowed, onDenied }) {
    const auth = getFirebaseAuth();

    if (typeof onPending === 'function') {
        onPending();
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
        if (!user) {
            if (typeof onDenied === 'function') onDenied('not-authenticated');
            redirectTo(getLoginPath());
            return;
        }

        const allowlistedAdmin = isEmailAllowlistedAsAdmin(user.email);

        // Email allowlist is the single source of truth for admin page access.
        if (allowlistedAdmin) {
            if (typeof onAllowed === 'function') {
                onAllowed({
                    authUser: user,
                    userDoc: { id: user.uid, role: 'admin', email: user.email || '' },
                    role: 'admin'
                });
            }
            return;
        }

        if (typeof onDenied === 'function') onDenied('not-admin-email');
        redirectTo(getNonAdminPath());
    });

    return unsubscribe;
}

export { requireAdminAccess };