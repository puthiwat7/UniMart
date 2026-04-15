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

    panel.innerHTML = '<div id="adminDashSection"></div><div id="adminListingsSection" style="margin-top:32px"></div><div id="adminUsersSection" style="margin-top:32px"></div><div id="adminReportsSection" style="margin-top:32px"></div><div id="adminPasswordResetSection" style="margin-top:32px"></div>';
    renderDashboard(document.getElementById('adminDashSection'), state);
    renderListingsManager(document.getElementById('adminListingsSection'), state);
    renderUsersManager(document.getElementById('adminUsersSection'), state);
    renderReportsManager(document.getElementById('adminReportsSection'), state);
    renderPasswordResetSection(document.getElementById('adminPasswordResetSection'));
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

            if (action === 'reports-refresh') {
                state.reports = await fetchReports();
                renderActiveView();
            }

            if (action === 'report-delete') {
                if (id) await deleteReport(id);
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

function renderPasswordResetSection(container) {
    if (!container) return;

    container.innerHTML = `
        <section class="password-reset-section">
            <div class="password-reset-container">
                <h3>Password Recovery Requests</h3>
                <div class="password-reset-list" id="passwordResetList">
                    <p class="no-requests">Loading password reset requests...</p>
                </div>
            </div>
        </section>
    `;

    // Implement the password reset list rendering directly
    renderPasswordResetList();
}

function renderPasswordResetList() {
    const list = document.getElementById('passwordResetList');
    if (!list) return;

    // Fetch from Firestore
    if (typeof firebase !== 'undefined' && firebase.firestore) {
        firebase.firestore().collection('passwordResetRequests')
            .orderBy('timestamp', 'desc')
            .get()
            .then(snapshot => {
                if (snapshot.empty) {
                    list.innerHTML = '<p class="no-requests">No password reset requests yet.</p>';
                    return;
                }

                list.innerHTML = '';
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const item = document.createElement('div');
                    item.className = 'password-reset-item';
                    item.innerHTML = `
                        <div>
                            <div class="password-reset-email">${data.email}</div>
                            <div class="password-reset-timestamp">${data.timestamp ? data.timestamp.toDate().toLocaleString() : 'Unknown time'}</div>
                        </div>
                        <label class="password-reset-checkbox">
                            <input type="checkbox" ${data.contacted ? 'checked' : ''} onchange="updatePasswordResetContacted('${doc.id}', this.checked)">
                            Contacted
                        </label>
                    `;
                    list.appendChild(item);
                });
            })
            .catch(error => {
                console.error('Error fetching password reset requests:', error);
                list.innerHTML = '<p class="no-requests">Error loading requests.</p>';
            });
    } else {
        // Firebase not ready yet, try again later
        setTimeout(renderPasswordResetList, 1000);
    }
}

// Make sure updatePasswordResetContacted is available globally
window.updatePasswordResetContacted = function(docId, contacted) {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
        firebase.firestore().collection('passwordResetRequests').doc(docId).update({
            contacted: contacted
        }).catch(error => {
            console.error('Error updating contacted status:', error);
            alert('Error updating status. Please try again.');
        });
    }
};

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
