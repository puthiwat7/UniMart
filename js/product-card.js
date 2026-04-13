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
    return fallbackValue;
}

function renderProductCard(product, options = {}) {
    const {
        showRemoveButton = false,
        showFavoriteIcon = false,
        onViewDetails = 'handleViewDetails',
        onFavoriteToggle = 'toggleFavorite',
        onRemove = 'removeFromFavorites',
        isFavorited = false
    } = options;

    const normalizedProduct = product || {};
    const productId = String(normalizedProduct.id || '');
    const productIdLiteral = `'${productId}'`;
    const isReserved = Boolean(normalizedProduct.reserved) && String(normalizedProduct.status || 'active').toLowerCase() === 'active';
    const conditionPercent = getConditionPercentage(normalizedProduct);
    const imageUrl = normalizedProduct.imageUrl || (Array.isArray(normalizedProduct.images) && normalizedProduct.images[0]) || '';
    const card = document.createElement('div');
    card.className = isReserved ? 'product-card reserved-card' : 'product-card';

    let cardImage;
    if (imageUrl) {
        cardImage = `<img src="${imageUrl}" alt="${String(normalizedProduct.title || '')}" loading="lazy">`;
    } else if (normalizedProduct.image) {
        cardImage = normalizedProduct.image;
    } else {
        cardImage = '📦';
    }

    const favoriteButton = showFavoriteIcon
        ? `<button class="favorite-btn ${isFavorited ? 'favorited' : ''}" onclick="event.stopPropagation(); ${onFavoriteToggle}(${productIdLiteral})">
                <i class="fas fa-heart"></i>
           </button>`
        : '';

    const reservedOverlay = isReserved ? '<div class="reserved-overlay">RESERVED</div>' : '';
    const collegeTag = normalizedProduct.college ? `<div class="product-college">${normalizedProduct.college}</div>` : '';
    const quantityTag = Number.isFinite(Number(normalizedProduct.quantity)) ? `<span class="product-quantity">Qty: ${Number(normalizedProduct.quantity)}</span>` : '';

    const removeButton = showRemoveButton
        ? `<button class="product-action-btn remove-btn" onclick="event.stopPropagation(); ${onRemove}(${productIdLiteral})">Remove</button>`
        : '';

    const reportUrl = `/pages/report?listingId=${encodeURIComponent(productId)}`;

    card.innerHTML = `
        <div class="product-image" onclick="${onViewDetails}(${productIdLiteral})">
            ${cardImage}
            <div class="product-image-badge">${String(normalizedProduct.badge || 'Used')}</div>
            ${favoriteButton}
            ${reservedOverlay}
        </div>
        <div class="product-info">
            <div class="product-meta-row">
                ${conditionPercent !== null ? `<span class="product-badge condition-badge">${conditionPercent}%</span>` : ''}
            </div>
            <h3 class="product-title">${String(normalizedProduct.title || 'Untitled Item')}</h3>
            <div class="product-price">${String(normalizedProduct.price || '¥0.00')}</div>
            <div class="product-details-row">
                <span class="product-seller">by ${String(normalizedProduct.seller || 'Campus Seller')}</span>
                ${quantityTag}
            </div>
            ${collegeTag}
            <div class="product-actions">
                <button onclick="event.stopPropagation(); ${onViewDetails}(${productIdLiteral})">View Details</button>
                ${removeButton}
            </div>
        </div>
    `;

    return card;
}

window.renderProductCard = renderProductCard;
window.getConditionPercentage = getConditionPercentage;
