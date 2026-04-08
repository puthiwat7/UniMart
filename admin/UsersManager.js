let allUsers = [];
let currentBans = {};
let usersSearchQuery = '';

function getUserJoinedDate(user) {
    const raw = user.createdAt || user.joinedAt || user.lastLoginAt || '';
    if (!raw) return '-';
    const d = new Date(raw);
    return isNaN(d.getTime()) ? String(raw) : d.toLocaleDateString();
}

function renderUsersTable(users, bans) {
    if (!users.length) {
        return '<p class="admin-helper-text" style="padding:12px 0">No users found.</p>';
    }

    const rows = users.map((user) => {
        const banData = (bans && bans[user.id]) || {};
        const bannedSelling = banData.bannedFromSelling === true;
        const bannedLogin = banData.bannedFromLogin === true;
        const email = String(user.email || '-');
        const name = String(user.displayName || user.fullName || '-');
        const college = String(user.college || user.university || '-');
        const joined = getUserJoinedDate(user);
        const itemsSold = Number(user.itemsSold || 0);

        return `
            <tr>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${email}">${email}</td>
                <td>${name}</td>
                <td>${college}</td>
                <td>${joined}</td>
                <td style="text-align:center">${itemsSold}</td>
                <td>
                    <button class="admin-table-btn ${bannedSelling ? 'admin-success-btn' : 'admin-danger-btn'}"
                        data-action="${bannedSelling ? 'user-unban-selling' : 'user-ban-selling'}"
                        data-id="${user.id}">
                        ${bannedSelling ? 'Unban Selling' : 'Ban Selling'}
                    </button>
                    <button class="admin-table-btn ${bannedLogin ? 'admin-success-btn' : 'admin-danger-btn'}"
                        data-action="${bannedLogin ? 'user-unban-login' : 'user-ban-login'}"
                        data-id="${user.id}">
                        ${bannedLogin ? 'Unban Login' : 'Ban Login'}
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Email</th>
                    <th>Name</th>
                    <th>College</th>
                    <th>Joined</th>
                    <th style="text-align:center">Items Sold</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

function filterUsers(query) {
    const q = String(query || '').toLowerCase().trim();
    if (!q) return allUsers;
    return allUsers.filter((u) => {
        return (
            String(u.email || '').toLowerCase().includes(q) ||
            String(u.displayName || u.fullName || '').toLowerCase().includes(q) ||
            String(u.college || u.university || '').toLowerCase().includes(q)
        );
    });
}

function refreshUsersTable() {
    const wrap = document.querySelector('.admin-users-table-wrap');
    if (!wrap) return;
    wrap.innerHTML = renderUsersTable(filterUsers(usersSearchQuery), currentBans);
}

function renderUsersManager(container, state) {
    allUsers = Array.isArray(state.users) ? state.users : [];
    currentBans = (state.bans && typeof state.bans === 'object') ? state.bans : {};
    usersSearchQuery = '';

    container.innerHTML = `
        <section class="admin-section">
            <h2>Users</h2>
            <p class="admin-helper-text">All accounts that have ever logged in to the platform. Total: <strong>${allUsers.length}</strong></p>
            <div style="margin-bottom:12px">
                <input
                    id="usersSearchInput"
                    type="text"
                    class="admin-search-input"
                    placeholder="Search by email, name or college…"
                    style="width:100%;max-width:380px;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px"
                    value="">
            </div>
            <div class="admin-users-table-wrap admin-table-wrap">
                ${renderUsersTable(allUsers, currentBans)}
            </div>
        </section>
    `;

    const searchInput = document.getElementById('usersSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            usersSearchQuery = e.target.value;
            refreshUsersTable();
        });
    }
}

export { renderUsersManager };
