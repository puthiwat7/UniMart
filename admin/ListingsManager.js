// Track current filter and all listings
let allListings = [];
let currentFilter = 'active';

function getListingStatus(status) {
    return String(status || 'active').toLowerCase();
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function encodeDataAttr(value) {
    return encodeURIComponent(String(value ?? ''));
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
        const listingId = String(listing.id || '');
        const safeTitle = String(listing.title || 'Untitled Listing');
        const safeSeller = String(listing.seller || listing.sellerEmail || 'Unknown Seller');
        const safePrice = String(listing.price || '-');
        const sellerUid = String(listing.sellerUid || '');
        const sellerEmail = String(listing.sellerEmail || '');
        const encodedListingId = encodeDataAttr(listingId);
        const encodedListingTitle = encodeDataAttr(safeTitle);
        const encodedSellerUid = encodeDataAttr(sellerUid);
        const encodedSellerEmail = encodeDataAttr(sellerEmail);
        const warningDisabled = !sellerUid && !sellerEmail;

        return `
            <tr>
                <td>${escapeHtml(safeTitle)}</td>
                <td>${escapeHtml(safeSeller)}</td>
                <td>${escapeHtml(safePrice)}</td>
                <td><span class="admin-status-pill admin-status-${status}">${status}</span></td>
                <td><span class="admin-status-pill ${listing.reserved && status === 'active' ? 'admin-status-reserved' : 'admin-status-active'}">${listing.reserved && status === 'active' ? 'Reserved' : 'Open'}</span></td>
                <td class="admin-warning-cell">
                    <button class="admin-table-btn admin-warning-btn" data-action="listing-warning" data-id="${escapeHtml(listingId)}" data-listing-id="${encodedListingId}" data-listing-title="${encodedListingTitle}" data-seller-uid="${encodedSellerUid}" data-seller-email="${encodedSellerEmail}" ${warningDisabled ? 'disabled title="Seller identity is missing for this listing"' : ''}>Send Warning</button>
                </td>
                <td class="admin-action-cell">
                    <button class="admin-table-btn" data-action="listing-status" data-id="${escapeHtml(listingId)}" data-status="active">Active</button>
                    <button class="admin-table-btn" data-action="listing-status" data-id="${escapeHtml(listingId)}" data-status="sold">Sold</button>
                    <button class="admin-table-btn" data-action="listing-status" data-id="${escapeHtml(listingId)}" data-status="withdrawn">Withdrawn</button>
                    <button class="admin-table-btn admin-danger-btn" data-action="listing-delete" data-id="${escapeHtml(listingId)}">Delete</button>
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
                    <th>Reserved</th>
                    <th>Warning</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${rows || '<tr><td colspan="7">No listings found.</td></tr>'}
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