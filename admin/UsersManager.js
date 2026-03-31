function renderUsersManager(container, state) {
    const users = Array.isArray(state.users) ? state.users : [];

    const rows = users.map((user) => {
        const role = String(user.role || 'user');
        const banned = user.banned === true;
        return `
            <tr>
                <td>${String(user.email || user.id || '-')}</td>
                <td>${String(user.displayName || user.fullName || '-')}</td>
                <td>${role}</td>
                <td>${banned ? 'Yes' : 'No'}</td>
                <td>
                    <button class="admin-table-btn admin-danger-btn" data-action="user-ban" data-id="${user.id}" ${banned ? 'disabled' : ''}>${banned ? 'Banned' : 'Ban User'}</button>
                </td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <section class="admin-section">
            <h2>Users Manager</h2>
            <p class="admin-helper-text">Banned users are flagged in Realtime Database and should be blocked from privileged actions.</p>
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Email / ID</th>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Banned</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || '<tr><td colspan="5">No users found.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

export { renderUsersManager };