/**
 * Scheduler functions.
 * Important: do NOT call initializeApp() here. Admin init is centralized in ./admin.
 */
import * as functions from "firebase-functions";
import { db } from "./admin";

export const pingScheduler = functions.https.onRequest(async (_req, res) => {
  try {
    await db.collection("_health").doc("scheduler").set(
      { ok: true, ts: Date.now() },
      { merge: true }
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});