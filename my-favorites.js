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
function renderFavorites() {
    const grid = document.getElementById('favoritesGrid');
    const favorites = getFavorites();

    grid.innerHTML = '';

    if (favorites.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 48px; color: #6b7280;">
                <i class="fas fa-heart" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                <p>No favorites yet</p>
                <p style="font-size: 14px; margin-top: 8px;">Start adding items to your favorites!</p>
                <a href="index.html" style="display: inline-block; margin-top: 16px; padding: 8px 16px; background-color: #4a5fc1; color: white; text-decoration: none; border-radius: 6px;">
                    Browse Marketplace
                </a>
            </div>
        `;
        return;
    }

    favorites.forEach(product => {
        const card = createFavoriteCard(product);
        grid.appendChild(card);
    });
}

// Create favorite card
function createFavoriteCard(product) {
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
                <button onclick="removeFromFavorites(${product.id})" style="background-color: #ef4444;">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        </div>
    `;
    return card;
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    renderFavorites();
    checkAuthStatus();
    setupClearFavoritesButton();
});

// Handle view details
function handleViewDetails(productId) {
    const favorites = getFavorites();
    const product = favorites.find(p => p.id === productId);
    if (product) {
        alert(`Viewing details for: ${product.title}\n\nPrice: ${product.price}\nSeller: ${product.seller}\n\nThis would open a detailed view of the product.`);
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
