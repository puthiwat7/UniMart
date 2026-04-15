function getQueryParam(name) {
    const queryString = window.location.search.substring(1);
    const params = new URLSearchParams(queryString);
    return params.get(name);
}

function showReportStatus(message, isError = false) {
    const statusEl = document.getElementById('reportFormStatus');
    if (!statusEl) return;

    statusEl.textContent = message;
    statusEl.style.color = isError ? '#dc2626' : '#10b981';
}

function setReportFormEnabled(enabled) {
    const submitButton = document.getElementById('reportSubmitBtn');
    const inputs = Array.from(document.querySelectorAll('#reportForm input, #reportForm select, #reportForm textarea'));
    inputs.forEach((element) => {
        element.disabled = !enabled;
    });
    if (submitButton) {
        submitButton.textContent = enabled ? 'Submit Feedback' : 'Submitting...';
    }
}

function updateAuthStatus(user) {
    const authStatus = document.getElementById('reportAuthStatus');
    if (!authStatus) return;
    if (user) {
        authStatus.textContent = `Signed in as ${user.email || 'authenticated user'}`;
        authStatus.style.color = '#10b981';
    } else {
        authStatus.textContent = 'You must sign in to submit feedback.';
        authStatus.style.color = '#dc2626';
    }
}

async function submitFeedback(payload) {
    if (!payload) throw new Error('Feedback payload is required.');
    const db = firebase.database();
    await db.ref('unimartAdminV1/reports').push(payload);
}

function buildReportPayload(currentUser) {
    const type = document.getElementById('reportType')?.value || 'general';
    const subject = document.getElementById('reportSubject')?.value.trim() || '';
    const message = document.getElementById('reportMessage')?.value.trim() || '';
    const listingId = document.getElementById('reportListingId')?.value.trim() || null;

    return {
        type,
        subject,
        message,
        listingId: listingId || null,
        reporterId: currentUser.uid,
        reporterEmail: currentUser.email || null,
        createdAt: new Date().toISOString(),
        status: 'open'
    };
}

function validateReportPayload(payload) {
    if (!payload.subject) {
        return 'Please enter a short summary of your feedback.';
    }
    if (!payload.message) {
        return 'Please enter the details of your feedback.';
    }
    return null;
}

function normalizePagePath() {
    const path = window.location.pathname || '';
    if (path.endsWith('/feedback')) return 'feedback';
    if (path.endsWith('/feedback.html')) return 'feedback.html';
    return path;
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('reportForm');
    const listingIdInput = document.getElementById('reportListingId');
    const reportCategory = document.getElementById('reportType');

    if (listingIdInput) {
        const listingId = getQueryParam('listingId');
        if (listingId) {
            listingIdInput.value = listingId;
        }
    }

    if (typeof firebase === 'undefined' || !firebase.auth) {
        showReportStatus('Unable to initialize Firebase. Please reload the page.', true);
        return;
    }

    firebase.auth().onAuthStateChanged((user) => {
        updateAuthStatus(user);
    });

    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const currentUser = firebase.auth().currentUser;

        if (!currentUser) {
            showReportStatus('Please sign in before submitting feedback.', true);
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
            return;
        }

        const payload = buildReportPayload(currentUser);
        const validationError = validateReportPayload(payload);
        if (validationError) {
            showReportStatus(validationError, true);
            return;
        }

        try {
            setReportFormEnabled(false);
            showReportStatus('Sending your feedback...', false);
            await submitFeedback(payload);
            showReportStatus('Thank you! Your submission has been received.', false);
            form.reset();
            if (listingIdInput) {
                const listingId = getQueryParam('listingId');
                if (listingId) listingIdInput.value = listingId;
            }
        } catch (error) {
            console.error('Feedback submission failed', error);
            showReportStatus('Unable to submit feedback right now. Please try again later.', true);
        } finally {
            setReportFormEnabled(true);
        }
    });

    if (reportCategory) {
        reportCategory.addEventListener('change', () => {
            const helpText = document.getElementById('reportHelpText');
            if (!helpText) return;
            if (reportCategory.value === 'user') {
                helpText.textContent = 'Use this option to report inappropriate or abusive behavior from another user.';
            } else if (reportCategory.value === 'issue') {
                helpText.textContent = 'Use this option to report a problem with a listing, page, or marketplace flow.';
            } else {
                helpText.textContent = 'Share general feedback about UniMart, improvements, or feature requests.';
            }
        });
    }
});