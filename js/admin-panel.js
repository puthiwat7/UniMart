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

let adminListings = [];
let currentFilter = 'all';
let currentItemId = null;
let currentImageIndex = 0;
let editingImages = [];
let accessGranted = false;

function getCachedUser() {
    try {
        const raw = localStorage.getItem('unimart_last_user');
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        return null;
    }
}

function parseListingsFromKey(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && Array.isArray(parsed.listings)) return parsed.listings;
        return [];
    } catch (error) {
        console.warn(`Failed to parse listings from key: ${key}`, error);
        return [];
    }
}

function safeWriteListings(listings) {
    const payload = JSON.stringify(listings);

    try {
        localStorage.setItem(USER_LISTINGS_KEY, payload);
    } catch (error) {
        console.warn('Unable to save listings to primary key:', error);
    }

    try {
        localStorage.setItem(LEGACY_LISTINGS_KEY, payload);
    } catch (error) {
        console.warn('Unable to save listings to legacy key:', error);
    }
}

function normalizeListing(item, index = 0) {
    if (!item || typeof item !== 'object') return null;

    const rawStatus = String(item.status || 'active').toLowerCase();
    const status = rawStatus === 'withdrawed' ? 'withdrawn' : rawStatus;

    return {
        id: item.id || Date.now() + index,
        title: String(item.title || 'Untitled Item'),
        price: String(item.price || '¥0.00'),
        category: String(item.category || 'Other'),
        image: String(item.image || '📦'),
        imageUrl: item.imageUrl || (Array.isArray(item.images) && item.images[0]) || '',
        images: Array.isArray(item.images) ? item.images.filter(Boolean) : [],
        badge: String(item.badge || 'Used'),
        description: String(item.description || ''),
        quantity: Number(item.quantity) || 1,
        seller: String(item.seller || 'Campus Seller'),
        sellerUid: item.sellerUid || null,
        sellerEmail: item.sellerEmail ? String(item.sellerEmail).toLowerCase() : '',
        status,
        listedDate: item.listedDate || item.listedAt || new Date().toISOString().split('T')[0],
        soldDate: item.soldDate || null
    };
}

function removeSampleItemsFromStorage() {
    const sampleTitlesLower = Array.from(SAMPLE_TITLES).map((t) => t.toLowerCase());

    [USER_LISTINGS_KEY, LEGACY_LISTINGS_KEY].forEach((key) => {
        const items = parseListingsFromKey(key);
        if (!items.length) return;

        const filtered = items.filter((item) => {
            const title = String(item?.title || '').trim().toLowerCase();
            return !sampleTitlesLower.includes(title);
        });

        if (filtered.length !== items.length) {
            try {
                localStorage.setItem(key, JSON.stringify(filtered));
            } catch (error) {
                console.warn(`Unable to write filtered listings to ${key}:`, error);
            }
        }
    });
}

async function loadAllListings() {
    if (!window.unimartListingsSync || typeof window.unimartListingsSync.getAllListingsFromCloud !== 'function') {
        return [];
    }

    const all = await window.unimartListingsSync.getAllListingsFromCloud();
    return all.map((item, index) => normalizeListing(item, index)).filter(Boolean);
}

async function persistAllChanges() {
    if (!window.unimartListingsSync || typeof window.unimartListingsSync.replaceAllListingsInCloud !== 'function') {
        throw new Error('Cloud listing service is unavailable.');
    }

    await window.unimartListingsSync.replaceAllListingsInCloud(adminListings);
}

async function refreshAdminView() {
    adminListings = await loadAllListings();
    renderAdminSales(adminListings);
    updateAdminStats();
}

function updateAdminStats() {
    const total = adminListings.length;
    const active = adminListings.filter((item) => item.status === 'active').length;
    const sold = adminListings.filter((item) => item.status === 'sold').length;

    document.getElementById('adminTotalListings').textContent = total;
    document.getElementById('adminActiveListings').textContent = active;
    document.getElementById('adminSoldListings').textContent = sold;
}

function setupFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach((b) => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentFilter = e.currentTarget.dataset.filter;
            filterAdminSales();
        });
    });
}

function filterAdminSales() {
    let filtered = adminListings;

    if (currentFilter !== 'all') {
        filtered = adminListings.filter((item) => item.status === currentFilter);
    }

    renderAdminSales(filtered);
}

function renderAdminSales(salesToRender) {
    const grid = document.getElementById('adminSalesGrid');
    grid.innerHTML = '';

    if (!salesToRender.length) {
        grid.innerHTML = `
            <div class="my-sales-empty-state">
                <i class="fas fa-inbox"></i>
                <p>No items found</p>
            </div>
        `;
        return;
    }

    salesToRender.forEach((item) => {
        const card = createAdminSaleCard(item);
        grid.appendChild(card);
    });
}

function createAdminSaleCard(item) {
    const card = document.createElement('div');
    card.className = 'product-card';

    const statusText = item.status === 'sold' ? 'SOLD' : (item.status === 'withdrawn' ? 'WITHDRAWN' : 'ACTIVE');
    const statusClass = item.status === 'sold' ? 'status-sold' : (item.status === 'withdrawn' ? 'status-withdrawn' : 'status-active');

    let cardImage = '📦';
    if (item.imageUrl || (item.images && item.images.length > 0)) {
        const imgSrc = item.imageUrl || item.images[0];
        cardImage = `<img src="${imgSrc}" alt="${item.title}" class="sale-card-image">`;
    } else if (item.image) {
        cardImage = item.image;
    }

    card.innerHTML = `
        <div class="product-image" onclick="openAdminModal(${item.id})">${cardImage}</div>
        <div class="product-info">
            <span class="product-badge sale-status-badge ${statusClass}">${statusText}</span>
            <h3 class="product-title" onclick="openAdminModal(${item.id})">${item.title}</h3>
            <div class="product-price">${item.price}</div>
            <div class="product-seller">${item.category}</div>
            <div class="admin-owner-line">${item.seller} ${item.sellerEmail ? `(${item.sellerEmail})` : ''}</div>
            <div class="sale-meta-line">
                <p><strong>Listed:</strong> ${String(item.listedDate).split('T')[0]}</p>
            </div>
            <div class="product-actions">
                <button onclick="openAdminModal(${item.id})">Manage Item</button>
            </div>
        </div>
    `;

    return card;
}

function getItemById(itemId) {
    return adminListings.find((item) => item.id === itemId) || null;
}

function getItemImages(item) {
    if (!item) return [];
    if (Array.isArray(item.images) && item.images.length) return item.images.filter(Boolean);
    if (item.imageUrl) return [item.imageUrl];
    return [];
}

function renderModalImage() {
    const item = getItemById(currentItemId);
    const imageBox = document.getElementById('adminCarouselImage');
    const prevBtn = document.getElementById('adminPrevBtn');
    const nextBtn = document.getElementById('adminNextBtn');
    const images = getItemImages(item);

    if (!imageBox) return;

    if (!images.length) {
        imageBox.innerHTML = '<div style="font-size: 14px; color: #9ca3af;">No image available</div>';
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        return;
    }

    if (currentImageIndex >= images.length) currentImageIndex = 0;
    if (currentImageIndex < 0) currentImageIndex = images.length - 1;

    imageBox.innerHTML = `<img src="${images[currentImageIndex]}" alt="${item.title}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;

    const showNav = images.length > 1;
    if (prevBtn) prevBtn.style.display = showNav ? 'flex' : 'none';
    if (nextBtn) nextBtn.style.display = showNav ? 'flex' : 'none';
}

function openAdminModal(itemId) {
    const item = getItemById(itemId);
    if (!item) return;

    currentItemId = itemId;
    currentImageIndex = 0;

    document.getElementById('adminModalTitle').textContent = item.title;
    document.getElementById('adminModalPrice').textContent = item.price;
    document.getElementById('adminModalBadge').textContent = item.badge;
    document.getElementById('adminModalDescription').textContent = item.description || 'No description available.';
    document.getElementById('adminModalCategory').textContent = item.category;
    document.getElementById('adminModalQuantity').textContent = String(item.quantity || 1);
    document.getElementById('adminModalStatus').textContent = String(item.status || 'active').toUpperCase();
    document.getElementById('adminModalSellerName').textContent = item.seller || 'Campus Seller';
    document.getElementById('adminModalSellerEmail').textContent = item.sellerEmail || '-';

    const canManage = item.status === 'active';
    document.getElementById('adminEditBtn').style.display = canManage ? 'inline-flex' : 'none';
    document.getElementById('adminWithdrawBtn').style.display = canManage ? 'inline-flex' : 'none';
    document.getElementById('adminMarkSoldBtn').style.display = canManage ? 'inline-flex' : 'none';

    document.getElementById('adminViewPanel').style.display = 'block';
    document.getElementById('adminEditPanel').style.display = 'none';

    renderModalImage();
    document.getElementById('adminSalesModal').classList.add('active');
}

function closeAdminModal() {
    document.getElementById('adminSalesModal').classList.remove('active');
    currentItemId = null;
    currentImageIndex = 0;
    editingImages = [];
}

function openAdminEditPanel() {
    const item = getItemById(currentItemId);
    if (!item || item.status !== 'active') return;

    document.getElementById('adminEditTitle').value = item.title;
    document.getElementById('adminEditPrice').value = String(item.price).replace(/[^\d.]/g, '');
    document.getElementById('adminEditDescription').value = item.description || '';
    document.getElementById('adminEditCategory').value = item.category || 'Other';
    document.getElementById('adminEditCondition').value = item.badge || 'Used';
    document.getElementById('adminEditQuantity').value = item.quantity || 1;

    editingImages = [...getItemImages(item)];
    renderEditImagesPreview();

    document.getElementById('adminViewPanel').style.display = 'none';
    document.getElementById('adminEditPanel').style.display = 'block';
}

function closeAdminEditPanel() {
    document.getElementById('adminEditPanel').style.display = 'none';
    document.getElementById('adminViewPanel').style.display = 'block';
}

function renderEditImagesPreview() {
    const preview = document.getElementById('adminEditImagesPreview');
    if (!preview) return;

    preview.innerHTML = '';

    if (!editingImages.length) {
        preview.innerHTML = '<div style="color: #9ca3af; font-size: 13px;">No images selected</div>';
        return;
    }

    editingImages.forEach((imgSrc, index) => {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.innerHTML = `
            <img src="${imgSrc}" alt="Image ${index + 1}" style="width: 100%; height: 88px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb;">
            <button type="button" data-index="${index}" style="position: absolute; top: 4px; right: 4px; background: #ef4444; color: #fff; border: none; border-radius: 999px; width: 22px; height: 22px; cursor: pointer;">&times;</button>
        `;
        preview.appendChild(wrapper);
    });

    preview.querySelectorAll('button[data-index]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const index = Number(btn.getAttribute('data-index'));
            if (Number.isInteger(index)) {
                editingImages.splice(index, 1);
                renderEditImagesPreview();
            }
        });
    });
}

async function saveAdminEdit() {
    const item = getItemById(currentItemId);
    if (!item || item.status !== 'active') return;

    const title = document.getElementById('adminEditTitle').value.trim();
    const priceValue = Number(document.getElementById('adminEditPrice').value);
    const description = document.getElementById('adminEditDescription').value.trim();
    const category = document.getElementById('adminEditCategory').value;
    const condition = document.getElementById('adminEditCondition').value;
    const quantityValue = Number(document.getElementById('adminEditQuantity').value);

    if (!title) return alert('Title is required.');
    if (!Number.isFinite(priceValue) || priceValue <= 0) return alert('Please enter a valid price.');
    if (!description) return alert('Description is required.');
    if (!Number.isFinite(quantityValue) || quantityValue < 1) return alert('Quantity must be at least 1.');
    if (!editingImages.length) return alert('At least 1 image is required.');

    item.title = title;
    item.price = `¥${priceValue.toFixed(2)}`;
    item.description = description;
    item.category = category;
    item.badge = condition;
    item.quantity = Math.floor(quantityValue);
    item.images = [...editingImages];
    item.imageUrl = editingImages[0] || '';

    await persistAllChanges();
    updateAdminStats();
    filterAdminSales();
    openAdminModal(item.id);
    alert('Listing updated successfully!');
}

async function withdrawCurrentListing() {
    const item = getItemById(currentItemId);
    if (!item || item.status !== 'active') return;
    if (!confirm('Are you sure you want to withdraw this listing?')) return;

    item.status = 'withdrawn';
    await persistAllChanges();
    updateAdminStats();
    filterAdminSales();
    closeAdminModal();
    alert('Listing withdrawn successfully!');
}

async function markCurrentListingSold() {
    const item = getItemById(currentItemId);
    if (!item || item.status !== 'active') return;

    item.status = 'sold';
    item.soldDate = new Date().toISOString().split('T')[0];
    await persistAllChanges();
    updateAdminStats();
    filterAdminSales();
    closeAdminModal();
    alert('Listing marked as sold!');
}

function setupAdminModal() {
    const closeBtn = document.getElementById('adminModalCloseBtn');
    const overlay = document.getElementById('adminModalOverlay');
    const prevBtn = document.getElementById('adminPrevBtn');
    const nextBtn = document.getElementById('adminNextBtn');
    const editBtn = document.getElementById('adminEditBtn');
    const withdrawBtn = document.getElementById('adminWithdrawBtn');
    const markSoldBtn = document.getElementById('adminMarkSoldBtn');
    const cancelEditBtn = document.getElementById('adminCancelEditBtn');
    const saveEditBtn = document.getElementById('adminSaveEditBtn');
    const editImagesInput = document.getElementById('adminEditImages');

    if (closeBtn) closeBtn.addEventListener('click', closeAdminModal);
    if (overlay) overlay.addEventListener('click', closeAdminModal);

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            const item = getItemById(currentItemId);
            const images = getItemImages(item);
            if (images.length <= 1) return;
            currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
            renderModalImage();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const item = getItemById(currentItemId);
            const images = getItemImages(item);
            if (images.length <= 1) return;
            currentImageIndex = (currentImageIndex + 1) % images.length;
            renderModalImage();
        });
    }

    if (editBtn) editBtn.addEventListener('click', openAdminEditPanel);
    if (withdrawBtn) withdrawBtn.addEventListener('click', withdrawCurrentListing);
    if (markSoldBtn) markSoldBtn.addEventListener('click', markCurrentListingSold);
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeAdminEditPanel);
    if (saveEditBtn) saveEditBtn.addEventListener('click', saveAdminEdit);

    if (editImagesInput) {
        editImagesInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;

            files.forEach((file) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (event.target && typeof event.target.result === 'string') {
                        editingImages.push(event.target.result);
                        renderEditImagesPreview();
                    }
                };
                reader.readAsDataURL(file);
            });

            e.target.value = '';
        });
    }
}

function renderAdminEmailList() {
    const list = document.getElementById('adminEmailList');
    if (!list || !window.unimartAdminAccess) return;

    const emails = window.unimartAdminAccess.getAdminEmails();
    list.innerHTML = '';

    emails.forEach((email) => {
        const li = document.createElement('li');
        li.className = 'admin-email-item';
        li.innerHTML = `<span>${email}</span><span class="admin-tag">Admin</span>`;
        list.appendChild(li);
    });
}

function setupAdminEmailManagement() {
    const input = document.getElementById('newAdminEmail');
    const addBtn = document.getElementById('addAdminEmailBtn');

    if (!input || !addBtn || !window.unimartAdminAccess) return;

    const handleAdd = () => {
        const result = window.unimartAdminAccess.addAdminEmail(input.value);
        if (!result.ok) {
            alert(result.message);
            return;
        }

        input.value = '';
        renderAdminEmailList();
        alert('Admin email added successfully.');
    };

    addBtn.addEventListener('click', handleAdd);
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleAdd();
        }
    });

    renderAdminEmailList();
}

function redirectNonAdmin() {
    alert('You do not have access to the Admin Panel.');
    window.location.href = '../index.html';
}

function verifyAdminAccess(user) {
    if (!user || !user.email || !window.unimartAdminAccess) return false;
    return window.unimartAdminAccess.isCurrentUserAdmin(user);
}

async function initializeAdminPage() {
    if (accessGranted) {
        await refreshAdminView();
        return;
    }

    const cachedUser = getCachedUser();
    if (cachedUser && verifyAdminAccess(cachedUser)) {
        accessGranted = true;
        await refreshAdminView();
        return;
    }

    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = 'login.html';
                return;
            }

            if (!verifyAdminAccess(user)) {
                redirectNonAdmin();
                return;
            }

            accessGranted = true;
            await refreshAdminView();
        });
        return;
    }

    redirectNonAdmin();
}

document.addEventListener('DOMContentLoaded', async () => {
    setupFilters();
    setupAdminModal();
    setupAdminEmailManagement();
    await initializeAdminPage();
});

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && accessGranted) {
        refreshAdminView();
    }
});

window.addEventListener('focus', () => {
    if (accessGranted) {
        refreshAdminView();
    }
});
