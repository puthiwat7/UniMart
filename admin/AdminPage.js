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
        <section class="admin-access-section">
            <h3>Admin Access</h3>
            <div class="admin-access-row">
                <input type="email" id="newAdminEmail" placeholder="Add admin email (e.g. student@example.com)">
                <button type="button" id="addAdminEmailBtn">Add Admin</button>
            </div>
            <ul id="adminEmailList" class="admin-email-list"></ul>
        </section>

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

function renderAdminEmailList() {
    const list = document.getElementById('adminEmailList');
    if (!list || !window.unimartAdminAccess) return;

    const emails = window.unimartAdminAccess.getAdminEmails();
    const currentUser = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
    const currentEmail = window.unimartAdminAccess.normalizeEmail(currentUser && currentUser.email ? currentUser.email : '');

    list.innerHTML = '';

    emails.forEach((email) => {
        const isDefaultAdmin = typeof window.unimartAdminAccess.isDefaultAdminEmail === 'function'
            ? window.unimartAdminAccess.isDefaultAdminEmail(email)
            : false;
        const isCurrentUserEmail = currentEmail && email === currentEmail;

        const actionHtml = isDefaultAdmin
            ? '<span class="admin-tag">Admin</span>'
            : `<button type="button" class="admin-remove-btn" data-remove-admin-email="${email}">Remove</button>`;

        const li = document.createElement('li');
        li.className = 'admin-email-item';
        li.innerHTML = `
            <span>${email}${isCurrentUserEmail ? ' (you)' : ''}</span>
            ${actionHtml}
        `;
        list.appendChild(li);
    });
}

function setupAdminEmailManagement() {
    const input = document.getElementById('newAdminEmail');
    const addBtn = document.getElementById('addAdminEmailBtn');
    const list = document.getElementById('adminEmailList');

    if (!input || !addBtn || !window.unimartAdminAccess) return;

    const handleAdd = () => {
        const result = window.unimartAdminAccess.addAdminEmail(input.value);
        if (!result.ok) {
            alert(result.message);
            return;
        }

        input.value = '';
        renderAdminEmailList();
        alert('Admin email added successfully.');
    };

    addBtn.addEventListener('click', handleAdd);
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleAdd();
        }
    });

    if (list) {
        list.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;

            const email = target.getAttribute('data-remove-admin-email');
            if (!email) return;

            if (!confirm(`Remove admin access for ${email}?`)) return;

            const result = window.unimartAdminAccess.removeAdminEmail(email);
            if (!result.ok) {
                alert(result.message);
                return;
            }

            renderAdminEmailList();
            alert('Admin removed successfully.');
        });
    }

    renderAdminEmailList();
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
    setupAdminEmailManagement();
    setActiveNav(state.activeView);
    setMainLoading('Loading admin data...');
    attachStaticEvents();
    subscribeCollectionsOnce();
    renderActiveView();

    window.addEventListener('beforeunload', cleanupSubscriptions);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAdminModule);
} else {
    bootAdminModule();
}
