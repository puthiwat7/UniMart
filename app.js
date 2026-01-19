// API Configuration
const API_URL = 'http://localhost:3000/api';

// State hel;lo
let currentUser = null;
let currentToken = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadListings();
});

// Check if user is authenticated
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        currentToken = token;
        currentUser = JSON.parse(user);
        updateUIForAuth();
    }
}
//hh
// Update UI based on authentication status
function updateUIForAuth() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const createLink = document.getElementById('createLink');
    const myListingsLink = document.getElementById('myListingsLink');
    
    if (currentUser) {
        authButtons.style.display = 'none';
        userMenu.style.display = 'flex';
        createLink.style.display = 'inline';
        myListingsLink.style.display = 'inline';
        document.getElementById('userName').textContent = currentUser.name;
    } else {
        authButtons.style.display = 'flex';
        userMenu.style.display = 'none';
        createLink.style.display = 'none';
        myListingsLink.style.display = 'none';
    }
}

// Show modal
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('show');
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');
}

// Show login
function showLogin() {
    showModal('loginModal');
}

// Show register
function showRegister() {
    showModal('registerModal');
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentToken = data.token;
            currentUser = data.user;
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            updateUIForAuth();
            closeModal('loginModal');
            document.getElementById('loginEmail').value = '';
            document.getElementById('loginPassword').value = '';
            alert('Login successful!');
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        alert('Error connecting to server');
    }
}

// Handle register
async function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('registerName').value;
    const studentId = document.getElementById('registerStudentId').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, studentId, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentToken = data.token;
            currentUser = data.user;
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            updateUIForAuth();
            closeModal('registerModal');
            document.getElementById('registerName').value = '';
            document.getElementById('registerStudentId').value = '';
            document.getElementById('registerEmail').value = '';
            document.getElementById('registerPassword').value = '';
            alert('Registration successful!');
        } else {
            alert(data.error || 'Registration failed');
        }
    } catch (error) {
        alert('Error connecting to server');
    }
}

// Logout
function logout() {
    currentUser = null;
    currentToken = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateUIForAuth();
    showHome();
    alert('Logged out successfully');
}

// Show home
function showHome() {
    document.getElementById('homePage').style.display = 'block';
    document.getElementById('createListingPage').style.display = 'none';
    document.getElementById('myListingsPage').style.display = 'none';
    loadListings();
}

// Show create listing
function showCreateListing() {
    if (!currentUser) {
        alert('Please login to create a listing');
        showLogin();
        return;
    }
    document.getElementById('homePage').style.display = 'none';
    document.getElementById('createListingPage').style.display = 'block';
    document.getElementById('myListingsPage').style.display = 'none';
}

// Show my listings
async function showMyListings() {
    if (!currentUser) {
        alert('Please login to view your listings');
        showLogin();
        return;
    }
    document.getElementById('homePage').style.display = 'none';
    document.getElementById('createListingPage').style.display = 'none';
    document.getElementById('myListingsPage').style.display = 'block';
    await loadMyListings();
}

// Load all listings
async function loadListings() {
    try {
        const response = await fetch(`${API_URL}/listings`);
        const listings = await response.json();
        displayListings(listings, 'listingsContainer');
    } catch (error) {
        console.error('Error loading listings:', error);
        document.getElementById('listingsContainer').innerHTML = 
            '<div class="empty-state"><h3>Error loading listings</h3></div>';
    }
}

// Load my listings
async function loadMyListings() {
    try {
        const response = await fetch(`${API_URL}/my-listings`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        const listings = await response.json();
        displayListings(listings, 'myListingsContainer', true);
    } catch (error) {
        console.error('Error loading my listings:', error);
    }
}

// Display listings
function displayListings(listings, containerId, showDelete = false) {
    const container = document.getElementById(containerId);
    
    if (listings.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No listings found</h3><p>Be the first to create a listing!</p></div>';
        return;
    }

    container.innerHTML = listings.map(listing => `
        <div class="listing-card">
            <div class="listing-image">${getCategoryEmoji(listing.category)}</div>
            <div class="listing-content">
                <div class="listing-category">${listing.category}</div>
                <div class="listing-title">${listing.title}</div>
                <div class="listing-description">${listing.description}</div>
                <div class="listing-footer">
                    <div class="listing-price">$${listing.price.toFixed(2)}</div>
                    <div class="listing-actions">
                        ${showDelete ? `<button onclick="deleteListing('${listing.id}')" class="btn btn-danger">Delete</button>` : ''}
                        <button onclick="showListingDetail('${listing.id}')" class="btn btn-primary">View</button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Get category emoji
function getCategoryEmoji(category) {
    const emojis = {
        'Textbooks': '📚',
        'Electronics': '💻',
        'Furniture': '🪑',
        'Clothing': '👕',
        'Services': '🔧',
        'Other': '📦'
    };
    return emojis[category] || '📦';
}

// Show listing detail
async function showListingDetail(listingId) {
    try {
        const response = await fetch(`${API_URL}/listings/${listingId}`);
        const listing = await response.json();
        
        const modalContent = document.getElementById('listingDetailContent');
        modalContent.innerHTML = `
            <div class="listing-detail">
                <div class="listing-image">${getCategoryEmoji(listing.category)}</div>
                <div class="listing-category">${listing.category}</div>
                <h2>${listing.title}</h2>
                <div class="listing-price">$${listing.price.toFixed(2)}</div>
                <div class="listing-description">${listing.description}</div>
                <p><strong>Condition:</strong> ${listing.condition}</p>
                <div class="seller-info">
                    <h3>Seller Information</h3>
                    <p><strong>Name:</strong> ${listing.sellerName}</p>
                    <p><strong>Email:</strong> ${listing.sellerEmail}</p>
                    <p><strong>Posted:</strong> ${new Date(listing.createdAt).toLocaleDateString()}</p>
                </div>
            </div>
        `;
        
        showModal('listingModal');
    } catch (error) {
        alert('Error loading listing details');
    }
}

// Delete listing
async function deleteListing(listingId) {
    if (!confirm('Are you sure you want to delete this listing?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/listings/${listingId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (response.ok) {
            alert('Listing deleted successfully');
            await loadMyListings();
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to delete listing');
        }
    } catch (error) {
        alert('Error deleting listing');
    }
}

// Handle create listing
async function handleCreateListing(event) {
    event.preventDefault();
    
    if (!currentUser) {
        alert('Please login to create a listing');
        return;
    }

    const title = document.getElementById('listingTitle').value;
    const description = document.getElementById('listingDescription').value;
    const price = document.getElementById('listingPrice').value;
    const category = document.getElementById('listingCategory').value;
    const condition = document.getElementById('listingCondition').value;

    try {
        const response = await fetch(`${API_URL}/listings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ title, description, price, category, condition })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Listing created successfully!');
            document.getElementById('listingTitle').value = '';
            document.getElementById('listingDescription').value = '';
            document.getElementById('listingPrice').value = '';
            document.getElementById('listingCategory').value = '';
            showHome();
            loadListings();
        } else {
            alert(data.error || 'Failed to create listing');
        }
    } catch (error) {
        alert('Error creating listing');
    }
}

// Perform search
async function performSearch() {
    const query = document.getElementById('searchInput').value;
    const category = document.getElementById('categoryFilter').value;
    
    try {
        let url = `${API_URL}/search?`;
        if (query) url += `q=${encodeURIComponent(query)}&`;
        if (category) url += `category=${encodeURIComponent(category)}&`;
        
        const response = await fetch(url);
        const listings = await response.json();
        displayListings(listings, 'listingsContainer');
    } catch (error) {
        console.error('Error searching:', error);
    }
}

// Filter by category
function filterByCategory(category) {
    document.getElementById('categoryFilter').value = category;
    document.getElementById('searchInput').value = '';
    performSearch();
}

// Close modals when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.classList.remove('show');
        }
    });
}
