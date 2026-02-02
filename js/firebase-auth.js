// Firebase Authentication Module
// Handles all authentication logic

class FirebaseAuthManager {
    constructor() {
        this.user = null;
        this.auth = firebase.auth();
    }

    // Check if user is logged in
    isUserLoggedIn() {
        return this.user !== null;
    }

    // Get current user
    getCurrentUser() {
        return this.user;
    }

    // Sign in with Google
    async signInWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            
            // Set language
            this.auth.languageCode = 'en';
            
            // Sign in with popup
            const result = await this.auth.signInWithPopup(provider);
            
            console.log('User signed in:', result.user);
            
            return result.user;
        } catch (error) {
            console.error('Error during sign in:', error);
            throw error;
        }
    }

    // Sign in with Email and Password
    async signInWithEmail(email, password) {
        try {
            const result = await this.auth.signInWithEmailAndPassword(email, password);
            console.log('User signed in with email:', result.user);
            return result.user;
        } catch (error) {
            console.error('Error during email sign in:', error);
            throw error;
        }
    }

    // Sign up with Email and Password
    async signUpWithEmail(email, password) {
        try {
            const result = await this.auth.createUserWithEmailAndPassword(email, password);
            console.log('User signed up with email:', result.user);
            return result.user;
        } catch (error) {
            console.error('Error during email sign up:', error);
            throw error;
        }
    }

    // Send password reset email
    async sendPasswordResetEmail(email) {
        try {
            await this.auth.sendPasswordResetEmail(email);
            console.log('Password reset email sent to:', email);
        } catch (error) {
            console.error('Error sending password reset email:', error);
            throw error;
        }
    }

    // Sign in with Phone Number
    async signInWithPhone(phoneNumber, appVerifier) {
        try {
            const confirmationResult = await this.auth.signInWithPhoneNumber(phoneNumber, appVerifier);
            console.log('SMS sent to:', phoneNumber);
            return confirmationResult;
        } catch (error) {
            console.error('Error during phone sign in:', error);
            throw error;
        }
    }

    // Verify phone code
    async verifyPhoneCode(confirmationResult, code) {
        try {
            const result = await confirmationResult.confirm(code);
            console.log('User signed in with phone:', result.user);
            return result.user;
        } catch (error) {
            console.error('Error verifying phone code:', error);
            throw error;
        }
    }

    // Sign out
    async signOut() {
        try {
            await this.auth.signOut();
            this.user = null;
            console.log('User signed out');
        } catch (error) {
            console.error('Error during sign out:', error);
            throw error;
        }
    }

    // Listen to authentication state changes
    onAuthStateChanged(callback) {
        this.auth.onAuthStateChanged((user) => {
            this.user = user;
            callback(user);
        });
    }

    // Get user ID token for backend
    async getIdToken() {
        if (this.user) {
            return await this.user.getIdToken();
        }
        return null;
    }

    // Get user data
    getUserData() {
        if (!this.user) return null;
        
        return {
            uid: this.user.uid,
            email: this.user.email,
            displayName: this.user.displayName,
            photoURL: this.user.photoURL,
            emailVerified: this.user.emailVerified,
            metadata: {
                creationTime: this.user.metadata.creationTime,
                lastSignInTime: this.user.metadata.lastSignInTime
            }
        };
    }
}

// Create global auth manager instance
const firebaseAuthManager = new FirebaseAuthManager();
