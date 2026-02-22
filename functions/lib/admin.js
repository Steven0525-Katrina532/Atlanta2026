"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.auth = void 0;
/**
 * Centralized Firebase Admin initialization.
 * Important: initialize only once to avoid "default app already exists" during deploy analysis.
 */
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
exports.auth = (0, auth_1.getAuth)();
exports.db = (0, firestore_1.getFirestore)();
