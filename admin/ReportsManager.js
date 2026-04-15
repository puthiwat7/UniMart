function formatDate(value) {
    if (!value) return '-';
    try {
        if (value && typeof value.toDate === 'function') {
            return value.toDate().toLocaleString();
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return '-';
        return parsed.toLocaleString();
    } catch (error) {
        return '-';
    }
}

function renderReportsManager(container, state) {
    const reports = Array.isArray(state.reports) ? state.reports : [];

    const rows = reports.map((report) => `
        <tr>
            <td>${String(report.listingId || '-')}</td>
            <td>${String(report.type || '-')}</td>
            <td>${String(report.subject || report.reason || '-')}</td>
            <td>${String(report.reporterEmail || report.reporterId || '-')}</td>
            <td>${String(report.message || '-')}</td>
            <td>${formatDate(report.createdAt)}</td>
            <td>
                <button class="admin-table-btn admin-danger-btn" data-action="report-delete" data-id="${report.id}">Delete</button>
            </td>
        </tr>
    `).join('');

    container.innerHTML = `
        <section class="admin-section">
            <div class="admin-section-header-row">
                <h2>Feedback & Reports</h2>
                <button class="admin-table-btn" data-action="reports-refresh">Refresh Reports</button>
            </div>
            <p class="admin-helper-text">Collection: unimartAdminV1/reports</p>
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Listing ID</th>
                            <th>Type</th>
                            <th>Subject</th>
                            <th>Reporter</th>
                            <th>Message</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || '<tr><td colspan="7">No reports found.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

export { renderReportsManager };