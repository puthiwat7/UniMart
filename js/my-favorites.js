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
            status: (listing.status || 'active').toLowerCase(),
            reserved: Boolean(listing.reserved)
        };
    }
    
    return { ...product, status: 'active' };
}

// Firebase-based favorites management
let favoritesRef = null;

// Load favorites from Firebase database
function loadFavorites(userId) {
    console.log("Loading favorites for user:", userId);

    if (!userId) {
        console.log("No userId provided to loadFavorites");
        showEmptyState("Please log in to view favorites");
        return;
    }

    // Remove any existing listener
    if (favoritesRef) {
        favoritesRef.off();
        favoritesRef = null;
    }

    if (!firebase.database || typeof firebase.database !== 'function') {
        console.error("Realtime Database SDK is not available on this page.");
        showDataError("Failed to load favorites. Database SDK missing.");
        return;
    }

    try {
        const path = `favorites/${userId}`;
        console.log("Reading favorites from path:", path);

        favoritesRef = firebase.database().ref(path);

        favoritesRef.on('value', async (snapshot) => {
            try {
                const data = snapshot.val();
                console.log("Favorites data:", data);

                if (!data) {
                    console.log("No favorites data found");
                    renderEmptyFavorites();
                    return;
                }

                // Convert favorites object to array
                const favoriteIds = Object.keys(data);
                console.log("Favorite item IDs:", favoriteIds);

                if (favoriteIds.length === 0) {
                    renderEmptyFavorites();
                    return;
                }

                // Fetch full listing data for each favorite
                await fetchAndRenderFavorites(favoriteIds);
            } catch (snapshotError) {
                console.error("FAVORITES SNAPSHOT ERROR:", {
                    message: snapshotError.message,
                    code: snapshotError.code,
                    type: snapshotError.constructor.name,
                    stack: snapshotError.stack
                });
                showDataError("Failed to process favorites data. Please try again.");
            }
        }, (error) => {
            console.error("FAVORITES DATABASE ERROR:", {
                message: error.message,
                code: error.code,
                type: error.constructor.name,
                stack: error.stack,
                path: path
            });

            // Provide specific error messages based on error code
            if (error.code === 'PERMISSION_DENIED') {
                console.error("Database Rules Issue: User does not have permission to read favorites");
                showDataError("Permission denied. Database rules may need adjustment.");
            } else if (error.message && error.message.includes('not a function')) {
                console.error("SDK Issue: firebase.database is not properly initialized");
                showDataError("Database SDK initialization error. Please refresh the page.");
            } else {
                showDataError("Failed to load favorites. Please try again.");
            }
        });
    } catch (error) {
        console.error("FAVORITES INITIALIZATION ERROR:", {
            message: error.message,
            code: error.code,
            type: error.constructor.name,
            stack: error.stack
        });
        showDataError("Failed to initialize favorites. Please try again.");
    }
// Fetch full listing data and render favorites
async function fetchAndRenderFavorites(favoriteIds) {
    console.log("Fetching listings for favorite IDs:", favoriteIds);

    try {
        const listings = await getListingsByIds(favoriteIds);
        console.log("Fetched listings:", listings.length, "items");

        const listingMap = new Map(listings.map((item) => [String(item.id), item]));

        const grid = document.getElementById('favoritesGrid');
        if (!grid) return;

        grid.innerHTML = '';

        if (listings.length === 0) {
            renderEmptyFavorites();
            return;
        }

        // Render each favorite
        for (const listing of listings) {
            if (listing && String(listing.status || 'active').toLowerCase() === 'active') {
                const card = renderProductCard(listing, {
                    showFavoriteIcon: true,
                    showRemoveButton: true,
                    isFavorited: true,
                    onViewDetails: 'handleViewDetails',
                    onFavoriteToggle: 'removeFromFavorites',
                    onRemove: 'removeFromFavorites'
                });
                grid.appendChild(card);
            }
        }

        console.log("Rendered", listings.length, "favorite items");

    } catch (error) {
        console.error("Error fetching favorite listings:", error);
        showDataError("Failed to load favorite items. Please try again.");
    }
}

// Add item to favorites in Firebase
function addToFavorites(productId, product) {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.log("Cannot add to favorites: no authenticated user");
        return false;
    }

    const normalizedId = String(productId);
    const favoritesRef = firebase.database().ref(`favorites/${user.uid}/${normalizedId}`);

    // Store minimal data needed for favorites
    const favoriteData = {
        id: normalizedId,
        addedAt: firebase.database.ServerValue.TIMESTAMP
    };

    console.log("Adding to favorites:", user.uid, normalizedId);

    favoritesRef.set(favoriteData)
        .then(() => {
            console.log("Successfully added to favorites");
        })
        .catch((error) => {
            console.error("Error adding to favorites:", error);
        });

    return true;
}

// Remove item from favorites in Firebase
function removeFromFavorites(productId) {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.log("Cannot remove from favorites: no authenticated user");
        return false;
    }

    const normalizedId = String(productId);
    const favoritesRef = firebase.database().ref(`favorites/${user.uid}/${normalizedId}`);

    console.log("Removing from favorites:", user.uid, normalizedId);

    favoritesRef.remove()
        .then(() => {
            console.log("Successfully removed from favorites");
        })
        .catch((error) => {
            console.error("Error removing from favorites:", error);
        });

    return true;
}

// Check if item is favorited (for UI updates)
function isFavorited(productId) {
    // This is a simplified version - in a real app you'd cache this
    // For now, we'll rely on the UI state being updated when favorites load
    return false;
}

// Render empty favorites state
function renderEmptyFavorites() {
    const grid = document.getElementById('favoritesGrid');
    if (!grid) return;

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
}

// Show empty state with message
function showEmptyState(message) {
    const grid = document.getElementById('favoritesGrid');
    if (!grid) return;

    grid.innerHTML = `
        <div class="my-sales-empty-state">
            <i class="fas fa-sign-in-alt"></i>
            <p>${message}</p>
            <a href="login.html" class="my-sales-start-selling-btn">
                Sign In
            </a>
        </div>
    `;
}

function showDataError(message) {
    const grid = document.getElementById('favoritesGrid');
    if (!grid) return;

    grid.innerHTML = `
        <div class="my-sales-empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${message}</p>
            <p class="favorites-empty-hint">There was an issue loading your saved items.</p>
        </div>
    `;
}

// Render favorites
// Initialize page with auth state listener
document.addEventListener('DOMContentLoaded', async () => {
    console.log("My Favorites page loaded, initializing...");

    function initializeWithAuth() {
        if (typeof firebase !== 'undefined' && typeof firebase.auth === 'function') {
            console.log("Firebase available, setting up auth listener...");

            if (typeof firebaseConfig === 'undefined') {
                console.error("Missing firebaseConfig on My Favorites page");
                showEmptyState("Firebase configuration missing. Please refresh the page.");
                return;
            }

            if (!firebase.apps.length) {
                try {
                    firebase.initializeApp(firebaseConfig);
                    console.log("Firebase app initialized from my-favorites.js");
                } catch (error) {
                    console.error("Failed to initialize Firebase app:", error);
                }
            }

            firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                .then(() => console.log("Auth persistence set to LOCAL"))
                .catch((error) => console.error('Error setting persistence:', error));

            firebase.auth().onAuthStateChanged(async (user) => {
                console.log("Auth state changed:", user);
                console.log("currentUser:", firebase.auth().currentUser);

                if (user) {
                    updateSidebarAuthState(user);
                    loadFavorites(user.uid);
                } else {
                    console.log("No authenticated user detected");
                    showEmptyState("Please log in to view your favorites");
                    updateSidebarAuthState(null);
                }
            });
        } else {
            console.log("Firebase not available yet, retrying...");
            setTimeout(initializeWithAuth, 100);
        }
    }

    initializeWithAuth();

    const refreshFavoritesBtn = document.getElementById('refreshFavoritesBtn');
    if (refreshFavoritesBtn) {
        refreshFavoritesBtn.addEventListener('click', () => {
            const user = firebase.auth().currentUser;
            if (user) {
                console.log("Manual refresh triggered");
                loadFavorites(user.uid);
            }
        });
    }

    setupClearFavoritesButton();
    setupProductModal();
    setupPaymentModal();
});

// Refresh favorites when the page becomes active
function refreshFavoritesForCurrentUser() {
    const user = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
    if (user) {
        loadFavorites(user.uid);
    }
}

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        refreshFavoritesForCurrentUser();
    }
});

window.addEventListener('focus', () => {
    refreshFavoritesForCurrentUser();
});

// ======================== Product Modal ========================
let currentProduct = null;

// Handle view details
async function handleViewDetails(productId) {
    const normalizedId = String(productId);
    console.log("Viewing details for product:", normalizedId);

    // Get the product data from listings
    const listings = await getListingsByIds([normalizedId]);
    const product = listings.find((l) => String(l.id) === normalizedId);

    if (product) {
        openProductModal(product);
    } else {
        console.error("Product not found:", normalizedId);
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
            const user = firebase.auth().currentUser;
            if (!user) {
                alert('Please log in first');
                return;
            }

            if (confirm('Are you sure you want to clear all favorites? This will remove all your saved items.')) {
                console.log("Clearing all favorites for user:", user.uid);
                const favoritesRef = firebase.database().ref(`favorites/${user.uid}`);
                favoritesRef.remove()
                    .then(() => {
                        console.log("All favorites cleared");
                        renderEmptyFavorites();
                    })
                    .catch((error) => {
                        console.error("Error clearing favorites:", error);
                        alert('Error clearing favorites. Please try again.');
                    });
            }
        });
    }
}

// ======================== Authentication Management ========================
// Check if user is logged in and update sidebar
function checkAuthStatus() {
    const user = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
    updateSidebarAuthState(user);
}

// Update sidebar based on auth state
function updateSidebarAuthState(user) {
    if (user) {
        showUserProfile({
            name: user.displayName || user.email || 'User',
            email: user.email || ''
        });
    } else {
        showLoginButton();
    }
}

// Display user profile
function showUserProfile(user) {
    const userProfile = document.getElementById('userProfile');
    const loginBtn = document.getElementById('loginBtn');
    if (!userProfile || !loginBtn) return;

    userProfile.style.display = 'flex';
    loginBtn.style.display = 'none';
    
    document.getElementById('userName').textContent = user.name || 'User';
    document.getElementById('userEmail').textContent = user.email || '';
}

// Display login button
function showLoginButton() {
    const userProfile = document.getElementById('userProfile');
    const loginBtn = document.getElementById('loginBtn');
    if (!userProfile || !loginBtn) return;

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
