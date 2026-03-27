import { requireAdminAccess } from './authGuard.js';
import {
    subscribeUsers,
    subscribeListings,
    subscribeReports,
    fetchReports,
    deleteListing,
    updateListingStatus,
    deleteReport,
    banUser
} from './firestoreService.js';
import { renderDashboard } from './Dashboard.js';
import { renderListingsManager } from './ListingsManager.js';
import { renderReportsManager } from './ReportsManager.js';
import { renderUsersManager } from './UsersManager.js';

const state = {
    authUser: null,
    adminUserDoc: null,
    activeView: 'dashboard',
    users: [],
    listings: [],
    reports: [],
    unsubscribers: []
};

function setMainLoading(message) {
    const panel = document.getElementById('adminModulePanel');
    if (!panel) return;
    panel.innerHTML = `<div class="admin-loading">${message}</div>`;
}

function getPanel() {
    return document.getElementById('adminModulePanel');
}

function renderActiveView() {
    const panel = getPanel();
    if (!panel) return;

    if (state.activeView === 'dashboard') {
        renderDashboard(panel, state);
        return;
    }

    if (state.activeView === 'listings') {
        renderListingsManager(panel, state);
        return;
    }

    if (state.activeView === 'reports') {
        renderReportsManager(panel, state);
        return;
    }

    if (state.activeView === 'users') {
        renderUsersManager(panel, state);
        return;
    }

    panel.innerHTML = '<div class="admin-loading">Unknown view.</div>';
}

function renderShell() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="admin-module-layout">
            <aside class="admin-module-sidebar" id="adminModuleSidebar">
                <button class="admin-module-nav active" data-view="dashboard">Dashboard</button>
                <button class="admin-module-nav" data-view="listings">Listings</button>
                <button class="admin-module-nav" data-view="reports">Reports</button>
                <button class="admin-module-nav" data-view="users">Users</button>
            </aside>
            <section class="admin-module-main" id="adminModulePanel"></section>
        </div>
    `;
}

function setActiveNav(view) {
    const buttons = document.querySelectorAll('.admin-module-nav');
    buttons.forEach((button) => {
        button.classList.toggle('active', button.dataset.view === view);
    });
}

function attachStaticEvents() {
    const sidebar = document.getElementById('adminModuleSidebar');
    const panel = getPanel();
    if (!sidebar || !panel) return;

    sidebar.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const button = target.closest('button[data-view]');
        if (!button) return;

        const nextView = button.dataset.view;
        if (!nextView || state.activeView === nextView) return;

        state.activeView = nextView;
        setActiveNav(nextView);
        renderActiveView();
    });

    panel.addEventListener('click', async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const actionButton = target.closest('button[data-action]');
        if (!actionButton) return;

        const action = actionButton.dataset.action;
        const id = actionButton.dataset.id;

        try {
            actionButton.disabled = true;

            if (action === 'listing-delete') {
                if (id) await deleteListing(id);
            }

            if (action === 'listing-status') {
                const status = actionButton.dataset.status;
                if (id && status) await updateListingStatus(id, status);
            }

            if (action === 'report-delete') {
                if (id) await deleteReport(id);
            }

            if (action === 'reports-refresh') {
                state.reports = await fetchReports();
                renderActiveView();
            }

            if (action === 'user-ban') {
                if (id) await banUser(id);
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
    const usersUnsub = subscribeUsers((users) => {
        state.users = users;
        renderActiveView();
    });

    const listingsUnsub = subscribeListings((listings) => {
        state.listings = listings;
        renderActiveView();
    });

    const reportsUnsub = subscribeReports((reports) => {
        state.reports = reports;
        renderActiveView();
    });

    state.unsubscribers.push(usersUnsub, listingsUnsub, reportsUnsub);
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
    setMainLoading('Verifying admin access...');

    requireAdminAccess({
        onPending: () => {
            setMainLoading('Checking permissions...');
        },
        onAllowed: ({ authUser, userDoc }) => {
            state.authUser = authUser;
            state.adminUserDoc = userDoc;

            setActiveNav(state.activeView);
            setMainLoading('Loading admin data...');
            attachStaticEvents();
            subscribeCollectionsOnce();
            renderActiveView();
        },
        onDenied: () => {
            setMainLoading('Access denied. Redirecting...');
        }
    });

    window.addEventListener('beforeunload', cleanupSubscriptions);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAdminModule);
} else {
    bootAdminModule();
}
