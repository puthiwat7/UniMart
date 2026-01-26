// Sample product data
const products = [
    {
        id: 1,
        title: "Introduction to Algorithms",
        price: "$25.00",
        category: "Textbooks",
        seller: "John Doe",
        image: "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&h=400&fit=crop",
        badge: "Brand New"
    },
    {
        id: 2,
        title: "Wireless Bluetooth Headphones",
        price: "$45.00",
        category: "Electronics",
        seller: "Sarah Lee",
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
        badge: "Like New"
    },
    {
        id: 3,
        title: "Wooden Desk Lamp",
        price: "$15.00",
        category: "Furniture",
        seller: "Mike Chen",
        image: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400&h=400&fit=crop",
        badge: "Used"
    },
    {
        id: 4,
        title: "Winter Jacket",
        price: "$35.00",
        category: "Clothing",
        seller: "Emma Wilson",
        image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop",
        badge: "Like New"
    },
    {
        id: 5,
        title: "Basketball",
        price: "$20.00",
        category: "Sports",
        seller: "Alex Johnson",
        image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=400&fit=crop",
        badge: "Used"
    },
    {
        id: 6,
        title: "Notebook Set",
        price: "$8.00",
        category: "Stationery",
        seller: "Lisa Park",
        image: "https://images.unsplash.com/photo-1517842645767-c639042777db?w=400&h=400&fit=crop",
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
    setupPaymentModal(); // Setup payment modal
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
            <img src="${product.image}" alt="${product.title}" onerror="this.src='https://via.placeholder.com/400x400?text=No+Image'">
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

// Building data for each college
const buildingsByCollege = {
    'Shaw': ['A', 'B', 'C', 'D', 'E', 'F'],
    'Ling': ['A', 'B', 'C'],
    'Muse': ['A', 'B', 'C'],
    'Diligentia': ['A', 'B', 'C'],
    'Harmonia': ['A', 'B', 'C', 'D'],
    'Minerva': ['A', 'C']
};

// Payment modal variables
let paymentTimer = null;
let paymentTimeLeft = 600; // 10 minutes in seconds
let currentOrderSerial = '';
let currentOrderData = null;

function openProductModal(product) {
    currentProduct = product;
    currentImageIndex = 0;

    // Update modal content
    document.getElementById('modalProductTitle').textContent = product.title;
    document.getElementById('modalProductPrice').textContent = product.price;
    document.getElementById('modalSeller').textContent = product.seller;
    document.getElementById('modalBadge').textContent = product.badge;
    
    // Update carousel image
    const carouselImage = document.getElementById('carouselImage');
    carouselImage.innerHTML = `<img src="${product.image}" alt="${product.title}" style="max-width: 100%; max-height: 100%; object-fit: contain;" onerror="this.parentElement.textContent='📦'">`;
    
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
    const modalCollege = document.getElementById('modalCollege');
    const modalBuilding = document.getElementById('modalBuilding');
    const modalOrderBtn = document.getElementById('modalOrderBtn');
    const qrWarning = document.getElementById('qrWarning');
    
    // Check if user has QR code uploaded
    let userHasQR = false;
    try {
        const userData = localStorage.getItem('unimart_user');
        if (userData) {
            const user = JSON.parse(userData);
            userHasQR = user.paymentQR !== null && user.paymentQR !== undefined;
        }
    } catch (error) {
        console.error('Error checking user QR status:', error);
    }
    
    const collegeSelected = modalCollege && modalCollege.value !== '';
    const buildingSelected = modalBuilding && modalBuilding.value !== '';
    
    // Show/hide QR warning
    if (qrWarning) {
        qrWarning.style.display = !userHasQR ? 'flex' : 'none';
    }
    
    if (modalOrderBtn) {
        if (collegeSelected && buildingSelected && userHasQR) {
            modalOrderBtn.disabled = false;
            modalOrderBtn.title = '';
        } else {
            modalOrderBtn.disabled = true;
            
            // Set helpful tooltip message
            if (!userHasQR) {
                modalOrderBtn.title = 'Please upload your payment QR code in your profile first';
            } else if (!collegeSelected) {
                modalOrderBtn.title = 'Please select your delivery college';
            } else if (!buildingSelected) {
                modalOrderBtn.title = 'Please select your building';
            }
        }
    }
}

// Reset modal form when closing
function resetModalForm() {
    const modalCollege = document.getElementById('modalCollege');
    const modalBuilding = document.getElementById('modalBuilding');
    const modalNotes = document.getElementById('modalNotes');
    const buildingSection = document.getElementById('buildingSection');
    
    if (modalCollege) modalCollege.value = '';
    if (modalBuilding) modalBuilding.value = '';
    if (modalNotes) modalNotes.value = '';
    if (buildingSection) buildingSection.style.display = 'none';
    
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

    // College selection change
    const modalCollege = document.getElementById('modalCollege');
    if (modalCollege) {
        modalCollege.addEventListener('change', (e) => {
            const selectedCollege = e.target.value;
            const buildingSection = document.getElementById('buildingSection');
            const modalBuilding = document.getElementById('modalBuilding');
            
            if (selectedCollege && buildingsByCollege[selectedCollege]) {
                // Show building section
                buildingSection.style.display = 'flex';
                
                // Populate buildings
                const buildings = buildingsByCollege[selectedCollege];
                modalBuilding.innerHTML = '<option value="">Select building</option>';
                buildings.forEach(building => {
                    const option = document.createElement('option');
                    option.value = building;
                    option.textContent = `Building ${building}`;
                    modalBuilding.appendChild(option);
                });
                
                // Reset building selection
                modalBuilding.value = '';
            } else {
                // Hide building section if no college selected
                buildingSection.style.display = 'none';
                modalBuilding.value = '';
            }
            
            // Check if order button should be enabled
            checkOrderButtonStatus();
        });
    }

    // Building selection change
    const modalBuilding = document.getElementById('modalBuilding');
    if (modalBuilding) {
        modalBuilding.addEventListener('change', () => {
            checkOrderButtonStatus();
        });
    }

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
            if (currentProduct && !modalOrderBtn.disabled) {
                const college = document.getElementById('modalCollege').value;
                const building = document.getElementById('modalBuilding').value;
                const notes = document.getElementById('modalNotes').value;
                
                // Prepare order data
                const orderData = {
                    itemName: currentProduct.title,
                    price: currentProduct.price,
                    college: college,
                    building: building,
                    notes: notes,
                    seller: currentProduct.seller,
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

// ======================== Payment Modal Functions ========================
// Generate random serial number in format: CUHK + random 8 chars
function generateSerialNumber() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let serial = 'CUHK';
    for (let i = 0; i < 8; i++) {
        serial += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return serial;
}

// Format time in MM:SS format
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Open payment modal
function openPaymentModal(orderData) {
    currentOrderData = orderData;
    currentOrderSerial = generateSerialNumber();
    paymentTimeLeft = 600; // Reset to 10 minutes
    
    const paymentModal = document.getElementById('paymentModal');
    const timerDisplay = document.getElementById('timerDisplay');
    const paymentTimer = document.getElementById('paymentTimer');
    
    // Update modal content
    document.getElementById('paymentItemName').textContent = orderData.itemName;
    document.getElementById('paymentDeliveryLocation').textContent = `${orderData.college} - Building ${orderData.building}`;
    document.getElementById('deliveryLocationAfter').textContent = `${orderData.college} - Building ${orderData.building}`;
    document.getElementById('paymentAmount').textContent = orderData.price;
    document.getElementById('serialNumber').textContent = currentOrderSerial;
    document.getElementById('serialNumberInSteps').textContent = currentOrderSerial;
    
    // Load user's payment QR code
    try {
        const userData = localStorage.getItem('unimart_user');
        if (userData) {
            const user = JSON.parse(userData);
            if (user.paymentQR) {
                const qrCodeImage = document.getElementById('paymentQRCode');
                qrCodeImage.innerHTML = `<img src="${user.paymentQR}" alt="Payment QR Code" style="max-width: 100%; max-height: 240px;">`;
            }
        }
    } catch (error) {
        console.error('Error loading payment QR:', error);
    }
    
    // Start timer
    startPaymentTimer();
    
    // Show modal
    paymentModal.classList.add('active');
}

// Close payment modal
function closePaymentModal() {
    const paymentModal = document.getElementById('paymentModal');
    paymentModal.classList.remove('active');
    
    // Clear timer
    if (paymentTimer) {
        clearInterval(paymentTimer);
        paymentTimer = null;
    }
    
    currentOrderData = null;
    currentOrderSerial = '';
}

// Start payment timer
function startPaymentTimer() {
    const timerDisplay = document.getElementById('timerDisplay');
    const timerElement = document.getElementById('paymentTimer');
    
    // Clear any existing timer
    if (paymentTimer) {
        clearInterval(paymentTimer);
    }
    
    paymentTimer = setInterval(() => {
        paymentTimeLeft--;
        timerDisplay.textContent = formatTime(paymentTimeLeft);
        
        // Update timer color based on time remaining
        timerElement.classList.remove('warning', 'danger');
        if (paymentTimeLeft <= 60) {
            timerElement.classList.add('danger');
        } else if (paymentTimeLeft <= 180) {
            timerElement.classList.add('warning');
        }
        
        // Auto-cancel when time runs out
        if (paymentTimeLeft <= 0) {
            clearInterval(paymentTimer);
            alert('Order has expired due to timeout. Please try again.');
            closePaymentModal();
        }
    }, 1000);
}

// Copy serial number to clipboard
function copySerialNumber() {
    const serialNumber = document.getElementById('serialNumber').textContent;
    
    // Modern clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(serialNumber).then(() => {
            showCopyConfirmation();
        }).catch(err => {
            // Fallback for older browsers
            fallbackCopySerial(serialNumber);
        });
    } else {
        fallbackCopySerial(serialNumber);
    }
}

// Fallback copy method
function fallbackCopySerial(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
        showCopyConfirmation();
    } catch (err) {
        alert('Failed to copy. Please copy manually: ' + text);
    }
    
    document.body.removeChild(textarea);
}

// Show copy confirmation
function showCopyConfirmation() {
    const btn = document.getElementById('btnCopySerial');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
    btn.style.background = '#dcfce7';
    btn.style.color = '#166534';
    btn.style.borderColor = '#86efac';
    
    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.style.background = 'white';
        btn.style.color = '#991b1b';
        btn.style.borderColor = '#dc2626';
    }, 2000);
}

// Handle order cancellation
function handleCancelOrder() {
    const confirmed = confirm('Are you sure you want to cancel this order?');
    if (confirmed) {
        closePaymentModal();
        alert('Order has been cancelled.');
    }
}

// Handle payment made confirmation
function handlePaymentMade() {
    const confirmed = confirm('Have you completed the payment and included the serial number in the payment note?');
    if (confirmed) {
        alert('Thank you! We will verify your payment within 2-4 hours and notify you once confirmed.');
        closePaymentModal();
        // Here you would typically send the order data to your backend
    }
}

// Setup payment modal event listeners
function setupPaymentModal() {
    const paymentModalClose = document.getElementById('paymentModalClose');
    const paymentModalOverlay = document.getElementById('paymentModalOverlay');
    const btnCopySerial = document.getElementById('btnCopySerial');
    const btnCancelOrder = document.getElementById('btnCancelOrder');
    const btnPaymentMade = document.getElementById('btnPaymentMade');
    
    if (paymentModalClose) {
        paymentModalClose.addEventListener('click', closePaymentModal);
    }
    
    if (paymentModalOverlay) {
        paymentModalOverlay.addEventListener('click', closePaymentModal);
    }
    
    if (btnCopySerial) {
        btnCopySerial.addEventListener('click', copySerialNumber);
    }
    
    if (btnCancelOrder) {
        btnCancelOrder.addEventListener('click', handleCancelOrder);
    }
    
    if (btnPaymentMade) {
        btnPaymentMade.addEventListener('click', handlePaymentMade);
    }
}
