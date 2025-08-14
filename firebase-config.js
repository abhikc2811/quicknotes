const firebaseConfig = {
  apiKey: "AIzaSyAOyvZ5Q7oD0svOuiPq036tiu7qPfew8wI",
  authDomain: "quicknotes-f8942.firebaseapp.com",
  projectId: "quicknotes-f8942",
  storageBucket: "quicknotes-f8942.firebasestorage.app",
  messagingSenderId: "303862146094",
  appId: "1:303862146094:web:77917ec86cb0d95217ebbf"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();