function getStatusValue(listing) {
    return String(listing && listing.status ? listing.status : '').toLowerCase();
}

function buildDashboardStats(state) {
    const users = Array.isArray(state.users) ? state.users : [];
    const listings = Array.isArray(state.listings) ? state.listings : [];

    return {
        totalUsers: users.length,
        totalListings: listings.length,
        activeListings: listings.filter((item) => getStatusValue(item) === 'active').length,
        soldListings: listings.filter((item) => getStatusValue(item) === 'sold').length
    };
}

function renderDashboard(container, state) {
    const stats = buildDashboardStats(state);

    container.innerHTML = `
        <section class="admin-section">
            <h2>Dashboard</h2>
            <div class="admin-stats-grid">
                <article class="admin-stat-card">
                    <h3>Total Users</h3>
                    <p>${stats.totalUsers}</p>
                </article>
                <article class="admin-stat-card">
                    <h3>Total Listings</h3>
                    <p>${stats.totalListings}</p>
                </article>
                <article class="admin-stat-card">
                    <h3>Active Listings</h3>
                    <p>${stats.activeListings}</p>
                </article>
                <article class="admin-stat-card">
                    <h3>Sold Listings</h3>
                    <p>${stats.soldListings}</p>
                </article>
            </div>
        </section>
    `;
}

export { renderDashboard, buildDashboardStats };