// Firebase Authentication Module
// Handles all authentication logic

class FirebaseAuthManager {
    constructor() {
        this.user = null;
        this.auth = firebase.auth();
        this.analytics = firebase.analytics();
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
            
            // Track login event
            this.analytics.logEvent('login', {
                method: 'google',
                user_id: result.user.uid
            });
            
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
            
            // Track login event
            this.analytics.logEvent('login', {
                method: 'email',
                user_id: result.user.uid
            });
            
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
            
            // Track sign up event
            this.analytics.logEvent('sign_up', {
                method: 'email',
                user_id: result.user.uid
            });
            
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

    // Send email verification
    async sendVerificationEmail() {
        try {
            if (this.user && !this.user.emailVerified) {
                await this.user.sendEmailVerification();
                console.log('Verification email sent to:', this.user.email);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error sending verification email:', error);
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
            // Cache basic user info so pages can show it immediately on load
            try {
                if (user) {
                    const cachedUser = {
                        uid: user.uid,
                        displayName: user.displayName,
                        email: user.email,
                        photoURL: user.photoURL
                    };
                    localStorage.setItem('unimart_last_user', JSON.stringify(cachedUser));
                } else {
                    localStorage.removeItem('unimart_last_user');
                }
            } catch (e) {
                console.error('Error caching user info:', e);
            }
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
