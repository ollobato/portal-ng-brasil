import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  getFirestore 
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyCnfaXR5NC28RsU8inhBjO0_PcslTI7gS4",
  authDomain: "portal-ng-brasil.firebaseapp.com",
  projectId: "portal-ng-brasil",
  storageBucket: "portal-ng-brasil.firebasestorage.app",
  messagingSenderId: "1005968704410",
  appId: "1:1005968704410:web:66df5b82dd90e51b13f023",
  measurementId: "G-DEJH1MHLMD"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Modern offline persistence using FirestoreSettings.cache
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (e) {
  firestoreDb = getFirestore(app);
}
export const db = firestoreDb;

export const storage = getStorage(app);
