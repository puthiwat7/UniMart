function getStatusValue(listing) {
    return String(listing && listing.status ? listing.status : '').toLowerCase();
}

function buildDashboardStats(state) {
    const listings = Array.isArray(state.listings) ? state.listings : [];

    return {
        totalListings: listings.length,
        activeListings: listings.filter((item) => getStatusValue(item) === 'active').length,
        soldListings: listings.filter((item) => getStatusValue(item) === 'sold').length,
        withdrawnListings: listings.filter((item) => getStatusValue(item) === 'withdrawn').length
    };
}

function renderDashboard(container, state) {
    const stats = buildDashboardStats(state);

    container.innerHTML = `
        <section class="admin-section">
            <h2>Dashboard</h2>
            <div class="admin-stats-grid">
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
                <article class="admin-stat-card">
                    <h3>Withdrawn Listings</h3>
                    <p>${stats.withdrawnListings}</p>
                </article>
            </div>
        </section>
    `;
}

export { renderDashboard, buildDashboardStats };