// Shared sidebar user display logic using FirebaseAuthManager
// This script assumes firebase-config.js and firebase-auth.js have been loaded.

const ADMIN_EMAILS_KEY = 'unimart_admin_emails';
const DEFAULT_ADMIN_EMAILS = ['puthiwat7@gmail.com', '124020058@link.cuhk.edu.cn','khpunnathorn@gmail.com','thaksapornchichi@gmail.com','eyerinyarat@gmail.com','shenhongboshen3@gmail.com'];

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function getStoredAdminEmails() {
    try {
        const raw = localStorage.getItem(ADMIN_EMAILS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(normalizeEmail).filter(Boolean) : [];
    } catch (error) {
        return [];
    }
}

function getAdminEmails() {
    const emails = new Set([...DEFAULT_ADMIN_EMAILS.map(normalizeEmail), ...getStoredAdminEmails()]);
    return Array.from(emails).filter(Boolean).sort();
}

function saveAdminEmails(emails) {
    const merged = new Set([...DEFAULT_ADMIN_EMAILS.map(normalizeEmail), ...(emails || []).map(normalizeEmail)]);
    localStorage.setItem(ADMIN_EMAILS_KEY, JSON.stringify(Array.from(merged).filter(Boolean).sort()));
}

function addAdminEmail(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return { ok: false, message: 'Email is required.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
        return { ok: false, message: 'Please enter a valid email address.' };
    }

    const current = getAdminEmails();
    if (current.includes(normalized)) {
        return { ok: false, message: 'Email is already an admin.' };
    }

    saveAdminEmails([...current, normalized]);
    return { ok: true, message: 'Admin email added.' };
}

function isDefaultAdminEmail(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return false;
    return DEFAULT_ADMIN_EMAILS.map(normalizeEmail).includes(normalized);
}

function removeAdminEmail(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return { ok: false, message: 'Email is required.' };

    const current = getAdminEmails();
    if (!current.includes(normalized)) {
        return { ok: false, message: 'Email is not in the admin list.' };
    }
    if (isDefaultAdminEmail(normalized)) {
        return { ok: false, message: 'Default admin accounts cannot be removed.' };
    }

    const next = current.filter((emailItem) => emailItem !== normalized);
    saveAdminEmails(next);
    return { ok: true, message: 'Admin email removed.' };
}

function isAdminEmail(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return false;
    return getAdminEmails().includes(normalized);
}

function isCurrentUserAdmin(userLike) {
    if (!userLike) return false;
    return isAdminEmail(userLike.email);
}

function resolveAdminPanelPath() {
    return '/pages/admin-panel';
}

function ensureAdminNavItem(userLike) {
    const shouldShow = isCurrentUserAdmin(userLike);
    const navLists = document.querySelectorAll('.navigation ul');

    navLists.forEach((list) => {
        if (!(list instanceof HTMLElement)) return;

        const existing = list.querySelector('li[data-admin-nav-item="true"]');
        if (!shouldShow) {
            if (existing) existing.remove();
            return;
        }

        if (existing) return;

        const li = document.createElement('li');
        li.setAttribute('data-admin-nav-item', 'true');

        const adminPath = resolveAdminPanelPath();
        const isActive = (window.location.pathname || '').includes('admin-panel');
        li.innerHTML = `
            <a href="${adminPath}" class="nav-item ${isActive ? 'active' : ''}">
                <i class="fas fa-user-shield"></i>
                <span>Admin Panel</span>
            </a>
        `;
        list.appendChild(li);
    });
}

window.unimartAdminAccess = {
    normalizeEmail,
    getAdminEmails,
    addAdminEmail,
    removeAdminEmail,
    isDefaultAdminEmail,
    isAdminEmail,
    isCurrentUserAdmin
};

function applyUserToSidebar(userLike) {
    const loginBtn = document.getElementById('loginBtn');

    // Different pages use different containers for the user profile
    const userProfileCard = document.getElementById('userProfileCard'); // index.html
    const userProfile = document.getElementById('userProfile');         // other pages

    const userNameEls = document.querySelectorAll('#userName');
    const userEmailEls = document.querySelectorAll('#userEmail');

    // Index page has optional avatar/image
    const profileImage = document.getElementById('userProfileImage');
    const avatarIcon = document.getElementById('userAvatarIcon');

    if (userLike && userLike.email) {
        // Show appropriate profile container
        if (userProfileCard) userProfileCard.style.display = 'flex';
        if (userProfile) userProfile.style.display = 'flex';

        // Hide login button if present
        if (loginBtn) loginBtn.style.display = 'none';

        // Update text fields wherever they exist
        userNameEls.forEach(el => {
            el.textContent = userLike.displayName || 'User';
        });
        userEmailEls.forEach(el => {
            el.textContent = userLike.email || '';
        });

        // Handle avatar/image on main page
        if (profileImage && avatarIcon) {
            if (userLike.photoURL) {
                profileImage.src = userLike.photoURL;
                profileImage.style.display = 'block';
                avatarIcon.style.display = 'none';
            } else {
                profileImage.style.display = 'none';
                avatarIcon.style.display = 'block';
            }
        }

        ensureAdminNavItem(userLike);
    } else {
        // Not logged in: hide profile containers, show login button
        if (userProfileCard) userProfileCard.style.display = 'none';
        if (userProfile) userProfile.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'flex';
        ensureAdminNavItem(null);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1) Immediately try to show cached user to avoid delay
    try {
        const cached = localStorage.getItem('unimart_last_user');
        if (cached) {
            const cachedUser = JSON.parse(cached);
            applyUserToSidebar(cachedUser);
        } else {
            ensureAdminNavItem(null);
        }
    } catch (e) {
        console.error('Error reading cached user info:', e);
        ensureAdminNavItem(null);
    }

    // 2) Then wire up real-time Firebase auth listener for live updates
    if (typeof firebaseAuthManager === 'undefined') {
        console.error('firebaseAuthManager is not available. Make sure firebase-auth.js is loaded.');
        return;
    }

    firebaseAuthManager.onAuthStateChanged(async (user) => {
        applyUserToSidebar(user);
        await enforcePolicy(user);
    });

// check whether the user has agreed to marketplace policies; if not, force them to profile page
async function enforcePolicy(user) {
    if (!user || !user.uid) {
        document.body.dataset.policyAgreed = 'unknown';
        return null;
    }

    if (!window.unimartProfileSync || typeof window.unimartProfileSync.getProfileFromCloud !== 'function') {
        document.body.dataset.policyAgreed = 'unknown';
        return null;
    }

    let profile = null;
    try {
        profile = await window.unimartProfileSync.getProfileFromCloud(user.uid);
        console.log('User data:', profile);
    } catch (e) {
        console.error('Failed to load profile data for policy check', e);
        document.body.dataset.policyAgreed = 'unknown';
        return null;
    }

    const agreed = profile && (profile.hasAgreedPolicy === true || profile.agreedToPolicies === true);

    // Keep policy status available to page scripts, but do not hard-redirect.
    // Auto-redirecting causes login/profile navigation loops and poor UX.
    document.body.dataset.policyAgreed = agreed ? 'true' : 'false';

    return agreed;
}

});

// Global sign-out handler used by main sidebar button
async function handleSignOut() {
    console.log('sign-out initiated');
    const path = window.location.pathname || '';
    const inPagesDir = path.includes('/pages/');
    const loginPath = inPagesDir ? 'login.html' : 'pages/login.html';

    try {
        if (typeof firebaseAuthManager !== 'undefined') {
            await firebaseAuthManager.signOut();
            console.log('firebaseAuthManager.signOut completed');
        } else {
            console.warn('firebaseAuthManager not available, skipping signOut call');
        }
    } catch (error) {
        console.error('Error during sign out call:', error);
    }

    // also clear cached user immediately to avoid ghost profile
    try {
        localStorage.removeItem('unimart_last_user');
    } catch (e) {
        console.warn('Could not remove cached user:', e);
    }

    // wait briefly for Firebase to propagate state, then redirect with flag
    setTimeout(() => {
        window.location.href = loginPath + '?loggedout=1';
    }, 300);

}

// add event listener fallback in case inline onclick is not firing
function attachLogoutHandlers() {
    const logoutButtons = document.querySelectorAll('.btn-logout');
    logoutButtons.forEach(btn => {
        btn.removeEventListener('click', handleSignOut);
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            handleSignOut();
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    attachLogoutHandlers();
});

