const DEFAULT_PRODUCTS = [];

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
    const keysToCheck = ['unimartListings', 'listings', USER_LISTINGS_KEY, LEGACY_LISTINGS_KEY];
    
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
})();

let products = [];

let currentCategory = 'All Items';
let filteredProducts = [];

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

function getCurrentExtendedProfile() {
    const uid = getCurrentUserUid();
    if (!uid) return null;
    try {
        const raw = localStorage.getItem(`unimart_profile_${uid}`);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        return null;
    }
}

function enforceBuyPolicyOrRedirect() {
    const profile = getCurrentExtendedProfile();
    if (profile && profile.agreedToPolicies === true) {
        return true;
    }

    alert('You must agree to marketplace policies before buying. You will be redirected to your profile.');
    window.location.href = 'pages/profile.html';
    return false;
}

function parseListingsFromKey(key) {
    const savedListings = localStorage.getItem(key);
    if (!savedListings) return [];

    try {
        const parsedListings = JSON.parse(savedListings);
        if (Array.isArray(parsedListings)) return parsedListings;
        if (parsedListings && Array.isArray(parsedListings.listings)) return parsedListings.listings;
        return [];
    } catch (error) {
        console.warn(`Failed to parse listings from key: ${key}`, error);
        return [];
    }
}

function normalizeListing(listing, fallbackIndex = 0) {
    if (!listing || typeof listing !== 'object') {
        return null;
    }

    const normalizedCategory = listing.category ? String(listing.category) : 'Other';
    const normalizedPrice = listing.price ? String(listing.price) : '¥0.00';

    const imageList = Array.isArray(listing.images) ? listing.images.filter(Boolean) : [];
    const primaryImageUrl = listing.imageUrl || imageList[0] || '';

    return {
        id: listing.id || Date.now() + fallbackIndex,
        title: String(listing.title || 'Untitled Item'),
        price: normalizedPrice,
        category: normalizedCategory,
        seller: String(listing.seller || 'Campus Seller'),
        sellerPaymentQR: listing.sellerPaymentQR || '',
        image: String(listing.image || '📦'),
        imageUrl: primaryImageUrl,
        images: imageList.length ? imageList : (primaryImageUrl ? [primaryImageUrl] : []),
        badge: String(listing.badge || 'Used'),
        description: String(listing.description || ''),
        status: String(listing.status || 'active').toLowerCase()
    };
}

function removeSampleListingsFromStorage() {
    // Aggressive cleanup - remove all sample items from storage with case-insensitive matching
    const sampleTitlesLower = Array.from(SAMPLE_TITLES).map(t => t.toLowerCase());
    
    [USER_LISTINGS_KEY, LEGACY_LISTINGS_KEY].forEach((key) => {
        const parsed = parseListingsFromKey(key);
        if (!parsed.length) return;

        const filtered = parsed.filter((listing) => {
            const title = String(listing?.title || '').trim().toLowerCase();
            return !sampleTitlesLower.includes(title);
        });

        if (filtered.length !== parsed.length) {
            localStorage.setItem(key, JSON.stringify(filtered));
            console.log(`Removed ${parsed.length - filtered.length} sample items from ${key}`);
        }
    });
}

function getUserListings() {
    const merged = [
        ...parseListingsFromKey(USER_LISTINGS_KEY),
        ...parseListingsFromKey(LEGACY_LISTINGS_KEY)
    ];

    const seen = new Set();
    const normalized = [];
    const sampleTitlesLower = Array.from(SAMPLE_TITLES).map(t => t.toLowerCase());

    merged.forEach((listing, index) => {
        const normalizedListing = normalizeListing(listing, index);
        if (!normalizedListing) return;
        
        // Case-insensitive sample title check
        const titleLower = normalizedListing.title.trim().toLowerCase();
        if (sampleTitlesLower.includes(titleLower)) return;
        if (normalizedListing.status !== 'active') return;

        const key = `${normalizedListing.id}-${normalizedListing.title}`;
        if (seen.has(key)) return;
        seen.add(key);
        normalized.push(normalizedListing);
    });

    return normalized;
}

function loadMarketplaceProducts() {
    removeSampleListingsFromStorage();
    const userListings = getUserListings();
    products = [...DEFAULT_PRODUCTS, ...userListings];
    filteredProducts = [...products];
}

function refreshMarketplaceProducts() {
    loadMarketplaceProducts();
    filterProducts();
}

function parsePrice(price) {
    const numericPrice = String(price).replace(/[^\d.]/g, '');
    return parseFloat(numericPrice) || 0;
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    loadMarketplaceProducts();
    updateCategoryCounts(); // Update counts on initial load
    renderProducts(products);
    setupCategoryFilters();
    setupSearch();
    setupRefresh();
    setupScrollToTop();
    setupProductModal(); // Setup product detail modal
    setupPaymentModal(); // Setup payment modal
});

// Refresh marketplace when page becomes visible (e.g., after navigating back from sell-item)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        refreshMarketplaceProducts();
    }
});

// Also refresh when window gains focus (for better reliability)
window.addEventListener('focus', () => {
    refreshMarketplaceProducts();
});

// Render products in the grid
function renderProducts(productsToRender) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '';

    if (productsToRender.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 48px; color: #6b7280;">No items found</div>';
        return;
    }

    productsToRender.forEach(product => {
        const productCard = createProductCard(product);
        grid.appendChild(productCard);
    });
}

// Create a product card element
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    const isFavorited = checkIfFavorited(product.id);
    const favBtnColor = isFavorited ? '#ef4444' : '#9ca3af';
    
    // Show uploaded image if available, otherwise show emoji icon
    let cardImage;
    if (product.imageUrl || (product.images && product.images.length > 0)) {
        const imgSrc = product.imageUrl || product.images[0];
        cardImage = `<img src="${imgSrc}" alt="${product.title}" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else if (product.image) {
        cardImage = product.image;
    } else {
        cardImage = '📦';
    }

    card.innerHTML = `
        <div class="product-image" style="position: relative; cursor: pointer;" onclick="handleViewDetails(${product.id})">
            ${cardImage}
            <button class="favorite-btn" onclick="event.stopPropagation(); toggleFavorite(${product.id}, ${JSON.stringify(product).replace(/"/g, '&quot;')})" style="position: absolute; top: 8px; right: 8px; background-color: transparent; border: none; color: ${favBtnColor}; font-size: 20px; cursor: pointer; z-index: 10;">
                <i class="fas fa-heart"></i>
            </button>
        </div>
        <div class="product-info">
            <span class="product-badge">${product.badge}</span>
            <h3 class="product-title">${product.title}</h3>
            <div class="product-price">${product.price}</div>
            <div class="product-actions">
                <button onclick="handleViewDetails(${product.id})">View Details</button>
            </div>
        </div>
    `;
    return card;
}

// Setup category filter clicks
function setupCategoryFilters() {
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
        card.addEventListener('click', () => {
            // Update active state
            categoryCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            // Get category name
            const categoryName = card.querySelector('span').textContent;
            currentCategory = categoryName;

            // Filter products
            filterProducts();
        });
    });
}

// Filter products based on current category and search
function filterProducts() {
    const searchInput = document.querySelector('.search-box input').value.toLowerCase();
    
    filteredProducts = products.filter(product => {
        const matchCategory = currentCategory === 'All Items' || product.category === currentCategory;
        const matchSearch = product.title.toLowerCase().includes(searchInput) || 
                          product.seller.toLowerCase().includes(searchInput);
        return matchCategory && matchSearch;
    });

    renderProducts(filteredProducts);
    updateCategoryCounts();
}

// Update category counts based on filtered products
function updateCategoryCounts() {
    const categoryCards = document.querySelectorAll('.category-card');
    const searchInput = document.querySelector('.search-box input').value.toLowerCase();
    
    categoryCards.forEach(card => {
        const categoryName = card.querySelector('span').textContent;
        let count = 0;
        
        if (categoryName === 'All Items') {
            count = products.filter(p => 
                p.title.toLowerCase().includes(searchInput) || 
                p.seller.toLowerCase().includes(searchInput)
            ).length;
        } else {
            count = products.filter(p => 
                p.category === categoryName && (
                    p.title.toLowerCase().includes(searchInput) || 
                    p.seller.toLowerCase().includes(searchInput)
                )
            ).length;
        }
        
        const countSpan = card.querySelector('.count');
        if (countSpan) {
            countSpan.textContent = count;
        }
    });
}

// Setup search functionality
function setupSearch() {
    const searchInput = document.querySelector('.search-box input');
    searchInput.addEventListener('input', () => {
        filterProducts();
    });
}

// Setup refresh button
function setupRefresh() {
    const refreshBtn = document.querySelector('.btn-refresh');
    refreshBtn.addEventListener('click', () => {
        // Refresh the products
        filterProducts();
    });
}

// Handle view details button - Open product modal
function handleViewDetails(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        openProductModal(product);
    }
}

// Product Modal Functions
let currentProduct = null;
let currentImageIndex = 0;

function getProductImages(product) {
    if (!product) return [];
    if (Array.isArray(product.images) && product.images.length) return product.images.filter(Boolean);
    if (product.imageUrl) return [product.imageUrl];
    return [];
}

function renderCurrentModalImage() {
    const modalImage = document.getElementById('carouselImage');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const images = getProductImages(currentProduct);

    if (!modalImage) return;

    if (!images.length) {
        // Show emoji icon if no uploaded images
        const emojiIcon = currentProduct?.image || '📦';
        modalImage.textContent = emojiIcon;
        modalImage.style.display = 'flex';
        modalImage.style.alignItems = 'center';
        modalImage.style.justifyContent = 'center';
        modalImage.style.fontSize = '120px';
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        return;
    }

    if (currentImageIndex >= images.length) currentImageIndex = 0;
    if (currentImageIndex < 0) currentImageIndex = images.length - 1;

    modalImage.innerHTML = `<img src="${images[currentImageIndex]}" alt="${currentProduct.title}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
    modalImage.style.display = '';
    modalImage.style.fontSize = '';

    const showNav = images.length > 1;
    if (prevBtn) prevBtn.style.display = showNav ? 'flex' : 'none';
    if (nextBtn) nextBtn.style.display = showNav ? 'flex' : 'none';
}

// Payment modal variables
let currentOrderData = null;

function openProductModal(product) {
    currentProduct = product;
    currentImageIndex = 0;

    // Update modal content
    document.getElementById('modalProductTitle').textContent = product.title;
    document.getElementById('modalProductPrice').textContent = product.price;
    document.getElementById('modalBadge').textContent = product.badge;
    
    // Display uploaded image(s)
    renderCurrentModalImage();
    
    // Use seller-provided description
    document.getElementById('modalDescription').textContent = product.description || 'No description available.';

    // Update favorite button state
    const saveBtn = document.getElementById('modalSaveBtn');
    if (checkIfFavorited(product.id)) {
        saveBtn.classList.add('favorited');
        saveBtn.innerHTML = '<i class="fas fa-heart"></i>Saved';
    } else {
        saveBtn.classList.remove('favorited');
        saveBtn.innerHTML = '<i class="fas fa-heart"></i>Save';
    }

    // Reset form and check order button status
    resetModalForm();
    checkOrderButtonStatus();

    // Show modal
    document.getElementById('productModal').classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
    currentProduct = null;
}

// Check if order button should be enabled
function checkOrderButtonStatus() {
    const modalOrderBtn = document.getElementById('modalOrderBtn');
    const qrWarning = document.getElementById('qrWarning');

    // Buyer QR is not required in marketplace checkout
    if (qrWarning) {
        qrWarning.style.display = 'none';
    }

    if (modalOrderBtn) {
        modalOrderBtn.disabled = false;
        modalOrderBtn.title = '';
    }
}

// Reset modal form when closing
function resetModalForm() {
    checkOrderButtonStatus();
}

// Setup modal event listeners
function setupProductModal() {
    // Modal close button
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeProductModal);

    // Modal overlay click to close
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) modalOverlay.addEventListener('click', closeProductModal);

    // Carousel navigation
    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentProduct) {
                const images = getProductImages(currentProduct);
                if (images.length <= 1) return;
                currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
                renderCurrentModalImage();
            }
        });
    }

    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentProduct) {
                const images = getProductImages(currentProduct);
                if (images.length <= 1) return;
                currentImageIndex = (currentImageIndex + 1) % images.length;
                renderCurrentModalImage();
            }
        });
    }

    // Save/Favorite button
    const modalSaveBtn = document.getElementById('modalSaveBtn');
    if (modalSaveBtn) {
        modalSaveBtn.addEventListener('click', () => {
            if (currentProduct) {
                toggleFavorite(currentProduct.id, currentProduct);
                const saveBtn = document.getElementById('modalSaveBtn');
                if (checkIfFavorited(currentProduct.id)) {
                    saveBtn.classList.add('favorited');
                    saveBtn.innerHTML = '<i class="fas fa-heart"></i>Saved';
                } else {
                    saveBtn.classList.remove('favorited');
                    saveBtn.innerHTML = '<i class="fas fa-heart"></i>Save';
                }
            }
        });
    }

    // Order button
    const modalOrderBtn = document.getElementById('modalOrderBtn');
    if (modalOrderBtn) {
        modalOrderBtn.addEventListener('click', () => {
            if (currentProduct && !modalOrderBtn.disabled) {
                if (!enforceBuyPolicyOrRedirect()) {
                    return;
                }

                // Prepare order data
                const orderData = {
                    itemName: currentProduct.title,
                    price: currentProduct.price,
                    seller: currentProduct.seller,
                    sellerPaymentQR: currentProduct.sellerPaymentQR,
                    productId: currentProduct.id
                };
                
                // Close product modal and open payment modal
                closeProductModal();
                resetModalForm();
                
                // Open payment modal
                openPaymentModal(orderData);
            }
        });
    }
}

// Handle add to cart button
function handleAddToCart(productId) {
    const product = products.find(p => p.id === productId);
    alert(`Added "${product.title}" to your cart!`);
    // Here you could add actual cart functionality
}

// Handle navigation items - Allow actual navigation for pages with href
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        const href = item.getAttribute('href');
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        // If navigating to Marketplace and already on index.html, don't show alert
        if ((href === '#' || href === '') && currentPage === 'index.html' && item.querySelector('span').textContent === 'Marketplace') {
            e.preventDefault();
            return;
        }
        
        // If an explicit href is present and not a placeholder, allow normal navigation
        if (href && href !== '#' && href !== '') {
            return;
        }
        
        // Otherwise treat as placeholder and show a navigation alert
        e.preventDefault();
        const text = item.querySelector('span').textContent;
        alert(`Navigating to ${text}...`);
    });
});

// Handle sort dropdown
document.querySelectorAll('.filter-select').forEach((select, index) => {
    select.addEventListener('change', (e) => {
        if (index === 0) {
            // Sort by option
            const sortBy = e.target.value;
            if (sortBy === 'Newest First') {
                filteredProducts.reverse();
            } else if (sortBy === 'Price Low to High') {
                filteredProducts.sort((a, b) => {
                    const priceA = parsePrice(a.price);
                    const priceB = parsePrice(b.price);
                    return priceA - priceB;
                });
            } else if (sortBy === 'Price High to Low') {
                filteredProducts.sort((a, b) => {
                    const priceA = parsePrice(a.price);
                    const priceB = parsePrice(b.price);
                    return priceB - priceA;
                });
            }
            renderProducts(filteredProducts);
        }
        // College filter (index === 1) can be expanded for college-specific filtering
    });
});

// ======================== Scroll to Top Button ========================
function setupScrollToTop() {
    const scrollBtn = document.getElementById('scrollToTopBtn');
    const mainContent = document.querySelector('.main-content');
    
    // Show/hide button based on scroll position
    mainContent.addEventListener('scroll', () => {
        if (mainContent.scrollTop > 300) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
    });
    
    // Scroll to top when clicked
    scrollBtn.addEventListener('click', () => {
        mainContent.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// ======================== Favorites Management ========================
function getFavorites() {
    const favorites = localStorage.getItem('favorites');
    return favorites ? JSON.parse(favorites) : [];
}

// Save favorites to localStorage
function saveFavorites(favorites) {
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

// Check if item is favorited
function checkIfFavorited(productId) {
    const favorites = getFavorites();
    return favorites.some(fav => fav.id === productId);
}

// Toggle favorite
function toggleFavorite(productId, product) {
    let favorites = getFavorites();
    const isFavorited = favorites.some(fav => fav.id === productId);
    
    if (isFavorited) {
        favorites = favorites.filter(fav => fav.id !== productId);
    } else {
        favorites.push(product);
    }
    
    saveFavorites(favorites);
    renderProducts(filteredProducts); // Re-render to update heart colors
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
    const userProfile = document.getElementById('userProfileCard');
    const loginBtn = document.getElementById('loginBtn');
    
    if (userProfile) userProfile.style.display = 'flex';
    if (loginBtn) loginBtn.style.display = 'none';
    
    const nameEl = document.getElementById('userName');
    const emailEl = document.getElementById('userEmail');
    if (nameEl) nameEl.textContent = user.name || 'User';
    if (emailEl) emailEl.textContent = user.email || '';
}

// Display login button
function showLoginButton() {
    const userProfile = document.getElementById('userProfileCard');
    const loginBtn = document.getElementById('loginBtn');
    
    if (userProfile) userProfile.style.display = 'none';
    if (loginBtn) loginBtn.style.display = 'flex';
}

// Handle login button click
const loginBtn = document.getElementById('loginBtn');
if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        alert('Login button clicked! (Placeholder for future Google Sign-In integration)');
    });
}

// Handle logout (optional - can be triggered from profile menu)
function logout() {
    localStorage.removeItem('userProfile');
    showLoginButton();
    alert('Signed out successfully!');
}

// Initialize auth status on page load
window.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
});

window.addEventListener('focus', refreshMarketplaceProducts);

window.addEventListener('storage', (event) => {
    if (event.key === USER_LISTINGS_KEY || event.key === LEGACY_LISTINGS_KEY) {
        refreshMarketplaceProducts();
    }
});

// ======================== Payment Modal Functions ========================
// Open payment modal
function openPaymentModal(orderData) {
    currentOrderData = orderData;

    const paymentModal = document.getElementById('paymentModal');

    // Update modal content
    document.getElementById('paymentItemName').textContent = orderData.itemName;

    // Show seller QR code directly in marketplace checkout
    const qrCodeImage = document.getElementById('paymentQRCode');
    if (orderData.sellerPaymentQR) {
        qrCodeImage.innerHTML = `<img src="${orderData.sellerPaymentQR}" alt="${orderData.seller} QR Code" style="max-width: 100%; max-height: 240px;">`;
    } else {
        qrCodeImage.innerHTML = '<i class="fas fa-qrcode" style="font-size: 120px; color: #ddd;"></i>';
    }

    // Show modal
    paymentModal.classList.add('active');
}

// Close payment modal
function closePaymentModal() {
    const paymentModal = document.getElementById('paymentModal');
    paymentModal.classList.remove('active');

    currentOrderData = null;
}

// Handle order cancellation
function handleCancelOrder() {
    closePaymentModal();
}

// Handle payment made confirmation
function handlePaymentMade() {
    closePaymentModal();
}

// Setup payment modal event listeners
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
        btnCancelOrder.addEventListener('click', handleCancelOrder);
    }
    
    if (btnPaymentMade) {
        btnPaymentMade.addEventListener('click', handlePaymentMade);
    }
}
