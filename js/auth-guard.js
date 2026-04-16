// Authentication Guard for Protected Pages
// This script should be included in all pages that require authentication

class AuthGuard {
    constructor() {
        this.authChecked = false;
        this.user = null;
        this.popupShown = false;
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

            if (!user) {
                // User is not logged in
                this.showLoginRequiredPopup();
            } else {
                // User is logged in, hide any popup
                this.hideLoginRequiredPopup();
            }
        });
    }

    showLoginRequiredPopup() {
        if (this.popupShown) return;

        this.popupShown = true;

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'authGuardOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
        `;

        // Create popup
        const popup = document.createElement('div');
        popup.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 32px;
            max-width: 400px;
            width: 90%;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            animation: popupFadeIn 0.3s ease-out;
        `;

        popup.innerHTML = `
            <div style="font-size: 48px; color: #ef4444; margin-bottom: 16px;">
                <i class="fas fa-lock"></i>
            </div>
            <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 24px; font-weight: 600;">
                Authentication Required
            </h2>
            <p style="margin: 0 0 24px 0; color: #6b7280; line-height: 1.5;">
                You need to be logged in to access this page. Please sign in to continue.
            </p>
            <button id="authGuardLoginBtn" style="
                background: linear-gradient(135deg, #4a5fc1, #2d3a8f);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: opacity 0.2s;
                width: 100%;
            ">
                <i class="fas fa-sign-in-alt" style="margin-right: 8px;"></i>
                Go to Login
            </button>
        `;

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes popupFadeIn {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 1; transform: scale(1); }
            }
        `;
        document.head.appendChild(style);

        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        // Add event listener
        document.getElementById('authGuardLoginBtn').addEventListener('click', () => {
            window.location.href = 'login';
        });

        // Prevent interaction with page content
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                window.location.href = 'login';
            }
        });
    }

    hideLoginRequiredPopup() {
        const overlay = document.getElementById('authGuardOverlay');
        if (overlay) {
            overlay.remove();
            this.popupShown = false;
        }
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