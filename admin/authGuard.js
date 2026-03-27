import { getFirebaseAuth, getUserById } from './firestoreService.js';

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

        try {
            const userDoc = await getUserById(user.uid);
            const role = userDoc && userDoc.role ? String(userDoc.role).toLowerCase() : '';

            if (role !== 'admin') {
                if (typeof onDenied === 'function') onDenied('not-admin');
                redirectTo(getNonAdminPath());
                return;
            }

            if (typeof onAllowed === 'function') {
                onAllowed({
                    authUser: user,
                    userDoc,
                    role
                });
            }
        } catch (error) {
            console.error('Failed to verify admin role:', error);
            if (typeof onDenied === 'function') onDenied('role-check-failed');
            redirectTo(getNonAdminPath());
        }
    });

    return unsubscribe;
}

export { requireAdminAccess };