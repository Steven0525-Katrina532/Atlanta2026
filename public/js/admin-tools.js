import { auth, app } from "/js/app-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js";

const ADMIN = "steven.hayes@noratrans.com";
const db = getFirestore(app);
const fn = getFunctions(app);

// callables
const upsertDriverFn     = httpsCallable(fn, "upsertDriver");
const removeDriverFn     = httpsCallable(fn, "removeDriver");
const addSupervisorFn    = httpsCallable(fn, "addSupervisor");
const demoteSupervisorFn = httpsCallable(fn, "demoteSupervisor");
const resetDemoFn        = httpsCallable(fn, "adminResetDemo");

const $ = (id) => document.getElementById(id);
const say = (m) => alert(m);

async function loadDrivers(){
  const sel = $("adminSelectDriver");
  if (!sel) return;
  sel.innerHTML = "<option value=''>-- select driver --</option>";
  try{
    const qs = await getDocs(query(collection(db,"drivers"), orderBy("email"), limit(1000)));
    qs.forEach(d=>{
      const e = String(d.get("email")||"").toLowerCase();
      const n = d.get("name") || e;
      if(e){
        const opt = document.createElement("option");
        opt.value = e; opt.textContent = `${n} (${e})`;
        sel.appendChild(opt);
      }
    });
  }catch{ /* ignore */ }
}

function openDriverConsole(email){
  if(!email) return say("Pick or type a driver email first.");
  location.href = "/driver.html?as=" + encodeURIComponent(email.toLowerCase());
}

onAuthStateChanged(auth, (user)=>{
  const me = String(user?.email||"").toLowerCase();
  const isAdmin = (me === ADMIN);
  const isSupervisor = !!(window.NORA?.isSupervisor) || isAdmin;

  // elements
  const panel = $("adminTools");
  if (!panel) return;
  panel.hidden = false;

  // enable/disable by role
  const supOnly = ["btnSupDemote","btnSupRemove","supEmail","btnSupAdd"]; // supervisor management (admin only)
  supOnly.forEach(id => { const el = $(id); if (el) el.disabled = !isAdmin; });

  // driver add/remove (supervisor or admin)
  ["btnAdd","btnRemove","hfName","hfEmail"].forEach(id => { const el = $(id); if (el) el.disabled = !isSupervisor; });

  // load drivers for jump
  loadDrivers();

  // open driver
  $("btnImpersonateGo")?.addEventListener("click", ()=>{
    const sel = $("adminSelectDriver");
    const typed = $("adminDriverEmail")?.value?.trim();
    openDriverConsole(typed || sel?.value);
  });

  // DRIVER add/remove
  $("btnAdd")?.addEventListener("click", async ()=>{
    const name = $("hfName")?.value?.trim();
    const email= $("hfEmail")?.value?.trim()?.toLowerCase();
    if(!email) return say("Email required");
    try{ await upsertDriverFn({ name, email }); say("Driver added/updated"); } catch(e){ say(e?.message||"Failed"); }
  });

  $("btnRemove")?.addEventListener("click", async ()=>{
    const email= $("hfEmail")?.value?.trim()?.toLowerCase();
    if(!email) return say("Email required");
    if(!confirm(`Remove driver ${email}?`)) return;
    try{ await removeDriverFn({ email }); say("Driver removed"); } catch(e){ say(e?.message||"Failed"); }
  });

  // SUPERVISOR add/demote/remove (admin only)
  $("btnSupAdd")?.addEventListener("click", async ()=>{
    if(!isAdmin) return;
    const email= $("supEmail")?.value?.trim()?.toLowerCase();
    if(!email) return say("Email required");
    try{ await addSupervisorFn({ email }); say("Supervisor added"); } catch(e){ say(e?.message||"Failed"); }
  });

  $("btnSupDemote")?.addEventListener("click", async ()=>{
    if(!isAdmin) return;
    const email= $("supEmail")?.value?.trim()?.toLowerCase();
    if(!email) return say("Email required");
    if(!confirm(`Demote ${email} to driver?`)) return;
    try{ await demoteSupervisorFn({ email }); say("Demoted"); } catch(e){ say(e?.message||"Failed"); }
  });

  $("btnSupRemove")?.addEventListener("click", async ()=>{
    if(!isAdmin) return;
    const email= $("supEmail")?.value?.trim()?.toLowerCase();
    if(!email) return say("Email required");
    if(!confirm(`Remove ${email} from supervisors AND Auth?`)) return;
    try{
      await demoteSupervisorFn({ email });
      await removeDriverFn({ email }).catch(()=>{});
      say("Supervisor removed (and user removed if existed).");
    } catch(e){ say(e?.message||"Failed"); }
  });

  // RESET (admin only) — requires typing 'reset'
  $("btnDemoReset")?.addEventListener("click", async ()=>{
    if(!isAdmin) return;
    const text = prompt("Type 'reset' to confirm clearing picks/assignments/proposals/counters.");
    if (!text) return;
    try{
      const res = await resetDemoFn({ confirm: text });
      say("Reset OK: " + JSON.stringify(res?.data?.results||{}));
    }catch(e){
      say(e?.message || "Reset failed");
    }
  });
});
(function(){
  const bc = ("BroadcastChannel" in window) ? new BroadcastChannel("claims") : null;
  function ping(){ try{
    if (bc) bc.postMessage({ type:"claims-updated", at:Date.now() });
    else localStorage.setItem("claims-updated", String(Date.now()));
  }catch{} }

  window.addEventListener("storage", (ev)=> {
    if (ev.key === "claims-updated") { auth?.currentUser?.getIdToken(true).then(()=>location.reload()); }
  });
  if (bc) bc.onmessage = (ev)=> {
    if (ev?.data?.type === "claims-updated") { auth?.currentUser?.getIdToken(true).then(()=>location.reload()); }
  };

  // expose for other handlers (call ping() after setUserRole succeeds)
  window.NORA = Object.assign({}, window.NORA||{}, { pingClaimsUpdate: ping });
})();
