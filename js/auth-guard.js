// Authentication Guard for Protected Pages
// This script should be included in all pages that require authentication

class AuthGuard {
    constructor() {
        this.authChecked = false;
        this.user = null;
        this.init();
    }

    init() {
        // Wait for Firebase to be available
        this.waitForFirebase().then(() => {
            this.setupAuthListener();
        });
    }

    waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (typeof firebase !== 'undefined' &&
                    firebase.auth &&
                    firebase.auth().app) {
                    resolve();
                } else {
                    setTimeout(checkFirebase, 50);
                }
            };
            checkFirebase();
        });
    }

    setupAuthListener() {
        firebase.auth().onAuthStateChanged((user) => {
            this.authChecked = true;
            this.user = user;

            if (window.unimartLoginNotice) {
                window.unimartLoginNotice.setAuthenticated(Boolean(user));
            }

            document.body.dataset.authState = user ? 'authenticated' : 'guest';
        });
    }
}

// Initialize auth guard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new AuthGuard();
});

// Also try to initialize immediately in case DOM is already ready
if (document.readyState === 'loading') {
    // DOM not ready yet
} else {
    new AuthGuard();
}