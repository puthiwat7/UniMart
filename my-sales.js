// Sample user sales data
const mySalesData = [
    {
        id: 101,
        title: "Used Calculus Textbook",
        price: "$30.00",
        category: "Textbooks",
        image: "📚",
        badge: "Used",
        status: "sold",
        buyer: "Jane Smith",
        soldDate: "2026-01-20"
    },
    {
        id: 102,
        title: "Mechanical Keyboard",
        price: "$55.00",
        category: "Electronics",
        image: "⌨️",
        badge: "Like New",
        status: "active",
        listedDate: "2026-01-15"
    },
    {
        id: 103,
        title: "Desk Chair",
        price: "$45.00",
        category: "Furniture",
        image: "🪑",
        badge: "Used",
        status: "active",
        listedDate: "2026-01-18"
    },
    {
        id: 104,
        title: "Vintage Lamp",
        price: "$20.00",
        category: "Furniture",
        image: "🔦",
        badge: "Used",
        status: "sold",
        buyer: "Mike Johnson",
        soldDate: "2026-01-12"
    }
];

let currentSalesFilter = 'all';

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    renderSales(mySalesData);
    checkAuthStatus();
    setupSalesFilters();
    updateSalesStats();
});

// Update sales statistics
function updateSalesStats() {
    const totalSales = mySalesData.filter(item => item.status === 'sold').length;
    const activeListings = mySalesData.filter(item => item.status === 'active').length;
    
    document.getElementById('totalSales').textContent = totalSales;
    document.getElementById('activeListing').textContent = activeListings;
}

// Setup sales filter buttons
function setupSalesFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentSalesFilter = e.target.dataset.filter;
            filterSales();
        });
    });
}

// Filter sales based on status
function filterSales() {
    let filtered = mySalesData;
    
    if (currentSalesFilter !== 'all') {
        filtered = mySalesData.filter(item => item.status === currentSalesFilter);
    }
    
    renderSales(filtered);
}

// Render sales items
function renderSales(salesToRender) {
    const grid = document.getElementById('salesGrid');
    grid.innerHTML = '';

    if (salesToRender.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 48px; color: #6b7280;">
                <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                <p>No items found</p>
                <a href="sell-item.html" style="display: inline-block; margin-top: 16px; padding: 8px 16px; background-color: #4a5fc1; color: white; text-decoration: none; border-radius: 6px;">
                    Start Selling
                </a>
            </div>
        `;
        return;
    }

    salesToRender.forEach(item => {
        const card = createSaleCard(item);
        grid.appendChild(card);
    });
}

// Create sale card
function createSaleCard(item) {
    const card = document.createElement('div');
    card.className = 'product-card';
    const statusColor = item.status === 'sold' ? '#10b981' : '#f59e0b';
    const statusText = item.status === 'sold' ? '✓ SOLD' : '📍 ACTIVE';
    
    let extraInfo = '';
    if (item.status === 'sold') {
        extraInfo = `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
                <p><strong>Buyer:</strong> ${item.buyer}</p>
                <p><strong>Sold:</strong> ${item.soldDate}</p>
            </div>
        `;
    } else {
        extraInfo = `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
                <p><strong>Listed:</strong> ${item.listedDate}</p>
            </div>
        `;
    }
    
    card.innerHTML = `
        <div class="product-image">${item.image}</div>
        <div class="product-info">
            <span class="product-badge" style="background-color: ${statusColor}; color: white;">${statusText}</span>
            <h3 class="product-title">${item.title}</h3>
            <div class="product-price">${item.price}</div>
            <div class="product-category" style="color: #6b7280; font-size: 12px;">${item.category}</div>
            ${extraInfo}
            <div class="product-actions">
                <button onclick="handleViewSaleDetails(${item.id})">View Details</button>
                ${item.status === 'active' ? `<button onclick="handleRemoveListing(${item.id})" style="background-color: #ef4444;">Remove</button>` : ''}
            </div>
        </div>
    `;
    return card;
}

// Handle view sale details
function handleViewSaleDetails(itemId) {
    const item = mySalesData.find(i => i.id === itemId);
    if (item) {
        let message = `Item: ${item.title}\nPrice: ${item.price}\nStatus: ${item.status.toUpperCase()}`;
        if (item.status === 'sold') {
            message += `\nBuyer: ${item.buyer}\nSold Date: ${item.soldDate}`;
        }
        alert(message);
    }
}

// Handle remove listing
function handleRemoveListing(itemId) {
    if (confirm('Are you sure you want to remove this listing?')) {
        const index = mySalesData.findIndex(i => i.id === itemId);
        if (index > -1) {
            mySalesData.splice(index, 1);
            updateSalesStats();
            filterSales();
            alert('Listing removed successfully!');
        }
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

// Handle logout
function logout() {
    localStorage.removeItem('userProfile');
    showLoginButton();
    alert('Signed out successfully!');
}
