/**
 * Bottom Navigation Active State Handler
 * Manages active state for mobile bottom navigation based on current page
 */

function initializeBottomNav() {
    const bottomNav = document.getElementById('bottomNav');
    if (!bottomNav) return;

    const navItems = bottomNav.querySelectorAll('.bottom-nav-item');
    const currentPath = window.location.pathname;

    // Determine current page based on URL
    let currentPage = 'marketplace'; // default

    if (currentPath.includes('sell-item')) {
        currentPage = 'sell';
    } else if (currentPath.includes('my-sales')) {
        currentPage = 'sales';
    } else if (currentPath.includes('my-favorites')) {
        currentPage = 'favorites';
    } else if (currentPath.includes('profile')) {
        currentPage = 'profile';
    } else if (currentPath.includes('admin-panel')) {
        currentPage = 'admin';
    } else if (currentPath.includes('feedback')) {
        currentPage = 'feedback';
    } else if (currentPath.includes('user-guide')) {
        currentPage = 'guide';
    } else if (currentPath.includes('index') || currentPath.endsWith('/')) {
        currentPage = 'marketplace';
    }

    // Update active state
    updateActiveNav(currentPage);

    // Add click handlers for smooth transitions
    navItems.forEach((item) => {
        item.addEventListener('click', (e) => {
            const page = item.getAttribute('data-page');
            updateActiveNav(page);
        });
    });
}

function updateActiveNav(page) {
    const bottomNav = document.getElementById('bottomNav');
    if (!bottomNav) return;

    const navItems = bottomNav.querySelectorAll('.bottom-nav-item');

    navItems.forEach((item) => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === page) {
            item.classList.add('active');
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBottomNav);
} else {
    initializeBottomNav();
}

// Also re-initialize on page load/navigation
window.addEventListener('load', initializeBottomNav);
