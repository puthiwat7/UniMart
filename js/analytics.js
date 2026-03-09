// Google Analytics Tracking Module for UniMart
// Tracks item-related events and user interactions

class UniMartAnalytics {
    constructor() {
        this.analytics = firebase.analytics();
    }

    // ==================== ITEM TRACKING ====================

    // Track when an item is listed
    trackItemListed(itemData) {
        this.analytics.logEvent('item_listed', {
            currency: 'USD',
            value: itemData.price || 0,
            item_id: itemData.id,
            item_name: itemData.name,
            item_category: itemData.category,
            price: itemData.price,
            condition: itemData.condition,
            status: itemData.status || 'active',
            items: [{
                item_id: itemData.id,
                item_name: itemData.name,
                item_category: itemData.category,
                price: itemData.price,
                quantity: 1,
                item_variant: itemData.condition
            }]
        });
        console.log('📊 Analytics: Item listed -', itemData.name);
    }

    // Track item status changes
    trackItemStatusChange(itemId, itemName, oldStatus, newStatus) {
        this.analytics.logEvent('item_status_change', {
            item_id: itemId,
            item_name: itemName,
            old_status: oldStatus,
            new_status: newStatus,
            status: newStatus,
            timestamp: new Date().toISOString()
        });
        console.log(`📊 Analytics: Item status changed - ${itemName}: ${oldStatus} → ${newStatus}`);
    }

    // Track when an item is viewed
    trackItemView(itemData) {
        this.analytics.logEvent('view_item', {
            currency: 'USD',
            value: itemData.price || 0,
            item_id: itemData.id,
            item_name: itemData.name,
            item_category: itemData.category,
            price: itemData.price,
            condition: itemData.condition,
            status: itemData.status || 'active',
            items: [{
                item_id: itemData.id,
                item_name: itemData.name,
                item_category: itemData.category,
                price: itemData.price,
                quantity: 1,
                item_variant: itemData.condition
            }]
        });
        console.log('📊 Analytics: Item viewed -', itemData.name);
    }

    // Track when an item is added to favorites
    trackAddToFavorites(itemData) {
        this.analytics.logEvent('add_to_wishlist', {
            currency: 'USD',
            value: itemData.price || 0,
            item_id: itemData.id,
            item_name: itemData.name,
            item_category: itemData.category,
            price: itemData.price,
            condition: itemData.condition,
            items: [{
                item_id: itemData.id,
                item_name: itemData.name,
                item_category: itemData.category,
                price: itemData.price,
                quantity: 1,
                item_variant: itemData.condition
            }]
        });
        console.log('📊 Analytics: Added to favorites -', itemData.name);
    }

    // Track when an item is removed from favorites
    trackRemoveFromFavorites(itemData) {
        this.analytics.logEvent('remove_from_wishlist', {
            currency: 'USD',
            value: itemData.price || 0,
            item_id: itemData.id,
            item_name: itemData.name,
            item_category: itemData.category,
            items: [{
                item_id: itemData.id,
                item_name: itemData.name,
                item_category: itemData.category,
                price: itemData.price || 0,
                quantity: 1
            }]
        });
        console.log('📊 Analytics: Removed from favorites -', itemData.name);
    }

    // Track item purchase/order
    trackPurchase(itemData, transactionId = null) {
        const txId = transactionId || `T${Date.now()}`;
        
        this.analytics.logEvent('purchase', {
            transaction_id: txId,
            value: itemData.price || 0,
            currency: 'USD',
            item_id: itemData.id,
            item_name: itemData.name,
            item_category: itemData.category,
            price: itemData.price,
            items: [{
                item_id: itemData.id,
                item_name: itemData.name,
                item_category: itemData.category,
                price: itemData.price,
                quantity: 1,
                item_variant: itemData.condition
            }]
        });
        console.log('📊 Analytics: Purchase tracked -', itemData.name);
    }

    // Track item sale (seller perspective)
    trackItemSold(itemData) {
        this.analytics.logEvent('item_sold', {
            currency: 'USD',
            value: itemData.price || 0,
            item_id: itemData.id,
            item_name: itemData.name,
            item_category: itemData.category,
            price: itemData.price,
            condition: itemData.condition,
            status: 'sold',
            timestamp: new Date().toISOString(),
            items: [{
                item_id: itemData.id,
                item_name: itemData.name,
                item_category: itemData.category,
                price: itemData.price,
                quantity: 1,
                item_variant: itemData.condition
            }]
        });
        console.log('📊 Analytics: Item sold -', itemData.name);
    }

    // Track item edit
    trackItemEdited(itemId, itemName, itemCategory = null) {
        this.analytics.logEvent('item_edited', {
            item_id: itemId,
            item_name: itemName,
            item_category: itemCategory,
            timestamp: new Date().toISOString()
        });
        console.log('📊 Analytics: Item edited -', itemName);
    }

    // Track item deletion
    trackItemDeleted(itemId, itemName, itemCategory = null) {
        this.analytics.logEvent('item_deleted', {
            item_id: itemId,
            item_name: itemName,
            item_category: itemCategory,
            timestamp: new Date().toISOString()
        });
        console.log('📊 Analytics: Item deleted -', itemName);
    }

    // ==================== SEARCH TRACKING ====================

    // Track search queries
    trackSearch(searchQuery, resultsCount = 0) {
        this.analytics.logEvent('search', {
            search_term: searchQuery,
            result_count: resultsCount
        });
        console.log(`📊 Analytics: Search - "${searchQuery}" (${resultsCount} results)`);
    }

    // ==================== USER INTERACTION TRACKING ====================

    // Track page views
    trackPageView(pageName, pageUrl = window.location.pathname) {
        this.analytics.logEvent('page_view', {
            page_title: pageName,
            page_location: window.location.href,
            page_path: pageUrl
        });
        console.log('📊 Analytics: Page view -', pageName);
    }

    // Track button clicks
    trackButtonClick(buttonName, buttonLocation) {
        this.analytics.logEvent('select_content', {
            content_type: 'button',
            item_id: buttonName,
            button_name: buttonName,
            button_location: buttonLocation
        });
        console.log(`📊 Analytics: Button clicked - ${buttonName} (${buttonLocation})`);
    }

    // Track contact seller
    trackContactSeller(itemId, itemName, itemCategory = null) {
        this.analytics.logEvent('contact_seller', {
            item_id: itemId,
            item_name: itemName,
            item_category: itemCategory,
            content_type: 'contact'
        });
        console.log('📊 Analytics: Contact seller -', itemName);
    }

    // Track feedback submission
    trackFeedbackSubmitted(rating, category) {
        this.analytics.logEvent('feedback_submitted', {
            rating: rating,
            category: category,
            value: rating,
            timestamp: new Date().toISOString()
        });
        console.log(`📊 Analytics: Feedback submitted - ${rating} stars, ${category}`);
    }

    // ==================== USER PROPERTIES ====================

    // Set user properties
    setUserProperties(properties) {
        // Convert all values to strings for GA4
        const stringProps = {};
        for (const [key, value] of Object.entries(properties)) {
            stringProps[key] = String(value);
        }
        this.analytics.setUserProperties(stringProps);
        console.log('📊 Analytics: User properties set', stringProps);
    }

    // Update user item counts
    updateUserItemCounts(totalListed, itemsSold, itemsPending) {
        this.setUserProperties({
            total_items_listed: totalListed,
            items_sold: itemsSold,
            items_pending: itemsPending,
            user_type: totalListed > 0 ? 'seller' : 'buyer'
        });
    }

    // ==================== CONVERSION TRACKING ====================

    // Track conversion funnel steps
    trackFunnelStep(stepName, stepNumber, itemData = {}) {
        this.analytics.logEvent('funnel_step', {
            step_name: stepName,
            step_number: stepNumber,
            item_id: itemData.id || null,
            item_name: itemData.name || null
        });
        console.log(`📊 Analytics: Funnel step ${stepNumber} - ${stepName}`);
    }

    // ==================== ERROR TRACKING ====================

    // Track errors
    trackError(errorType, errorMessage, location) {
        this.analytics.logEvent('error_occurred', {
            error_type: errorType,
            error_message: errorMessage,
            error_location: location,
            timestamp: new Date().toISOString()
        });
        console.log(`📊 Analytics: Error tracked - ${errorType} at ${location}`);
    }
}

// Create global analytics instance
const uniMartAnalytics = new UniMartAnalytics();
