# Modal Component - Code Reference

## Complete Modal HTML Structure

```html
<!-- Product Detail Modal -->
<div class="product-modal" id="productModal">
    <div class="modal-overlay" id="modalOverlay"></div>
    <div class="modal-content">
        <button class="modal-close" id="modalCloseBtn">
            <i class="fas fa-times"></i>
        </button>

        <div class="modal-body modal-body-grid">
            <!-- LEFT COLUMN: Image Section -->
            <div class="modal-image-section">
                <div class="image-carousel">
                    <button class="carousel-btn prev-btn" id="prevBtn">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <div class="carousel-image" id="carouselImage">📱</div>
                    <button class="carousel-btn next-btn" id="nextBtn">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                <div class="badge-group">
                    <span class="badge" id="modalBadge">Brand New</span>
                </div>
            </div>

            <!-- RIGHT COLUMN: Details Section -->
            <div class="modal-details-section">
                <!-- Title & Price (Always Visible) -->
                <div class="modal-header-content">
                    <h2 id="modalProductTitle">Product Title</h2>
                    <div class="modal-price" id="modalProductPrice">$0.00</div>
                </div>

                <!-- Description (Conditional) -->
                <div class="modal-section" id="descriptionSection" style="display: none;">
                    <h4><i class="fas fa-align-left"></i> Description</h4>
                    <p id="modalDescription"></p>
                </div>

                <!-- Product Info Grid (Conditional Fields) -->
                <div class="product-info-grid">
                    <!-- Category -->
                    <div class="info-item" id="categoryItem" style="display: none;">
                        <label><i class="fas fa-tag"></i> Category</label>
                        <span id="modalCategory"></span>
                    </div>

                    <!-- College -->
                    <div class="info-item" id="collegeItem" style="display: none;">
                        <label><i class="fas fa-graduation-cap"></i> College</label>
                        <span id="modalCollege"></span>
                    </div>

                    <!-- Seller Name -->
                    <div class="info-item" id="sellerItem" style="display: none;">
                        <label><i class="fas fa-user-circle"></i> Seller</label>
                        <span id="modalSellerName"></span>
                    </div>

                    <!-- Condition with Color-Coded Progress Bar -->
                    <div class="info-item" id="conditionItem" style="display: none;">
                        <label><i class="fas fa-heartbeat"></i> Condition</label>
                        <div class="condition-display">
                            <span class="condition-percentage" id="modalCondition"></span>
                            <div class="condition-bar">
                                <div class="condition-fill" id="modalConditionBar"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Quality Badge -->
                    <div class="info-item" id="qualityItem" style="display: none;">
                        <label><i class="fas fa-star"></i> Quality</label>
                        <span class="quality-badge" id="modalQuality"></span>
                    </div>

                    <!-- Availability Status -->
                    <div class="info-item" id="availabilityItem" style="display: none;">
                        <label><i class="fas fa-box"></i> Status</label>
                        <span id="modalReservedStatus"></span>
                    </div>
                </div>

                <!-- QR Warning (Conditional) -->
                <div class="qr-warning" id="qrWarning" style="display: none;">
                    <i class="fas fa-exclamation-circle"></i>
                    <div>
                        <strong>Upload QR first</strong>
                        <p>Please upload your Profile QR code in your <a href="pages/profile">profile</a> to complete orders.</p>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="modal-actions">
                    <button class="btn-order" id="modalOrderBtn" disabled>
                        <i class="fas fa-check-circle"></i>
                        Contact Seller
                    </button>
                    <button class="btn-save" id="modalSaveBtn">
                        <i class="fas fa-heart"></i>
                        Save
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
```

---

## JavaScript Logic - openProductModal()

```javascript
function openProductModal(product) {
    currentProduct = product;
    currentImageIndex = 0;

    // ===== TITLE & PRICE (Always displayed) =====
    document.getElementById('modalProductTitle').textContent = product.title || 'Product';
    document.getElementById('modalProductPrice').textContent = product.price || '$0.00';
    document.getElementById('modalBadge').textContent = product.badge || 'Used';
    
    // ===== DISPLAY IMAGE =====
    renderCurrentModalImage();
    
    // ===== DESCRIPTION (Show if exists) =====
    const descriptionSection = document.getElementById('descriptionSection');
    if (product.description) {
        document.getElementById('modalDescription').textContent = product.description;
        descriptionSection.style.display = 'block';
    } else {
        descriptionSection.style.display = 'none';
    }

    // ===== CATEGORY (Show if exists) =====
    const categoryItem = document.getElementById('categoryItem');
    if (product.category) {
        document.getElementById('modalCategory').textContent = product.category;
        categoryItem.style.display = 'flex';
    } else {
        categoryItem.style.display = 'none';
    }

    // ===== COLLEGE (Show if exists) =====
    const collegeItem = document.getElementById('collegeItem');
    if (product.college) {
        document.getElementById('modalCollege').textContent = product.college;
        collegeItem.style.display = 'flex';
    } else {
        collegeItem.style.display = 'none';
    }

    // ===== SELLER NAME (Show if exists) =====
    const sellerItem = document.getElementById('sellerItem');
    if (product.seller) {
        document.getElementById('modalSellerName').textContent = product.seller;
        sellerItem.style.display = 'flex';
    } else {
        sellerItem.style.display = 'none';
    }

    // ===== CONDITION with Color Coding (Show if exists) =====
    const conditionItem = document.getElementById('conditionItem');
    const conditionValue = getConditionPercentage(product);
    if (conditionValue !== null) {
        const conditionPercent = document.getElementById('modalCondition');
        const conditionBar = document.getElementById('modalConditionBar');
        
        conditionPercent.textContent = `${conditionValue}%`;
        conditionBar.style.width = `${conditionValue}%`;
        
        // Color code: Green (>70%), Amber (40-70%), Red (<40%)
        if (conditionValue >= 70) {
            conditionBar.style.backgroundColor = '#10b981'; // Green
        } else if (conditionValue >= 40) {
            conditionBar.style.backgroundColor = '#f59e0b'; // Amber
        } else {
            conditionBar.style.backgroundColor = '#ef4444'; // Red
        }
        
        conditionItem.style.display = 'flex';
    } else {
        conditionItem.style.display = 'none';
    }

    // ===== QUALITY Badge (Show if exists) =====
    const qualityItem = document.getElementById('qualityItem');
    if (product.quality) {
        const qualityBadge = document.getElementById('modalQuality');
        qualityBadge.textContent = product.quality;
        
        // Apply color classes
        qualityBadge.className = 'quality-badge';
        const quality = String(product.quality).toLowerCase();
        if (quality === 'new' || quality === 'brand new') {
            qualityBadge.classList.add('quality-new');
        } else if (quality === 'like new') {
            qualityBadge.classList.add('quality-like-new');
        } else {
            qualityBadge.classList.add('quality-used');
        }
        
        qualityItem.style.display = 'flex';
    } else {
        qualityItem.style.display = 'none';
    }

    // ===== AVAILABILITY (Always displayed) =====
    const availabilityItem = document.getElementById('availabilityItem');
    const statusText = product.reserved ? 'Reserved' : 'Available';
    const statusClass = product.reserved ? 'status-reserved' : 'status-available';
    
    const statusSpan = document.getElementById('modalReservedStatus');
    statusSpan.textContent = statusText;
    statusSpan.className = statusClass;
    availabilityItem.style.display = 'flex';

    // ===== FAVORITE BUTTON =====
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
```

---

## CSS Key Classes

### Layout Classes
```css
.modal-body-grid           /* 2-column grid (48px gap) */
.product-info-grid        /* 2x3 info fields grid */
.modal-image-section      /* Left column image area */
.modal-details-section    /* Right column details area */
.modal-header-content     /* Title & Price container */
```

### Field Classes
```css
.info-item                /* Individual field container (flex column) */
.info-item label          /* Field label with icon */
.info-item span           /* Field value */
```

### Condition Classes
```css
.condition-display        /* Container for condition */
.condition-percentage     /* Text showing percentage */
.condition-bar            /* Progress bar background */
.condition-fill           /* Animated progress bar fill */
                          /* Colors: green, amber, red */
```

### Quality Classes
```css
.quality-badge            /* Badge container */
.quality-new              /* Blue: New items */
.quality-like-new         /* Green: Like New items */
.quality-used             /* Amber: Used items */
```

### Status Classes
```css
.status-available         /* Green text */
.status-reserved          /* Red text */
```

### Button Classes
```css
.btn-order                /* Primary action button */
.btn-save                 /* Secondary save/favorite button */
.btn-save.favorited       /* Favorited state styling */
.modal-actions            /* Button container (flex row) */
```

---

## Responsive Breakpoints

### Desktop (>768px)
- 2-column layout: 1fr 1fr
- Gap: 48px
- Padding: 48px
- Product info grid: 2 columns

### Tablet (480px - 768px)
- 1-column layout
- Gap: 32px
- Padding: 32px 24px
- Product info grid: 1 column
- Buttons stack vertically

### Mobile (<480px)
- 1-column layout
- Gap: 24px
- Padding: 20px 16px
- Product info grid: 1 column
- Reduced font sizes
- Buttons stack with 8px gap

---

## Required Data Fields

For complete display, product objects should include:

```javascript
const product = {
  // Required for basic display
  id: "unique-id",
  title: "Product Name",
  price: "$99.99",
  badge: "Like New",
  
  // Image display
  imageUrl: "url-to-image" || images: ["url1", "url2"],
  
  // Optional fields (conditionally displayed)
  description: "Detailed product description...",
  category: "Electronics",
  college: "Stanford University",
  seller: "John Doe",
  quality: "Like New",  // "New", "Like New", "Used"
  condition: 85,        // 0-100 numeric value
  reserved: false,      // true/false for availability
}
```

---

## Usage Example

```javascript
// Opening modal with complete product data
const product = {
  id: "123",
  title: "iPhone 13 Pro",
  price: "$799.99",
  badge: "Like New",
  imageUrl: "product.jpg",
  description: "Excellent condition, rarely used. Comes with original box and charger.",
  category: "Electronics",
  college: "Stanford University",
  seller: "Sarah Chen",
  quality: "Like New",
  condition: 88,
  reserved: false
};

handleViewDetails(product.id); // Opens modal and populates all fields
```

Result:
- Title and price always shown (bold, highlighted)
- Description, Category, College, Seller all visible
- Condition: "88%" with green progress bar
- Quality: Green "Like New" badge
- Status: Green "Available" text
- All fields properly spaced and aligned
