# Quick Start Guide - Profile Page Testing

## Current Dummy User
- **Name:** Alex Johnson
- **Email:** alex.johnson@student.cuhk.edu.hk
- **Password:** Not required (Google login to be added later)

## Test Steps

### Step 1: Access Profile Page
1. Open `index.html` in browser
2. Click "Profile" in the sidebar (or navigate to `pages/profile.html`)

### Step 2: View Profile
- You should see user card with "Alex Johnson" and email
- Profile information shows "Not set" for empty fields
- Yellow alert box visible asking to review policies

### Step 3: Edit Profile
1. Click "Edit Profile" button
2. Select a college (required) - choose from:
   - Minerva
   - Muse
   - Diligentia
   - Ling
   - Harmonia
   - Shaw
3. Fill in optional fields:
   - Student ID: e.g., "123456"
   - Phone: e.g., "+1234567890"
   - WeChat: e.g., "your_wechat_id"
   - Bio: e.g., "Hello everyone!"
4. Click "Save Changes"
5. Profile should update and show saved data
6. Click "Edit Profile" again to verify data persisted

### Step 4: Upload Payment QR Code
1. Click on the QR code upload area
2. Choose any image file from your computer
3. Image should display in the upload area
4. Refresh page - image should still be there (localStorage persistence)

### Step 5: Review Marketplace Policies
1. Click "Click here to review" link in the yellow alert
   OR
   Check the "I have read and agree to the terms" checkbox
2. Modal should open showing marketplace policies
3. Read through policies (scroll if needed)
4. Click "I Agree to These Terms" button
5. Modal closes and alert disappears
6. Checkbox stays checked
7. Refresh page - agreement should persist

### Step 6: Verify Data Persistence
1. Complete all steps 1-5
2. Close browser tab/window
3. Reopen and go back to profile page
4. All data should be restored from localStorage

## Browser Developer Tools

To view/clear localStorage:
1. Press F12 to open Developer Tools
2. Go to "Application" tab
3. Click "Local Storage"
4. Find `unimart_user` key to see stored data
5. Right-click and "Clear" to reset

## Known Limitations (To Be Fixed with Backend)

- Data stored only in browser (not synchronized across devices)
- No real Google authentication yet
- No server-side validation
- Images stored as base64 (limited by localStorage size ~5MB)
- No user verification or email confirmation

## Future Google OAuth Integration

When backend is ready:
1. "Sign in with Google" button will replace current manual entry
2. User data will sync from Google account
3. Real authentication tokens will be used
4. Data will be stored on server instead of just browser

## Contact & Support

For profile page implementation details, see:
- `PROFILE_SETUP.md` - Complete feature documentation
- `backend-setup.md` - Backend implementation guide
