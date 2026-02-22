import { auth } from "/js/app-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const SUPERVISORS = new Set([
  "allen.shelley@noratrans.com",
  "louise.cook@noratrans.com"
]);
const ADMIN = "steven.hayes@noratrans.com";

function addSupervisorButton() {
  if (document.getElementById("supervisorTopBtn")) return;
  const a = document.createElement("a");
  a.id = "supervisorTopBtn";
  a.href = "/supervisor";
  a.textContent = "Supervisor Console";
  a.style.cssText = "position:fixed;top:72px;right:16px;z-index:2000;background:#1f8a5b;color:#fff;padding:10px 14px;border-radius:10px;font-weight:700;text-decoration:none;box-shadow:0 6px 18px rgba(0,0,0,.18)";
  document.body.appendChild(a);
}

onAuthStateChanged(auth, (user) => {
  if (!user) return;
  const email = String(user.email || "").toLowerCase();
  const isSupervisor = SUPERVISORS.has(email);
  const isAdmin = email === ADMIN;
  window.NORA = Object.freeze({ isSupervisor, isAdmin, email });
  if (isSupervisor || isAdmin) addSupervisorButton();
});
