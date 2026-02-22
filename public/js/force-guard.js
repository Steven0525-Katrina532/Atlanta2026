import { initFirebase } from "/firebase-config.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

function unhideAttr(attr){
  document.querySelectorAll(`[${attr}]`).forEach(el => {
    el.removeAttribute(attr);
    el.hidden = false;
    el.style.removeProperty("display");
    el.style.visibility = "visible";
    el.classList.remove("hidden");
  });
}

initFirebase();
const auth = getAuth();

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  const t = await user.getIdTokenResult(true);
  const c = t.claims || {};

  // Accept either style: admin:true OR role:"admin"
  const isAdmin = (c.admin === true) || (c.role === "admin");
  const isSupervisor = isAdmin || (c.supervisor === true) || (c.role === "supervisor");

  if (isAdmin)      unhideAttr("data-admin-only");
  if (isSupervisor) unhideAttr("data-supervisor-only");

  // If the admin driver dropdown exists but is empty, seed with demo entries
  const sel = document.querySelector("#adminSelectDriver");
  if (isAdmin && sel && sel.options.length === 0) {
    const demo = [
      { name: "Allen Shelley", email: "allen.shelley@noratrans.com" },
      { name: "Louise Cook",   email: "louise.cook@noratrans.com"  },
      { name: "Test Driver",   email: "driver@example.com"         }
    ];
    demo.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.email;
      opt.textContent = `${d.name} — ${d.email}`;
      sel.appendChild(opt);
    });
  }
});
