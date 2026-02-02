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
    });
});

// Global sign-out handler used by main sidebar button
async function handleSignOut() {
    try {
        await firebaseAuthManager.signOut();
        // Redirect to login page from both root and /pages/ URLs
        const path = window.location.pathname || '';
        const inPagesDir = path.includes('/pages/');
        const loginPath = inPagesDir ? 'login.html' : 'pages/login.html';
        window.location.href = loginPath;
    } catch (error) {
        console.error('Error signing out:', error);
        alert('Error signing out. Please try again.');
    }
}

