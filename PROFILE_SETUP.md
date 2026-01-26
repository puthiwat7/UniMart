# UniMart Profile Page Implementation

## Overview
The profile page has been fully implemented with the following features:

### Features Implemented

#### 1. **Profile Display Page**
- User card showing name and email (currently using dummy data: "Alex Johnson")
- Profile information section with:
  - College (required)
  - Student ID
  - Phone Number
  - WeChat ID
  - Bio
- All data persists in browser localStorage

#### 2. **Edit Profile Mode**
- Click "Edit Profile" button to enter edit mode
- Edit all profile fields
- Save changes back to storage
- Cancel to discard changes
- Form validation (College is required)

#### 3. **Payment QR Code Upload**
- Click to upload personal payment QR code image
- Supports any image format
- File size validation (max 5MB)
- Displays uploaded image in the section
- QR code persists in localStorage (as base64)

#### 4. **Marketplace Policies Agreement**
- Policy agreement checkbox
- "Review Policies" link opens comprehensive modal
- Modal shows all marketplace policies including:
  - General Terms
  - Seller Responsibilities
  - Buyer Responsibilities
  - Refunds & Disputes
  - Platform Fees
  - Delivery Process
- Agree button in modal records user agreement
- Alert shows until policies are agreed to

#### 5. **User Management System**
- `UserManager` class in profile.js handles:
  - Creating dummy user (Alex Johnson, alex.johnson@student.cuhk.edu.hk)
  - Saving/loading user data from localStorage
  - Updating profile information
  - Recording policy agreements
  - Managing payment QR codes

## Files Created

### Frontend
- `pages/profile.html` - Profile page HTML
- `css/profile.css` - Profile page styling
- `js/profile.js` - Profile page logic and user management

### Backend Documentation
- `backend-setup.md` - Complete backend structure and implementation guide
  - User model schema
  - API endpoints
  - Project structure
  - Environment variables
  - Google OAuth setup
  - Security considerations

## Current User Data
**Dummy User (for testing):**
- Name: Alex Johnson
- Email: alex.johnson@student.cuhk.edu.hk
- All other fields: Empty by default

Data is stored in browser's `localStorage` under the key `unimart_user`

## How to Test

1. **Navigate to Profile:**
   - From home page, click "Profile" in sidebar
   - Or visit `pages/profile.html`

2. **Edit Profile:**
   - Click "Edit Profile" button
   - Fill in College (required) and other fields
   - Click "Save Changes"

3. **Upload Payment QR:**
   - Click on the QR code upload area
   - Select an image file
   - Image will display and persist

4. **Review Policies:**
   - Click "Click here to review" in the alert
   - Or click "Marketplace Policies" checkbox
   - Modal opens showing full policies
   - Click "I Agree to These Terms" to record agreement
   - Alert disappears after agreement

## Data Persistence
All user data is saved to localStorage and persists across browser sessions until cleared.

## Next Steps: Google OAuth Integration

### Backend Setup Required
1. Create Node.js/Express server
2. Set up MongoDB database
3. Configure Google OAuth 2.0 credentials
4. Implement authentication endpoints

### To Integrate Google Login Later:
1. Replace `UserManager` with `AuthService` class (provided in backend-setup.md)
2. Add Google Sign-In button to login flow
3. Exchange Google token for JWT on backend
4. Store JWT in localStorage
5. Include token in all API requests

### Key Environment Variables Needed:
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
JWT_SECRET=your_jwt_secret_key
MONGODB_URI=mongodb://...
```

## File Structure
```
UniMart/
├── index.html (updated with Profile link)
├── pages/
│   ├── profile.html (NEW)
│   └── ... other pages
├── css/
│   ├── style.css
│   └── profile.css (NEW)
└── js/
    ├── script.js
    └── profile.js (NEW)
```

## Backend Documentation
For complete backend implementation guide, see `backend-setup.md` which includes:
- User schema
- All required API endpoints
- Authentication flow
- Security best practices
- Project structure recommendations
