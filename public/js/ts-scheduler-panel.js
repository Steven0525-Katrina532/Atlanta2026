import { ensureFirebase, watchClaims } from "/js/claims.js";
import {
  getFirestore, collection, doc, setDoc, updateDoc, getDoc,
  query, where, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

function yyyymm(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
function yyyymmdd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function daysInMonth(year, month1to12) {
  return new Date(year, month1to12, 0).getDate();
}
function parseMonth(month) {
  const [y, m] = month.split("-").map(Number);
  return { y, m };
}
function addMonths(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth() + n, 1);
  return d;
}

function createPanel() {
  const el = document.createElement("div");
  el.id = "tsSchedulerPanel";
  el.style.cssText = `
    position:fixed; right:16px; bottom:16px; z-index:99999;
    width:380px; max-width:calc(100vw - 32px);
    background:#fff; border:1px solid #ddd; border-radius:14px;
    box-shadow:0 10px 30px rgba(0,0,0,.12);
    font-family:system-ui,Segoe UI,Arial; overflow:hidden;
  `;
  el.innerHTML = `
    <div style="padding:12px 14px; border-bottom:1px solid #eee; display:flex; align-items:center; justify-content:space-between;">
      <div>
        <div style="font-weight:800;">TS Scheduler Panel</div>
        <div id="tsPanelMeta" style="font-size:12px; opacity:.7;">loading…</div>
      </div>
      <button id="tsPanelToggle" style="border:1px solid #ccc; border-radius:10px; padding:6px 10px; cursor:pointer;">–</button>
    </div>

    <div id="tsPanelBody" style="padding:12px 14px; display:grid; gap:10px;">
      <div id="tsPanelStatus" style="font-size:13px; padding:8px 10px; border-radius:10px; background:#f5f5f5;">Checking auth…</div>

      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button id="tabCurrent" style="padding:8px 10px; border-radius:10px; border:1px solid #ccc; cursor:pointer;">Current Month</button>
        <button id="tabSched" style="padding:8px 10px; border-radius:10px; border:1px solid #ccc; cursor:pointer;">Scheduling Month</button>
      </div>

      <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <input id="datePick" type="date" style="flex:1; min-width:170px; padding:8px 10px; border-radius:10px; border:1px solid #ccc;" />
        <button id="addDate" style="padding:8px 10px; border-radius:10px; border:1px solid #333; cursor:pointer;">Add</button>
      </div>

      <div style="display:flex; gap:8px;">
        <button id="submitDates" style="flex:1; padding:10px 12px; border-radius:12px; border:1px solid #0b5; background:#0b5; color:#fff; cursor:pointer;">Submit (up to 5)</button>
        <button id="clearDates" style="padding:10px 12px; border-radius:12px; border:1px solid #ccc; cursor:pointer;">Clear</button>
      </div>

      <div style="font-size:12px; opacity:.75;">
        Cooldown: <span id="cooldown">ready</span>
      </div>

      <div style="display:grid; gap:8px;">
        <div style="font-weight:700;">Selected Dates</div>
        <div id="selectedList" style="font-size:13px;"></div>
      </div>

      <div style="display:grid; gap:8px;">
        <div style="font-weight:700;">Month Availability</div>
        <div id="monthGrid" style="max-height:240px; overflow:auto; border:1px solid #eee; border-radius:12px; padding:8px;"></div>
      </div>

      <div style="display:grid; gap:8px;">
        <div style="font-weight:700;">My Applications (this view)</div>
        <div id="myApps" style="font-size:13px;"></div>
      </div>
    </div>
  `;
  document.body.appendChild(el);

  const btn = el.querySelector("#tsPanelToggle");
  const body = el.querySelector("#tsPanelBody");
  btn.addEventListener("click", () => {
    const hidden = body.style.display === "none";
    body.style.display = hidden ? "grid" : "none";
    btn.textContent = hidden ? "–" : "+";
  });

  return el;
}

function setStatus(text, ok=false) {
  const s = document.getElementById("tsPanelStatus");
  s.textContent = text;
  s.style.background = ok ? "#e7f7ee" : "#f5f5f5";
  s.style.border = "1px solid " + (ok ? "#9ad3b2" : "#eee");
}

function monthDates(month) {
  const { y, m } = parseMonth(month);
  const count = daysInMonth(y, m);
  const out = [];
  for (let i=1;i<=count;i++) {
    const d = new Date(y, m-1, i);
    out.push(yyyymmdd(d));
  }
  return out;
}

async function getMonthConfig(db, month) {
  const snap = await getDoc(doc(db, "monthConfigs", month));
  return snap.exists() ? snap.data() : null;
}

function nowUtcMillis() { return Date.now(); }

function fmtLocal(dtMillis) {
  const d = new Date(dtMillis);
  return d.toLocaleString();
}

function canCancelNow(monthConfig) {
  if (!monthConfig?.closeAt) return false;
  const closeMillis = monthConfig.closeAt.toDate().getTime();
  return nowUtcMillis() < closeMillis;
}

function isBeforeClose(monthConfig) {
  if (!monthConfig?.closeAt) return false;
  return nowUtcMillis() < monthConfig.closeAt.toDate().getTime();
}

function pickViewMonths() {
  const now = new Date();
  const current = yyyymm(now);
  const sched = yyyymm(addMonths(now, 1));
  return { current, sched };
}

function buildCounts(capacity, appsByDate) {
  const remaining = new Map();
  for (const [date, cnt] of appsByDate.entries()) {
    remaining.set(date, Math.max(0, capacity - cnt));
  }
  return remaining;
}

(async function main(){
  createPanel();

  const meta = document.getElementById("tsPanelMeta");
  const cooldownEl = document.getElementById("cooldown");
  const selectedList = document.getElementById("selectedList");
  const monthGrid = document.getElementById("monthGrid");
  const myAppsEl = document.getElementById("myApps");

  let activeTab = "sched"; // default
  let selected = new Set();
  let cooldownUntil = 0;

  const { auth } = await ensureFirebase();
  const db = getFirestore();

  const { current, sched } = pickViewMonths();

  const tabCurrent = document.getElementById("tabCurrent");
  const tabSched = document.getElementById("tabSched");

  function setTab(t) {
    activeTab = t;
    tabCurrent.style.background = (t==="current") ? "#eee" : "#fff";
    tabSched.style.background = (t==="sched") ? "#eee" : "#fff";
    render();
  }

  tabCurrent.onclick = ()=>setTab("current");
  tabSched.onclick = ()=>setTab("sched");
  setTab("sched");

  function renderSelected() {
    if (selected.size===0) {
      selectedList.innerHTML = `<div style="opacity:.7;">(none)</div>`;
      return;
    }
    const items = Array.from(selected).sort().map(d=>`<div>${d}</div>`).join("");
    selectedList.innerHTML = items;
  }

  function updateCooldown() {
    const ms = cooldownUntil - Date.now();
    if (ms <= 0) {
      cooldownEl.textContent = "ready";
      return;
    }
    cooldownEl.textContent = Math.ceil(ms/1000) + "s";
  }
  setInterval(updateCooldown, 500);

  document.getElementById("clearDates").onclick = () => {
    selected = new Set();
    renderSelected();
  };

  document.getElementById("addDate").onclick = () => {
    const v = document.getElementById("datePick").value;
    if (!v) return;
    selected.add(v);
    renderSelected();
  };

  // live data holders
  let capacity = 0;
  let appsByDate = new Map(); // date -> count of applied
  let myAppliedDates = new Set(); // date strings applied by me (status=applied)

  // vehicles capacity listener
  onSnapshot(query(collection(db, "vehicles"), where("active","==",true)), (snap)=>{
    capacity = snap.size;
    render();
  });

  // applications listener (all applied in view month)
  let unsubApps = null;
  function subscribeMonthApps(month) {
    if (unsubApps) unsubApps();
    appsByDate = new Map();
    myAppliedDates = new Set();

    const q = query(collection(db, "applications"), where("month","==",month), where("status","==","applied"));
    unsubApps = onSnapshot(q, (snap)=>{
      const counts = new Map();
      const mine = new Set();

      snap.forEach(docu=>{
        const a = docu.data();
        const date = String(a.date || "");
        if (!date) return;
        counts.set(date, (counts.get(date) || 0) + 1);
        if (a.tsUid === auth.currentUser?.uid) mine.add(date);
      });

      appsByDate = counts;
      myAppliedDates = mine;
      render();
    });
  }

  function viewMonth() {
    return activeTab === "current" ? current : sched;
  }

  async function render() {
    const month = viewMonth();
    meta.textContent = `month=${month} • capacity=${capacity}`;

    // month config
    const cfg = await getMonthConfig(db, month);
    const closeText = cfg?.closeAt ? fmtLocal(cfg.closeAt.toDate().getTime()) : "(not set)";
    const state = cfg?.state || "(none)";
    const closeOk = isBeforeClose(cfg);

    // subscribe to correct month apps
    subscribeMonthApps(month);

    // status line for rules
    if (activeTab === "sched") {
      setStatus(`Scheduling month. CloseAt: ${closeText}. State: ${state}.`, true);
    } else {
      setStatus(`Current month. Red=open days. CloseAt: ${closeText}. State: ${state}.`, true);
    }

    // grid
    const dates = monthDates(month);
    // compute remaining per date
    const remaining = new Map();
    for (const d of dates) {
      const cnt = appsByDate.get(d) || 0;
      remaining.set(d, Math.max(0, capacity - cnt));
    }

    // show grid list
    monthGrid.innerHTML = dates.map(d=>{
      const rem = remaining.get(d) ?? 0;
      const isFull = rem === 0;
      const open = rem > 0;
      const isMine = myAppliedDates.has(d);

      const bg = isFull ? "#f0f0f0" : (open ? "#fff" : "#fff");
      const border = isFull ? "#ddd" : (open ? "#c00" : "#ddd"); // red border for open
      const label = isFull ? "FULL" : `OPEN ${rem}`;
      const mine = isMine ? " • MINE" : "";

      return `
        <div data-date="${d}" style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:6px 8px; margin:4px 0; border:1px solid ${border}; border-radius:10px; background:${bg};">
          <div style="font-family:ui-monospace,Consolas,monospace;">${d}</div>
          <div style="font-size:12px; opacity:.85;">${label}${mine}</div>
        </div>
      `;
    }).join("");

    // my apps list with cancel buttons (cancel before close only)
    const canCancel = canCancelNow(cfg);
    const mine = Array.from(myAppliedDates).sort();
    myAppsEl.innerHTML = mine.length ? mine.map(d=>`
      <div style="display:flex; justify-content:space-between; gap:8px; align-items:center; padding:6px 0; border-bottom:1px solid #eee;">
        <div>${d}</div>
        <button data-cancel="${d}" style="padding:6px 10px; border-radius:10px; border:1px solid #ccc; cursor:pointer;" ${canCancel ? "" : "disabled"}>${canCancel ? "Cancel" : "Closed"}</button>
      </div>
    `).join("") : `<div style="opacity:.7;">(none)</div>`;

    // attach cancel handlers
    myAppsEl.querySelectorAll("button[data-cancel]").forEach(btn=>{
      btn.onclick = async () => {
        const date = btn.getAttribute("data-cancel");
        const month = viewMonth();
        const cfg = await getMonthConfig(db, month);
        if (!canCancelNow(cfg)) {
          alert("This schedule is closed. Contact your Base Lead to make changes.");
          return;
        }
        const id = `${auth.currentUser.uid}_${date}`;
        await updateDoc(doc(db,"applications",id), {
          status: "cancelled",
          statusUpdatedAt: serverTimestamp(),
        });
      };
    });
  }

  // auth + claims
  watchClaims(async (user, claims) => {
    const role = claims.role || "ts";
    // BaseLead is also TS; allow. Ops/global will still work but this is TS panel.
    if (!["ts","baseLead","opsManager","globalAdmin"].includes(role)) {
      setStatus("Unknown role; cannot proceed.", false);
      return;
    }
    setStatus(`Signed in ✅ role=${role}`, true);
    // initial month subscribe
    subscribeMonthApps(viewMonth());
    await render();
  }, () => {
    setStatus("Not signed in. Go to /login/ first.", false);
  });

  // submit logic (up to 5 + 30s cooldown)
  document.getElementById("submitDates").onclick = async () => {
    if (!auth.currentUser) return alert("Not signed in.");
    if (Date.now() < cooldownUntil) return alert("Cooldown active. Please wait.");

    const month = viewMonth();
    const cfg = await getMonthConfig(db, month);

    // Rules:
    // - scheduling month: allow submit only before close
    // - current month: allow submit only if remaining > 0 (red/open)
    if (activeTab === "sched" && cfg && !isBeforeClose(cfg)) {
      // after close, late apps for scheduling month still allowed only for open days; this panel allows it anyway if open
      // we will just continue, but base lead will assign later
    }

    const dates = Array.from(selected).sort();
    if (dates.length === 0) return alert("Select at least one date.");
    if (dates.length > 5) return alert("You can submit up to 5 dates at a time.");

    // capacity check client-side (server is source of truth later; this is MVP)
    // We'll compute open slots from current in-memory counts.
    const openOk = [];
    for (const d of dates) {
      // date must be in the month view
      if (!d.startsWith(month)) continue;
      const cnt = appsByDate.get(d) || 0;
      const rem = Math.max(0, capacity - cnt);
      if (rem <= 0) continue;
      openOk.push(d);
    }
    if (openOk.length === 0) return alert("All selected dates are full or not in this month view.");

    // write applications docs
    for (const date of openOk) {
      const id = `${auth.currentUser.uid}_${date}`;
      await setDoc(doc(db,"applications",id), {
        baseId: "ATLANTA",
        month,
        date,
        tsUid: auth.currentUser.uid,
        tsStaffId: auth.currentUser.uid, // TODO: replace with staffId from tsProfiles later
        tsName: auth.currentUser.email || "unknown",
        submittedAt: serverTimestamp(),
        submittedByUid: auth.currentUser.uid,
        status: "applied",
        statusUpdatedAt: serverTimestamp(),
      }, { merge: true });
    }

    // cooldown + clear
    cooldownUntil = Date.now() + 30000;
    selected = new Set();
    renderSelected();
  };

})();
