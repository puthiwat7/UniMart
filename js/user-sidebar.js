// Shared sidebar user display logic using FirebaseAuthManager
// This script assumes firebase-config.js and firebase-auth.js have been loaded.

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
    } else {
        // Not logged in: hide profile containers, show login button
        if (userProfileCard) userProfileCard.style.display = 'none';
        if (userProfile) userProfile.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'flex';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1) Immediately try to show cached user to avoid delay
    try {
        const cached = localStorage.getItem('unimart_last_user');
        if (cached) {
            const cachedUser = JSON.parse(cached);
            applyUserToSidebar(cachedUser);
        }
    } catch (e) {
        console.error('Error reading cached user info:', e);
    }

    // 2) Then wire up real-time Firebase auth listener for live updates
    if (typeof firebaseAuthManager === 'undefined') {
        console.error('firebaseAuthManager is not available. Make sure firebase-auth.js is loaded.');
        return;
    }

    firebaseAuthManager.onAuthStateChanged((user) => {
        applyUserToSidebar(user);
        enforcePolicy(user);
    });

// check whether the user has agreed to marketplace policies; if not, force them to profile page
function enforcePolicy(user) {
    if (!user || !user.uid) return;
    let profile = null;
    try {
        const raw = localStorage.getItem(`unimart_profile_${user.uid}`);
        profile = raw ? JSON.parse(raw) : null;
    } catch (e) {
        console.error('Failed to parse profile data for policy check', e);
    }
    const agreed = profile && profile.agreedToPolicies;

    // Keep policy status available to page scripts, but do not hard-redirect.
    // Auto-redirecting causes login/profile navigation loops and poor UX.
    document.body.dataset.policyAgreed = agreed ? 'true' : 'false';
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

