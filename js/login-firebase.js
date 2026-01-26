// Login Page Logic

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

    // Google Sign-In Button
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    if (!googleSignInBtn) {
        console.error('Google Sign-In button not found!');
        return;
    }
    
    googleSignInBtn.addEventListener('click', handleGoogleSignIn);
    console.log('Google Sign-In button ready');
});

async function handleGoogleSignIn() {
    console.log('handleGoogleSignIn clicked');
    
    const btn = document.getElementById('googleSignInBtn');
    const loadingState = document.getElementById('loadingState');
    const errorMessage = document.getElementById('errorMessage');

    try {
        // Show loading state
        btn.style.display = 'none';
        loadingState.style.display = 'flex';
        errorMessage.style.display = 'none';
        
        console.log('About to call signInWithGoogle');

        // Sign in with Google
        const user = await firebaseAuthManager.signInWithGoogle();

        console.log('Sign in successful:', user.email);

        // Redirect to home
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 500);

    } catch (error) {
        console.error('Sign in error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);

        // Hide loading
        loadingState.style.display = 'none';
        btn.style.display = 'flex';

        // Show error
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

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    errorText.textContent = message;
    errorDiv.style.display = 'flex';
}
