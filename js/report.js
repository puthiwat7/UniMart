function getCurrentUser() {
    if (typeof firebaseAuthManager !== 'undefined' && typeof firebaseAuthManager.getCurrentUser === 'function') {
        return firebaseAuthManager.getCurrentUser();
    }
    if (typeof firebase !== 'undefined' && firebase.auth) {
        return firebase.auth().currentUser;
    }
    return null;
}

function getQueryParam(key) {
    const params = new URLSearchParams(window.location.search);
    return params.get(key) || '';
}

function setFieldVisibility(type) {
    const reportedUserRow = document.getElementById('reportedUserRow');
    const listingIdRow = document.getElementById('listingIdRow');
    if (reportedUserRow) reportedUserRow.style.display = type === 'user' ? 'block' : 'none';
    if (listingIdRow) listingIdRow.style.display = type === 'listing' ? 'block' : 'none';
}

function showFormMessage(message, isError = false) {
    const statusEl = document.getElementById('reportFormStatus');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.style.color = isError ? 'var(--danger-red)' : 'var(--primary)';
}

function buildReportPayload() {
    const type = document.getElementById('reportType').value;
    const listingIdInput = document.getElementById('listingId');
    const listingId = listingIdInput ? listingIdInput.value.trim() : getQueryParam('listingId');
    const reportedUser = document.getElementById('reportedUser').value.trim();
    const subject = document.getElementById('reportSubject').value.trim();
    const message = document.getElementById('reportMessage').value.trim();
    const currentUser = getCurrentUser();

    const payload = {
        type: type || 'general',
        listingId: listingId || null,
        reportedUser: reportedUser || null,
        reporterId: currentUser ? currentUser.uid : 'anonymous',
        reporterEmail: currentUser ? currentUser.email || null : null,
        reason: subject || message.slice(0, 120) || 'User feedback',
        message: message || null,
        createdAt: new Date().toISOString()
    };

    return payload;
}

function validateReportForm(payload) {
    if (!payload.message || !payload.message.trim()) {
        return 'Please provide a detailed description of the issue.';
    }

    if (payload.type === 'user' && !payload.reportedUser) {
        return 'Please enter the reported user display name.';
    }

    if (payload.type === 'listing' && !payload.listingId) {
        return 'Please enter the listing ID for the listing issue report.';
    }

    return null;
}

async function submitReport(payload) {
    if (typeof firebase === 'undefined' || typeof firebase.database !== 'function') {
        throw new Error('Realtime Database is unavailable.');
    }

    const db = firebase.database();
    await db.ref('unimartAdminV1/reports').push(payload);
}

function updatePreFilledInputs() {
    const listingId = getQueryParam('listingId');
    const reportType = getQueryParam('type');

    if (listingId) {
        const listingInput = document.getElementById('listingId');
        if (listingInput) listingInput.value = listingId;
        const typeSelect = document.getElementById('reportType');
        if (typeSelect) typeSelect.value = 'listing';
    }

    if (reportType) {
        const typeSelect = document.getElementById('reportType');
        if (typeSelect) typeSelect.value = reportType;
    }

    setFieldVisibility(document.getElementById('reportType').value);
}

document.addEventListener('DOMContentLoaded', () => {
    const reportTypeSelect = document.getElementById('reportType');
    const reportForm = document.getElementById('reportForm');

    if (reportTypeSelect) {
        reportTypeSelect.addEventListener('change', (event) => {
            setFieldVisibility(event.target.value);
        });
    }

    if (reportForm) {
        reportForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            showFormMessage('Submitting report...', false);
            const payload = buildReportPayload();
            const validationError = validateReportForm(payload);
            if (validationError) {
                showFormMessage(validationError, true);
                return;
            }

            try {
                await submitReport(payload);
                reportForm.reset();
                updateFieldVisibilityFromCurrentState();
                showFormMessage('Thank you. Your report has been submitted.', false);
            } catch (error) {
                console.error('Report submission failed', error);
                showFormMessage('Unable to submit the report right now. Please try again later.', true);
            }
        });
    }

    function updateFieldVisibilityFromCurrentState() {
        const currentType = document.getElementById('reportType')?.value || 'general';
        setFieldVisibility(currentType);
    }

    if (typeof firebaseAuthManager !== 'undefined' && typeof firebaseAuthManager.onAuthStateChanged === 'function') {
        firebaseAuthManager.onAuthStateChanged(() => {
            updatePreFilledInputs();
        });
    }

    updatePreFilledInputs();
});
