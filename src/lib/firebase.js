import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
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
export const db = getFirestore(app);

// Habilitar persistência offline para garantir que nenhuma matéria seja perdida caso a internet caia
enableIndexedDbPersistence(db).catch((err) => {
  console.warn("Falha ao ativar persistência offline:", err);
});

export const storage = getStorage(app);
