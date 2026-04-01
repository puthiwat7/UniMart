// Firebase Authentication Module
// Handles all authentication logic

class FirebaseAuthManager {
    constructor() {
        this.user = null;
        this.auth = firebase.auth();
        this.analytics = null;

        // Analytics SDK is optional on some pages. Do not break auth if unavailable.
        try {
            if (typeof firebase.analytics === 'function') {
                this.analytics = firebase.analytics();
                this.logAnalyticsEvent('page_view', {
                    page_title: document.title,
                    page_location: window.location.href
                });
            }
        } catch (error) {
            console.warn('Firebase Analytics is unavailable on this page:', error);
        }
    }

    logAnalyticsEvent(eventName, params = {}) {
        if (!this.analytics || typeof this.analytics.logEvent !== 'function') {
            return;
        }

        try {
            this.analytics.logEvent(eventName, params);
        } catch (error) {
            console.warn(`Failed to log analytics event: ${eventName}`, error);
        }
    }

    setAnalyticsUserProperties(properties = {}) {
        if (!this.analytics || typeof this.analytics.setUserProperties !== 'function') {
            return;
        }

        try {
            this.analytics.setUserProperties(properties);
        } catch (error) {
            console.warn('Failed to set analytics user properties', error);
        }
    }

    async ensureUserExists(user) {
        if (!user || !user.uid || !user.email) {
            console.warn('ensureUserExists: missing user data', user);
            return;
        }

        if (typeof firebase === 'undefined' || typeof firebase.firestore !== 'function') {
            console.warn('Firestore SDK not available for user provisioning.');
            return;
        }

        try {
            const userRef = firebase.firestore().collection('users').doc(user.uid);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                await userRef.set({
                    email: String(user.email).toLowerCase(),
                    role: 'user',
                    createdAt: new Date().toISOString()
                });
                console.log('Created Firestore user profile:', user.uid);
                return;
            }

            const data = userDoc.data() || {};
            const updates = {};

            if (!data.email) updates.email = String(user.email).toLowerCase();
            if (!data.role) updates.role = 'user';
            if (!data.createdAt) updates.createdAt = new Date().toISOString();

            if (Object.keys(updates).length > 0) {
                await userRef.set(updates, { merge: true });
                console.log('Updated Firestore user profile or role defaults:', user.uid);
            }
        } catch (error) {
            console.error('ensureUserExists Firestore operation failed:', error);
        }
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
            
            // Ensure user exists in Firestore
            await this.ensureUserExists(result.user);
            
            // Track login event
            this.logAnalyticsEvent('login', {
                method: 'google',
                user_id: result.user.uid
            });

            // Send a test item view event to populate dimensions
            this.logAnalyticsEvent('view_item', {
                item_id: 'welcome_item',
                item_name: 'Welcome to UniMart',
                item_category: 'System',
                price: 0,
                condition: 'New',
                status: 'active',
                currency: 'USD',
                value: 0,
                items: [{
                    item_id: 'welcome_item',
                    item_name: 'Welcome to UniMart',
                    item_category: 'System',
                    price: 0,
                    quantity: 1
                }]
            });

            // Set user properties
            this.setAnalyticsUserProperties({
                total_items_listed: '0',
                items_sold: '0',
                user_type: 'new_user'
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

            await this.ensureUserExists(result.user);
            
            // Track login event
            this.logAnalyticsEvent('login', {
                method: 'email',
                user_id: result.user.uid
            });

            // Send a test item view event to populate dimensions
            this.logAnalyticsEvent('view_item', {
                item_id: 'welcome_item',
                item_name: 'Welcome to UniMart',
                item_category: 'System',
                price: 0,
                condition: 'New',
                status: 'active',
                currency: 'USD',
                value: 0,
                items: [{
                    item_id: 'welcome_item',
                    item_name: 'Welcome to UniMart',
                    item_category: 'System',
                    price: 0,
                    quantity: 1
                }]
            });

            // Set user properties
            this.setAnalyticsUserProperties({
                total_items_listed: '0',
                items_sold: '0',
                user_type: 'returning_user'
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

            await this.ensureUserExists(result.user);
            
            // Track sign up event
            this.logAnalyticsEvent('sign_up', {
                method: 'email',
                user_id: result.user.uid
            });

            // Send a test item view event to populate dimensions
            this.logAnalyticsEvent('view_item', {
                item_id: 'welcome_new_user',
                item_name: 'Welcome New User',
                item_category: 'System',
                price: 0,
                condition: 'New',
                status: 'active',
                currency: 'USD',
                value: 0,
                items: [{
                    item_id: 'welcome_new_user',
                    item_name: 'Welcome New User',
                    item_category: 'System',
                    price: 0,
                    quantity: 1
                }]
            });

            // Set user properties
            this.setAnalyticsUserProperties({
                total_items_listed: '0',
                items_sold: '0',
                user_type: 'new_user'
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

    async isUserBanned(uid) {
        if (!uid) return false;
        if (typeof firebase.firestore !== 'function') return false;

        try {
            const userDoc = await firebase.firestore().collection('users').doc(uid).get();
            if (!userDoc.exists) return false;
            const data = userDoc.data() || {};
            return data.banned === true;
        } catch (error) {
            console.warn('Failed to check banned status:', error);
            return false;
        }
    }

    // Listen to authentication state changes
    onAuthStateChanged(callback) {
        this.auth.onAuthStateChanged(async (user) => {
            this.user = user;

            if (user && await this.isUserBanned(user.uid)) {
                await this.signOut();
                alert('Your account has been restricted. Please contact support.');
                callback(null);
                return;
            }

            if (user) {
                await this.ensureUserExists(user);
            }

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
