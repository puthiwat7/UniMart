// Firebase Configuration
// Replace these values with your Firebase project credentials
// Get these from Firebase Console: https://console.firebase.google.com/

const firebaseConfig = {
  apiKey: "AIzaSyAt50gvXpxqE1A4qdnnX3BqbMf1Q0x4i6o",
  authDomain: "unimart-63bcc.firebaseapp.com",
  projectId: "unimart-63bcc",
  databaseURL: "https://unimart-63bcc-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "unimart-63bcc.firebasestorage.app",
  messagingSenderId: "275149343796",
  appId: "1:275149343796:web:62476076206920ff5dce61",
  measurementId: "G-T3T8JFF08Y"
};

// Global constants
const COLLEGES = [
  "All Colleges",
  "Minerva",
  "Muse",
  "Diligentia",
  "Ling",
  "Harmonia",
  "Shaw",
  "Eighth College",
  "Duan Family"
];

// Initialize Firebase - wait for SDK to be available
if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      console.log('Firebase app initialized successfully');
  } else {
      console.log('Firebase app already initialized');
  }

  window.firebaseInitialized = true;
  console.log('Firebase SDK state:', {
      auth: typeof firebase.auth,
      database: typeof firebase.database,
      analytics: typeof firebase.analytics
  });
  
  // Get Firebase Auth instance
  const auth = firebase.auth();
  
  // Initialize Firebase Analytics only when available on this page
  let analytics = null;
  if (typeof firebase.analytics === 'function') {
      analytics = firebase.analytics();
      console.log('Firebase Analytics initialized');
  } else {
      console.info('Firebase Analytics SDK not loaded on this page. Analytics is disabled for this page.');
  }
  
  // Enable persistence
  firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .catch((error) => {
          console.error('Error setting persistence:', error);
      });

  if (analytics) {
      console.log('Analytics enabled');
  }
} else {
  console.error('Firebase SDK not loaded. Make sure firebase-app-compat.js is loaded.');
}
