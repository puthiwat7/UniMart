// Login Page Logic

let confirmationResult = null; // For phone verification
let recaptchaVerifier = null; // For reCAPTCHA
let isSignUpMode = false; // Toggle between sign in and sign up
let recaptchaInitialized = false; // Track if reCAPTCHA has been set up

document.addEventListener('DOMContentLoaded', () => {
    console.log('Login page loaded');
    
    // Check if already logged in
    firebaseAuthManager.onAuthStateChanged((user) => {
        if (user) {
            // User is logged in, redirect to home
            console.log('User already logged in:', user.email);
            window.location.href = '../index.html';
        }
    });

    // Initialize tab switching
    setupTabs();

    // Email form
    const emailForm = document.getElementById('emailForm');
    if (emailForm) {
        emailForm.addEventListener('submit', handleEmailAuth);
    }

    // Phone form
    const sendCodeBtn = document.getElementById('sendCodeBtn');
    if (sendCodeBtn) {
        sendCodeBtn.addEventListener('click', handleSendCode);
    }

    const phoneForm = document.getElementById('phoneForm');
    if (phoneForm) {
        phoneForm.addEventListener('submit', handleVerifyCode);
    }

    // Google Sign-In Button
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', handleGoogleSignIn);
    }

    // Toggle Sign Up/Sign In
    const toggleSignUp = document.getElementById('toggleSignUp');
    if (toggleSignUp) {
        toggleSignUp.addEventListener('click', (e) => {
            e.preventDefault();
            isSignUpMode = !isSignUpMode;
            updateEmailFormMode();
        });
    }
    
    console.log('Login page initialized');
});

// Setup tab switching
function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));

            // Add active class to clicked tab and its content
            tab.classList.add('active');
            const tabName = tab.getAttribute('data-tab');
            const content = document.getElementById(`${tabName}Tab`);
            if (content) {
                content.classList.add('active');
            }

            // Initialize reCAPTCHA when phone tab is activated
            if (tabName === 'phone' && !recaptchaInitialized) {
                setTimeout(() => {
                    setupRecaptcha();
                }, 100);
            }

            // Hide messages when switching tabs
            hideMessages();
        });
    });
}

// Setup reCAPTCHA
function setupRecaptcha() {
    if (recaptchaInitialized) {
        console.log('reCAPTCHA already initialized');
        return;
    }

    try {
        recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
            'size': 'normal',
            'callback': (response) => {
                console.log('reCAPTCHA solved');
            },
            'expired-callback': () => {
                console.log('reCAPTCHA expired');
                showError('reCAPTCHA expired. Please try again.');
            }
        });
        
        recaptchaVerifier.render().then(() => {
            console.log('reCAPTCHA initialized successfully');
            recaptchaInitialized = true;
        });
    } catch (error) {
        console.error('Error setting up reCAPTCHA:', error);
        showError('Failed to initialize reCAPTCHA. Please refresh the page.');
    }
}

// Update email form mode (sign in vs sign up)
function updateEmailFormMode() {
    const submitBtn = document.querySelector('#emailForm button[type="submit"] span');
    const toggleText = document.querySelector('#toggleSignUp');
    const togglePara = document.querySelector('.toggle-auth p');

    if (isSignUpMode) {
        submitBtn.textContent = 'Sign Up with Email';
        togglePara.innerHTML = 'Already have an account? <a href="#" id="toggleSignUp">Sign in</a>';
    } else {
        submitBtn.textContent = 'Sign In with Email';
        togglePara.innerHTML = 'Don\'t have an account? <a href="#" id="toggleSignUp">Sign up</a>';
    }

    // Re-attach event listener
    const newToggle = document.getElementById('toggleSignUp');
    if (newToggle) {
        newToggle.addEventListener('click', (e) => {
            e.preventDefault();
            isSignUpMode = !isSignUpMode;
            updateEmailFormMode();
        });
    }
}

// Handle Email Authentication (Sign In or Sign Up)
async function handleEmailAuth(e) {
    e.preventDefault();
    
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;

    if (!email || !password) {
        showError('Please enter both email and password.');
        return;
    }

    if (password.length < 6) {
        showError('Password must be at least 6 characters long.');
        return;
    }

    showLoading();
    hideMessages();

    try {
        let user;
        if (isSignUpMode) {
            user = await firebaseAuthManager.signUpWithEmail(email, password);
            showSuccess('Account created successfully! Redirecting...');
        } else {
            user = await firebaseAuthManager.signInWithEmail(email, password);
            showSuccess('Signed in successfully! Redirecting...');
        }

        console.log('Email auth successful:', user.email);

        // Redirect to home
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 1500);

    } catch (error) {
        hideLoading();
        console.error('Email auth error:', error);

        let errorText = 'Authentication failed. Please try again.';
        
        if (error.code === 'auth/email-already-in-use') {
            errorText = 'This email is already in use. Please sign in instead.';
        } else if (error.code === 'auth/invalid-email') {
            errorText = 'Invalid email address.';
        } else if (error.code === 'auth/weak-password') {
            errorText = 'Password is too weak. Use at least 6 characters.';
        } else if (error.code === 'auth/user-not-found') {
            errorText = 'No account found with this email. Please sign up.';
        } else if (error.code === 'auth/wrong-password') {
            errorText = 'Incorrect password. Please try again.';
        } else if (error.code === 'auth/too-many-requests') {
            errorText = 'Too many failed attempts. Please try again later.';
        }

        showError(errorText);
    }
}

// Handle Send Verification Code
async function handleSendCode() {
    const phoneNumber = document.getElementById('phoneInput').value.trim();

    if (!phoneNumber) {
        showError('Please enter a phone number.');
        return;
    }

    // Ensure reCAPTCHA is initialized
    if (!recaptchaVerifier || !recaptchaInitialized) {
        showError('Please wait for reCAPTCHA to load, then try again.');
        setupRecaptcha();
        return;
    }

    showLoading();
    hideMessages();

    try {
        confirmationResult = await firebaseAuthManager.signInWithPhone(phoneNumber, recaptchaVerifier);
        
        hideLoading();
        showSuccess('Verification code sent to your phone!');
        
        // Show verification input
        document.getElementById('verificationSection').style.display = 'block';
        document.getElementById('sendCodeBtn').style.display = 'none';
        document.getElementById('phoneInput').disabled = true;

    } catch (error) {
        hideLoading();
        console.error('Phone sign in error:', error);

        let errorText = 'Failed to send verification code. Please try again.';
        
        if (error.code === 'auth/invalid-phone-number') {
            errorText = 'Invalid phone number format.';
        } else if (error.code === 'auth/too-many-requests') {
            errorText = 'Too many requests. Please try again later.';
        } else if (error.code === 'auth/quota-exceeded') {
            errorText = 'SMS quota exceeded. Please try again later.';
        } else if (error.code === 'auth/billing-not-enabled') {
            errorText = 'Phone authentication is not enabled. Please contact support or use Email/Google sign-in.';
        } else if (error.code === 'auth/project-not-authorized') {
            errorText = 'Phone authentication is not configured. Please use Email/Google sign-in.';
        }

        showError(errorText);
        
        // Reset reCAPTCHA
        if (recaptchaVerifier) {
            recaptchaVerifier.clear();
            recaptchaInitialized = false;
            setTimeout(() => {
                setupRecaptcha();
            }, 100);
        }
    }
}

// Handle Verify Code
async function handleVerifyCode(e) {
    e.preventDefault();
    
    const code = document.getElementById('verificationCode').value.trim();

    if (!code || code.length !== 6) {
        showError('Please enter the 6-digit verification code.');
        return;
    }

    if (!confirmationResult) {
        showError('Please request a verification code first.');
        return;
    }

    showLoading();
    hideMessages();

    try {
        const user = await firebaseAuthManager.verifyPhoneCode(confirmationResult, code);
        
        showSuccess('Phone verified successfully! Redirecting...');
        console.log('Phone auth successful:', user.phoneNumber);

        // Redirect to home
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 1500);

    } catch (error) {
        hideLoading();
        console.error('Verification error:', error);

        let errorText = 'Invalid verification code. Please try again.';
        
        if (error.code === 'auth/invalid-verification-code') {
            errorText = 'Invalid verification code.';
        } else if (error.code === 'auth/code-expired') {
            errorText = 'Verification code expired. Please request a new one.';
        }

        showError(errorText);
    }
}

async function handleGoogleSignIn() {
    console.log('handleGoogleSignIn clicked');
    
    showLoading();
    hideMessages();

    try {
        console.log('About to call signInWithGoogle');

        // Sign in with Google
        const user = await firebaseAuthManager.signInWithGoogle();

        console.log('Sign in successful:', user.email);
        showSuccess('Signed in successfully! Redirecting...');

        // Redirect to home
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 1500);

    } catch (error) {
        hideLoading();
        console.error('Sign in error:', error);

        let errorText = 'Sign in failed. Please try again.';
        
        if (error.code === 'auth/popup-blocked') {
            errorText = 'Sign-in popup was blocked. Please check your browser settings.';
        } else if (error.code === 'auth/popup-closed-by-user') {
            errorText = 'Sign-in cancelled.';
        } else if (error.code === 'auth/network-request-failed') {
            errorText = 'Network error. Please check your internet connection.';
        }

        showError(errorText);
    }
}

function showLoading() {
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
        loadingState.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
        loadingState.style.display = 'none';
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    if (errorDiv && errorText) {
        errorText.textContent = message;
        errorDiv.style.display = 'flex';
    }
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    const successText = document.getElementById('successText');
    if (successDiv && successText) {
        successText.textContent = message;
        successDiv.style.display = 'flex';
    }
}

function hideMessages() {
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';
}
