/**
 * Provisioning on signup.
 * Important: do NOT call initializeApp() here. Admin init is centralized in ./admin.
 */
import * as functions from "firebase-functions";
import { auth, db } from "./admin";

export const provisionRolesOnSignUp = functions.auth.user().onCreate(async (user) => {
  const uid = user.uid;
  const email = user.email ?? null;

  // Default role is "driver". You can later promote users to "admin" via setUserRole callable.
  const role = "driver";

  await auth.setCustomUserClaims(uid, { role });

  await db.collection("users").doc(uid).set(
    {
      uid,
      email,
      role,
      mustChangePassword: true,
      createdAt: Date.now(),
    },
    { merge: true }
  );

  return;
});
