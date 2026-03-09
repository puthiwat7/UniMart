const USER_LISTINGS_KEY = 'unimartListings';
const LEGACY_LISTINGS_KEY = 'listings';
const SAMPLE_TITLES = new Set([
    'Introduction to Algorithms',
    'Wireless Bluetooth Headphones',
    'Wooden Desk Lamp',
    'Winter Jacket',
    'Basketball',
    'Notebook Set',
    'Used Calculus Textbook',
    'Mechanical Keyboard',
    'Desk Chair',
    'Vintage Lamp'
]);

let mySalesData = [];
let currentSalesFilter = 'all';
let currentSalesItemId = null;
let currentSalesImageIndex = 0;
let editingImages = [];

// Run AGGRESSIVE cleanup immediately when script loads to remove ALL sample items
(function forceRemoveSampleItems() {
    const sampleTitlesLower = [
        'introduction to algorithms',
        'wireless bluetooth headphones',
        'wooden desk lamp',
        'winter jacket',
        'basketball',
        'notebook set',
        'used calculus textbook',
        'mechanical keyboard',
        'desk chair',
        'vintage lamp'
    ];
    
    // Check all possible localStorage keys
    const keysToCheck = [USER_LISTINGS_KEY, LEGACY_LISTINGS_KEY, 'listings', 'unimartListings'];
    
    keysToCheck.forEach((key) => {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return;
            
            let items = JSON.parse(raw);
            let itemsArray = [];
            
            // Handle different storage formats
            if (Array.isArray(items)) {
                itemsArray = items;
            } else if (items && Array.isArray(items.listings)) {
                itemsArray = items.listings;
            } else if (items && typeof items === 'object') {
                itemsArray = [items];
            }
            
            // Filter with case-insensitive comparison
            const filtered = itemsArray.filter(item => {
                if (!item || typeof item !== 'object') return false;
                const title = String(item.title || '').trim().toLowerCase();
                return !sampleTitlesLower.includes(title);
            });
            
            // Only update if we actually removed items
            if (filtered.length !== itemsArray.length) {
                localStorage.setItem(key, JSON.stringify(filtered));
                console.log(`✓ Removed ${itemsArray.length - filtered.length} sample items from "${key}"`);
            }
        } catch (e) {
            console.warn('Cleanup error for key:', key, e);
        }
    });
    
    // Force one more check - also add a timestamp to ensure this runs
    const cleanupTimestamp = localStorage.getItem('lastSampleCleanup');
    const now = Date.now();
    
    // Run aggressive cleanup if never run or more than 1 hour ago
    if (!cleanupTimestamp || (now - parseInt(cleanupTimestamp)) > 3600000) {
        console.log('Running forced sample item cleanup...');
        localStorage.setItem('lastSampleCleanup', String(now));
    }
})();

function parseListingsFromKey(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && Array.isArray(parsed.listings)) return parsed.listings;
        return [];
    } catch (error) {
        console.warn(`Failed to parse listings from key: ${key}`, error);
        return [];
    }
}

function writeListingsToAllKeys(listings) {
    localStorage.setItem(USER_LISTINGS_KEY, JSON.stringify(listings));
    localStorage.setItem(LEGACY_LISTINGS_KEY, JSON.stringify(listings));
}

function getCurrentUserIdentity() {
    const firebaseUser = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
    if (firebaseUser) {
        return {
            uid: firebaseUser.uid || null,
            email: (firebaseUser.email || '').toLowerCase(),
            displayName: firebaseUser.displayName || ''
        };
    }

    try {
        const cached = localStorage.getItem('unimart_last_user');
        if (!cached) return { uid: null, email: '', displayName: '' };
        const user = JSON.parse(cached);
        return {
            uid: user.uid || null,
            email: (user.email || '').toLowerCase(),
            displayName: user.displayName || ''
        };
    } catch (error) {
        return { uid: null, email: '', displayName: '' };
    }
}

function normalizeListing(item, index = 0) {
    if (!item || typeof item !== 'object') return null;

    const status = String(item.status || 'active').toLowerCase();

    return {
        id: item.id || Date.now() + index,
        title: String(item.title || 'Untitled Item'),
        price: String(item.price || '¥0.00'),
        category: String(item.category || 'Other'),
        image: String(item.image || '📦'),
        imageUrl: item.imageUrl || (Array.isArray(item.images) && item.images[0]) || '',
        images: Array.isArray(item.images) ? item.images.filter(Boolean) : [],
        badge: String(item.badge || 'Used'),
        description: String(item.description || ''),
        quantity: Number(item.quantity) || 1,
        seller: String(item.seller || 'Campus Seller'),
        sellerUid: item.sellerUid || null,
        sellerEmail: item.sellerEmail ? String(item.sellerEmail).toLowerCase() : '',
        status,
        listedDate: item.listedDate || item.listedAt || new Date().toISOString().split('T')[0],
        soldDate: item.soldDate || null
    };
}

function listingBelongsToCurrentUser(listing, currentUser) {
    if (!currentUser.uid && !currentUser.email) return false;
    if (listing.sellerUid && currentUser.uid) return listing.sellerUid === currentUser.uid;
    if (listing.sellerEmail && currentUser.email) return listing.sellerEmail === currentUser.email;
    return false;
}

function removeSampleItemsFromStorage() {
    // Aggressive cleanup - remove all sample items from storage with case-insensitive matching
    const sampleTitlesLower = Array.from(SAMPLE_TITLES).map(t => t.toLowerCase());
    
    [USER_LISTINGS_KEY, LEGACY_LISTINGS_KEY].forEach((key) => {
        const items = parseListingsFromKey(key);
        if (!items.length) return;

        const filtered = items.filter((item) => {
            const title = String(item?.title || '').trim().toLowerCase();
            return !sampleTitlesLower.includes(title);
        });

        if (filtered.length !== items.length) {
            localStorage.setItem(key, JSON.stringify(filtered));
            console.log(`Removed ${items.length - filtered.length} sample items from ${key}`);
        }
    });
}

function loadAllListingsForStorage() {
    // First, ensure sample items are removed
    removeSampleItemsFromStorage();

    const merged = [
        ...parseListingsFromKey(USER_LISTINGS_KEY),
        ...parseListingsFromKey(LEGACY_LISTINGS_KEY)
    ];

    const deduped = [];
    const seen = new Set();
    const sampleTitlesLower = Array.from(SAMPLE_TITLES).map(t => t.toLowerCase());

    merged.forEach((item, index) => {
        const normalized = normalizeListing(item, index);
        if (!normalized) return;
        
        // Case-insensitive sample title check
        const titleLower = normalized.title.trim().toLowerCase();
        if (sampleTitlesLower.includes(titleLower)) return;

        const key = `${normalized.id}-${normalized.title}`;
        if (seen.has(key)) return;
        seen.add(key);
        deduped.push(normalized);
    });

    writeListingsToAllKeys(deduped);
    return deduped;
}

function loadMySalesData() {
    const currentUser = getCurrentUserIdentity();
    const allListings = loadAllListingsForStorage();
    mySalesData = allListings.filter((item) => listingBelongsToCurrentUser(item, currentUser));
}

function persistMySalesChanges() {
    const currentUser = getCurrentUserIdentity();
    const allListings = loadAllListingsForStorage();

    const withoutMine = allListings.filter((item) => !listingBelongsToCurrentUser(item, currentUser));
    const updated = [...withoutMine, ...mySalesData];
    writeListingsToAllKeys(updated);
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    refreshMySalesView();
    setupSalesFilters();
    setupSalesModal();

    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(() => {
            refreshMySalesView();
        });
    }
});

// Refresh my-sales when page becomes visible (e.g., after listing a new item)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        refreshMySalesView();
    }
});

// Also refresh when window gains focus (for better reliability)
window.addEventListener('focus', () => {
    refreshMySalesView();
});

function refreshMySalesView() {
    loadMySalesData();
    renderSales(mySalesData);
    updateSalesStats();
}

// Update sales statistics
function updateSalesStats() {
    const totalSales = mySalesData.filter(item => item.status === 'sold').length;
    const activeListings = mySalesData.filter(item => item.status === 'active').length;

    document.getElementById('totalSales').textContent = totalSales;
    document.getElementById('activeListing').textContent = activeListings;
}

// Setup sales filter buttons
function setupSalesFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentSalesFilter = e.target.dataset.filter;
            filterSales();
        });
    });
}

// Filter sales based on status
function filterSales() {
    let filtered = mySalesData;

    if (currentSalesFilter !== 'all') {
        filtered = mySalesData.filter(item => item.status === currentSalesFilter);
    }

    renderSales(filtered);
}

// Render sales items
function renderSales(salesToRender) {
    const grid = document.getElementById('salesGrid');
    grid.innerHTML = '';

    if (salesToRender.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 48px; color: #6b7280;">
                <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                <p>No items found</p>
                <a href="sell-item.html" style="display: inline-block; margin-top: 16px; padding: 8px 16px; background-color: #4a5fc1; color: white; text-decoration: none; border-radius: 6px;">
                    Start Selling
                </a>
            </div>
        `;
        return;
    }

    salesToRender.forEach(item => {
        const card = createSaleCard(item);
        grid.appendChild(card);
    });
}

// Create sale card
function createSaleCard(item) {
    const card = document.createElement('div');
    card.className = 'product-card';
    const statusColor = item.status === 'sold' ? '#10b981' : (item.status === 'withdrawed' ? '#6b7280' : '#f59e0b');
    const statusText = item.status === 'sold' ? 'SOLD' : (item.status === 'withdrawed' ? 'WITHDRAWED' : 'ACTIVE');

    let extraInfo = '';
    if (item.status === 'sold') {
        extraInfo = `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
                <p><strong>Sold:</strong> ${item.soldDate || '-'}</p>
            </div>
        `;
    } else if (item.status === 'withdrawed') {
        extraInfo = `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
                <p><strong>Status:</strong> Withdrawed</p>
            </div>
        `;
    } else {
        extraInfo = `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
                <p><strong>Listed:</strong> ${String(item.listedDate).split('T')[0]}</p>
            </div>
        `;
    }

    // Show uploaded image if available, otherwise show emoji icon
    let cardImage;
    if (item.imageUrl || (item.images && item.images.length > 0)) {
        const imgSrc = item.imageUrl || item.images[0];
        cardImage = `<img src="${imgSrc}" alt="${item.title}" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else if (item.image) {
        cardImage = item.image;
    } else {
        cardImage = '📦';
    }

    card.innerHTML = `
        <div class="product-image" style="cursor: pointer;" onclick="openSalesModal(${item.id})">${cardImage}</div>
        <div class="product-info">
            <span class="product-badge" style="background-color: ${statusColor}; color: white;">${statusText}</span>
            <h3 class="product-title" style="cursor: pointer;" onclick="openSalesModal(${item.id})">${item.title}</h3>
            <div class="product-price">${item.price}</div>
            <div class="product-category" style="color: #6b7280; font-size: 12px;">${item.category}</div>
            ${extraInfo}
            <div class="product-actions">
                <button onclick="openSalesModal(${item.id})">View Details</button>
            </div>
        </div>
    `;
    return card;
}

function getSalesItemById(itemId) {
    return mySalesData.find((item) => item.id === itemId) || null;
}

function getSalesItemImages(item) {
    if (!item) return [];
    if (Array.isArray(item.images) && item.images.length) return item.images.filter(Boolean);
    if (item.imageUrl) return [item.imageUrl];
    return [];
}

function renderSalesModalImage() {
    const item = getSalesItemById(currentSalesItemId);
    const imageBox = document.getElementById('salesCarouselImage');
    const prevBtn = document.getElementById('salesPrevBtn');
    const nextBtn = document.getElementById('salesNextBtn');
    const images = getSalesItemImages(item);

    if (!imageBox) return;

    if (!images.length) {
        imageBox.innerHTML = '<div style="font-size: 14px; color: #9ca3af;">No image available</div>';
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        return;
    }

    if (currentSalesImageIndex >= images.length) currentSalesImageIndex = 0;
    if (currentSalesImageIndex < 0) currentSalesImageIndex = images.length - 1;

    imageBox.innerHTML = `<img src="${images[currentSalesImageIndex]}" alt="${item.title}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
    const showNav = images.length > 1;
    if (prevBtn) prevBtn.style.display = showNav ? 'flex' : 'none';
    if (nextBtn) nextBtn.style.display = showNav ? 'flex' : 'none';
}

function openSalesModal(itemId) {
    const item = getSalesItemById(itemId);
    if (!item) return;

    currentSalesItemId = itemId;
    currentSalesImageIndex = 0;

    document.getElementById('salesModalTitle').textContent = item.title;
    document.getElementById('salesModalPrice').textContent = item.price;
    document.getElementById('salesModalBadge').textContent = item.badge;
    document.getElementById('salesModalDescription').textContent = item.description || 'No description available.';
    document.getElementById('salesModalCategory').textContent = item.category;
    document.getElementById('salesModalQuantity').textContent = String(item.quantity || 1);
    document.getElementById('salesModalStatus').textContent = String(item.status || 'active').toUpperCase();

    const canManage = item.status === 'active';
    document.getElementById('salesEditBtn').style.display = canManage ? 'inline-flex' : 'none';
    document.getElementById('salesWithdrawBtn').style.display = canManage ? 'inline-flex' : 'none';
    document.getElementById('salesMarkSoldBtn').style.display = canManage ? 'inline-flex' : 'none';

    document.getElementById('salesViewPanel').style.display = 'block';
    document.getElementById('salesEditPanel').style.display = 'none';

    renderSalesModalImage();
    document.getElementById('salesModal').classList.add('active');
}

function closeSalesModal() {
    document.getElementById('salesModal').classList.remove('active');
    currentSalesItemId = null;
    currentSalesImageIndex = 0;
    editingImages = [];
}

function openSalesEditPanel() {
    const item = getSalesItemById(currentSalesItemId);
    if (!item || item.status !== 'active') return;

    document.getElementById('editTitle').value = item.title;
    document.getElementById('editPrice').value = String(item.price).replace(/[^\d.]/g, '');
    document.getElementById('editDescription').value = item.description || '';
    document.getElementById('editCategory').value = item.category || 'Other';
    document.getElementById('editCondition').value = item.badge || 'Used';
    document.getElementById('editQuantity').value = item.quantity || 1;

    editingImages = [...getSalesItemImages(item)];
    renderEditImagesPreview();

    document.getElementById('salesViewPanel').style.display = 'none';
    document.getElementById('salesEditPanel').style.display = 'block';
}

function closeSalesEditPanel() {
    document.getElementById('salesEditPanel').style.display = 'none';
    document.getElementById('salesViewPanel').style.display = 'block';
}

function renderEditImagesPreview() {
    const preview = document.getElementById('editImagesPreview');
    if (!preview) return;

    preview.innerHTML = '';

    if (!editingImages.length) {
        preview.innerHTML = '<div style="color: #9ca3af; font-size: 13px;">No images selected</div>';
        return;
    }

    editingImages.forEach((imgSrc, index) => {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.innerHTML = `
            <img src="${imgSrc}" alt="Image ${index + 1}" style="width: 100%; height: 88px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb;">
            <button type="button" data-index="${index}" style="position: absolute; top: 4px; right: 4px; background: #ef4444; color: #fff; border: none; border-radius: 999px; width: 22px; height: 22px; cursor: pointer;">&times;</button>
        `;
        preview.appendChild(wrapper);
    });

    preview.querySelectorAll('button[data-index]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const index = Number(btn.getAttribute('data-index'));
            if (Number.isInteger(index)) {
                editingImages.splice(index, 1);
                renderEditImagesPreview();
            }
        });
    });
}

function saveSalesEdit() {
    const item = getSalesItemById(currentSalesItemId);
    if (!item || item.status !== 'active') return;

    const title = document.getElementById('editTitle').value.trim();
    const priceValue = Number(document.getElementById('editPrice').value);
    const description = document.getElementById('editDescription').value.trim();
    const category = document.getElementById('editCategory').value;
    const condition = document.getElementById('editCondition').value;
    const quantityValue = Number(document.getElementById('editQuantity').value);

    if (!title) {
        alert('Title is required.');
        return;
    }
    if (!Number.isFinite(priceValue) || priceValue <= 0) {
        alert('Please enter a valid price.');
        return;
    }
    if (!description) {
        alert('Description is required.');
        return;
    }
    if (!Number.isFinite(quantityValue) || quantityValue < 1) {
        alert('Quantity must be at least 1.');
        return;
    }
    if (!editingImages.length) {
        alert('At least 1 image is required.');
        return;
    }

    item.title = title;
    item.price = `¥${priceValue.toFixed(2)}`;
    item.description = description;
    item.category = category;
    item.badge = condition;
    item.quantity = Math.floor(quantityValue);
    item.images = [...editingImages];
    item.imageUrl = editingImages[0] || '';

    persistMySalesChanges();
    updateSalesStats();
    filterSales();
    openSalesModal(item.id);
    alert('Listing updated successfully!');
}

function withdrawCurrentListing() {
    const item = getSalesItemById(currentSalesItemId);
    if (!item || item.status !== 'active') return;
    if (!confirm('Are you sure you want to withdraw this listing?')) return;

    item.status = 'withdrawed';
    persistMySalesChanges();
    updateSalesStats();
    filterSales();
    closeSalesModal();
    alert('Listing withdrawed successfully!');
}

function markCurrentListingSold() {
    const item = getSalesItemById(currentSalesItemId);
    if (!item || item.status !== 'active') return;

    item.status = 'sold';
    item.soldDate = new Date().toISOString().split('T')[0];
    persistMySalesChanges();
    updateSalesStats();
    filterSales();
    closeSalesModal();
    alert('Listing marked as sold!');
}

function setupSalesModal() {
    const closeBtn = document.getElementById('salesModalCloseBtn');
    const overlay = document.getElementById('salesModalOverlay');
    const prevBtn = document.getElementById('salesPrevBtn');
    const nextBtn = document.getElementById('salesNextBtn');
    const editBtn = document.getElementById('salesEditBtn');
    const withdrawBtn = document.getElementById('salesWithdrawBtn');
    const markSoldBtn = document.getElementById('salesMarkSoldBtn');
    const cancelEditBtn = document.getElementById('salesCancelEditBtn');
    const saveEditBtn = document.getElementById('salesSaveEditBtn');
    const editImagesInput = document.getElementById('editImages');

    if (closeBtn) closeBtn.addEventListener('click', closeSalesModal);
    if (overlay) overlay.addEventListener('click', closeSalesModal);

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            const item = getSalesItemById(currentSalesItemId);
            const images = getSalesItemImages(item);
            if (images.length <= 1) return;
            currentSalesImageIndex = (currentSalesImageIndex - 1 + images.length) % images.length;
            renderSalesModalImage();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const item = getSalesItemById(currentSalesItemId);
            const images = getSalesItemImages(item);
            if (images.length <= 1) return;
            currentSalesImageIndex = (currentSalesImageIndex + 1) % images.length;
            renderSalesModalImage();
        });
    }

    if (editBtn) editBtn.addEventListener('click', openSalesEditPanel);
    if (withdrawBtn) withdrawBtn.addEventListener('click', withdrawCurrentListing);
    if (markSoldBtn) markSoldBtn.addEventListener('click', markCurrentListingSold);
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeSalesEditPanel);
    if (saveEditBtn) saveEditBtn.addEventListener('click', saveSalesEdit);

    if (editImagesInput) {
        editImagesInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;

            files.forEach((file) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (event.target && typeof event.target.result === 'string') {
                        editingImages.push(event.target.result);
                        renderEditImagesPreview();
                    }
                };
                reader.readAsDataURL(file);
            });

            e.target.value = '';
        });
    }
}

// (Authentication and sidebar display are handled globally by user-sidebar.js)
