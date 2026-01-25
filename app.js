// API Configuration
const API_URL = 'http://localhost:3000/api';

// State
let currentUser = null;
let currentToken = null;
let allListings = [];
let currentCategory = '';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadListings();
    
    // Initialize sidebar - open on desktop by default
    const sidebar = document.getElementById('sidebar');
    if (sidebar && window.innerWidth > 768) {
        sidebar.classList.add('open');
        sidebar.style.transform = 'translateX(0)';
    }
    
    // Add event listeners for search and filters
    const searchInput = document.getElementById('searchInput');
    const sortFilter = document.getElementById('sortFilter');
    const collegeFilter = document.getElementById('collegeFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(performSearch, 300));
    }
    if (sortFilter) {
        sortFilter.addEventListener('change', performSearch);
    }
    if (collegeFilter) {
        collegeFilter.addEventListener('change', performSearch);
    }

    // Handle window resize for responsive behavior
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(handleResize, 250);
    });
    handleResize();

    // Close sidebar when clicking on nav items on mobile
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                toggleSidebar();
            }
        });
    });
});

// Toggle sidebar for mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
        document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
    }
}

// Handle window resize
function handleResize() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (window.innerWidth > 768) {
        // Desktop: always show sidebar, remove overlay
        if (sidebar) {
            sidebar.classList.add('open');
            sidebar.style.transform = 'translateX(0)';
        }
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    } else {
        // Mobile: close sidebar by default unless it was manually opened
        if (sidebar && !sidebar.classList.contains('open')) {
            sidebar.style.transform = 'translateX(-100%)';
        }
        if (overlay && !sidebar.classList.contains('open')) {
            overlay.classList.remove('active');
        }
        document.body.style.overflow = '';
    }
}

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
    
    // Sidebar elements
    const sidebarUser = document.getElementById('sidebarUser');
    const sidebarUserName = document.getElementById('sidebarUserName');
    const sidebarUserEmail = document.getElementById('sidebarUserEmail');
    const createNavLink = document.getElementById('createNavLink');
    const ordersNavLink = document.getElementById('ordersNavLink');
    const salesNavLink = document.getElementById('salesNavLink');
    const favoritesNavLink = document.getElementById('favoritesNavLink');
    const profileNavLink = document.getElementById('profileNavLink');
    const notificationBell = document.getElementById('notificationBell');
    
    if (currentUser) {
        authButtons.style.display = 'none';
        userMenu.style.display = 'flex';
        createLink.style.display = 'inline';
        myListingsLink.style.display = 'inline';
        document.getElementById('userName').textContent = currentUser.name;
        
        // Update sidebar
        if (sidebarUser) {
            sidebarUser.style.display = 'flex';
            if (sidebarUserName) {
                sidebarUserName.textContent = currentUser.name;
            }
            if (sidebarUserEmail) {
                sidebarUserEmail.textContent = currentUser.email || 'user@cuhksz.edu.cn';
            }
            // Update avatar with initials
            const userAvatar = sidebarUser.querySelector('.user-avatar');
            if (userAvatar) {
                const nameParts = currentUser.name.split(' ');
                const initials = nameParts.length >= 2 
                    ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
                    : currentUser.name.substring(0, 2).toUpperCase();
                userAvatar.innerHTML = `<span style="color: white; font-weight: 600; font-size: 1rem;">${initials}</span>`;
            }
        }
        if (createNavLink) createNavLink.style.display = 'block';
        if (ordersNavLink) ordersNavLink.style.display = 'block';
        if (salesNavLink) salesNavLink.style.display = 'block';
        if (favoritesNavLink) favoritesNavLink.style.display = 'block';
        if (profileNavLink) profileNavLink.style.display = 'block';
        if (notificationBell) notificationBell.style.display = 'block';
    } else {
        authButtons.style.display = 'flex';
        userMenu.style.display = 'none';
        createLink.style.display = 'none';
        myListingsLink.style.display = 'none';
        
        // Hide sidebar user elements
        if (sidebarUser) sidebarUser.style.display = 'none';
        if (createNavLink) createNavLink.style.display = 'none';
        if (ordersNavLink) ordersNavLink.style.display = 'none';
        if (salesNavLink) salesNavLink.style.display = 'none';
        if (favoritesNavLink) favoritesNavLink.style.display = 'none';
        if (profileNavLink) profileNavLink.style.display = 'none';
        if (notificationBell) notificationBell.style.display = 'none';
    }
}

// Set active navigation item
function setActiveNav(element) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    if (element) {
        element.classList.add('active');
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
    const profilePage = document.getElementById('profilePage');
    if (profilePage) profilePage.style.display = 'none';
    // Reset filters
    currentCategory = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('sortFilter').value = 'newest';
    document.getElementById('collegeFilter').value = '';
    document.querySelectorAll('.category-filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === '') {
            btn.classList.add('active');
        }
    });
    loadListings();
    // Set active nav
    const marketplaceNav = document.querySelector('.nav-item[onclick*="showHome"]');
    if (marketplaceNav) setActiveNav(marketplaceNav);
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
    const profilePage = document.getElementById('profilePage');
    if (profilePage) profilePage.style.display = 'none';
    await loadMyListings();
    // Set active nav
    const salesNav = document.querySelector('.nav-item[onclick*="showMyListings"]');
    if (salesNav) setActiveNav(salesNav);
}

// Placeholder functions for other navigation items
function showMyOrders() {
    alert('My Orders feature coming soon!');
    const ordersNav = document.querySelector('.nav-item[onclick*="showMyOrders"]');
    if (ordersNav) setActiveNav(ordersNav);
}

function showMyFavorites() {
    alert('My Favorites feature coming soon!');
    const favoritesNav = document.querySelector('.nav-item[onclick*="showMyFavorites"]');
    if (favoritesNav) setActiveNav(favoritesNav);
}

function showUserGuide() {
    alert('User Guide coming soon!');
    const guideNav = document.querySelector('.nav-item[onclick*="showUserGuide"]');
    if (guideNav) setActiveNav(guideNav);
}

function showFeedback() {
    alert('Feedback feature coming soon!');
    const feedbackNav = document.querySelector('.nav-item[onclick*="showFeedback"]');
    if (feedbackNav) setActiveNav(feedbackNav);
}

function showProfile() {
    if (!currentUser) {
        alert('Please login to view your profile');
        showLogin();
        return;
    }
    document.getElementById('homePage').style.display = 'none';
    document.getElementById('createListingPage').style.display = 'none';
    document.getElementById('myListingsPage').style.display = 'none';
    const profilePage = document.getElementById('profilePage');
    if (profilePage) {
        profilePage.style.display = 'block';
        loadProfileData();
    }
    // Set active nav
    const profileNav = document.querySelector('.nav-item[onclick*="showProfile"]');
    if (profileNav) setActiveNav(profileNav);
}

// Load profile data
async function loadProfileData() {
    if (!currentUser) return;
    
    const profileName = document.getElementById('profileName');
    const profileStudentId = document.getElementById('profileStudentId');
    const profileEmail = document.getElementById('profileEmail');
    const profileCollege = document.getElementById('profileCollege');
    const profilePhone = document.getElementById('profilePhone');
    const profileUserName = document.getElementById('profileUserName');
    const profileUserEmail = document.getElementById('profileUserEmail');
    const profileAvatarInitials = document.getElementById('profileAvatarInitials');
    
    if (profileName) profileName.value = currentUser.name || '';
    if (profileStudentId) profileStudentId.value = currentUser.studentId || '';
    if (profileEmail) profileEmail.value = currentUser.email || '';
    if (profileCollege) profileCollege.value = currentUser.college || '';
    if (profilePhone) profilePhone.value = currentUser.phone || '';
    
    if (profileUserName) profileUserName.textContent = currentUser.name || 'User Name';
    if (profileUserEmail) profileUserEmail.textContent = currentUser.email || 'user@cuhksz.edu.cn';
    
    if (profileAvatarInitials) {
        const nameParts = (currentUser.name || '').split(' ');
        const initials = nameParts.length >= 2 
            ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
            : (currentUser.name || 'U').substring(0, 2).toUpperCase();
        profileAvatarInitials.textContent = initials;
    }
    
    // Load statistics
    try {
        const response = await fetch(`${API_URL}/my-listings`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const listings = await response.json();
        const statListings = document.getElementById('statListings');
        if (statListings) statListings.textContent = listings.length || 0;
    } catch (error) {
        console.error('Error loading profile stats:', error);
    }
}

// Load all listings
async function loadListings() {
    try {
        const response = await fetch(`${API_URL}/listings`);
        allListings = await response.json();
        updateCategoryCounts(allListings);
        performSearch();
    } catch (error) {
        console.error('Error loading listings:', error);
        document.getElementById('listingsContainer').innerHTML = 
            '<div class="empty-state"><h3>Error loading listings</h3></div>';
    }
}

// Refresh listings
function refreshListings() {
    loadListings();
}

// Update category counts
function updateCategoryCounts(listings) {
    const categories = ['', 'Textbooks', 'Electronics', 'Furniture', 'Clothing', 'Sports', 'Stationery', 'Kitchen', 'Vehicles', 'Other'];
    
    categories.forEach(category => {
        const count = category === '' 
            ? listings.length 
            : listings.filter(l => l.category === category).length;
        const countElement = document.getElementById(`count-${category || 'all'}`);
        if (countElement) {
            countElement.textContent = count;
        }
    });
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
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

    container.innerHTML = listings.map(listing => {
        const condition = listing.condition || 'New';
        const quantity = listing.quantity || 1;
        const sellerName = listing.sellerName || 'Unknown';
        const sellerRating = listing.sellerRating || '100%';
        const imageUrl = listing.imageUrl || '';
        
        return `
        <div class="listing-card">
            <div class="listing-image-wrapper">
                ${imageUrl 
                    ? `<img src="${imageUrl}" alt="${listing.title}" class="listing-image">`
                    : `<div class="listing-image-placeholder">${getCategoryEmoji(listing.category)}</div>`
                }
                ${condition === 'New' || condition === 'Brand New' ? '<div class="listing-badge">Brand New</div>' : ''}
                ${quantity > 1 ? `<div class="listing-quantity">${quantity} left</div>` : ''}
                <div class="listing-favorite" onclick="toggleFavorite(event, '${listing.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </div>
            </div>
            <div class="listing-content">
                <div class="listing-title">${listing.title}</div>
                <div class="listing-seller">
                    <div class="seller-icon"></div>
                    <span>${sellerName}</span>
                    <span class="seller-rating">${sellerRating}</span>
                </div>
                <div class="listing-price-section">
                    <div class="listing-price">¥${listing.price.toFixed(0)}</div>
                    <div class="listing-price-unit">per item</div>
                    <div class="listing-actions">
                        ${showDelete ? `<button onclick="deleteListing('${listing.id}')" class="btn btn-danger" style="margin-right: 0.5rem;">Delete</button>` : ''}
                        <button onclick="showListingDetail('${listing.id}')" class="btn-view">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            View
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    }).join('');
}

// Toggle favorite
function toggleFavorite(event, listingId) {
    event.stopPropagation();
    const favoriteBtn = event.currentTarget;
    favoriteBtn.classList.toggle('active');
    // TODO: Implement favorite functionality with API
}

// Get category emoji
function getCategoryEmoji(category) {
    const emojis = {
        'Textbooks': '📚',
        'Electronics': '💻',
        'Furniture': '🪑',
        'Clothing': '👕',
        'Sports': '🎾',
        'Stationery': '✏️',
        'Kitchen': '🍳',
        'Vehicles': '🚗',
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
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    const sortBy = document.getElementById('sortFilter').value;
    const college = document.getElementById('collegeFilter').value;
    
    let filteredListings = [...allListings];
    
    // Filter by search query
    if (query) {
        filteredListings = filteredListings.filter(listing => 
            listing.title.toLowerCase().includes(query) ||
            listing.description.toLowerCase().includes(query) ||
            listing.category.toLowerCase().includes(query)
        );
    }
    
    // Filter by category
    if (currentCategory) {
        filteredListings = filteredListings.filter(listing => listing.category === currentCategory);
    }
    
    // Filter by college (if college field exists)
    if (college) {
        filteredListings = filteredListings.filter(listing => listing.college === college);
    }
    
    // Sort listings
    filteredListings.sort((a, b) => {
        switch(sortBy) {
            case 'newest':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'oldest':
                return new Date(a.createdAt) - new Date(b.createdAt);
            case 'price-low':
                return a.price - b.price;
            case 'price-high':
                return b.price - a.price;
            default:
                return 0;
        }
    });
    
    displayListings(filteredListings, 'listingsContainer');
}

// Filter by category
function filterByCategory(category) {
    currentCategory = category;
    
    // Update active state of category buttons
    document.querySelectorAll('.category-filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        }
    });
    
    performSearch();
}

// Handle update profile
async function handleUpdateProfile(event) {
    event.preventDefault();
    
    if (!currentUser) {
        alert('Please login to update your profile');
        return;
    }
    
    const name = document.getElementById('profileName').value;
    const studentId = document.getElementById('profileStudentId').value;
    const email = document.getElementById('profileEmail').value;
    const college = document.getElementById('profileCollege').value;
    const phone = document.getElementById('profilePhone').value;
    
    try {
        const response = await fetch(`${API_URL}/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ name, studentId, email, college, phone })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Update current user
            currentUser = { ...currentUser, name, studentId, email, college, phone };
            localStorage.setItem('user', JSON.stringify(currentUser));
            updateUIForAuth();
            loadProfileData();
            alert('Profile updated successfully!');
        } else {
            alert(data.error || 'Failed to update profile');
        }
    } catch (error) {
        alert('Error updating profile');
    }
}

// Handle change password
async function handleChangePassword(event) {
    event.preventDefault();
    
    if (!currentUser) {
        alert('Please login to change your password');
        return;
    }
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        alert('New passwords do not match');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Password changed successfully!');
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            alert(data.error || 'Failed to change password');
        }
    } catch (error) {
        alert('Error changing password');
    }
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
