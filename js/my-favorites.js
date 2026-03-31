function getCachedUser() {
    try {
        const raw = localStorage.getItem('unimart_last_user');
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        return null;
    }
}

function getCurrentUserUid() {
    const firebaseUser = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
    if (firebaseUser && firebaseUser.uid) return firebaseUser.uid;
    const cachedUser = getCachedUser();
    return cachedUser && cachedUser.uid ? cachedUser.uid : null;
}

let policyProfile = null;
let policyProfileLoaded = false;

function isPolicyAgreed(profile) {
    if (!profile || typeof profile !== 'object') return false;
    return profile.hasAgreedPolicy === true || profile.agreedToPolicies === true;
}

async function loadPolicyProfileFromCloud(forceRefresh = false) {
    const uid = getCurrentUserUid();
    if (!uid) {
        policyProfileLoaded = false;
        policyProfile = null;
        return null;
    }

    if (!forceRefresh && policyProfileLoaded) {
        return policyProfile;
    }

    if (!window.unimartProfileSync || typeof window.unimartProfileSync.getProfileFromCloud !== 'function') {
        policyProfileLoaded = false;
        policyProfile = null;
        return null;
    }

    try {
        policyProfile = await window.unimartProfileSync.getProfileFromCloud(uid);
        policyProfileLoaded = true;
        console.log('User data:', policyProfile);
        return policyProfile;
    } catch (error) {
        console.warn('Failed to load policy profile:', error);
        policyProfileLoaded = false;
        policyProfile = null;
        return null;
    }
}

async function enforceBuyPolicyOrRedirect() {
    const uid = getCurrentUserUid();
    if (!uid) {
        return null;
    }

    if (!policyProfileLoaded) {
        await loadPolicyProfileFromCloud(true);
    }

    const profile = await loadPolicyProfileFromCloud(true);
    if (profile && isPolicyAgreed(profile)) {
        return true;
    }

    alert('You must agree to marketplace policies before buying. You will be redirected to your profile.');
    window.location.href = 'profile';
    return false;
}

async function getListingsByIds(ids) {
    if (!window.unimartListingsSync) return [];

    if (typeof window.unimartListingsSync.getListingsByIdsFromCloud === 'function') {
        return window.unimartListingsSync.getListingsByIdsFromCloud(ids, {
            cacheTtlMs: 60000,
            timeoutMs: 10000
        });
    }

    if (typeof window.unimartListingsSync.getAllListingsFromCloud !== 'function') {
        return [];
    }

    const all = await window.unimartListingsSync.getAllListingsFromCloud({ limit: 300 });
    const idSet = new Set((Array.isArray(ids) ? ids : []).map((id) => String(id)));
    return all.filter((item) => idSet.has(String(item.id)));
}

// Get product status from listings
async function getProductStatus(productId) {
    const listings = await getListingsByIds([productId]);
    const listing = listings.find((l) => String(l.id) === String(productId));
    return listing ? (listing.status || 'active').toLowerCase() : 'active';
}

// Get updated product data (to reflect edits)
async function getUpdatedProduct(product) {
    const listings = await getListingsByIds([product.id]);
    const listing = listings.find((l) => String(l.id) === String(product.id));
    
    if (listing) {
        // Merge listing data with favorite data
        return {
            ...product,
            title: listing.title || product.title,
            price: listing.price || product.price,
            category: listing.category || product.category,
            badge: listing.badge || product.badge,
            image: listing.image || product.image,
            seller: listing.seller || product.seller,
            status: (listing.status || 'active').toLowerCase()
        };
    }
    
    return { ...product, status: 'active' };
}

// Get favorites from localStorage
function getFavorites() {
    const favorites = localStorage.getItem('favorites');
    return favorites ? JSON.parse(favorites) : [];
}

// Save favorites to localStorage
function saveFavorites(favorites) {
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

// Add item to favorites
function addToFavorites(productId, product) {
    const favorites = getFavorites();
    const exists = favorites.some(fav => fav.id === productId);
    
    if (!exists) {
        favorites.push(product);
        saveFavorites(favorites);
    }
}

// Remove item from favorites
function removeFromFavorites(productId) {
    let favorites = getFavorites();
    favorites = favorites.filter(fav => fav.id !== productId);
    saveFavorites(favorites);
    renderFavorites();
}

// Check if item is in favorites
function isFavorited(productId) {
    const favorites = getFavorites();
    return favorites.some(fav => fav.id === productId);
}

// Render favorites
async function renderFavorites() {
    const grid = document.getElementById('favoritesGrid');
    let favorites = getFavorites();

    const listingIds = favorites.map((item) => item.id);
    const cloudListings = await getListingsByIds(listingIds);
    const listingMap = new Map(cloudListings.map((item) => [String(item.id), item]));

    // Filter out non-active items (sold/withdrawn) and update the stored favorites list
    const activeFavorites = [];
    for (const product of favorites) {
        const cloudListing = listingMap.get(String(product.id));
        const updatedProduct = cloudListing
            ? {
                ...product,
                title: cloudListing.title || product.title,
                price: cloudListing.price || product.price,
                category: cloudListing.category || product.category,
                badge: cloudListing.badge || product.badge,
                image: cloudListing.image || product.image,
                seller: cloudListing.seller || product.seller,
                status: (cloudListing.status || 'active').toLowerCase()
            }
            : { ...product, status: 'active' };
        if (String(updatedProduct.status || 'active').toLowerCase() === 'active') {
            activeFavorites.push(product);
        }
    }

    // If some items were removed (because they are no longer active), save the updated list
    if (activeFavorites.length !== favorites.length) {
        saveFavorites(activeFavorites);
        favorites = activeFavorites;
    }

    grid.innerHTML = '';

    if (favorites.length === 0) {
        grid.innerHTML = `
            <div class="my-sales-empty-state">
                <i class="fas fa-heart"></i>
                <p>No favorites yet</p>
                <p class="favorites-empty-hint">Start adding items to your favorites!</p>
                <a href="../" class="my-sales-start-selling-btn">
                    Browse Marketplace
                </a>
            </div>
        `;
        return;
    }

    for (const product of favorites) {
        const cloudListing = listingMap.get(String(product.id));
        const updatedProduct = cloudListing
            ? {
                ...product,
                title: cloudListing.title || product.title,
                price: cloudListing.price || product.price,
                category: cloudListing.category || product.category,
                badge: cloudListing.badge || product.badge,
                image: cloudListing.image || product.image,
                seller: cloudListing.seller || product.seller,
                status: (cloudListing.status || 'active').toLowerCase()
            }
            : { ...product, status: 'active' };
        const card = createFavoriteCard(updatedProduct);
        grid.appendChild(card);
    }
}

// Create favorite card
function createFavoriteCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const status = product.status || 'active';
    const isAvailable = status === 'active';
    const statusClass = isAvailable ? 'status-available' : 'status-unavailable';
    const statusText = isAvailable ? 'Available' : 'Unavailable';
    
    // Show uploaded image if available, otherwise show emoji icon
    let cardImage;
    if (product.imageUrl || (product.images && product.images.length > 0)) {
        const imgSrc = product.imageUrl || product.images[0];
        cardImage = `<img src="${imgSrc}" alt="${product.title}" class="sale-card-image">`;
    } else if (product.image) {
        cardImage = product.image;
    } else {
        cardImage = '📦';
    }
    
    card.innerHTML = `
        <div class="product-image favorite-image-wrapper" onclick="handleViewDetails(${product.id})">
            ${cardImage}
            ${!isAvailable ? '<div class="favorite-unavailable-overlay">UNAVAILABLE</div>' : ''}
        </div>
        <div class="product-info">
            <div class="favorite-card-top-row">
                <span class="product-badge">${product.badge}</span>
                <span class="favorite-status-pill ${statusClass}">
                    ${statusText}
                </span>
            </div>
            <h3 class="product-title">${product.title}</h3>
            <div class="product-price">${product.price}</div>
            <div class="product-seller">by ${product.seller}</div>
            <div class="product-actions">
                <button onclick="handleViewDetails(${product.id})">View Details</button>
                <button class="favorite-remove-btn" onclick="removeFromFavorites(${product.id})">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        </div>
    `;
    return card;
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    await loadPolicyProfileFromCloud(false);
    await renderFavorites();

    const refreshFavoritesBtn = document.getElementById('refreshFavoritesBtn');
    if (refreshFavoritesBtn) {
        refreshFavoritesBtn.addEventListener('click', renderFavorites);
    }

    checkAuthStatus();
    setupClearFavoritesButton();
    setupProductModal();
    setupPaymentModal();
});

// Refresh favorites when page becomes visible
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        renderFavorites();
    }
});

window.addEventListener('focus', () => {
    renderFavorites();
});

// ======================== Product Modal ========================
let currentProduct = null;

// Handle view details
async function handleViewDetails(productId) {
    const favorites = getFavorites();
    const product = favorites.find((p) => p.id === productId);
    if (product) {
        const updatedProduct = await getUpdatedProduct(product);
        openProductModal(updatedProduct);
    }
}

function openProductModal(product) {
    currentProduct = product;
    const status = product.status || 'active';
    const isAvailable = status === 'active';

    // Update modal content
    document.getElementById('modalProductTitle').textContent = product.title;
    document.getElementById('modalProductPrice').textContent = product.price;
    document.getElementById('modalSeller').textContent = product.seller;
    document.getElementById('modalBadge').textContent = product.badge;
    
    // Display image - uploaded or emoji
    const carouselImage = document.getElementById('carouselImage');
    if (product.imageUrl || (product.images && product.images.length > 0)) {
        const imgSrc = product.imageUrl || product.images[0];
        carouselImage.innerHTML = `<img src="${imgSrc}" alt="${product.title}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
    } else {
        carouselImage.textContent = product.image || '📦';
        carouselImage.style.fontSize = '120px';
    }
    
    document.getElementById('modalDescription').textContent = product.description || `A ${product.badge.toLowerCase()} ${(product.category || '').toLowerCase()} item.`;

    // Update availability section
    const availabilitySection = document.getElementById('availabilitySection');
    const availabilityNotice = document.getElementById('availabilityNotice');
    const availabilityText = document.getElementById('availabilityText');
    
    if (!isAvailable) {
        availabilitySection.style.display = 'block';
        availabilityNotice.style.padding = '12px';
        availabilityNotice.style.background = '#fef2f2';
        availabilityNotice.style.border = '1px solid #fecaca';
        availabilityNotice.style.borderRadius = '8px';
        availabilityNotice.style.display = 'flex';
        availabilityNotice.style.alignItems = 'center';
        availabilityNotice.style.gap = '8px';
        availabilityNotice.style.color = '#dc2626';
        
        if (status === 'sold') {
            availabilityText.textContent = 'This item has been sold';
        } else if (status === 'withdrawed' || status === 'withdrawn') {
            availabilityText.textContent = 'This item has been withdrawn by the seller';
        } else {
            availabilityText.textContent = 'This item is no longer available';
        }
    } else {
        availabilitySection.style.display = 'none';
    }

    // Update save button state
    const saveBtn = document.getElementById('modalSaveBtn');
    saveBtn.classList.add('favorited');
    saveBtn.innerHTML = '<i class="fas fa-heart"></i>Saved';

    // Show modal
    document.getElementById('productModal').classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
    currentProduct = null;
}

function setupProductModal() {
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeProductModal);

    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) modalOverlay.addEventListener('click', closeProductModal);

    // Carousel navigation
    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentProduct) {
                document.getElementById('carouselImage').textContent = currentProduct.image;
            }
        });
    }

    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentProduct) {
                document.getElementById('carouselImage').textContent = currentProduct.image;
            }
        });
    }

    // Save/Favorite button
    const modalSaveBtn = document.getElementById('modalSaveBtn');
    if (modalSaveBtn) {
        modalSaveBtn.addEventListener('click', () => {
            if (currentProduct) {
                // Already in favorites, so remove it
                removeFromFavorites(currentProduct.id);
                closeProductModal();
            }
        });
    }

    // Order button
    const modalOrderBtn = document.getElementById('modalOrderBtn');
    if (modalOrderBtn) {
        modalOrderBtn.addEventListener('click', async () => {
            if (currentProduct) {
                if (!(await enforceBuyPolicyOrRedirect())) {
                    return;
                }

                const status = currentProduct.status || 'active';
                const isAvailable = status === 'active';
                
                if (!isAvailable) {
                    // If not available, just close the modal
                    closeProductModal();
                } else {
                    // If available, open payment modal
                    const orderData = {
                        itemName: currentProduct.title,
                        price: currentProduct.price,
                        seller: currentProduct.seller,
                        sellerPaymentQR: currentProduct.sellerPaymentQR,
                        productId: currentProduct.id
                    };
                    closeProductModal();
                    openPaymentModal(orderData);
                }
            }
        });
    }
}

// ======================== Payment Modal ========================
let currentOrderData = null;

function openPaymentModal(orderData) {
    currentOrderData = orderData;
    const paymentModal = document.getElementById('paymentModal');
    
    document.getElementById('paymentItemName').textContent = orderData.itemName;
    
    const qrCodeContainer = document.getElementById('paymentQRCode');
    if (orderData.sellerPaymentQR) {
        qrCodeContainer.innerHTML = `<img src="${orderData.sellerPaymentQR}" alt="Seller QR Code" style="width: 100%; height: 100%; object-fit: contain;">`;
    } else {
        qrCodeContainer.innerHTML = '<i class="fas fa-qrcode" style="font-size: 120px; color: #ddd;"></i>';
    }
    
    paymentModal.classList.add('active');
}

function closePaymentModal() {
    const paymentModal = document.getElementById('paymentModal');
    paymentModal.classList.remove('active');
    currentOrderData = null;
}

function setupPaymentModal() {
    const paymentModalClose = document.getElementById('paymentModalClose');
    const paymentModalOverlay = document.getElementById('paymentModalOverlay');
    const btnCancelOrder = document.getElementById('btnCancelOrder');
    const btnPaymentMade = document.getElementById('btnPaymentMade');
    
    if (paymentModalClose) {
        paymentModalClose.addEventListener('click', closePaymentModal);
    }
    
    if (paymentModalOverlay) {
        paymentModalOverlay.addEventListener('click', closePaymentModal);
    }
    
    if (btnCancelOrder) {
        btnCancelOrder.addEventListener('click', closePaymentModal);
    }
    
    if (btnPaymentMade) {
        btnPaymentMade.addEventListener('click', closePaymentModal);
    }
}

// Setup clear favorites button
function setupClearFavoritesButton() {
    const clearBtn = document.getElementById('clearFavoritesBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all favorites?')) {
                localStorage.removeItem('favorites');
                renderFavorites();
            }
        });
    }
}

// ======================== Authentication Management ========================
// Check if user is logged in (from localStorage)
function checkAuthStatus() {
    const userProfile = localStorage.getItem('userProfile');
    if (userProfile) {
        showUserProfile(JSON.parse(userProfile));
    } else {
        showLoginButton();
    }
}

// Display user profile
function showUserProfile(user) {
    const userProfile = document.getElementById('userProfile');
    const loginBtn = document.getElementById('loginBtn');
    
    userProfile.style.display = 'flex';
    loginBtn.style.display = 'none';
    
    document.getElementById('userName').textContent = user.name || 'User';
    document.getElementById('userEmail').textContent = user.email || '';
}

// Display login button
function showLoginButton() {
    const userProfile = document.getElementById('userProfile');
    const loginBtn = document.getElementById('loginBtn');
    
    userProfile.style.display = 'none';
    loginBtn.style.display = 'flex';
}

// Handle login button click
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            alert('Login button clicked! (Placeholder for future Google Sign-In integration)');
        });
    }
});

// Handle logout (optional - can be triggered from profile menu)
function logout() {
    localStorage.removeItem('userProfile');
    showLoginButton();
    alert('Signed out successfully!');
}
