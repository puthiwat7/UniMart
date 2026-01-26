// ======================== Feedback Page JavaScript ========================

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    setupFeedbackForm();
    setupContactAdminModal();
    updateUserInfo();
    checkAuthStatus();
});

// Update user info display
function updateUserInfo() {
    const userProfile = localStorage.getItem('userProfile');
    let userName = 'Guest User';
    let userEmail = 'guest@example.com';

    if (userProfile) {
        const user = JSON.parse(userProfile);
        userName = user.name || 'Guest User';
        userEmail = user.email || 'guest@example.com';
    }

    // Update submit info
    const submitInfo = document.getElementById('submitInfo');
    if (submitInfo) {
        submitInfo.textContent = `Submitting as: ${userName} (${userEmail})`;
    }

    // Update contact info
    const contactInfo = document.getElementById('contactInfo');
    if (contactInfo) {
        contactInfo.textContent = `Contacting as: ${userName}`;
    }
}

// Setup feedback form
function setupFeedbackForm() {
    const form = document.getElementById('feedbackForm');
    const clearBtn = document.getElementById('clearBtn');

    // Handle form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = {
            feedbackType: document.getElementById('feedbackType').value,
            subject: document.getElementById('subject').value,
            message: document.getElementById('message').value
        };

        // Here you would typically send the data to a server
        console.log('Feedback submitted:', formData);
        
        // Show success message
        alert('Thank you for your feedback! Your submission has been received.');
        
        // Clear form
        form.reset();
    });

    // Handle clear button
    clearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the form?')) {
            form.reset();
        }
    });
}

// Setup contact admin modal
function setupContactAdminModal() {
    const contactAdminBtn = document.getElementById('contactAdminBtn');
    const modal = document.getElementById('contactAdminModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const contactAdminForm = document.getElementById('contactAdminForm');

    // Open modal
    contactAdminBtn.addEventListener('click', () => {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    // Close modal
    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        contactAdminForm.reset();
    }

    closeModalBtn.addEventListener('click', closeModal);
    cancelModalBtn.addEventListener('click', closeModal);

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    // Handle form submission
    contactAdminForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const message = document.getElementById('adminMessage').value;

        // Here you would typically send the data to a server
        console.log('Admin message sent:', message);
        
        // Show success message
        alert('Your message has been sent to the admin team. They will respond as soon as possible.');
        
        // Close modal and reset form
        closeModal();
    });
}

// Check if user is logged in (from localStorage)
function checkAuthStatus() {
    const userProfile = localStorage.getItem('userProfile');
    if (userProfile) {
        showUserProfile(JSON.parse(userProfile));
    } else {
        showLoginButton();
    }
}

// Display user profile
function showUserProfile(user) {
    const userProfile = document.getElementById('userProfile');
    const loginBtn = document.getElementById('loginBtn');
    
    if (userProfile && loginBtn) {
        userProfile.style.display = 'flex';
        loginBtn.style.display = 'none';
        
        document.getElementById('userName').textContent = user.name || 'User';
        document.getElementById('userEmail').textContent = user.email || '';
        
        // Update feedback form user info
        updateUserInfo();
    }
}

// Display login button
function showLoginButton() {
    const userProfile = document.getElementById('userProfile');
    const loginBtn = document.getElementById('loginBtn');
    
    if (userProfile && loginBtn) {
        userProfile.style.display = 'none';
        loginBtn.style.display = 'flex';
    }
}

// Handle login button click
const loginBtn = document.getElementById('loginBtn');
if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        alert('Login button clicked! (Placeholder for future Google Sign-In integration)');
    });
}
