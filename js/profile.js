// ======================== Profile Page Logic ========================
// Uses Firebase auth for base user data and Firebase Realtime Database (by uid) for extended profile fields.
// Persists across devices and browsers.

// Load extended profile from Firebase cloud database
async function loadExtendedProfile(uid) {
    if (!uid) return null;
    
    // Try to load from cloud first
    if (typeof window.unimartProfileSync !== 'undefined') {
        try {
            const cloudProfile = await window.unimartProfileSync.getProfileFromCloud(uid);
            if (cloudProfile) {
                // Clear any legacy localStorage data
                window.unimartProfileSync.clearLegacyLocalProfile(uid);
                return cloudProfile;
            }
        } catch (error) {
            console.warn('Error loading profile from cloud, falling back to default:', error);
        }
    }

    // Return default profile if cloud is unavailable
    return {
        college: '',
        studentId: '',
        phone: '',
        wechat: '',
        bio: '',
        paymentQR: null,
        agreedToPolicies: false
    };
}

// Save extended profile to Firebase cloud database
async function saveExtendedProfile(uid, data) {
    if (!uid) return;
    
    if (typeof window.unimartProfileSync === 'undefined') {
        console.error('Profile sync not available; profile not saved');
        return;
    }

    try {
        await window.unimartProfileSync.saveProfileToCloud(uid, data);
    } catch (error) {
        console.error('Error saving profile to cloud:', error);
        throw error;
    }
}

let currentFirebaseUser = null;
let currentExtendedProfile = null;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebaseAuthManager === 'undefined') {
        console.error('firebaseAuthManager is not available on profile page.');
        return;
    }

    // Wait for auth and then initialize profile with real login data
    firebaseAuthManager.onAuthStateChanged(async (user) => {
        if (!user) {
            // Auth guard in HTML will redirect, but just in case:
            window.location.href = 'login.html';
            return;
        }

        currentFirebaseUser = user;
        
        // Load profile from cloud (async operation)
        try {
            currentExtendedProfile = await loadExtendedProfile(user.uid);
        } catch (error) {
            console.error('Error loading profile during initialization:', error);
            currentExtendedProfile = {
                college: '',
                studentId: '',
                phone: '',
                wechat: '',
                bio: '',
                paymentQR: null,
                agreedToPolicies: false
            };
        }

        initializeProfile();
        setupEventListeners();
    });
});

function initializeProfile() {
    if (!currentFirebaseUser || !currentExtendedProfile) return;

    const user = currentFirebaseUser;
    const profile = currentExtendedProfile;
    
    // Update profile display
    document.getElementById('profileName').textContent = user.displayName || 'User';
    document.getElementById('profileEmail').textContent = user.email || '';

    // Show avatar photo if user has one
    const avatarImg = document.getElementById('profileAvatarImage');
    const avatarIcon = document.querySelector('.user-avatar-large i');
    if (avatarImg && avatarIcon) {
        if (user.photoURL) {
            avatarImg.src = user.photoURL;
            avatarImg.style.display = 'block';
            avatarIcon.style.display = 'none';
        } else {
            avatarImg.style.display = 'none';
            avatarIcon.style.display = 'block';
        }
    }
    
    // Load existing QR code if available
    if (profile.paymentQR) {
        displayUploadedQR(profile.paymentQR);
    }
    
    // Display profile information
    updateProfileDisplay(profile);
    
    // Set form values in case user switches to edit mode
    updateFormValues(profile);
}

function updateProfileDisplay(profile) {
    document.getElementById('displayCollege').textContent = profile.college || 'Not set';
    document.getElementById('displayStudentID').textContent = profile.studentId || 'Not set';
    document.getElementById('displayPhone').textContent = profile.phone || 'Not set';
    document.getElementById('displayWechat').textContent = profile.wechat || 'Not set';
    document.getElementById('displayBio').textContent = profile.bio || 'No bio added';

    // Show or hide alert based on policy agreement
    const alert = document.querySelector('.alert-warning');
    if (profile.agreedToPolicies) {
        alert.style.display = 'none';
    }
}

function updateFormValues(profile) {
    document.getElementById('college').value = profile.college || '';
    document.getElementById('studentId').value = profile.studentId || '';
    document.getElementById('phone').value = profile.phone || '';
    document.getElementById('wechat').value = profile.wechat || '';
    document.getElementById('bio').value = profile.bio || '';
    document.getElementById('policyCheckbox').checked = profile.agreedToPolicies || false;
}

function setupEventListeners() {
    // Edit Profile Button
    document.getElementById('editProfileBtn').addEventListener('click', toggleEditMode);
    document.getElementById('cancelEditBtn').addEventListener('click', toggleEditMode);

    // Profile Form Submission
    document.getElementById('profileForm').addEventListener('submit', handleProfileSubmit);

    // Policies Links
    document.getElementById('reviewPoliciesLink').addEventListener('click', (e) => {
        e.preventDefault();
        openPoliciesModal();
    });

    document.getElementById('policiesLink').addEventListener('click', (e) => {
        e.preventDefault();
        openPoliciesModal();
    });

    // Modal Controls
    document.getElementById('closeModal').addEventListener('click', closePoliciesModal);
    document.getElementById('closeModalBtn').addEventListener('click', closePoliciesModal);
    document.getElementById('modalOverlay').addEventListener('click', closePoliciesModal);
    document.getElementById('agreeModalBtn').addEventListener('click', handleAgreeToPolicy);

    // QR Code Upload
    const qrDisplay = document.getElementById('qrDisplay');
    const qrFileInput = document.getElementById('qrFileInput');
    const changeQrBtn = document.getElementById('changeQrBtn');
    
    qrDisplay.addEventListener('click', (e) => {
        // Only trigger file input if clicking on placeholder area
        if (!document.getElementById('qrImage').style.display || 
            document.getElementById('qrImage').style.display === 'none') {
            qrFileInput.click();
        }
    });
    
    if (changeQrBtn) {
        changeQrBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            qrFileInput.click();
        });
    }
    
    qrFileInput.addEventListener('change', handleQRUpload);

    // Policy Checkbox
    document.getElementById('policyCheckbox').addEventListener('change', (e) => {
        if (e.target.checked) {
            openPoliciesModal();
        }
    });
}

function toggleEditMode() {
    const profileView = document.getElementById('profileView');
    const profileForm = document.getElementById('profileForm');
    
    profileView.style.display = profileView.style.display === 'none' ? 'block' : 'none';
    profileForm.style.display = profileForm.style.display === 'none' ? 'block' : 'none';
}

function handleProfileSubmit(e) {
    e.preventDefault();

    const profileData = {
        college: document.getElementById('college').value,
        studentId: document.getElementById('studentId').value,
        phone: document.getElementById('phone').value,
        wechat: document.getElementById('wechat').value,
        bio: document.getElementById('bio').value
    };

    // Validate required fields
    if (!profileData.college) {
        alert('Please select a college');
        return;
    }

    // Merge and save extended profile (per Firebase user)
    currentExtendedProfile = {
        ...currentExtendedProfile,
        ...profileData,
        updatedAt: new Date().toISOString()
    };
    
    // Save to cloud (async)
    saveExtendedProfile(currentFirebaseUser.uid, currentExtendedProfile)
        .then(() => {
            // Update display
            updateProfileDisplay(currentExtendedProfile);
            
            // Toggle back to view mode
            toggleEditMode();
            
            // Show success message
            showNotification('Profile updated successfully!', 'success');
        })
        .catch(error => {
            console.error('Failed to save profile:', error);
            showNotification('Failed to save profile. Please try again.', 'error');
        });
}

function handleQRUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const imageData = event.target.result;
        
        // Save to extended profile
        currentExtendedProfile = {
            ...currentExtendedProfile,
            paymentQR: imageData,
            updatedAt: new Date().toISOString()
        };
        
        // Save to cloud (async)
        saveExtendedProfile(currentFirebaseUser.uid, currentExtendedProfile)
            .then(() => {
                // Update display
                displayUploadedQR(imageData);
                
                showNotification('Profile QR code uploaded successfully!', 'success');
            })
            .catch(error => {
                console.error('Failed to upload QR code:', error);
                showNotification('Failed to upload QR code. Please try again.', 'error');
            });
    };
    reader.readAsDataURL(file);
}

function displayUploadedQR(imageData) {
    const qrPlaceholder = document.getElementById('qrPlaceholder');
    const qrImage = document.getElementById('qrImage');
    const qrOverlay = document.getElementById('qrOverlay');
    
    if (qrPlaceholder) qrPlaceholder.style.display = 'none';
    if (qrImage) {
        qrImage.src = imageData;
        qrImage.style.display = 'block';
    }
    if (qrOverlay) qrOverlay.style.display = 'flex';
}

function openPoliciesModal() {
    const modal = document.getElementById('policiesModal');
    const overlay = document.getElementById('modalOverlay');
    
    modal.classList.add('active');
    overlay.classList.add('active');
}

function closePoliciesModal() {
    const modal = document.getElementById('policiesModal');
    const overlay = document.getElementById('modalOverlay');
    
    modal.classList.remove('active');
    overlay.classList.remove('active');
}

function handleAgreeToPolicy() {
    // Update user agreement in extended profile
    currentExtendedProfile = {
        ...currentExtendedProfile,
        agreedToPolicies: true,
        updatedAt: new Date().toISOString()
    };
    
    // Save to cloud (async)
    saveExtendedProfile(currentFirebaseUser.uid, currentExtendedProfile)
        .then(() => {
            // Update form
            document.getElementById('policyCheckbox').checked = true;
            
            // Hide alert
            const alert = document.querySelector('.alert-warning');
            alert.style.display = 'none';
            
            // Close modal
            closePoliciesModal();
            
            showNotification('You have agreed to the marketplace policies!', 'success');
        })
        .catch(error => {
            console.error('Failed to save policy agreement:', error);
            showNotification('Failed to save agreement. Please try again.', 'error');
        });
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    
    let bgColor;
    switch (type) {
        case 'success':
            bgColor = '#10b981';
            break;
        case 'error':
            bgColor = '#ef4444';
            break;
        case 'warning':
            bgColor = '#f59e0b';
            break;
        default:
            bgColor = '#3b82f6';
    }
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add slide animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
