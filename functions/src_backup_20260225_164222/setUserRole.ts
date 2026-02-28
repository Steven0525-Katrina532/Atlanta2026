/**
 * Admin-only role setter.
 * Important: do NOT call initializeApp() here. Admin init is centralized in ./admin.
 */
import * as functions from "firebase-functions";
import { auth, db } from "./admin";

type SetUserRoleRequest = {
  uid: string;
  role: string;
};

export const setUserRole = functions.https.onCall(async (data: SetUserRoleRequest, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be signed in.");
  }

  const callerUid = context.auth.uid;
  const callerSnap = await db.collection("users").doc(callerUid).get();
  const callerRole = callerSnap.exists ? (callerSnap.data() as any).role : undefined;

  if (callerRole !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Admin only.");
  }

  if (!data?.uid || !data?.role) {
    throw new functions.https.HttpsError("invalid-argument", "uid and role are required.");
  }

  await auth.setCustomUserClaims(data.uid, { role: data.role });
  await db.collection("users").doc(data.uid).set({ role: data.role }, { merge: true });

  return { ok: true };
});