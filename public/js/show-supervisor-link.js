import { auth } from "/js/app-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

function ensureButton() {
  let link = document.querySelector("#supervisorLink");
  if (!link) {
    link = document.createElement("a");
    link.id = "supervisorLink";
    link.href = "/supervisor/";
    link.textContent = "Supervisor Console";
    link.style.marginLeft = "12px";
    link.style.display = "none"; // default hidden until claims say yes

    // Try to place in a visible area
    const target =
      document.querySelector("nav, header, .toolbar, .topbar") ||
      document.querySelector("#app") ||
      document.body;
    target.appendChild(link);
  }
  return link;
}

onAuthStateChanged(auth, async (user) => {
  const link = ensureButton();
  if (!user) { link.style.display = "none"; return; }

  try {
    const t = await user.getIdTokenResult(true);
    const c = t.claims || {};
    const isAdmin = c.role === "admin" || c.admin === true;
    const isSup   = isAdmin || c.role === "supervisor" || c.supervisor === true;

    // show if admin or supervisor
    link.style.display = (isSup ? "" : "none");
  } catch (e) {
    // if we can’t read claims, keep hidden
    link.style.display = "none";
    console.warn("claim check failed:", e);
  }
});
