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
exports.provisionRolesOnSignUp = void 0;
/**
 * Provisioning on signup.
 * Important: do NOT call initializeApp() here. Admin init is centralized in ./admin.
 */
const functions = __importStar(require("firebase-functions"));
const admin_1 = require("./admin");
exports.provisionRolesOnSignUp = functions.auth.user().onCreate(async (user) => {
    const uid = user.uid;
    const email = user.email ?? null;
    // Default role is "driver". You can later promote users to "admin" via setUserRole callable.
    const role = "driver";
    await admin_1.auth.setCustomUserClaims(uid, { role });
    await admin_1.db.collection("users").doc(uid).set({
        uid,
        email,
        role,
        mustChangePassword: true,
        createdAt: Date.now(),
    }, { merge: true });
    return;
});
