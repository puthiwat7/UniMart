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
    renderProducts(products);
    setupCategoryFilters();
    setupSearch();
    setupRefresh();
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
    card.innerHTML = `
        <div class="product-image">${product.image}</div>
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

// Handle view details button
function handleViewDetails(productId) {
    const product = products.find(p => p.id === productId);
    alert(`Viewing details for: ${product.title}\n\nPrice: ${product.price}\nSeller: ${product.seller}\n\nThis would open a detailed view of the product.`);
}

// Handle add to cart button
function handleAddToCart(productId) {
    const product = products.find(p => p.id === productId);
    alert(`Added "${product.title}" to your cart!`);
    // Here you could add actual cart functionality
}

// Handle navigation items
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
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
