import { auth } from "/js/app-init.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
document.getElementById("btnLogout")?.addEventListener("click", async () => {
  try { await signOut(auth); location.href = "/login.html"; } catch(e){ alert("Log out failed: " + (e?.message || "Unknown")); }
});
