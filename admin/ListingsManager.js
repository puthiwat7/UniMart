// Track current filter and all listings
let allListings = [];
let currentFilter = 'active';

function getListingStatus(status) {
    return String(status || 'active').toLowerCase();
}

function filterListingsByStatus(filter) {
    return allListings.filter((listing) => {
        const status = getListingStatus(listing.status);
        return status === filter;
    });
}

function renderListingsTable(container, listings) {
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

    return `
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
    `;
}

function renderListings(filter) {
    currentFilter = filter;
    const filteredListings = filterListingsByStatus(filter);
    const tableContainer = document.querySelector('.admin-listings-table-wrap');
    
    if (tableContainer) {
        tableContainer.innerHTML = renderListingsTable(tableContainer, filteredListings);
    }
}

function attachTabEventListeners() {
    const tabs = document.querySelectorAll('.admin-listing-tab');
    
    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const filter = tab.dataset.filter;
            
            // Update active state
            tabs.forEach((t) => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Render filtered listings
            renderListings(filter);
        });
    });
}

function renderListingsManager(container, state) {
    // Store all listings for filtering
    allListings = Array.isArray(state.listings) ? state.listings : [];
    currentFilter = 'active';

    // Get initial filtered listings
    const filteredListings = filterListingsByStatus('active');

    container.innerHTML = `
        <section class="admin-section">
            <h2>Listings Manager</h2>
            <p class="admin-helper-text">Realtime Database feed with live updates.</p>
            
            <div class="admin-listing-tabs">
                <button class="admin-listing-tab active" data-filter="active">Active</button>
                <button class="admin-listing-tab" data-filter="sold">Sold</button>
                <button class="admin-listing-tab" data-filter="withdrawn">Withdrawn</button>
            </div>
            
            <div class="admin-listings-table-wrap admin-table-wrap">
                ${renderListingsTable(container, filteredListings)}
            </div>
        </section>
    `;

    // Attach event listeners after rendering
    attachTabEventListeners();
}

export { renderListingsManager, renderListings };