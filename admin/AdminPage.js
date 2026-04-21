import {
    subscribeListings,
    subscribeUsers,
    subscribeBans,
    subscribeReports,
    deleteListing,
    updateListingStatus,
    createSellerWarning,
    deleteReport,
    fetchReports,
    banUserFromSelling,
    unbanUserFromSelling,
    banUserFromLogin,
    unbanUserFromLogin
} from './firestoreService.js';
import { renderDashboard } from './Dashboard.js';
import { renderListingsManager } from './ListingsManager.js';
import { renderReportsManager } from './ReportsManager.js';
import { renderUsersManager } from './UsersManager.js';

const state = {
    listings: [],
    users: [],
    reports: [],
    bans: {},
    warningDraft: null,
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

function decodeDatasetValue(value) {
    if (!value) return '';

    try {
        return decodeURIComponent(value);
    } catch (error) {
        return String(value);
    }
}

function getWarningModal() {
    return document.getElementById('adminWarningModal');
}

function findUserUidByEmail(email) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return '';

    const matchedUser = (Array.isArray(state.users) ? state.users : []).find((user) => {
        return String(user.email || '').trim().toLowerCase() === normalizedEmail;
    });

    return matchedUser ? String(matchedUser.id || matchedUser.uid || '') : '';
}

function getWarningReasonLabel(reason) {
    return String(reason || 'Policy Reminder').trim() || 'Policy Reminder';
}

function buildNoticeMessage({ reason, listingTitle, listingId, adminComment }) {
    const safeReason = getWarningReasonLabel(reason);
    const safeTitle = String(listingTitle || 'your listing').trim() || 'your listing';
    const safeListingId = String(listingId || '').trim();
    const safeComment = String(adminComment || '').trim();

    let message = `Hello, this is a respectful notice from the UniMart admin team about your listing "${safeTitle}"`;
    if (safeListingId) {
        message += ` (ID: ${safeListingId})`;
    }

    message += `. We identified a possible marketplace policy issue: ${safeReason}. `;
    message += 'Please review and update the listing as soon as possible so it remains aligned with UniMart community rules.';

    if (safeComment) {
        message += `\n\nAdditional admin note: ${safeComment}`;
    }

    message += '\n\nThis is a warning notice intended to help you correct the issue respectfully. Repeated violations may lead to stronger account restrictions. Thank you for your cooperation.';

    return message;
}

function updateWarningPreview() {
    const preview = document.getElementById('adminWarningPreview');
    const reasonSelect = document.getElementById('adminWarningReason');
    const commentInput = document.getElementById('adminWarningComment');

    if (!preview) return;

    const draft = state.warningDraft || {};
    preview.textContent = buildNoticeMessage({
        reason: reasonSelect ? reasonSelect.value : 'Policy Reminder',
        listingTitle: draft.listingTitle,
        listingId: draft.listingId,
        adminComment: commentInput ? commentInput.value : ''
    });
}

function resetWarningDialog() {
    const sellerSummary = document.getElementById('adminWarningSellerSummary');
    const listingSummary = document.getElementById('adminWarningListingSummary');
    const reasonSelect = document.getElementById('adminWarningReason');
    const commentInput = document.getElementById('adminWarningComment');
    const preview = document.getElementById('adminWarningPreview');

    state.warningDraft = null;

    if (sellerSummary) sellerSummary.textContent = '-';
    if (listingSummary) listingSummary.textContent = '-';
    if (reasonSelect) reasonSelect.value = 'Policy Reminder';
    if (commentInput) commentInput.value = '';
    if (preview) preview.textContent = '';
}

function closeWarningDialog() {
    const modal = getWarningModal();
    if (!modal) return;

    modal.hidden = true;
    modal.classList.remove('is-open');
    resetWarningDialog();
}

function openWarningDialog(draft) {
    const modal = getWarningModal();
    const sellerSummary = document.getElementById('adminWarningSellerSummary');
    const listingSummary = document.getElementById('adminWarningListingSummary');

    if (!modal || !sellerSummary || !listingSummary) return;

    const resolvedSellerEmail = String(draft.sellerEmail || '');
    const resolvedSellerUid = String(draft.sellerUid || '') || findUserUidByEmail(resolvedSellerEmail);

    state.warningDraft = {
        sellerUid: resolvedSellerUid,
        sellerEmail: String(draft.sellerEmail || ''),
        listingId: String(draft.listingId || ''),
        listingTitle: String(draft.listingTitle || 'Untitled Listing')
    };

    sellerSummary.textContent = state.warningDraft.sellerEmail
        ? `${state.warningDraft.sellerEmail} (UID: ${state.warningDraft.sellerUid || 'unknown'})`
        : `UID: ${state.warningDraft.sellerUid || 'unknown'}`;
    listingSummary.textContent = `${state.warningDraft.listingTitle}${state.warningDraft.listingId ? ` (ID: ${state.warningDraft.listingId})` : ''}`;

    modal.hidden = false;
    modal.classList.add('is-open');
    updateWarningPreview();
}

function getCurrentAdminIdentifier() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        const user = firebase.auth().currentUser;
        if (user && user.email) return user.email;
        if (user && user.uid) return user.uid;
    }

    return 'admin';
}

function renderActiveView() {
    const panel = getPanel();
    if (!panel) return;

    panel.innerHTML = '<div id="adminDashSection"></div><div id="adminListingsSection" style="margin-top:32px"></div><div id="adminFeedbackSection" style="margin-top:32px"></div><div id="adminUsersSection" style="margin-top:32px"></div>';
    renderDashboard(document.getElementById('adminDashSection'), state);
    renderListingsManager(document.getElementById('adminListingsSection'), state);
    renderReportsManager(document.getElementById('adminFeedbackSection'), state);
    renderUsersManager(document.getElementById('adminUsersSection'), state);
}

function renderShell() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <section class="admin-module-main" id="adminModulePanel"></section>
        <div class="admin-warning-modal" id="adminWarningModal" hidden>
            <div class="admin-warning-dialog" role="dialog" aria-modal="true" aria-labelledby="adminWarningDialogTitle">
                <div class="admin-warning-header">
                    <h3 id="adminWarningDialogTitle">Send Seller Warning</h3>
                    <button type="button" class="admin-warning-close" id="adminWarningCloseBtn" aria-label="Close warning dialog">&times;</button>
                </div>
                <p class="admin-helper-text admin-warning-intro">Use this notice to clearly and respectfully inform the seller about a rule or policy concern.</p>
                <div class="admin-warning-summary">
                    <p><strong>Seller:</strong> <span id="adminWarningSellerSummary">-</span></p>
                    <p><strong>Listing:</strong> <span id="adminWarningListingSummary">-</span></p>
                </div>
                <label for="adminWarningReason" class="admin-warning-label">Warning reason</label>
                <select id="adminWarningReason" class="admin-warning-select">
                    <option value="Policy Reminder">Policy Reminder</option>
                    <option value="Misleading Listing Details">Misleading Listing Details</option>
                    <option value="Inappropriate or Prohibited Content">Inappropriate or Prohibited Content</option>
                    <option value="Spam or Duplicate Listing">Spam or Duplicate Listing</option>
                    <option value="Unclear Pricing or Terms">Unclear Pricing or Terms</option>
                </select>
                <label for="adminWarningComment" class="admin-warning-label">Admin comment</label>
                <textarea id="adminWarningComment" class="admin-warning-textarea" rows="4" placeholder="Add a clear and respectful explanation for the seller."></textarea>
                <div class="admin-warning-preview-wrap">
                    <p class="admin-warning-preview-title">Notice preview</p>
                    <pre id="adminWarningPreview" class="admin-warning-preview"></pre>
                </div>
                <div class="admin-warning-actions">
                    <button type="button" class="admin-table-btn" id="adminWarningCancelBtn">Cancel</button>
                    <button type="button" class="admin-table-btn admin-warning-send-btn" id="adminWarningSendBtn">Send Warning</button>
                </div>
            </div>
        </div>
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

            if (action === 'report-delete') {
                if (id) await deleteReport(id);
            }

            if (action === 'listing-status') {
                const status = actionButton.dataset.status;
                if (id && status) await updateListingStatus(id, status);
            }

            if (action === 'reports-refresh') {
                state.reports = await fetchReports();
                renderActiveView();
            }

            if (action === 'listing-warning') {
                openWarningDialog({
                    sellerUid: decodeDatasetValue(actionButton.dataset.sellerUid),
                    sellerEmail: decodeDatasetValue(actionButton.dataset.sellerEmail),
                    listingId: decodeDatasetValue(actionButton.dataset.listingId || actionButton.dataset.id),
                    listingTitle: decodeDatasetValue(actionButton.dataset.listingTitle)
                });
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

        } catch (error) {
            console.error(`Admin action failed: ${action}`, error);
            alert('Admin action failed. Please try again.');
        } finally {
            actionButton.disabled = false;
        }
    });

    const warningModal = getWarningModal();
    const warningCloseBtn = document.getElementById('adminWarningCloseBtn');
    const warningCancelBtn = document.getElementById('adminWarningCancelBtn');
    const warningSendBtn = document.getElementById('adminWarningSendBtn');
    const warningReason = document.getElementById('adminWarningReason');
    const warningComment = document.getElementById('adminWarningComment');

    if (warningCloseBtn) warningCloseBtn.addEventListener('click', closeWarningDialog);
    if (warningCancelBtn) warningCancelBtn.addEventListener('click', closeWarningDialog);

    if (warningModal) {
        warningModal.addEventListener('click', (event) => {
            if (event.target === warningModal) {
                closeWarningDialog();
            }
        });
    }

    if (warningReason) warningReason.addEventListener('change', updateWarningPreview);
    if (warningComment) warningComment.addEventListener('input', updateWarningPreview);

    if (warningSendBtn) {
        warningSendBtn.addEventListener('click', async () => {
            const draft = state.warningDraft || {};
            const reason = warningReason ? warningReason.value : 'Policy Reminder';
            const adminComment = warningComment ? warningComment.value.trim() : '';
            const sellerUid = draft.sellerUid || findUserUidByEmail(draft.sellerEmail);

            if (!sellerUid) {
                alert('Cannot send warning because the seller account could not be matched. Please make sure the listing has a valid seller email or UID.');
                return;
            }

            const noticeMessage = buildNoticeMessage({
                reason,
                listingTitle: draft.listingTitle,
                listingId: draft.listingId,
                adminComment
            });

            try {
                warningSendBtn.disabled = true;
                await createSellerWarning({
                    sellerUid,
                    listingId: draft.listingId,
                    listingTitle: draft.listingTitle,
                    sellerEmail: draft.sellerEmail,
                    reason,
                    adminComment,
                    noticeMessage,
                    issuedBy: getCurrentAdminIdentifier()
                });
                alert('Warning sent to the seller successfully.');
                closeWarningDialog();
            } catch (error) {
                console.error('Failed to send seller warning:', error);
                alert('Failed to send warning. Please try again.');
            } finally {
                warningSendBtn.disabled = false;
            }
        });
    }
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
