"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUserRole = void 0;
/**
 * Admin-only role setter.
 * Important: do NOT call initializeApp() here. Admin init is centralized in ./admin.
 */
const functions = __importStar(require("firebase-functions"));
const admin_1 = require("./admin");
exports.setUserRole = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in.");
    }
    const callerUid = context.auth.uid;
    const callerSnap = await admin_1.db.collection("users").doc(callerUid).get();
    const callerRole = callerSnap.exists ? callerSnap.data().role : undefined;
    if (callerRole !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Admin only.");
    }
    if (!data?.uid || !data?.role) {
        throw new functions.https.HttpsError("invalid-argument", "uid and role are required.");
    }
    await admin_1.auth.setCustomUserClaims(data.uid, { role: data.role });
    await admin_1.db.collection("users").doc(data.uid).set({ role: data.role }, { merge: true });
    return { ok: true };
});
