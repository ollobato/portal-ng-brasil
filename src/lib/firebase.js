import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCnfaXR5NC28RsU8inhBjO0_PcsLTI7gS4",
  authDomain: "portal-ng-brasil.firebaseapp.com",
  projectId: "portal-ng-brasil",
  storageBucket: "portal-ng-brasil.firebasestorage.app",
  messagingSenderId: "1005968704410",
  appId: "1:1005968704410:web:66df5b82dd90e51b13f023",
  measurementId: "G-DEJH1MHLMD"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
