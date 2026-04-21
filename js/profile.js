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
        fullName: '',
        college: '',
        studentId: '',
        phone: '',
        wechat: '',
        paymentQR: null,
        hasAgreedPolicy: false,
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
let unsubscribeProfileRealtime = null;

function isPolicyAgreed(profile) {
    if (!profile || typeof profile !== 'object') return false;
    if (typeof window.unimartProfileSync !== 'undefined' && typeof window.unimartProfileSync.hasUserAgreedPolicy === 'function') {
        return window.unimartProfileSync.hasUserAgreedPolicy(profile);
    }
    return profile.hasAgreedPolicy === true || profile.agreedToPolicies === true;
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebaseAuthManager === 'undefined') {
        console.error('firebaseAuthManager is not available on profile page.');
        return;
    }

    // Wait for auth and then initialize profile with real login data
    firebaseAuthManager.onAuthStateChanged(async (user) => {
        if (!user) {
            // Auth guard in HTML will redirect, but just in case:
            window.location.href = 'login';
            return;
        }

        currentFirebaseUser = user;
        
        // Load profile from cloud (async operation)
        try {
            currentExtendedProfile = await loadExtendedProfile(user.uid);
            console.log('User data:', currentExtendedProfile);
        } catch (error) {
            console.error('Error loading profile during initialization:', error);
            currentExtendedProfile = {
                college: '',
                studentId: '',
                phone: '',
                wechat: '',
                bio: '',
                paymentQR: null,
                hasAgreedPolicy: false,
                agreedToPolicies: false
            };
        }

        if (typeof window.unimartProfileSync !== 'undefined' && typeof window.unimartProfileSync.subscribeToProfile === 'function') {
            if (unsubscribeProfileRealtime) {
                unsubscribeProfileRealtime();
                unsubscribeProfileRealtime = null;
            }
            unsubscribeProfileRealtime = window.unimartProfileSync.subscribeToProfile(user.uid, (profileFromCloud) => {
                currentExtendedProfile = profileFromCloud;
                console.log('User data:', currentExtendedProfile);
                updateProfileDisplay(currentExtendedProfile);
                updateFormValues(currentExtendedProfile);
            });
        }

        initializeProfile();
        setupEventListeners();
    });
});

window.addEventListener('beforeunload', () => {
    if (unsubscribeProfileRealtime) {
        unsubscribeProfileRealtime();
        unsubscribeProfileRealtime = null;
    }
});

function initializeProfile() {
    if (!currentFirebaseUser || !currentExtendedProfile) return;

    const user = currentFirebaseUser;
    const profile = currentExtendedProfile;
    
    // Update profile display
    const resolvedName = (profile.fullName || user.displayName || '').trim();
    document.getElementById('profileName').textContent = resolvedName || 'User';
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

    // Populate college options
    populateCollegeOptions();

    // Show reset password button for email/password users only
    showResetPasswordButtonIfApplicable(user);
}

function showResetPasswordButtonIfApplicable(user) {
    const section = document.getElementById('passwordResetSection');
    if (!section) return;

    // Check if user signed up with email/password (not Google)
    const isEmailPasswordUser = user.providerData.some(provider => provider.providerId === 'password');
    
    if (isEmailPasswordUser) {
        section.style.display = 'block';
    } else {
        section.style.display = 'none';
    }
}

function populateCollegeOptions() {
    const collegeSelect = document.getElementById('college');
    if (!collegeSelect) return;

    // Clear existing options
    collegeSelect.innerHTML = '';

    // Fallback colleges if COLLEGES constant is not available
    const fallbackColleges = [
        "Minerva",
        "Muse", 
        "Diligentia",
        "Ling",
        "Harmonia",
        "Shaw",
        "Eighth College",
        "Duan Family"
    ];

    // Use COLLEGES constant if available, otherwise use fallback
    const collegesToUse = (typeof COLLEGES !== 'undefined' && Array.isArray(COLLEGES)) 
        ? COLLEGES.slice(1) // Skip "All Colleges" for profile
        : fallbackColleges;

    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select your college';
    collegeSelect.appendChild(defaultOption);

    // Add college options
    collegesToUse.forEach(college => {
        const option = document.createElement('option');
        option.value = college;
        option.textContent = college;
        collegeSelect.appendChild(option);
    });
}

function updateProfileDisplay(profile) {
    document.getElementById('displayFullName').textContent = profile.fullName || 'Not set';
    document.getElementById('displayCollege').textContent = profile.college || 'Not set';
    document.getElementById('displayStudentID').textContent = profile.studentId || 'Not set';
    document.getElementById('displayPhone').textContent = profile.phone || 'Not set';
    document.getElementById('displayWechat').textContent = profile.wechat || 'Not set';

    // Check if profile is complete and store in localStorage
    const isProfileComplete = profile.fullName && profile.college;
    if (isProfileComplete) {
        localStorage.setItem("profileComplete", "true");
    }

    // Check if policy is agreed and store in localStorage
    if (isPolicyAgreed(profile)) {
        localStorage.setItem("policyAccepted", "true");
    }

    // Show or hide alert based on policy agreement
    const alert = document.querySelector('.alert-warning');
    if (isPolicyAgreed(profile)) {
        alert.style.display = 'none';
    } else {
        alert.style.display = 'flex';
    }
}

function updateFormValues(profile) {
    document.getElementById('fullName').value = profile.fullName || '';
    document.getElementById('college').value = profile.college || '';
    document.getElementById('studentId').value = profile.studentId || '';
    document.getElementById('phone').value = profile.phone || '';
    document.getElementById('wechat').value = profile.wechat || '';
    document.getElementById('policyCheckbox').checked = isPolicyAgreed(profile);
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

    // Reset Password Button
    document.getElementById('resetPasswordBtn').addEventListener('click', handleResetPassword);
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
        fullName: document.getElementById('fullName').value.trim(),
        college: document.getElementById('college').value,
        studentId: document.getElementById('studentId').value,
        phone: document.getElementById('phone').value,
        wechat: document.getElementById('wechat').value
    };

    // Validate required fields
    if (!profileData.fullName) {
        alert('Please enter your display name');
        return;
    }

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
            
            // Check if profile is now complete and store in localStorage
            const isProfileComplete = profileData.fullName && profileData.college;
            if (isProfileComplete) {
                localStorage.setItem("profileComplete", "true");
            }
            
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

function handleResetPassword() {
    const user = firebase.auth().currentUser;
    if (!user || !user.email) {
        showNotification('Unable to send a reset email right now. Please sign in again.', 'error');
        return;
    }

    firebaseAuthManager.sendPasswordResetEmail(user.email)
        .then(() => {
            showNotification(`Password reset email sent to ${user.email}. Open the link in that email to set a new password.`, 'success');
        })
        .catch((error) => {
            console.error('Password reset email error:', error);
            let errorMessage = 'Failed to send password reset email.';
            if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many reset attempts. Please wait a bit and try again.';
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your connection and try again.';
            }
            showNotification(errorMessage, 'error');
        });
}

function handleAgreeToPolicy() {
    if (!currentFirebaseUser || !currentFirebaseUser.uid) {
        showNotification('Unable to save agreement. Please sign in again.', 'error');
        return;
    }

    // Save agreement in cloud first, then fetch the latest profile as source of truth.
    const saveAgreement = (typeof window.unimartProfileSync !== 'undefined' && typeof window.unimartProfileSync.setPolicyAgreement === 'function')
        ? window.unimartProfileSync.setPolicyAgreement(currentFirebaseUser.uid, true)
        : saveExtendedProfile(currentFirebaseUser.uid, {
            ...currentExtendedProfile,
            hasAgreedPolicy: true,
            agreedToPolicies: true,
            updatedAt: new Date().toISOString()
        });

    saveAgreement
        .then(() => loadExtendedProfile(currentFirebaseUser.uid))
        .then((freshProfile) => {
            currentExtendedProfile = freshProfile || {
                ...currentExtendedProfile,
                hasAgreedPolicy: true,
                agreedToPolicies: true
            };
            console.log('User data:', currentExtendedProfile);

            document.getElementById('policyCheckbox').checked = true;
            
            // Hide alert
            const alert = document.querySelector('.alert-warning');
            alert.style.display = 'none';
            
            // Close modal
            closePoliciesModal();
            
            // Store policy acceptance in localStorage for modal check
            localStorage.setItem("policyAccepted", "true");
            
            showNotification('You have agreed to the Terms of Use & Marketplace Policy!', 'success');
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

// Ensure college options are populated on page load
document.addEventListener('DOMContentLoaded', () => {
    populateCollegeOptions();
});
