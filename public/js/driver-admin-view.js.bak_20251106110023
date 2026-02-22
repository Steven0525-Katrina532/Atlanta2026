import { auth, app } from "/js/app-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, doc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const ADMIN = "steven.hayes@noratrans.com";
const db = getFirestore(app);

// Expose which driver the UI should operate on.
// If admin adds/submits dates, we log an audit trail.
function banner(msg){
  const b = document.createElement("div");
  b.textContent = msg;
  b.style.cssText = "position:fixed;bottom:12px;right:12px;background:#111;color:#fff;padding:8px 10px;border-radius:10px;opacity:.9;z-index:3000;font-size:12px";
  document.body.appendChild(b);
}

onAuthStateChanged(auth, async (user) => {
  const me = String(user?.email||"").toLowerCase();
  const p = new URLSearchParams(location.search);
  const asEmail = String(p.get("as")||"").toLowerCase();

  // Only admins can target another driver via ?as=
  const isAdmin = (me === ADMIN) || !!(window.NORA?.isAdmin);
  const target = (isAdmin && asEmail) ? asEmail : me;

  // Tell the rest of the page who to load
  window.NORA = Object.assign({}, window.NORA || {}, { targetDriver: target, actingAdmin: isAdmin ? me : null });

  if (isAdmin && asEmail) {
    banner("ADMIN viewing driver: " + asEmail);
  }

  // OPTIONAL: if your submit code can call this audit hook after it writes, keep it handy:
  window.NORA_AUDIT = async function(action, details){
    try{
      const ref = doc(db, "admin_audit", crypto.randomUUID());
      await setDoc(ref, {
        action,
        details,
        actedBy: me,
        targetDriver: target,
        at: serverTimestamp()
      });
    }catch(e){ console.warn("Audit failed", e); }
  }
});
(function(){
  // add a back-to-supervisor button when admin is viewing ?as=
  const p = new URLSearchParams(location.search);
  const viewingAs = p.get("as");
  const me = window.NORA?.actingAdmin;
  if (viewingAs && me) {
    const btn = document.createElement("a");
    btn.textContent = "Back to Supervisor";
    btn.href = "/supervisor";
    btn.style.cssText = "position:fixed;top:12px;right:12px;background:#1f8a5b;color:#fff;padding:10px 14px;border-radius:10px;font-weight:700;text-decoration:none;z-index:3000;box-shadow:0 6px 18px rgba(0,0,0,.18)";
    document.body.appendChild(btn);
  }
})();
