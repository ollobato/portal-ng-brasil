import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, writeBatch, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { initialNews } from '../data/newsData';

export function useFirebaseSync(collectionName, fallbackInitialData = []) {
  const [data, setDataState] = useState(fallbackInitialData);
  const [loading, setLoading] = useState(true);

  // Sync from Firebase
  useEffect(() => {
    const colRef = collection(db, collectionName);
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      if (!snapshot.empty) {
        const fetchedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort by timestamp or ID if needed, for now just set
        setDataState(fetchedData);
      } else {
        // If empty in Firebase but we have local initial data, let's keep it empty in state
        // until migration happens. If it's a completely fresh load, use fallback.
        setDataState(fallbackInitialData);
      }
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching ${collectionName} from Firebase:`, error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName]);

  // Wrapper for set state that syncs to Firebase
  const setData = async (newDataOrFn) => {
    // 1. Update local state immediately for snappy UI
    const newData = typeof newDataOrFn === 'function' ? newDataOrFn(data) : newDataOrFn;
    setDataState(newData);

    // 2. Sync to Firebase
    try {
      const batch = writeBatch(db);
      const newIds = new Set(newData.map(item => String(item.id)));
      
      // Get current docs in Firebase to figure out what to delete
      const snapshot = await getDocs(collection(db, collectionName));
      snapshot.forEach(docSnap => {
        if (!newIds.has(docSnap.id)) {
          batch.delete(docSnap.ref);
        }
      });

      // Add/Update new docs
      newData.forEach(item => {
        const docRef = doc(db, collectionName, String(item.id));
        batch.set(docRef, item);
      });

      await batch.commit();
    } catch (error) {
      console.error(`Error saving ${collectionName} to Firebase:`, error);
    }
  };

  return [data, setData, loading];
}

export function useFirebaseDoc(collectionName, docId, fallbackInitialData = {}) {
  const [data, setDataState] = useState(fallbackInitialData);
  const [loading, setLoading] = useState(true);

  // Sync from Firebase
  useEffect(() => {
    const docRef = doc(db, collectionName, docId);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        setDataState({ ...fallbackInitialData, ...snapshot.data() });
      } else {
        setDataState(fallbackInitialData);
      }
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching ${collectionName}/${docId} from Firebase:`, error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, docId]);

  // Wrapper for set state that syncs to Firebase
  const setData = async (newDataOrFn) => {
    const newData = typeof newDataOrFn === 'function' ? newDataOrFn(data) : newDataOrFn;
    setDataState(newData);

    try {
      const docRef = doc(db, collectionName, docId);
      await setDoc(docRef, newData, { merge: true });
    } catch (error) {
      console.error(`Error saving ${collectionName}/${docId} to Firebase:`, error);
    }
  };

  return [data, setData, loading];
}

// Utility to run once to migrate local storage to Firebase
export const migrateLocalStorageToFirebase = async () => {
  try {
    const savedNews = localStorage.getItem('portal_ng_news');
    if (savedNews) {
      const parsedNews = JSON.parse(savedNews);
      const batch = writeBatch(db);
      parsedNews.forEach(item => {
        const docRef = doc(db, 'news', String(item.id));
        batch.set(docRef, item);
      });
      await batch.commit();
      console.log('Migration of news completed.');
      localStorage.removeItem('portal_ng_news'); // Clear to prevent re-migration
    }

    const savedBanners = localStorage.getItem('portal_ng_banners');
    if (savedBanners) {
      const parsedBanners = JSON.parse(savedBanners);
      const batch = writeBatch(db);
      parsedBanners.forEach(item => {
        const docRef = doc(db, 'banners', String(item.id));
        batch.set(docRef, item);
      });
      await batch.commit();
      console.log('Migration of banners completed.');
      localStorage.removeItem('portal_ng_banners');
    }
  } catch (error) {
    console.error('Migration failed:', error);
  }
};
