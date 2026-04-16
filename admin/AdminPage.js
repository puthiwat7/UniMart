import {
    subscribeListings,
    subscribeUsers,
    subscribeBans,
    subscribePasswordResetRequests,
    deleteListing,
    updateListingStatus,
    updatePasswordResetContacted,
    deletePasswordResetRequest,
    banUserFromSelling,
    unbanUserFromSelling,
    banUserFromLogin,
    unbanUserFromLogin
} from './firestoreService.js';
import { renderDashboard } from './Dashboard.js';
import { renderListingsManager } from './ListingsManager.js';
import { renderUsersManager } from './UsersManager.js';
import { renderPasswordResetManager } from './PasswordResetManager.js';

const state = {
    listings: [],
    users: [],
    bans: {},
    passwordResetRequests: [],
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

    panel.innerHTML = '<div id="adminDashSection"></div><div id="adminListingsSection" style="margin-top:32px"></div><div id="adminUsersSection" style="margin-top:32px"></div><div id="adminPasswordResetSection" style="margin-top:32px"></div>';
    renderDashboard(document.getElementById('adminDashSection'), state);
    renderListingsManager(document.getElementById('adminListingsSection'), state);
    renderUsersManager(document.getElementById('adminUsersSection'), state);
    renderPasswordResetManager(document.getElementById('adminPasswordResetSection'), state);
}

function renderShell() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <section class="admin-module-main" id="adminModulePanel"></section>
    `;
}

function attachStaticEvents() {
    const panel = getPanel();
    if (!panel) return;

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

            if (action === 'user-ban-selling') {
                if (id) await banUserFromSelling(id);
            }

            if (action === 'user-unban-selling') {
                if (id) await unbanUserFromSelling(id);
            }

            if (action === 'user-ban-login') {
                if (id) await banUserFromLogin(id);
            }

            if (action === 'user-unban-login') {
                if (id) await unbanUserFromLogin(id);
            }

            if (action === 'password-reset-delete') {
                if (id) await deletePasswordResetRequest(id);
            }
        } catch (error) {
            console.error(`Admin action failed: ${action}`, error);
            alert('Admin action failed. Please try again.');
        } finally {
            actionButton.disabled = false;
        }
    });

    // Make updatePasswordResetContacted available globally
    window.updatePasswordResetContacted = async (id, contacted) => {
        try {
            await updatePasswordResetContacted(id, contacted);
        } catch (error) {
            console.error('Error updating password reset contacted status:', error);
            alert('Error updating status. Please try again.');
        }
    };
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

    const passwordResetUnsub = subscribePasswordResetRequests((requests) => {
        state.passwordResetRequests = requests;
        renderActiveView();
    });

    state.unsubscribers.push(listingsUnsub, usersUnsub, bansUnsub, passwordResetUnsub);
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
