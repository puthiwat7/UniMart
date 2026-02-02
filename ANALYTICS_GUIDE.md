# Google Analytics Implementation Guide for UniMart

## What's Been Implemented

### 1. Core Analytics Setup
- ✅ Firebase Analytics SDK added to all pages
- ✅ Analytics initialized in firebase-config.js
- ✅ Authentication events tracked (login, sign-up)

### 2. Comprehensive Item Tracking (`analytics.js`)

The new `analytics.js` module provides tracking for:

#### Item Lifecycle Events:
- `trackItemListed()` - When an item is posted for sale
- `trackItemView()` - When someone views an item
- `trackItemStatusChange()` - When status changes (active → sold → archived)
- `trackItemEdited()` - When item details are updated
- `trackItemDeleted()` - When an item is removed
- `trackItemSold()` - When seller confirms a sale
- `trackPurchase()` - When buyer completes a purchase

#### User Interaction Events:
- `trackAddToFavorites()` - When items are favorited
- `trackRemoveFromFavorites()` - When items are unfavorited
- `trackContactSeller()` - When buyer contacts seller
- `trackSearch()` - Search queries and result counts
- `trackPageView()` - Page navigation
- `trackButtonClick()` - Button interactions
- `trackFeedbackSubmitted()` - User feedback

#### User Properties:
- `updateUserItemCounts()` - Track total listings, sold items, pending items
- `setUserProperties()` - Set custom user attributes

#### Error Tracking:
- `trackError()` - Log errors for debugging

## How to Use

### Basic Usage Example:

```javascript
// Track when an item is listed
uniMartAnalytics.trackItemListed({
    id: '12345',
    name: 'Laptop',
    category: 'Electronics',
    price: 500,
    condition: 'Used'
});

// Track item view
uniMartAnalytics.trackItemView({
    id: '12345',
    name: 'Laptop',
    category: 'Electronics',
    price: 500
});

// Track status change
uniMartAnalytics.trackItemStatusChange(
    '12345',
    'Laptop',
    'active',
    'sold'
);

// Track search
uniMartAnalytics.trackSearch('laptop', 15); // 15 results found

// Track page view
uniMartAnalytics.trackPageView('Home Page');

// Track add to favorites
uniMartAnalytics.trackAddToFavorites({
    id: '12345',
    name: 'Laptop',
    category: 'Electronics',
    price: 500
});
```

### Integration Examples:

#### In your sell-item.js (when listing an item):
```javascript
function handleItemSubmit(itemData) {
    // Save item to database
    saveItem(itemData);
    
    // Track with analytics
    uniMartAnalytics.trackItemListed(itemData);
}
```

#### In your item detail page (when viewing an item):
```javascript
function loadItemDetails(itemId) {
    const item = getItemFromDatabase(itemId);
    displayItem(item);
    
    // Track view
    uniMartAnalytics.trackItemView(item);
}
```

#### In your favorites handler:
```javascript
function addToFavorites(item) {
    saveFavorite(item);
    uniMartAnalytics.trackAddToFavorites(item);
}
```

#### In your search function:
```javascript
function performSearch(query) {
    const results = searchItems(query);
    displayResults(results);
    
    uniMartAnalytics.trackSearch(query, results.length);
}
```

## Viewing Analytics Data

### Firebase Console:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (unimart-bccb5)
3. Click **Analytics** → **Dashboard**
4. View real-time events and user behavior

### Key Reports to Monitor:
- **Events**: See all tracked events (item_listed, item_sold, etc.)
- **User Properties**: View user segments by item counts
- **Conversion Funnels**: Track buyer journey (view → favorite → purchase)
- **Real-time**: See live user activity

### Custom Reports:
Create custom reports in Google Analytics 4 to track:
- Items listed per day/week
- Most viewed items
- Conversion rate (views to purchases)
- Average time to sell
- Popular categories
- User engagement metrics

## Next Steps

To complete the implementation, add tracking calls to:

1. **js/script.js** - Main page interactions
2. **js/my-favorites.js** - Favorite operations
3. **js/my-sales.js** - Sales tracking
4. **pages/sell-item.html** - Item listing form
5. Search functionality
6. Item detail views

Would you like me to implement tracking in any specific file?

## Privacy & Compliance

- Analytics data is anonymized
- No personally identifiable information (PII) is tracked
- Users can opt-out in browser settings
- GDPR compliant when used properly

## Testing Analytics

Open browser console and you'll see:
```
📊 Analytics: Item listed - Laptop
📊 Analytics: Item viewed - Textbook
📊 Analytics: Search - "laptop" (15 results)
```

All events are also visible in Firebase Console → Analytics → DebugView when testing locally.
