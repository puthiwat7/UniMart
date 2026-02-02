// Login Page Logic

let isSignUpMode = false; // Toggle between sign in and sign up

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

    // Email form
    const emailForm = document.getElementById('emailForm');
    if (emailForm) {
        emailForm.addEventListener('submit', handleEmailAuth);
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
            
            // Send verification email
            try {
                await firebaseAuthManager.sendVerificationEmail();
                showSuccess('Account created! Please check your email to verify your account.');
                console.log('Verification email sent to:', user.email);
            } catch (verifyError) {
                console.error('Error sending verification email:', verifyError);
                showSuccess('Account created successfully! Redirecting...');
            }
        } else {
            user = await firebaseAuthManager.signInWithEmail(email, password);
            showSuccess('Signed in successfully! Redirecting...');
        }

        console.log('Email auth successful:', user.email);

        // Redirect to home
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 2000);

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

async function handleGoogleSignIn() {
    console.log('handleGoogleSignIn clicked');
    
    showLoading();
    hideMessages();

    try {
        console.log('About to call signInWithGoogle');

        // Sign in with Google
        const user = await firebaseAuthManager.signInWithGoogle();

        console.log('Sign in successful:', user.email);
        
        // Send verification email if email not verified
        if (!user.emailVerified) {
            try {
                await firebaseAuthManager.sendVerificationEmail();
                showSuccess('Signed in successfully! Please check your email to verify your account.');
                console.log('Verification email sent to:', user.email);
            } catch (verifyError) {
                console.error('Error sending verification email:', verifyError);
                showSuccess('Signed in successfully! Redirecting...');
            }
        } else {
            showSuccess('Signed in successfully! Redirecting...');
        }

        // Redirect to home
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 2000);

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
