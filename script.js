// Sample product data
const products = [
    {
        id: 1,
        title: "Introduction to Algorithms",
        price: "$25.00",
        category: "Textbooks",
        seller: "John Doe",
        image: "📚",
        badge: "Brand New"
    },
    {
        id: 2,
        title: "Wireless Bluetooth Headphones",
        price: "$45.00",
        category: "Electronics",
        seller: "Sarah Lee",
        image: "🎧",
        badge: "Like New"
    },
    {
        id: 3,
        title: "Wooden Desk Lamp",
        price: "$15.00",
        category: "Furniture",
        seller: "Mike Chen",
        image: "💡",
        badge: "Used"
    },
    {
        id: 4,
        title: "Winter Jacket",
        price: "$35.00",
        category: "Clothing",
        seller: "Emma Wilson",
        image: "🧥",
        badge: "Like New"
    },
    {
        id: 5,
        title: "Basketball",
        price: "$20.00",
        category: "Sports",
        seller: "Alex Johnson",
        image: "🏀",
        badge: "Used"
    },
    {
        id: 6,
        title: "Notebook Set",
        price: "$8.00",
        category: "Stationery",
        seller: "Lisa Park",
        image: "📓",
        badge: "Brand New"
    }
];

let currentCategory = 'All Items';
let filteredProducts = products;

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    updateCategoryCounts(); // Update counts on initial load
    renderProducts(products);
    setupCategoryFilters();
    setupSearch();
    setupRefresh();
    setupScrollToTop();
    setupProductModal(); // Setup product detail modal
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
    
    card.innerHTML = `
        <div class="product-image" style="position: relative; cursor: pointer;" onclick="handleViewDetails(${product.id})">
            ${product.image}
            <button class="favorite-btn" onclick="event.stopPropagation(); toggleFavorite(${product.id}, ${JSON.stringify(product).replace(/"/g, '&quot;')})" style="position: absolute; top: 8px; right: 8px; background-color: transparent; border: none; color: ${favBtnColor}; font-size: 20px; cursor: pointer; z-index: 10;">
                <i class="fas fa-heart"></i>
            </button>
        </div>
        <div class="product-info">
            <span class="product-badge">${product.badge}</span>
            <h3 class="product-title">${product.title}</h3>
            <div class="product-price">${product.price}</div>
            <div class="product-seller">by ${product.seller}</div>
            <div class="product-actions">
                <button onclick="handleViewDetails(${product.id})">View Details</button>
                <button onclick="handleAddToCart(${product.id})">Add to Cart</button>
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
        // Animate rotation
        refreshBtn.style.transform = 'rotate(360deg)';
        refreshBtn.style.transition = 'transform 0.6s ease';
        
        setTimeout(() => {
            refreshBtn.style.transform = 'rotate(0deg)';
        }, 600);

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

function openProductModal(product) {
    currentProduct = product;
    currentImageIndex = 0;

    // Update modal content
    document.getElementById('modalProductTitle').textContent = product.title;
    document.getElementById('modalProductPrice').textContent = product.price;
    document.getElementById('modalSeller').textContent = product.seller;
    document.getElementById('modalBadge').textContent = product.badge;
    document.getElementById('carouselImage').textContent = product.image;
    document.getElementById('modalDescription').textContent = `A ${product.badge.toLowerCase()} ${product.category.toLowerCase()} item in excellent condition.`;

    // Update favorite button state
    const saveBtn = document.getElementById('modalSaveBtn');
    if (checkIfFavorited(product.id)) {
        saveBtn.classList.add('favorited');
        saveBtn.innerHTML = '<i class="fas fa-heart"></i>Saved';
    } else {
        saveBtn.classList.remove('favorited');
        saveBtn.innerHTML = '<i class="fas fa-heart"></i>Save';
    }

    // Show modal
    document.getElementById('productModal').classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
    currentProduct = null;
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
                currentImageIndex = (currentImageIndex - 1 + 1) % 1; // Simple carousel with 1 image per product
                document.getElementById('carouselImage').textContent = currentProduct.image;
            }
        });
    }

    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentProduct) {
                currentImageIndex = (currentImageIndex + 1) % 1; // Simple carousel with 1 image per product
                document.getElementById('carouselImage').textContent = currentProduct.image;
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
            if (currentProduct) {
                alert(`Added "${currentProduct.title}" to your cart!`);
                closeProductModal();
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
                    const priceA = parseFloat(a.price.replace('$', ''));
                    const priceB = parseFloat(b.price.replace('$', ''));
                    return priceA - priceB;
                });
            } else if (sortBy === 'Price High to Low') {
                filteredProducts.sort((a, b) => {
                    const priceA = parseFloat(a.price.replace('$', ''));
                    const priceB = parseFloat(b.price.replace('$', ''));
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
document.getElementById('loginBtn').addEventListener('click', () => {
    alert('Login button clicked! (Placeholder for future Google Sign-In integration)');
});

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
