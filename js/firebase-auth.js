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
