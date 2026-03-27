function getListingStatus(status) {
    return String(status || 'active').toLowerCase();
}

function renderListingsManager(container, state) {
    const listings = Array.isArray(state.listings) ? state.listings : [];

    const rows = listings.map((listing) => {
        const status = getListingStatus(listing.status);
        const safeTitle = String(listing.title || 'Untitled Listing');
        const safeSeller = String(listing.seller || listing.sellerEmail || 'Unknown Seller');
        const safePrice = String(listing.price || '-');

        return `
            <tr>
                <td>${safeTitle}</td>
                <td>${safeSeller}</td>
                <td>${safePrice}</td>
                <td><span class="admin-status-pill admin-status-${status}">${status}</span></td>
                <td class="admin-action-cell">
                    <button class="admin-table-btn" data-action="listing-status" data-id="${listing.id}" data-status="active">Active</button>
                    <button class="admin-table-btn" data-action="listing-status" data-id="${listing.id}" data-status="sold">Sold</button>
                    <button class="admin-table-btn" data-action="listing-status" data-id="${listing.id}" data-status="withdrawn">Withdrawn</button>
                    <button class="admin-table-btn admin-danger-btn" data-action="listing-delete" data-id="${listing.id}">Delete</button>
                </td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <section class="admin-section">
            <h2>Listings Manager</h2>
            <p class="admin-helper-text">Single Firestore query with real-time updates.</p>
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Seller</th>
                            <th>Price</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || '<tr><td colspan="5">No listings found.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

export { renderListingsManager };