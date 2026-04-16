function renderPasswordResetManager(container, state) {
    const requests = Array.isArray(state.passwordResetRequests) ? state.passwordResetRequests : [];

    const rows = requests.map((request) => `
        <tr>
            <td>${String(request.email || '-')}</td>
            <td>${request.timestamp ? new Date(request.timestamp).toLocaleString() : 'Unknown time'}</td>
            <td>
                <input type="checkbox" 
                       ${request.contacted ? 'checked' : ''} 
                       onchange="updatePasswordResetContacted('${request.id}', this.checked)"
                       style="margin: 0;">
                <span style="margin-left: 8px; font-size: 12px; color: #6b7280;">Contacted</span>
            </td>
            <td>
                <button class="admin-table-btn admin-danger-btn" data-action="password-reset-delete" data-id="${request.id}">Delete</button>
            </td>
        </tr>
    `).join('');

    container.innerHTML = `
        <section class="admin-section">
            <div class="admin-section-header-row">
                <h2>Password Reset Requests</h2>
                <button class="admin-table-btn" data-action="password-reset-refresh">Refresh</button>
            </div>
            <p class="admin-helper-text">Collection: passwordResetRequests (Realtime Database)</p>
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Requested At</th>
                            <th>Contacted</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows && rows.length > 0 ? rows : '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #6b7280;">No password reset requests found. If requests are not appearing, check that database rules are properly deployed with read/write access to "passwordResetRequests" collection.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

export { renderPasswordResetManager };