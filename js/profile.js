// ======================== User Management ========================
// This is a basic user management system that will be extended with Google API

class UserManager {
    constructor() {
        this.currentUser = this.loadFromLocalStorage() || this.createDummyUser();
    }

    // Create a dummy user for initial testing
    createDummyUser() {
        const dummyUser = {
            id: 'user_' + Date.now(),
            name: 'Alex Johnson',
            email: 'alex.johnson@student.cuhk.edu.hk',
            college: '',
            studentId: '',
            phone: '',
            wechat: '',
            bio: '',
            paymentQR: null,
            agreedToPolicies: false,
            createdAt: new Date().toISOString(),
            googleId: null // Will be populated when Google login is implemented
        };
        this.saveToLocalStorage(dummyUser);
        return dummyUser;
    }

    // Load user from localStorage
    loadFromLocalStorage() {
        try {
            const userData = localStorage.getItem('unimart_user');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error loading user from localStorage:', error);
            return null;
        }
    }

    // Save user to localStorage
    saveToLocalStorage(user) {
        try {
            localStorage.setItem('unimart_user', JSON.stringify(user));
        } catch (error) {
            console.error('Error saving user to localStorage:', error);
        }
    }

    // Update user profile
    updateProfile(profileData) {
        this.currentUser = {
            ...this.currentUser,
            ...profileData,
            updatedAt: new Date().toISOString()
        };
        this.saveToLocalStorage(this.currentUser);
        return this.currentUser;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user has agreed to policies
    hasPolicyAgreement() {
        return this.currentUser.agreedToPolicies === true;
    }

    // Agree to policies
    agreeToPolicies() {
        return this.updateProfile({ agreedToPolicies: true });
    }

    // Set payment QR code
    setPaymentQR(qrData) {
        return this.updateProfile({ paymentQR: qrData });
    }
}

// Global user manager instance
const userManager = new UserManager();

// ======================== Profile Page Logic ========================
document.addEventListener('DOMContentLoaded', () => {
    initializeProfile();
    setupEventListeners();
});

function initializeProfile() {
    const user = userManager.getCurrentUser();
    
    // Update profile display
    document.getElementById('profileName').textContent = user.name;
    document.getElementById('profileEmail').textContent = user.email;
    
    // Load existing QR code if available
    if (user.paymentQR) {
        displayUploadedQR(user.paymentQR);
    }
    
    // Update sidebar user info if it exists
    const userNameEl = document.getElementById('userName');
    const userEmailEl = document.getElementById('userEmail');
    if (userNameEl) userNameEl.textContent = user.name;
    if (userEmailEl) userEmailEl.textContent = user.email;

    // Display profile information
    updateProfileDisplay(user);
    
    // Set form values in case user switches to edit mode
    updateFormValues(user);
}

function updateProfileDisplay(user) {
    document.getElementById('displayCollege').textContent = user.college || 'Not set';
    document.getElementById('displayStudentID').textContent = user.studentId || 'Not set';
    document.getElementById('displayPhone').textContent = user.phone || 'Not set';
    document.getElementById('displayWechat').textContent = user.wechat || 'Not set';
    document.getElementById('displayBio').textContent = user.bio || 'No bio added';

    // Show or hide alert based on policy agreement
    const alert = document.querySelector('.alert-warning');
    if (user.agreedToPolicies) {
        alert.style.display = 'none';
    }
}

function updateFormValues(user) {
    document.getElementById('college').value = user.college || '';
    document.getElementById('studentId').value = user.studentId || '';
    document.getElementById('phone').value = user.phone || '';
    document.getElementById('wechat').value = user.wechat || '';
    document.getElementById('bio').value = user.bio || '';
    document.getElementById('policyCheckbox').checked = user.agreedToPolicies || false;
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

    // Update user profile
    const updatedUser = userManager.updateProfile(profileData);
    
    // Update display
    updateProfileDisplay(updatedUser);
    
    // Toggle back to view mode
    toggleEditMode();
    
    // Show success message
    showNotification('Profile updated successfully!', 'success');
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
        
        // Save to user profile
        userManager.setPaymentQR(imageData);
        
        // Update display
        displayUploadedQR(imageData);
        
        showNotification('Payment QR code uploaded successfully!', 'success');
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
    // Update user agreement
    const updatedUser = userManager.agreeToPolicies();
    
    // Update form
    document.getElementById('policyCheckbox').checked = true;
    
    // Hide alert
    const alert = document.querySelector('.alert-warning');
    alert.style.display = 'none';
    
    // Close modal
    closePoliciesModal();
    
    showNotification('You have agreed to the marketplace policies!', 'success');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#3b82f6'};
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
