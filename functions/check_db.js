const admin = require("firebase-admin");
admin.initializeApp({ projectId: "portal-ng-brasil" });
const db = admin.firestore();

async function check() {
  const news = await db.collection("news").get();
  console.log("News count:", news.size);
  
  const drafts = await db.collection("drafts").get();
  console.log("Drafts count:", drafts.size);
}
check().catch(console.error);
