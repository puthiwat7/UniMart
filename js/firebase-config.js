// Firebase Configuration
// Replace these values with your Firebase project credentials
// Get these from Firebase Console: https://console.firebase.google.com/

const firebaseConfig = {
  apiKey: "AIzaSyB05pJyXGh0y5Vpjd6EYeXsoIfXgBGChMs",
  authDomain: "unimart-bccb5.firebaseapp.com",
  projectId: "unimart-bccb5",
  databaseURL: "https://unimart-bccb5-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "unimart-bccb5.firebasestorage.app",
  messagingSenderId: "395199091096",
  appId: "1:395199091096:web:439f64e5dec4e83aaddbed",
  measurementId: "G-2QJ09Q5M12"
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
  firebase.initializeApp(firebaseConfig);
  
  // Get Firebase Auth instance
  const auth = firebase.auth();
  
    // Initialize Firebase Analytics only when available on this page
    let analytics = null;
    if (typeof firebase.analytics === 'function') {
      analytics = firebase.analytics();
    } else {
      console.warn('Firebase Analytics SDK not loaded on this page. Skipping analytics initialization.');
    }
  
  // Enable persistence
  firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .catch((error) => {
          console.error('Error setting persistence:', error);
      });
  
  console.log('Firebase initialized successfully');
  if (analytics) {
      console.log('Analytics enabled');
  }
} else {
  console.error('Firebase SDK not loaded. Make sure firebase-app-compat.js is loaded.');
}
