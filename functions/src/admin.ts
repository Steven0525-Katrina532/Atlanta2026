/**
 * Centralized Firebase Admin initialization.
 * Important: initialize only once to avoid "default app already exists" during deploy analysis.
 */
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

if (getApps().length === 0) {
  initializeApp();
}

export const auth = getAuth();
export const db = getFirestore();