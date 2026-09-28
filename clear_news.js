import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCnfaXR5NC28RsU8inhBjO0_PcslTI7gS4",
  authDomain: "portal-ng-brasil.firebaseapp.com",
  projectId: "portal-ng-brasil",
  storageBucket: "portal-ng-brasil.firebasestorage.app",
  messagingSenderId: "1005968704410",
  appId: "1:1005968704410:web:66df5b82dd90e51b13f023",
  measurementId: "G-DEJH1MHLMD"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearNews() {
  const querySnapshot = await getDocs(collection(db, "news"));
  const deletePromises = [];
  querySnapshot.forEach((document) => {
    deletePromises.push(deleteDoc(doc(db, "news", document.id)));
  });
  await Promise.all(deletePromises);
  console.log(`Deleted ${deletePromises.length} news articles.`);
  process.exit(0);
}

clearNews().catch(console.error);
