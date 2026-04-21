(function () {
    const state = {
        authenticated: null,
        banner: null,
        hideTimer: null,
    };

    function getLoginPath() {
        const currentPath = window.location.pathname || '';
        return currentPath.includes('/pages/') ? 'login' : 'pages/login';
    }

    function createBanner() {
        if (state.banner && document.contains(state.banner)) {
            return state.banner;
        }

        const banner = document.createElement('section');
        banner.className = 'login-notice';
        banner.setAttribute('role', 'status');
        banner.innerHTML = `
            <div class="login-notice__icon">
                <i class="fas fa-user-lock"></i>
            </div>
            <div class="login-notice__content">
                <h2>Login required</h2>
                <p>Log in to view listings and unlock other UniMart features.</p>
            </div>
            <button type="button" class="login-notice__button" data-login-notice-action>
                <i class="fas fa-sign-in-alt"></i>
                <span>Sign in</span>
            </button>
        `;

        const loginButton = banner.querySelector('[data-login-notice-action]');
        if (loginButton) {
            loginButton.addEventListener('click', () => {
                window.location.href = getLoginPath();
            });
        }

        state.banner = banner;
        return banner;
    }

    function show() {
        const banner = createBanner();

        if (state.hideTimer) {
            clearTimeout(state.hideTimer);
            state.hideTimer = null;
        }

        if (banner.parentElement !== document.body) {
            document.body.appendChild(banner);
            requestAnimationFrame(() => {
                banner.classList.add('is-visible');
            });
            return;
        }

        banner.classList.add('is-visible');
    }

    function hide() {
        if (!state.banner) {
            return;
        }

        const banner = state.banner;
        banner.classList.remove('is-visible');

        state.hideTimer = setTimeout(() => {
            if (banner.parentElement) {
                banner.remove();
            }
            if (state.banner === banner) {
                state.banner = null;
            }
            state.hideTimer = null;
        }, 240);
    }

    function setAuthenticated(isAuthenticated) {
        state.authenticated = Boolean(isAuthenticated);
        document.body.dataset.authState = state.authenticated ? 'authenticated' : 'guest';

        if (state.authenticated) {
            hide();
        } else {
            show();
        }
    }

    window.unimartLoginNotice = {
        setAuthenticated,
        showGuestNotice: show,
        hideGuestNotice: hide,
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (state.authenticated === false) {
                show();
            }
        });
    } else if (state.authenticated === false) {
        show();
    }
})();