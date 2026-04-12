import {
    subscribeListings,
    subscribeUsers,
    subscribeBans,
    subscribeReports,
    fetchReports,
    deleteListing,
    deleteReport,
    updateListingStatus,
    banUserFromSelling,
    unbanUserFromSelling,
    banUserFromLogin,
    unbanUserFromLogin
} from './firestoreService.js';
import { renderDashboard } from './Dashboard.js';
import { renderListingsManager } from './ListingsManager.js';
import { renderUsersManager } from './UsersManager.js';
import { renderReportsManager } from './ReportsManager.js';

const state = {
    listings: [],
    users: [],
    bans: {},
    reports: [],
    activeView: 'dashboard',
    unsubscribers: []
};

function setMainLoading(message) {
    const panel = getPanel();
    if (!panel) return;
    panel.innerHTML = `<div class="admin-loading">${message}</div>`;
}

function getPanel() {
    return document.getElementById('adminModulePanel');
}

function updateModuleNav() {
    const buttons = document.querySelectorAll('.admin-module-nav');
    buttons.forEach((button) => {
        button.classList.toggle('active', button.dataset.nav === state.activeView);
    });
}

function renderActiveView() {
    const panel = getPanel();
    if (!panel) return;

    updateModuleNav();

    switch (state.activeView) {
        case 'listings':
            renderListingsManager(panel, state);
            break;
        case 'users':
            renderUsersManager(panel, state);
            break;
        case 'reports':
            renderReportsManager(panel, state);
            break;
        default:
            renderDashboard(panel, state);
            break;
    }
}

function setActiveView(view) {
    state.activeView = view || 'dashboard';
    renderActiveView();

function renderShell() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="admin-module-layout">
            <aside class="admin-module-sidebar">
                <button class="admin-module-nav active" data-nav="dashboard">
                    <i class="fas fa-tachometer-alt"></i>
                    Dashboard
                </button>
                <button class="admin-module-nav" data-nav="listings">
                    <i class="fas fa-boxes"></i>
                    Listings
                </button>
                <button class="admin-module-nav" data-nav="users">
                    <i class="fas fa-users"></i>
                    Users
                </button>
                <button class="admin-module-nav" data-nav="reports">
                    <i class="fas fa-flag"></i>
                    Feedback
                </button>
            </aside>
            <section class="admin-module-main" id="adminModulePanel"></section>
        </div>
    `;
}

function attachStaticEvents() {
    const container = document.querySelector('.admin-module-layout');
    if (!container) return;

    container.addEventListener('click', async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const navButton = target.closest('button[data-nav]');
        if (navButton) {
            setActiveView(navButton.dataset.nav);
            return;
        }

        const actionButton = target.closest('button[data-action]');
        if (!actionButton) return;

        const action = actionButton.dataset.action;
        const id = actionButton.dataset.id;

        try {
            actionButton.disabled = true;

            if (action === 'listing-delete' && id) {
                await deleteListing(id);
            }

            if (action === 'listing-status' && id) {
                const status = actionButton.dataset.status;
                if (status) await updateListingStatus(id, status);
            }

            if (action === 'user-ban-selling' && id) {
                await banUserFromSelling(id);
            }

            if (action === 'user-unban-selling' && id) {
                await unbanUserFromSelling(id);
            }

            if (action === 'user-ban-login' && id) {
                await banUserFromLogin(id);
            }

            if (action === 'user-unban-login' && id) {
                await unbanUserFromLogin(id);
            }

            if (action === 'report-delete' && id) {
                await deleteReport(id);
            }

            if (action === 'reports-refresh') {
                const reports = await fetchReports();
                state.reports = reports;
                renderActiveView();
            }
        } catch (error) {
            console.error(`Admin action failed: ${action}`, error);
            alert('Admin action failed. Please try again.');
        } finally {
            actionButton.disabled = false;
        }
    });
}

function subscribeCollectionsOnce() {
    const listingsUnsub = subscribeListings((listings) => {
        state.listings = listings;
        renderActiveView();
    });

    const usersUnsub = subscribeUsers((users) => {
        state.users = users;
        renderActiveView();
    });

    const bansUnsub = subscribeBans((bans) => {
        state.bans = bans;
        renderActiveView();
    });

    const reportsUnsub = subscribeReports((reports) => {
        state.reports = reports;
        renderActiveView();
    });

    state.unsubscribers.push(listingsUnsub, usersUnsub, bansUnsub, reportsUnsub);
}

function cleanupSubscriptions() {
    state.unsubscribers.forEach((unsubscribe) => {
        if (typeof unsubscribe === 'function') {
            unsubscribe();
        }
    });
    state.unsubscribers = [];
}

function bootAdminModule() {
    renderShell();
    setMainLoading('Loading admin data...');
    attachStaticEvents();
    subscribeCollectionsOnce();

    window.addEventListener('beforeunload', cleanupSubscriptions);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAdminModule);
} else {
    bootAdminModule();
}
