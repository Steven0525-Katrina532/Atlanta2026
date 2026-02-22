import { initFirebase } from "/firebase-config.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const app = initFirebase();
const auth = getAuth(app);
const db = getFirestore(app);

// Optional: expose for any legacy inline scripts
try { globalThis.__atl = Object.assign(globalThis.__atl || {}, { app, auth, db }); } catch {}

export { app, auth, db };

