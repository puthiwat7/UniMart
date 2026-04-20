(function () {
    const state = {
        authenticated: null,
        banner: null,
    };

    function getLoginPath() {
        const currentPath = window.location.pathname || '';
        return currentPath.includes('/pages/') ? 'login' : 'pages/login';
    }

    function getHostElement() {
        return document.querySelector('.main-content') || document.body;
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
                <h2>Guest mode</h2>
                <p>Sign in to create listings, save favorites, and manage your profile across UniMart.</p>
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
        const host = getHostElement();
        const banner = createBanner();

        if (banner.parentElement !== host) {
            host.prepend(banner);
        }
    }

    function hide() {
        if (state.banner) {
            state.banner.remove();
            state.banner = null;
        }
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

    function initialize() {
        let hasCachedUser = false;

        try {
            hasCachedUser = Boolean(localStorage.getItem('unimart_last_user'));
        } catch (error) {
            hasCachedUser = false;
        }

        if (!hasCachedUser) {
            show();
        }
    }

    window.unimartLoginNotice = {
        setAuthenticated,
        show,
        hide,
    };

    document.addEventListener('DOMContentLoaded', initialize);
})();