import { initializeApp, getApps } from "firebase-admin/app";`nimport { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import PDFDocument from "pdfkit";

if (!getApps().length) { initializeApp(); }
const db = getFirestore();
const tz = "America/New_York";

/** ROLES */
async function requireRole(context, role) {
  if (!context.auth?.token?.email) throw new functions.https.HttpsError("unauthenticated","Sign in required");
  const email = context.auth.token.email;
  const snap = await db.doc(`roles/${email}`).get();
  const roles = snap.exists ? snap.data().roles || {} : {};
  if (!roles[role] && !roles["admin"]) throw new functions.https.HttpsError("permission-denied","Supervisor/admin only");
  return email;
}

/** Utilities */
function isoOrNull(v){ return v?.toDate ? v.toDate().toISOString() : v ?? null; }
function ymFromDateStr(d) { // "YYYY-MM-DD"
  return d.slice(0,7);
}
function dayFromDateStr(d) {
  return d.slice(8,10);
}
function asDate(s) { return new Date(s); }

/** ========== CORE HELPERS (shared) ========== */

async function setWindowCore({ open, closeAt, ym }, actorEmail) {
  const doc = { status: open ? "OPEN" : "CLOSED", updatedAt: Timestamp.now() };
  if (closeAt) doc.closeAt = Timestamp.fromDate(new Date(closeAt));
  if (ym) doc.ym = ym;
  await db.doc("settings/window").set(doc, { merge: true });
  await db.collection("audits").add({ type:"setWindow", doc, by: actorEmail, at: FieldValue.serverTimestamp() });
  return { ok:true };
}

async function listLateRequestsInternal() {
  const qs = await db.collection("lateRequests").orderBy("at","desc").limit(200).get();
  return qs.docs.map(d => {
    const obj = { id: d.id, ...d.data() };
    for (const k of Object.keys(obj)) if (obj[k]?.toDate) obj[k] = obj[k].toDate().toISOString();
    return obj;
  });
}

async function decideLateCore({ id, approve }, actorEmail) {
  const ref = db.doc(`lateRequests/${id}`);
  const snap = await ref.get();
  if (!snap.exists) throw new functions.https.HttpsError("not-found","late request not found");
  const lr = snap.data(); // expects { uid,email,date:YYYY-MM-DD, vehicle? }

  const ymKey = ymFromDateStr(lr.date);
  const dayKey = dayFromDateStr(lr.date);
  const aRef = db.doc(`assignments/${ymKey}/days/${dayKey}`);

  await db.runTransaction(async tx => {
    if (approve) {
      const aSnap = await tx.get(aRef);
      const cur = aSnap.exists ? aSnap.data() : { ym: ymKey, day: dayKey, pairs: [] };
      cur.pairs = cur.pairs || [];
      // ensure capacity <= 11
      if ((cur.pairs?.length || 0) >= 11) throw new functions.https.HttpsError("failed-precondition","day at capacity");
      // if vehicle provided, keep it; else null (engine or supervisor can later pick)
      cur.pairs.push({ uid: lr.uid, email: lr.email, vehicle: lr.vehicle ?? null, source: "late-approve" });
      tx.set(aRef, cur, { merge: true });
      tx.delete(ref);
    } else {
      tx.update(ref, { state:"denied", decidedAt: FieldValue.serverTimestamp() });
    }
  });

  await db.collection("audits").add({ type:"decideLate", id, approve, by: actorEmail, at: FieldValue.serverTimestamp() });
  return { ok:true };
}

/**
 * Assignment Engine (authoritative rules, simplified heuristic):
 *  - Capacity: 11 per day
 *  - Pair-lock: keep same driver+vehicle up to 3 consecutive days
 *  - Fairness: assign drivers with the fewest total assigned days first
 *  - Vehicle priority: Suburbans 1601–1606, then Equinox 1631–1635 (from runbook)
 *  - Uses applications within the month; writes to assignments/{ym}/days/{day} atomically per day
 */
async function runEngineCore(month, actorEmail) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new functions.https.HttpsError("invalid-argument","month must be YYYY-MM");

  // Load vehicles (active, not hidden)
  const vqs = await db.collection("vehicles").get();
  const vehicles = vqs.docs
    .map(d => d.data())
    .filter(v => v.active !== false && v.hidden !== true)
    .map(v => v.id);

  // Priority order from runbook: Suburbans then Equinox
  const priorityOrder = [
    "1601","1602","1603","1604","1605","1606",
    "1631","1632","1633","1634","1635"
  ].filter(id => vehicles.includes(id));

  // Load applications for the month
  const aqs = await db.collection("applications").where("ym","==",month).get();
  const apps = aqs.docs.map(d => d.data()); // { uid,email, ym, dates:[], ... }

  // Build applicant map: day -> list of {uid,email}
  const dayApplicants = {}; // "DD" -> Set of drivers
  for (const a of apps) {
    const dates = a.dates || [];
    for (const date of dates) {
      if (date.startsWith(month)) {
        const day = dayFromDateStr(date);
        if (!dayApplicants[day]) dayApplicants[day] = new Map();
        dayApplicants[day].set(a.uid, { uid: a.uid, email: a.email });
      }
    }
  }

  // Current working assignments (if any) to respect existing streaks
  const daysColl = await db.collection(`assignments/${month}/days`).get();
  const current = {}; // day -> pairs[]
  for (const d of daysColl.docs) current[d.id] = d.data().pairs || [];

  // Fairness: count current assigned days per driver across the month
  const assignedCount = {};
  for (const [day, pairs] of Object.entries(current)) {
    for (const p of pairs) {
      assignedCount[p.uid] = (assignedCount[p.uid] || 0) + 1;
    }
  }

  // Helper: check/extend streaks
  function prevDayStr(month, dd) {
    const d = new Date(month + "-" + dd);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(8,10);
  }

  function findPrevVehicleFor(uid, dd) {
    const pd = prevDayStr(month, dd);
    const prev = current[pd] || [];
    const hit = prev.find(p => p.uid === uid && p.vehicle);
    return hit?.vehicle || null;
  }

  // Iterate all days in month
  const start = new Date(month + "-01T00:00:00");
  const end = new Date(start); end.setMonth(end.getMonth()+1);

  for (let d = new Date(start); d < end; d.setDate(d.getDate()+1)) {
    const dd = d.toISOString().slice(8,10);
    const want = 11;

    // get candidates
    const applicants = Array.from((dayApplicants[dd]?.values() || []));
    const existing = current[dd] || [];

    // continuing streaks get priority (<=3 days)
    const streakAdds = [];
    for (const a of applicants) {
      // Check previous two days for same driver to estimate streak length
      let streak = 0;
      let probe = dd;
      for (let i=0;i<2;i++){
        probe = prevDayStr(month, probe);
        const prevPairs = current[probe] || [];
        if (prevPairs.some(p => p.uid === a.uid)) streak++;
        else break;
      }
      if (streak > 0 && streak < 3) {
        const veh = findPrevVehicleFor(a.uid, dd);
        if (veh) streakAdds.push({ ...a, vehicle: veh, streak });
      }
    }

    // Fill with streaks (dedupe)
    const takenUids = new Set(existing.map(x=>x.uid));
    const pairs = [...existing];
    for (const s of streakAdds) {
      if (pairs.length >= want) break;
      if (takenUids.has(s.uid)) continue;
      const veh = s.vehicle || priorityOrder.find(v => !pairs.some(p => p.vehicle===v));
      pairs.push({ uid: s.uid, email: s.email, vehicle: veh, source: "engine-streak" });
      takenUids.add(s.uid);
      assignedCount[s.uid] = (assignedCount[s.uid] || 0) + 1;
    }

    // Remaining slots: fairness (fewest assigned) among applicants not yet taken
    const fillCandidates = applicants.filter(a => !takenUids.has(a.uid));
    fillCandidates.sort((a,b) => (assignedCount[a.uid]||0) - (assignedCount[b.uid]||0));

    for (const a of fillCandidates) {
      if (pairs.length >= want) break;
      const veh = priorityOrder.find(v => !pairs.some(p => p.vehicle===v));
      pairs.push({ uid: a.uid, email: a.email, vehicle: veh, source: "engine-fair" });
      takenUids.add(a.uid);
      assignedCount[a.uid] = (assignedCount[a.uid] || 0) + 1;
    }

    // Write atomically
    const aRef = db.doc(`assignments/${month}/days/${dd}`);
    await db.runTransaction(async tx => {
      const curSnap = await tx.get(aRef);
      const cur = curSnap.exists ? curSnap.data() : { ym: month, day: dd, pairs: [] };
      cur.ym = month; cur.day = dd; cur.pairs = pairs.slice(0, want);
      tx.set(aRef, cur, { merge: true });
    });

    current[dd] = pairs.slice(0, want);
  }

  await db.collection("audits").add({ type:"runEngine", month, by: actorEmail, at: FieldValue.serverTimestamp() });
  return { ok:true };
}

/** PDF Export (simple roster for day/week/month; returns base64 string for MVP) */
async function exportPdfCore({ month, range, day, weekStart }, actorEmail) {
  const doc = new PDFDocument({ size: "LETTER", margin: 36 });
  const chunks = [];
  doc.on("data", c => chunks.push(c));
  const title = `ATL Roster ${month} ${range || "month"}`;
  doc.fontSize(18).text(title, { align: "center" }).moveDown();

  async function printDay(ym, dd) {
    const ref = db.doc(`pub/${ym}/days/${dd}`);
    const snap = await ref.get();
    const data = snap.exists ? snap.data() : null;
    doc.fontSize(14).text(`${ym}-${dd}`, { underline: true });
    if (!data || !data.pairs?.length) {
      doc.fontSize(10).text("No assignments.");
      doc.moveDown();
      return;
    }
    for (const p of data.pairs) doc.fontSize(10).text(`Vehicle ${p.vehicle || "--"}  —  ${p.email || p.uid}`);
    doc.moveDown();
  }

  if (range === "day" && day) {
    await printDay(month, day.padStart(2,"0"));
  } else if (range === "week" && weekStart) {
    let d = new Date(`${month}-${weekStart.padStart(2,"0")}T00:00:00`);
    for (let i=0;i<7;i++){ await printDay(d.toISOString().slice(0,7), d.toISOString().slice(8,10)); d.setDate(d.getDate()+1); }
  } else {
    // whole month (all days found in pub)
    const qs = await db.collection(`pub/${month}/days`).get();
    const days = qs.docs.map(x=>x.id).sort();
    for (const dd of days) await printDay(month, dd);
  }

  doc.end();
  const buf = await new Promise(res => doc.on("end", () => res(Buffer.concat(chunks))));
  return { ok:true, base64: buf.toString("base64") };
}

/** ========== CALLABLES ========== */

export const setWindow = functions.https.onCall(async (data, context) => {
  const email = await requireRole(context, "supervisor");
  return await setWindowCore(data || {}, email);
});

export const listLateRequests = functions.https.onCall(async (_, context) => {
  await requireRole(context, "supervisor");
  return await listLateRequestsInternal();
});

export const decideLate = functions.https.onCall(async (data, context) => {
  const email = await requireRole(context, "supervisor");
  return await decideLateCore(data || {}, email);
});

export const runEngine = functions.https.onCall(async (data, context) => {
  const email = await requireRole(context, "supervisor");
  return await runEngineCore(String((data||{}).month||""), email);
});

export const exportMonthlyPdf = functions.https.onCall(async (data, context) => {
  const email = await requireRole(context, "supervisor");
  return await exportPdfCore(data||{}, email);
});

/** One-time role seed (owner only) */
export const seedRolesOnce = functions.https.onCall(async (data, context) => {
  const email = context.auth?.token?.email || "";
  if (email !== "steven.hayes@noratrans.com")
    throw new functions.https.HttpsError("permission-denied","owner only");
  const already = await db.doc("settings/seedRolesOnce").get();
  if (already.exists) throw new functions.https.HttpsError("failed-precondition","already seeded");

  const roles = {
    "steven.hayes@noratrans.com": { admin:true, supervisor:true, driver:false, features:{ owner:true } },
    "louise.cook@noratrans.com":  { supervisor:true, driver:true },
    "allen.shelley@noratrans.com":{ supervisor:true, driver:true }
  };
  const batch = db.batch();
  Object.entries(roles).forEach(([k,v]) => batch.set(db.doc(`roles/${k}`), { roles:v }, { merge:true }));
  batch.set(db.doc("settings/seedRolesOnce"), { at: FieldValue.serverTimestamp(), by: email });
  await batch.commit();
  return { ok:true };
});

/** Command Box (plain-English MVP) */
export const supervisorCommand = functions.https.onCall(async (data, context) => {
  const email = await requireRole(context, "supervisor");
  const t = String((data||{}).text||"").toLowerCase().trim();

  // open/close window
  if (t.startsWith("open window")) {
    const m = t.match(/until (.+)$/);
    const closeAt = m ? m[1] : null;
    return await setWindowCore({ open:true, closeAt }, email);
  }
  if (t.startsWith("close window")) {
    return await setWindowCore({ open:false }, email);
  }
  // run engine for YYYY-MM
  if (t.startsWith("run engine")) {
    const m = t.match(/(\d{4}-\d{2})/);
    if (!m) throw new functions.https.HttpsError("invalid-argument","Specify month YYYY-MM");
    return await runEngineCore(m[1], email);
  }
  // approve late <email fragment> for YYYY-MM-DD
  if (t.startsWith("approve late")) {
    const m = t.match(/approve late\s+(.+?)\s+for\s+(\d{4}-\d{2}-\d{2})/);
    const list = await listLateRequestsInternal();
    let hit = null;
    if (m) {
      const who = m[1];
      const day = m[2];
      hit = list.find(x => x.date === day && String(x.email||"").toLowerCase().includes(who));
    } else {
      // fallback: first in list
      hit = list[0];
    }
    if (!hit) throw new functions.https.HttpsError("not-found","no matching late request");
    return await decideLateCore({ id: hit.id, approve:true }, email);
  }

  return { ok:false, note:"unrecognized command (MVP)" };
});

