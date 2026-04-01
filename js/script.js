const DEFAULT_PRODUCTS = [];

// Local storage keys used by the legacy listing cache.
// These are updated by the My Sales page when listings change.
const USER_LISTINGS_KEY = 'unimartListings';
const LEGACY_LISTINGS_KEY = 'listings';

let products = [];

let currentCategory = 'All Items';
let filteredProducts = [];
let isMarketplaceLoading = false;
let realtimeUnsubscribe = null;
let policyProfile = null;
let policyProfileLoaded = false;

function isPolicyAgreed(profile) {
    if (!profile || typeof profile !== 'object') return false;
    return profile.hasAgreedPolicy === true || profile.agreedToPolicies === true;
}

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
        policyProfileLoaded = true;
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
        policyProfileLoaded = true;
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
    console.log('User data:', profile);

    if (!profile) {
        return null;
    }

    if (isPolicyAgreed(profile)) {
        return true;
    }

    alert('You must agree to marketplace policies before buying. You will be redirected to your profile.');
    window.location.href = 'pages/profile';
    return false;
}

function normalizeListing(listing, fallbackIndex = 0) {
    if (!listing || typeof listing !== 'object') {
        return null;
    }

    const normalizedCategory = listing.category ? String(listing.category) : 'Other';
    const normalizedPrice = listing.price ? String(listing.price) : '¥0.00';

    const imageList = Array.isArray(listing.images) ? listing.images.filter(Boolean) : [];
    const primaryImageUrl = listing.imageUrl || imageList[0] || '';

    const normalizedCondition = Number.isFinite(Number(listing.condition)) ? Number(listing.condition) : (Number.isFinite(Number(listing.conditionPercentage)) ? Number(listing.conditionPercentage) : null);
    
    console.log('normalizeListing:', {
        id: listing.id,
        originalCondition: listing.condition,
        originalConditionPercentage: listing.conditionPercentage,
        normalizedCondition,
        badge: listing.badge
    });

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
        condition: normalizedCondition,
        quantity: Number.isFinite(Number(listing.quantity)) ? Number(listing.quantity) : 1,
        description: String(listing.description || ''),
        status: String(listing.status || 'active').toLowerCase()
    };
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
    console.log('getConditionPercentage:', { productId: product?.id, condition: product?.condition, badge: product?.badge, result: fallbackValue });
    return fallbackValue;
}

const CACHE_KEY = 'unimart_marketplace_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function loadMarketplaceProducts() {
    window.marketplaceLoadError = null;
    window.marketplaceLoadWarning = null;

    if (!window.unimartListingsSync || typeof window.unimartListingsSync.getActiveListingsFromCloud !== 'function') {
        products = [...DEFAULT_PRODUCTS];
        filteredProducts = [...products];
        return;
    }

    try {
        const cloudListings = await window.unimartListingsSync.getActiveListingsFromCloud({
            limit: 160,
            cacheTtlMs: 45000
        });
        const normalized = cloudListings.map((listing, index) => normalizeListing(listing, index)).filter(Boolean);
        products = [...DEFAULT_PRODUCTS, ...normalized];

        // Cache the results (still useful for offline fallback)
        saveToCache(products);

        const readState = window.unimartListingsSyncLastReadState || null;
        if (readState && readState.mode === 'fallback-limited') {
            const loadedCount = Number(readState.count) || normalized.length;
            const limit = Number(readState.limit) || loadedCount;
            window.marketplaceLoadWarning = `Loaded ${loadedCount} recent items (limited to ${limit}) due to a slow network/database response.`;
        }
    } catch (error) {
        console.warn('Failed to load cloud listings:', error);
        window.marketplaceLoadError = error;
        products = [];
    }

    filteredProducts = [...products];
}

function loadFromCache() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const data = JSON.parse(cached);
        const now = Date.now();

        if (now - data.timestamp > CACHE_DURATION) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }

        return data;
    } catch (error) {
        console.warn('Failed to load from cache:', error);
        return null;
    }
}

function saveToCache(products) {
    try {
        const data = {
            products,
            timestamp: Date.now()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
        console.warn('Failed to save to cache:', error);
    }
}

async function refreshMarketplaceProducts() {
    renderMarketplaceLoadingState();
    await loadMarketplaceProducts();
    filterProducts();
}

function parsePrice(price) {
    const numericPrice = String(price).replace(/[^\d.]/g, '');
    return parseFloat(numericPrice) || 0;
}

async function initializeMarketplaceData() {
    renderMarketplaceLoadingState();
    await loadMarketplaceProducts();
    updateCategoryCounts();
    filterProducts();
    
    // Setup real-time listener for live updates
    setupRealtimeMarketplaceSync();
}

function setupRealtimeMarketplaceSync() {
    // Clean up existing listener
    if (realtimeUnsubscribe) {
        realtimeUnsubscribe();
        realtimeUnsubscribe = null;
    }

    if (!window.unimartListingsSync || typeof window.unimartListingsSync.setupRealtimeListingsListener !== 'function') {
        console.warn('Realtime sync not available');
        return;
    }

    realtimeUnsubscribe = window.unimartListingsSync.setupRealtimeListingsListener((allListings) => {
        try {
            const normalized = allListings.map((listing, index) => normalizeListing(listing, index)).filter(Boolean);
            
            // Update products array
            products = [...DEFAULT_PRODUCTS, ...normalized];
            filteredProducts = [...products];
            
            // Update UI
            updateCategoryCounts();
            filterProducts();
            
            // Cache the updated data
            saveToCache(products);
            
            console.log('Marketplace updated with realtime data:', products.length, 'items');
        } catch (error) {
            console.warn('Error processing realtime marketplace update:', error);
        }
    }, {
        status: 'active',
        limit: 160
    });
}

// Initialize the page - Wait for Firebase and DOM
async function initializeApp() {
    // Wait for Firebase to be available
    while (typeof firebase === 'undefined' || !firebase.auth) {
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Initialize even without auth for public content
    await initializeMarketplaceData();
    setupCategoryFilters();
    setupCategoryDropdown();
    setupSearch();
    setupRefresh();
    setupScrollToTop();
    setupProductModal();
    setupPaymentModal();
    populateCollegeDropdown();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeApp();
        // Ensure college dropdown is populated as backup
        populateCollegeDropdown();
    });
} else {
    initializeApp();
    // Ensure college dropdown is populated as backup
    populateCollegeDropdown();
}

// Refresh marketplace when page becomes visible (e.g., after navigating back from sell-item)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // With realtime sync, we don't need to manually refresh
        // The listener will automatically update the UI
    }
});

// Also refresh when window gains focus (for better reliability)
window.addEventListener('focus', () => {
    // With realtime sync, we don't need to manually refresh
    // The listener will automatically update the UI
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (realtimeUnsubscribe) {
        realtimeUnsubscribe();
        realtimeUnsubscribe = null;
    }
});

let currentPage = 1;
const ITEMS_PER_PAGE = 20;

function renderProducts(productsToRender, page = 1) {
    const grid = document.getElementById('productsGrid');
    const warningContainer = document.getElementById('marketplaceWarningBanner');
    if (!grid) return;

    isMarketplaceLoading = false;

    // Calculate pagination
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedProducts = productsToRender.slice(startIndex, endIndex);
    const totalPages = Math.ceil(productsToRender.length / ITEMS_PER_PAGE);

    // Clear grid but keep existing content for pagination
    if (page === 1) {
        grid.innerHTML = '';
    }

    if (warningContainer) {
        if (window.marketplaceLoadWarning) {
            warningContainer.textContent = window.marketplaceLoadWarning;
            warningContainer.style.display = 'block';
        } else {
            warningContainer.style.display = 'none';
            warningContainer.textContent = '';
        }
    }

    if (window.marketplaceLoadError) {
        grid.innerHTML = `
            <div class="marketplace-error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Failed to load items</h3>
                <p>Could not load marketplace items. Please check your internet connection or try again.<br><span>${window.marketplaceLoadError.message || window.marketplaceLoadError}</span></p>
                <button id="retryMarketplaceLoad">Retry</button>
            </div>
        `;
        const retryBtn = document.getElementById('retryMarketplaceLoad');
        if (retryBtn) retryBtn.onclick = () => refreshMarketplaceProducts();
        return;
    }

    if (productsToRender.length === 0) {
        grid.innerHTML = `
            <div class="marketplace-empty-state">
                <i class="fas fa-box-open"></i>
                <h3>No items listed yet</h3>
                <p>New listings will appear here once sellers publish them.</p>
            </div>
        `;
        return;
    }

    // Render products for current page
    paginatedProducts.forEach(product => {
        const productCard = createProductCard(product);
        grid.appendChild(productCard);
    });

    // Add load more button if there are more pages
    if (page < totalPages && !document.getElementById('loadMoreBtn')) {
        const loadMoreBtn = document.createElement('div');
        loadMoreBtn.id = 'loadMoreBtn';
        loadMoreBtn.className = 'load-more-container';
        loadMoreBtn.innerHTML = `
            <button class="btn-load-more" onclick="loadNextPage()">
                <i class="fas fa-plus"></i>
                Load More Items
            </button>
        `;
        grid.appendChild(loadMoreBtn);
    } else if (page >= totalPages) {
        // Remove load more button if we've loaded all pages
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) loadMoreBtn.remove();
    }

    currentPage = page;
}

function loadNextPage() {
    const nextPage = currentPage + 1;
    renderProducts(filteredProducts, nextPage);
}

function renderMarketplaceLoadingState(count = 8) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    isMarketplaceLoading = true;
    grid.innerHTML = '';

    for (let i = 0; i < count; i += 1) {
        const card = document.createElement('div');
        card.className = 'product-card loading-card';
        card.innerHTML = `
            <div class="product-image skeleton-block"></div>
            <div class="product-info">
                <div class="skeleton-line skeleton-badge"></div>
                <div class="skeleton-line skeleton-title"></div>
                <div class="skeleton-line skeleton-price"></div>
                <div class="skeleton-line skeleton-button"></div>
            </div>
        `;
        grid.appendChild(card);
    }
}

// Create a product card element
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    const isFavorited = checkIfFavorited(product.id);
    const favBtnColor = isFavorited ? '#ef4444' : '#9ca3af';
    const conditionPercent = getConditionPercentage(product);
    
    // Show uploaded image if available, otherwise show emoji icon
    let cardImage;
    if (product.imageUrl || (product.images && product.images.length > 0)) {
        const imgSrc = product.imageUrl || product.images[0];
        cardImage = `<img src="${imgSrc}" alt="${product.title}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;">`;
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
            <div class="product-meta-row">
                <span class="product-badge" style="margin-bottom: 0;">${product.badge}</span>
                ${conditionPercent !== null ? `<span class="product-badge condition-badge">${conditionPercent}%</span>` : ''}
            </div>
            <h3 class="product-title">${product.title}</h3>
            <div class="product-price">${product.price}</div>
            <div class="product-details-row">
                <span class="product-seller">by ${product.seller || 'Campus Seller'}</span>
                <span class="product-quantity">Qty: ${product.quantity || 1}</span>
            </div>
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

            // Update dropdown if visible
            setCategoryDropdownValue(currentCategory);

            // Filter products
            filterProducts();
        });
    });
}

function mapCategoryValueToLabel(value) {
    const map = {
        all: 'All Items',
        textbooks: 'Textbooks',
        electronics: 'Electronics',
        furniture: 'Furniture',
        clothing: 'Clothing',
        sports: 'Sports',
        stationery: 'Stationery',
        kitchen: 'Kitchen',
        vehicles: 'Vehicles',
        other: 'Other'
    };
    return map[value] || 'All Items';
}

function mapCategoryLabelToValue(label) {
    const normalized = String(label).trim().toLowerCase();
    const map = {
        'all items': 'all',
        textbooks: 'textbooks',
        electronics: 'electronics',
        furniture: 'furniture',
        clothing: 'clothing',
        sports: 'sports',
        stationery: 'stationery',
        kitchen: 'kitchen',
        vehicles: 'vehicles',
        other: 'other'
    };
    return map[normalized] || 'all';
}

function setCategoryDropdownValue(categoryLabel) {
    const categorySelect = document.getElementById('categorySelect');
    if (!categorySelect) return;

    const value = mapCategoryLabelToValue(categoryLabel);
    categorySelect.value = value;
}

function setupCategoryDropdown() {
    const categorySelect = document.getElementById('categorySelect');
    if (!categorySelect) return;

    categorySelect.addEventListener('change', (e) => {
        const selectedCategory = e.target.value;
        currentCategory = mapCategoryValueToLabel(selectedCategory);

        // Sync pills active state for desktop fallback
        const categoryCards = document.querySelectorAll('.category-card');
        categoryCards.forEach(c => c.classList.remove('active'));
        const targetCard = Array.from(categoryCards).find(card => card.querySelector('span').textContent === currentCategory);
        if (targetCard) {
            targetCard.classList.add('active');
        }

        // Apply filtering using existing logic
        filterProducts();
    });

    // Set initial dropdown based on current category (e.g., when page loads with active pill set)
    setCategoryDropdownValue(currentCategory);
}

// Filter products based on current category and search
function filterProducts() {
    currentPage = 1; // Reset pagination when filtering
    const searchInput = document.querySelector('.search-box input').value.toLowerCase();
    const selectedCollege = document.getElementById('collegeSelect').value;
    
    filteredProducts = products.filter(product => {
        const matchCategory = currentCategory === 'All Items' || product.category === currentCategory;
        const matchSearch = product.title.toLowerCase().includes(searchInput) || 
                          product.seller.toLowerCase().includes(searchInput);
        const matchCollege = selectedCollege === 'All Colleges' || product.college === selectedCollege;
        return matchCategory && matchSearch && matchCollege;
    });

    renderProducts(filteredProducts, 1);
    updateCategoryCounts();
}

// Update category counts based on filtered products - Optimized single pass
function updateCategoryCounts() {
    const categoryCards = document.querySelectorAll('.category-card');
    const searchInput = document.querySelector('.search-box input').value.toLowerCase();
    const selectedCollege = document.getElementById('collegeSelect').value;
    
    // Create a map for efficient counting
    const categoryCounts = new Map();
    let totalCount = 0;
    
    products.forEach(product => {
        const matchesSearch = !searchInput || 
            product.title.toLowerCase().includes(searchInput) || 
            product.seller.toLowerCase().includes(searchInput);
        const matchesCollege = selectedCollege === 'All Colleges' || product.college === selectedCollege;
        
        if (matchesSearch && matchesCollege) {
            const category = product.category;
            categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
            totalCount++;
        }
    });
    
    categoryCards.forEach(card => {
        const categoryName = card.querySelector('span').textContent;
        let count = 0;
        
        if (categoryName === 'All Items') {
            count = totalCount;
        } else {
            count = categoryCounts.get(categoryName) || 0;
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
    refreshBtn.addEventListener('click', async () => {
        // Refresh the products
        await refreshMarketplaceProducts();
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
        modalOrderBtn.addEventListener('click', async () => {
            if (currentProduct && !modalOrderBtn.disabled) {
                if (!(await enforceBuyPolicyOrRedirect())) {
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
    });
});

// Handle college filter
document.getElementById('collegeSelect').addEventListener('change', (e) => {
    filterProducts();
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

function populateCollegeDropdown() {
    const collegeSelect = document.getElementById('collegeSelect');
    if (!collegeSelect) {
        console.warn('College select element not found');
        return;
    }

    // Clear existing options
    collegeSelect.innerHTML = '';

    // Fallback colleges if COLLEGES constant is not available
    const fallbackColleges = [
        "All Colleges",
        "Minerva",
        "Muse",
        "Diligentia", 
        "Ling",
        "Harmonia",
        "Shaw",
        "Eighth College",
        "Duan Family"
    ];

    // Use COLLEGES constant if available, otherwise use fallback
    const collegesToUse = (typeof COLLEGES !== 'undefined' && Array.isArray(COLLEGES)) 
        ? COLLEGES 
        : fallbackColleges;

    // Add college options
    collegesToUse.forEach(college => {
        const option = document.createElement('option');
        option.value = college;
        option.textContent = college;
        collegeSelect.appendChild(option);
    });
}

// Ensure college dropdown is populated on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
    populateCollegeDropdown();
});
