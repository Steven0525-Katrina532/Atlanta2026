import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAAG8EhCj9Rbeoll7kFq_i_oNYW0TfD7kU",
  authDomain: "atlanta-2026-scheduler.firebaseapp.com",
  projectId: "atlanta-2026-scheduler",
  storageBucket: "atlanta-2026-scheduler.firebasestorage.app",
  messagingSenderId: "754736544212",
  appId: "1:754736544212:web:9bf2a86562ea70aa3f3e41"
};

export function initFirebase() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}
