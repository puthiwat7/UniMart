// ======================== State ========================
let favoritedIds = new Set();
let favoritedListings = [];
let favDbListener = null;
let currentFavProduct = null;
let currentFavImages = [];
let currentFavImageIndex = 0;
let _fetchVersion = 0;

// ======================== Helpers ========================
function getFavCurrentUser() {
    return (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
}

function getConditionPercentage(product) {
    const raw = Number(product?.condition);

    if (Number.isFinite(raw)) {
        return Math.max(0, Math.min(100, Math.round(raw)));
    }

    const badge = String(product?.badge || '').toLowerCase();
    const fallbackMap = {
        'very poor': 0,
        poor: 20,
        fair: 40,
        good: 60,
        'like new': 80,
        'brand new': 100,
        used: 60
    };

    const fallbackValue = Number.isFinite(fallbackMap[badge]) ? fallbackMap[badge] : null;
    return fallbackValue;
}

function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ======================== Auth Init ========================
document.addEventListener('DOMContentLoaded', () => {
    function waitForFirebase() {
        if (typeof firebase === 'undefined' || !firebase.auth) {
            setTimeout(waitForFirebase, 100);
            return;
        }
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                startFavoritesListener(user.uid);
            } else {
                // Auth guard will handle redirect, but show empty state just in case
                stopFavoritesListener();
                renderEmptyState('Please sign in to view your favorites.', 'sign-in');
            }
        });
    }
    waitForFirebase();
    setupFavModal();
    setupRefreshButton();
    setupClearButton();
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) refreshFavorites();
    });
});

// ======================== RTDB Favorites Listener ========================
function startFavoritesListener(uid) {
    stopFavoritesListener();
    renderLoadingState();

    const ref = firebase.database().ref(`favorites/${uid}`);
    favDbListener = ref;

    ref.on('value', (snapshot) => {
        favoritedIds.clear();
        const favoriteData = snapshot.val() || {};
        Object.keys(favoriteData).forEach(key => {
            if (key !== null && key !== undefined && key !== '') {
                favoritedIds.add(String(key));
            }
        });

        if (favoritedIds.size === 0) {
            favoritedListings = [];
            renderFavoritesGrid();
            return;
        }

        const snapshotIds = Array.from(favoritedIds);
        console.debug('Loading favorites for user', uid, 'count=', snapshotIds.length);
        fetchFavoritedListings(snapshotIds);
    }, (err) => {
        console.error('Favorites listener error:', err);
        renderErrorState('Failed to load favorites. Please try again.');
    });
}

function stopFavoritesListener() {
    if (favDbListener) {
        favDbListener.off();
        favDbListener = null;
    }
    favoritedIds.clear();
}

// ======================== Fetch Listing Data ========================
async function fetchFavoritedListings(ids) {
    const validIds = Array.isArray(ids) ? ids.filter(id => id !== null && id !== undefined && String(id).trim() !== '') : [];
    if (validIds.length === 0) {
        favoritedListings = [];
        renderFavoritesGrid();
        return;
    }

    // Version counter: if a newer fetch starts before this one finishes, discard this result
    const version = ++_fetchVersion;

    try {
        const db = firebase.database();
        const snapshots = await Promise.all(
            validIds.map(id =>
                db.ref('unimartListingsV1/' + id).once('value').catch(() => null)
            )
        );

        // Discard if a newer call has started
        if (version !== _fetchVersion) return;

        favoritedListings = validIds.map((id, i) => {
            const snap = snapshots[i];
            if (snap && snap.exists()) {
                const val = snap.val();
                const rawStatus = String(val.status || 'active').toLowerCase();
                const status = rawStatus === 'withdrawed' ? 'withdrawn' : rawStatus;
                const images = Array.isArray(val.images) ? val.images.filter(Boolean) : [];
                return {
                    ...val,
                    id: String(snap.key),
                    title: String(val.title || 'Untitled Item'),
                    price: String(val.price || '¥0.00'),
                    category: String(val.category || 'Other'),
                    seller: String(val.seller || 'Campus Seller'),
                    sellerUid: val.sellerUid || null,
                    college: String(val.college || ''),
                    image: String(val.image || '📦'),
                    imageUrl: val.imageUrl || images[0] || '',
                    images,
                    badge: String(val.badge || 'Used'),
                    description: String(val.description || ''),
                    status,
                    reserved: Boolean(val.reserved),
                    sellerPaymentQR: val.sellerPaymentQR || ''
                };
            }
            return {
                id,
                title: 'Item no longer available',
                price: '—',
                badge: 'Unknown',
                status: 'unavailable',
                seller: '—',
                sellerUid: null,
                college: '',
                category: '—',
                description: '',
                image: '📦',
                imageUrl: '',
                images: [],
                reserved: false,
                sellerPaymentQR: ''
            };
        });
        renderFavoritesGrid();
    } catch (error) {
        if (version !== _fetchVersion) return;
        console.error('Error fetching favorited listings:', error);
        renderErrorState('Failed to load listings. Please refresh.');
    }
}

async function refreshFavorites() {
    const user = getFavCurrentUser();
    if (!user) return;
    renderLoadingState();
    favoritedIds.clear();
    const ref = firebase.database().ref(`favorites/${user.uid}`);
    try {
        const snapshot = await ref.once('value');
        const favoriteData = snapshot.val() || {};
        Object.keys(favoriteData).forEach(key => {
            if (key !== null && key !== undefined && key !== '') {
                favoritedIds.add(String(key));
            }
        });
        if (favoritedIds.size === 0) {
            favoritedListings = [];
            renderFavoritesGrid();
            return;
        }
        const ids = Array.from(favoritedIds);
        console.debug('Refreshing favorites for user', user.uid, 'count=', ids.length);
        await fetchFavoritedListings(ids);
    } catch (err) {
        renderErrorState('Refresh failed. Please try again.');
    }
}

// ======================== Render Grid ========================
function renderLoadingState() {
    const grid = document.getElementById('favoritesGrid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        const card = document.createElement('div');
        card.className = 'product-card loading-card';
        card.innerHTML = `
            <div class="product-image skeleton-block"></div>
            <div class="product-info">
                <div class="skeleton-line skeleton-badge"></div>
                <div class="skeleton-line skeleton-title"></div>
                <div class="skeleton-line skeleton-price"></div>
                <div class="skeleton-line skeleton-button"></div>
            </div>`;
        grid.appendChild(card);
    }
}

function renderFavoritesGrid() {
    const grid = document.getElementById('favoritesGrid');
    if (!grid) return;
    if (favoritedListings.length === 0) {
        renderEmptyState('No favorites yet. Browse the marketplace and heart items to save them here.', 'browse');
        return;
    }
    grid.innerHTML = '';
    for (const listing of favoritedListings) {
        grid.appendChild(createFavCard(listing));
    }
}

function createFavCard(listing) {
    const productId = String(listing.id);
    const productIdLiteral = `'${productId}'`;
    const status = String(listing.status || 'active').toLowerCase();
    const isActive = status === 'active';
    const isReserved = Boolean(listing.reserved) && isActive;
    const imageUrl = listing.imageUrl || (Array.isArray(listing.images) && listing.images[0]) || '';

    let cardImage;
    if (imageUrl) {
        cardImage = `<img src="${imageUrl}" alt="${escHtml(listing.title)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">`;
    } else {
        cardImage = `<span style="font-size:64px;line-height:1;">${listing.image || '📦'}</span>`;
    }

    const overlayBg = status === 'sold' ? '#dc2626cc' : status === 'withdrawn' ? '#6b7280cc' : '#374151cc';
    const statusOverlay = !isActive
        ? `<div class="reserved-overlay" style="background:${overlayBg};">${status.toUpperCase()}</div>`
        : '';
    const reservedOverlay = isReserved
        ? '<div class="reserved-overlay" style="background:#d97706cc;">RESERVED</div>'
        : '';
    const overlay = statusOverlay || reservedOverlay;

    const unavailBadge = !isActive
        ? `<span class="product-badge" style="background:#fef2f2;color:#dc2626;border-color:#fecaca;">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`
        : '';
    const reservedBadge = isReserved
        ? `<span class="product-badge" style="background:#ffedd5;color:#c2410c;border-color:#fecaca;">Reserved</span>`
        : '';

    const card = document.createElement('div');
    card.className = 'product-card' + (!isActive ? ' fav-unavailable-card' : isReserved ? ' reserved-card' : '');
    card.innerHTML = `
        <div class="product-image" onclick="openFavModal(${productIdLiteral})" style="position:relative;cursor:pointer;display:flex;align-items:center;justify-content:center;">
            ${cardImage}
            <button class="favorite-btn" onclick="event.stopPropagation(); handleFavRemove(${productIdLiteral})"
                style="position:absolute;top:8px;right:8px;background:transparent;border:none;color:#ef4444;font-size:20px;cursor:pointer;z-index:10;" title="Remove from favorites">
                <i class="fas fa-heart"></i>
            </button>
            ${overlay}
        </div>
        <div class="product-info">
            <div class="product-meta-row">
                <span class="product-badge">${escHtml(listing.badge || 'Used')}</span>
                ${reservedBadge}
                ${unavailBadge}
            </div>
            <h3 class="product-title" onclick="openFavModal(${productIdLiteral})" style="cursor:pointer;">${escHtml(listing.title)}</h3>
            <div class="product-price">${escHtml(listing.price)}</div>
            <div class="product-details-row">
                <span class="product-seller">by ${escHtml(listing.seller || 'Campus Seller')}</span>
            </div>
            <div class="product-actions">
                <button onclick="openFavModal(${productIdLiteral})">View Details</button>
                <button class="btn-action btn-action-withdraw" onclick="event.stopPropagation(); handleFavRemove(${productIdLiteral})" title="Remove from favorites">
                    <i class="fas fa-heart-broken"></i>
                    Remove
                </button>
            </div>
        </div>`;
    return card;
}

function renderEmptyState(message, type) {
    const grid = document.getElementById('favoritesGrid');
    if (!grid) return;
    const icon = type === 'sign-in' ? 'fa-sign-in-alt' : 'fa-heart';
    const linkHtml = type === 'browse'
        ? `<a href="../" class="my-sales-start-selling-btn"><i class="fas fa-store"></i> Browse Marketplace</a>`
        : type === 'sign-in'
        ? `<a href="login" class="my-sales-start-selling-btn"><i class="fas fa-sign-in-alt"></i> Sign In</a>`
        : '';
    grid.innerHTML = `
        <div class="my-sales-empty-state">
            <i class="fas ${icon}"></i>
            <p>${message}</p>
            ${linkHtml}
        </div>`;
}

function renderErrorState(message) {
    const grid = document.getElementById('favoritesGrid');
    if (!grid) return;
    grid.innerHTML = `
        <div class="my-sales-empty-state">
            <i class="fas fa-exclamation-triangle" style="color:#f59e0b;"></i>
            <p>${message}</p>
        </div>`;
}

// ======================== Remove from Favorites ========================
function handleFavRemove(productId) {
    const user = getFavCurrentUser();
    if (!user) return;
    firebase.database().ref(`favorites/${user.uid}/${String(productId)}`).remove()
        .catch(err => console.error('Error removing favorite:', err));
    // Firebase listener auto re-renders grid
}

// ======================== Modal ========================
function ensureFavDescriptionItem() {
    const infoGrid = document.querySelector('#favModal .product-info-grid');
    if (!infoGrid) return null;

    let descriptionItem = document.getElementById('favDescriptionItem');
    if (!descriptionItem) {
        descriptionItem = document.createElement('div');
        descriptionItem.id = 'favDescriptionItem';
        descriptionItem.className = 'info-item info-item-description';
        descriptionItem.style.display = 'none';
        descriptionItem.style.gridColumn = '1 / -1';
        descriptionItem.style.minHeight = 'auto';
        descriptionItem.innerHTML = `
            <label><i class="fas fa-align-left"></i> Description</label>
            <p id="favModalDescription" style="margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; line-height: 1.6; word-break: break-word; white-space: normal;">No description available</p>
        `;
    }

    if (descriptionItem.parentElement !== infoGrid) {
        infoGrid.insertBefore(descriptionItem, infoGrid.firstChild);
    }

    const legacySection = document.getElementById('favDescriptionSection');
    if (legacySection) {
        legacySection.style.display = 'none';
    }

    return descriptionItem;
}

function openFavModal(productId) {
    const id = String(productId);
    const product = favoritedListings.find(l => String(l.id) === id);
    if (!product) return;

    console.log('[DEBUG] openFavModal product:', product);

    currentFavProduct = product;
    currentFavImages = Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : product.imageUrl ? [product.imageUrl] : [];
    currentFavImageIndex = 0;

    const status = String(product.status || 'active').toLowerCase();
    const isActive = status !== 'sold' && status !== 'withdrawn';
    const conditionValue = getConditionPercentage ? getConditionPercentage(product) : null;
    const quantityValue = Number.isFinite(Number(product.quantity)) ? Number(product.quantity) : null;

    document.getElementById('favModalTitle').textContent = product.title || 'Product';
    document.getElementById('favModalPrice').textContent = product.price || '¥0.00';
    document.getElementById('favModalBadge').textContent = product.badge || 'Used';

    const descriptionItem = ensureFavDescriptionItem();
    const descriptionText = document.getElementById('favModalDescription');
    if (product.description && descriptionItem && descriptionText) {
        descriptionText.textContent = product.description;
        descriptionItem.style.display = 'flex';
    } else {
        if (descriptionText) {
            descriptionText.textContent = 'No description available';
        }
        if (descriptionItem) {
            descriptionItem.style.display = 'none';
        }
    }
    
    // ===== DETAILS PILLS ROW =====
    const detailsRow = document.getElementById('favModalDetailsRow');
    let hasDetails = false;

    // Category pill
    const categoryPill = document.getElementById('favModalCategoryPill');
    if (product.category) {
        document.getElementById('favModalCategory').textContent = product.category;
        categoryPill.style.display = 'inline-flex';
        hasDetails = true;
    } else {
        categoryPill.style.display = 'none';
    }

    // College pill
    const collegePill = document.getElementById('favModalCollegePill');
    if (product.college) {
        document.getElementById('favModalCollege').textContent = product.college;
        collegePill.style.display = 'inline-flex';
        hasDetails = true;
    } else {
        collegePill.style.display = 'none';
    }

    // Seller pill
    const sellerPill = document.getElementById('favModalSellerPill');
    if (product.seller) {
        document.getElementById('favModalSeller').textContent = product.seller;
        sellerPill.style.display = 'inline-flex';
        hasDetails = true;
    } else {
        sellerPill.style.display = 'none';
    }

    // Show/hide the entire details row
    detailsRow.style.display = hasDetails ? 'flex' : 'none';
    
    const availabilityItem = document.getElementById('favAvailabilityItem');
    const statusSpan = document.getElementById('favModalStatus');
    const statusText = product.reserved ? 'Reserved' : (isActive ? 'Available' : 'Unavailable');
    const statusClass = product.reserved ? 'status-reserved' : (isActive ? 'status-available' : 'status-reserved');
    statusSpan.textContent = statusText;
    statusSpan.className = statusClass;
    availabilityItem.style.display = 'flex';

    const conditionItem = document.getElementById('favConditionItem');
    const conditionPercent = document.getElementById('favModalCondition');
    const conditionBar = document.getElementById('favModalConditionBar');
    if (conditionValue !== null && conditionValue !== undefined) {
        conditionPercent.textContent = `${conditionValue}%`;
        conditionBar.style.width = `${conditionValue}%`;
        if (conditionValue >= 70) {
            conditionBar.style.backgroundColor = '#10b981';
        } else if (conditionValue >= 40) {
            conditionBar.style.backgroundColor = '#f59e0b';
        } else {
            conditionBar.style.backgroundColor = '#ef4444';
        }
        conditionItem.style.display = 'flex';
    } else {
        conditionPercent.textContent = 'N/A';
        conditionBar.style.width = '0%';
        conditionBar.style.backgroundColor = '#d1d5db';
        conditionItem.style.display = 'none';
    }

    const quantityItem = document.getElementById('favQuantityItem');
    const quantityBadge = document.getElementById('favModalQuantity');
    if (quantityValue !== null) {
        quantityBadge.textContent = `${quantityValue} available`;
        quantityItem.style.display = 'flex';
    } else {
        quantityBadge.textContent = 'N/A';
        quantityItem.style.display = 'none';
    }

    renderFavModalImage();

    const availText = document.getElementById('favAvailabilityText');
    const availNotice = document.getElementById('favAvailabilityNotice');
    if (!isActive) {
        availNotice.style.display = 'flex';
        if (status === 'sold') {
            availText.textContent = 'This item has been sold.';
        } else if (status === 'withdrawn') {
            availText.textContent = 'This item has been withdrawn by the seller.';
        } else {
            availText.textContent = 'This item is no longer available.';
        }
    } else {
        availNotice.style.display = 'none';
    }

    // Enable contact seller button for active items
    const favModalOrderBtn = document.getElementById('favModalOrderBtn');
    console.log('Setting button state, isActive:', isActive, 'button:', favModalOrderBtn);
    if (favModalOrderBtn) {
        if (isActive) {
            favModalOrderBtn.disabled = false;
            favModalOrderBtn.style.opacity = '1';
            favModalOrderBtn.style.cursor = 'pointer';
            favModalOrderBtn.title = '';
            console.log('Button enabled');
            
            // Re-attach event listener to ensure it's working
            favModalOrderBtn.onclick = async () => {
                console.log('Contact Seller button clicked via onclick!');
                if (currentFavProduct) {
                    // Prepare order data
                    const orderData = {
                        itemName: currentFavProduct.title,
                        price: currentFavProduct.price,
                        seller: currentFavProduct.seller,
                        sellerPaymentQR: currentFavProduct.sellerPaymentQR,
                        productId: currentFavProduct.id
                    };

                    // Close product modal and open payment modal
                    closeFavModal();
                    openFavPaymentModal(orderData);
                }
            };
        } else {
            favModalOrderBtn.disabled = true;
            favModalOrderBtn.style.opacity = '0.5';
            favModalOrderBtn.style.cursor = 'not-allowed';
            favModalOrderBtn.title = 'This item is no longer available';
            console.log('Button disabled');
            favModalOrderBtn.onclick = null;
        }
    }

    document.getElementById('favModal').classList.add('active');
}

function renderFavModalImage() {
    const container = document.getElementById('favCarouselImage');
    if (!container || !currentFavProduct) return;
    if (currentFavImages.length > 0) {
        const src = currentFavImages[currentFavImageIndex];
        container.innerHTML = `<img src="${src}" alt="${escHtml(currentFavProduct.title)}" style="max-width:100%;max-height:100%;object-fit:contain;">`;
        container.style.fontSize = '';
    } else {
        container.innerHTML = '';
        container.textContent = currentFavProduct.image || '📦';
        container.style.fontSize = '72px';
    }
}

function closeFavModal() {
    document.getElementById('favModal').classList.remove('active');
    currentFavProduct = null;
}

// ======================== Payment Modal Functions ========================
function openFavPaymentModal(orderData) {
    // Set order details
    document.getElementById('favPaymentItemName').textContent = orderData.itemName || 'Product';

    // Load QR code
    const qrContainer = document.getElementById('favPaymentQRCode');
    qrContainer.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:32px;color:#d1d5db;"></i>';

    let qrSrc = orderData.sellerPaymentQR || '';

    // Fetch seller profile from cloud using their UID if needed
    if (!qrSrc && currentFavProduct && currentFavProduct.sellerUid &&
        window.unimartProfileSync &&
        typeof window.unimartProfileSync.getProfileFromCloud === 'function') {
        (async () => {
            try {
                const sellerProfile = await window.unimartProfileSync.getProfileFromCloud(currentFavProduct.sellerUid);
                if (sellerProfile && sellerProfile.paymentQR) {
                    qrSrc = sellerProfile.paymentQR;
                }
            } catch (_) {}
            renderFavPaymentQR(qrSrc);
        })();
    } else {
        renderFavPaymentQR(qrSrc);
    }

    // Setup modal event listeners
    setupFavPaymentModal();

    // Show modal
    document.getElementById('favPaymentModal').classList.add('active');
}

function renderFavPaymentQR(qrSrc) {
    const qrContainer = document.getElementById('favPaymentQRCode');
    if (qrSrc) {
        qrContainer.innerHTML = `<img src="${qrSrc}" alt="Seller Payment QR" style="max-width:100%;max-height:220px;object-fit:contain;border-radius:8px;">`;
    } else {
        qrContainer.innerHTML = `
            <i class="fas fa-qrcode" style="font-size:64px;color:#d1d5db;"></i>
            <p style="color:#9ca3af;font-size:12px;margin-top:8px;text-align:center;">Seller has not uploaded a QR code</p>`;
    }
}

function setupFavPaymentModal() {
    const modal = document.getElementById('favPaymentModal');
    const overlay = document.getElementById('favPaymentModalOverlay');
    const closeBtn = document.getElementById('favPaymentModalClose');
    const cancelBtn = document.getElementById('favBtnCancelOrder');
    const contactBtn = document.getElementById('favBtnPaymentMade');

    const closeModal = () => {
        modal.classList.remove('active');
    };

    overlay.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    contactBtn.addEventListener('click', () => {
        alert('Contact initiated! You can now communicate with the seller using the QR code.');
        closeModal();
    });
}

function setupFavModal() {
    document.getElementById('favModalCloseBtn').addEventListener('click', closeFavModal);
    document.getElementById('favModalOverlay').addEventListener('click', closeFavModal);

    document.getElementById('favPrevBtn').addEventListener('click', () => {
        if (currentFavImages.length > 1) {
            currentFavImageIndex = (currentFavImageIndex - 1 + currentFavImages.length) % currentFavImages.length;
            renderFavModalImage();
        }
    });

    document.getElementById('favNextBtn').addEventListener('click', () => {
        if (currentFavImages.length > 1) {
            currentFavImageIndex = (currentFavImageIndex + 1) % currentFavImages.length;
            renderFavModalImage();
        }
    });

    // Contact Seller button - event listener attached when modal opens
    // Event listener is attached in openFavModal when button is enabled

    document.getElementById('favRemoveBtn').addEventListener('click', () => {
        if (currentFavProduct) {
            handleFavRemove(currentFavProduct.id);
            closeFavModal();
        }
    });
}

// ======================== Refresh & Clear Buttons ========================
function setupRefreshButton() {
    const btn = document.getElementById('refreshFavoritesBtn');
    if (btn) btn.addEventListener('click', refreshFavorites);
}

function setupClearButton() {
    const btn = document.getElementById('clearFavoritesBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const user = getFavCurrentUser();
        if (!user) return;
        if (!confirm('Remove all favorites? This cannot be undone.')) return;
        firebase.database().ref(`favorites/${user.uid}`).remove()
            .catch(err => console.error('Error clearing favorites:', err));
    });
}

window.openFavModal = openFavModal;
window.handleFavRemove = handleFavRemove;