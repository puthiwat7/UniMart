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

function getConditionColor(percent) {
    if (percent >= 70) return '#10b981'; // Green
    if (percent >= 31) return '#f59e0b'; // Amber
    return '#ef4444';                    // Red
}

function getFavoriteCount(product) {
    return Math.max(0, Math.floor(Number(product?.favoriteCount) || 0));
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
    const favoriteCount = getFavoriteCount(normalizedProduct);
    const imageUrl = normalizedProduct.imageUrl || (Array.isArray(normalizedProduct.images) && normalizedProduct.images[0]) || '';
    const card = document.createElement('div');
    card.className = isReserved ? 'product-card reserved-card' : 'product-card';

    let cardImage;
    if (imageUrl) {
        cardImage = `<img src="${imageUrl}" alt="${String(normalizedProduct.title || '')}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else if (normalizedProduct.image) {
        cardImage = normalizedProduct.image;
    } else {
        cardImage = '📦';
    }

    const heartColor = isFavorited ? '#ef4444' : '#9ca3af';
    const overlayTopRight = `
        <div class="product-card-top-right">
            ${showFavoriteIcon
                ? `<button class="product-like-button${isFavorited ? ' is-active' : ''}" onclick="event.stopPropagation(); ${onFavoriteToggle}(${productIdLiteral})" style="color: ${heartColor};" title="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}">
                        <i class="fas fa-heart"></i>
                        <span>${favoriteCount}</span>
                   </button>`
                : `<span class="product-like-count"><i class="fas fa-heart"></i>${favoriteCount}</span>`}
        </div>`;

    const reservedOverlay = isReserved ? '<div class="reserved-overlay">RESERVED</div>' : '';
    const collegeTag = normalizedProduct.college ? `<div class="product-college">${normalizedProduct.college}</div>` : '';
    const quantityTag = Number.isFinite(Number(normalizedProduct.quantity)) ? `<span class="product-quantity">${Number(normalizedProduct.quantity)} available</span>` : '';

    const removeButton = showRemoveButton
        ? `<button class="product-action-btn remove-btn" onclick="event.stopPropagation(); ${onRemove}(${productIdLiteral})">Remove</button>`
        : '';

    card.innerHTML = `
        <div class="product-image" onclick="${onViewDetails}(${productIdLiteral})" style="position: relative; cursor: pointer;">
            ${cardImage}
            ${overlayTopRight}
            ${reservedOverlay}
        </div>
        <div class="product-info">
            <div class="product-meta-row">
                <span class="product-badge">${String(normalizedProduct.badge || 'Used')}</span>
                ${conditionPercent !== null ? `<span class="product-badge condition-badge" style="color:${getConditionColor(conditionPercent)};border-color:${getConditionColor(conditionPercent)};background:transparent;">${conditionPercent}%</span>` : ''}
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
window.getConditionColor = getConditionColor;
window.getFavoriteCount = getFavoriteCount;
