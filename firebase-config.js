const firebaseConfig = {
  apiKey:            "AIzaSyCU0t9Lr0O4Vft4Ml2Xpr7-vqmojRUSy0w",
  authDomain:        "cozyappsdb.firebaseapp.com",
  projectId:         "cozyappsdb",
  storageBucket:     "cozyappsdb.firebasestorage.app",
  messagingSenderId: "846926256750",
  appId:             "1:846926256750:web:60a0a9f2b9c34c55dae47f"
};

firebase.initializeApp(firebaseConfig);

// Global handle used by app.js and picreax.js
const db = firebase.firestore();

