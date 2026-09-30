const admin = require("firebase-admin");
admin.initializeApp({ projectId: "portal-ng-brasil" });
const db = admin.firestore();

async function check() {
  try {
    const newsSnap = await db.collection("news").get();
    console.log(`--- NEWS (${newsSnap.size}) ---`);
    newsSnap.forEach(doc => {
      const data = doc.data();
      console.log(`[${doc.id}] ${data.title ? data.title.substring(0, 50) : 'NO TITLE'} (Date: ${data.date})`);
    });

    const draftsSnap = await db.collection("drafts").get();
    console.log(`\n--- DRAFTS (${draftsSnap.size}) ---`);
    draftsSnap.forEach(doc => {
      const data = doc.data();
      console.log(`[${doc.id}] ${data.title ? data.title.substring(0, 50) : 'NO TITLE'}`);
    });
  } catch (err) {
    console.error(err);
  }
}
check();
