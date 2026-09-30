import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, writeBatch, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { initialNews } from '../data/newsData';

export function useFirebaseSync(collectionName, fallbackInitialData = []) {
  // Load from local backup if available, otherwise fallback
  const getInitialBackup = () => {
    try {
      const backup = localStorage.getItem(`portal_ng_backup_${collectionName}`);
      if (backup) {
        return JSON.parse(backup);
      }
    } catch(e) {}
    return fallbackInitialData;
  };

  const [data, setDataState] = useState(getInitialBackup());
  const [loading, setLoading] = useState(true);

  // Sync from Firebase
  useEffect(() => {
    const colRef = collection(db, collectionName);
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      if (!snapshot.empty) {
        const fetchedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDataState(fetchedData);
        // Redundancy: Backup to LocalStorage
        localStorage.setItem(`portal_ng_backup_${collectionName}`, JSON.stringify(fetchedData));
      } else {
        const backup = getInitialBackup();
        setDataState(backup);
        // Se o Firebase estiver vazio mas houver backup local, sincroniza forçado para o Firebase!
        if (backup && backup.length > 0) {
          setData(backup);
        }
      }
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching ${collectionName} from Firebase:`, error);
      // Try to load from backup on error
      setDataState(getInitialBackup());
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName]);

  // Wrapper for set state that syncs to Firebase
  const setData = async (newDataOrFn) => {
    const newData = typeof newDataOrFn === 'function' ? newDataOrFn(data) : newDataOrFn;
    
    // Update local state and backup immediately
    setDataState(newData);
    localStorage.setItem(`portal_ng_backup_${collectionName}`, JSON.stringify(newData));

    // 2. Sync to Firebase
    try {
      const batch = writeBatch(db);
      let writes = 0;
      
      const oldIds = new Map(data.map(item => [String(item.id), item]));
      const newIds = new Set(newData.map(item => String(item.id)));

      // Add/Update new docs (only if changed)
      newData.forEach(item => {
        const strId = String(item.id);
        const oldItem = oldIds.get(strId);
        if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
          const docRef = doc(db, collectionName, strId);
          batch.set(docRef, item);
          writes++;
        }
      });

      // Delete missing docs
      data.forEach(item => {
        const strId = String(item.id);
        if (!newIds.has(strId)) {
          const docRef = doc(db, collectionName, strId);
          batch.delete(docRef);
          writes++;
        }
      });

      if (writes > 0) {
        if (writes > 500) {
           console.warn(`Batch contains ${writes} writes, which exceeds the 500 limit.`);
        }
        await batch.commit();
      }
    } catch (error) {
      console.error(`Error saving ${collectionName} to Firebase:`, error);
    }
  };

  return [data, setData, loading];
}

export function useFirebaseDoc(collectionName, docId, fallbackInitialData = {}) {
  // Load from local backup if available, otherwise fallback
  const getInitialBackup = () => {
    try {
      const backup = localStorage.getItem(`portal_ng_backup_doc_${collectionName}_${docId}`);
      if (backup) {
        return JSON.parse(backup);
      }
    } catch(e) {}
    return fallbackInitialData;
  };

  const [data, setDataState] = useState(getInitialBackup());
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef(null);

  // Sync from Firebase
  useEffect(() => {
    const docRef = doc(db, collectionName, docId);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const fetchedData = { ...fallbackInitialData, ...snapshot.data() };
        setDataState(fetchedData);
        localStorage.setItem(`portal_ng_backup_doc_${collectionName}_${docId}`, JSON.stringify(fetchedData));
      } else {
        const backup = getInitialBackup();
        setDataState(backup);
      }
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching ${collectionName}/${docId} from Firebase:`, error);
      setDataState(getInitialBackup());
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, docId]);

  // Wrapper for set state that syncs to Firebase
  const setData = async (newDataOrFn) => {
    const newData = typeof newDataOrFn === 'function' ? newDataOrFn(data) : newDataOrFn;
    
    // Update local state and backup immediately
    setDataState(newData);
    localStorage.setItem(`portal_ng_backup_doc_${collectionName}_${docId}`, JSON.stringify(newData));

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const docRef = doc(db, collectionName, docId);
        await setDoc(docRef, newData, { merge: true });
      } catch (error) {
        console.error(`Error saving ${collectionName}/${docId} to Firebase:`, error);
      }
    }, 1000);
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

    const savedDrafts = localStorage.getItem('portal_ng_drafts');
    if (savedDrafts) {
      const parsedDrafts = JSON.parse(savedDrafts);
      const batch = writeBatch(db);
      parsedDrafts.forEach(item => {
        const docRef = doc(db, 'drafts', String(item.id));
        batch.set(docRef, item);
      });
      await batch.commit();
      console.log('Migration of drafts completed.');
      localStorage.removeItem('portal_ng_drafts');
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
