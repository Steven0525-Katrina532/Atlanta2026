import { auth } from "/js/app-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

function unhideAttr(attr){
  document.querySelectorAll(`[${attr}]`).forEach(el => {
    el.removeAttribute(attr);
    el.hidden = false;
    el.style.removeProperty("display");
    el.style.visibility = "visible";
    el.classList.remove("hidden");
  });
}

function unhideMain(){
  const main = document.querySelector("main#app, main");
  if (main){
    main.hidden = false;
    main.style.removeProperty("display");
    main.style.visibility = "visible";
    main.classList.remove("hidden");
  }
}

// run when auth state is known
onAuthStateChanged(auth, async (user) => {
  if (!user) return; // not signed in yet
  const token = await user.getIdTokenResult(true);
  const c = token.claims || {};
  // Accept either style: admin:true OR role:"admin"
  const isAdmin = (c.admin === true) || (c.role === "admin");
  const isSupervisor = isAdmin || (c.supervisor === true) || (c.role === "supervisor");

  console.log("claims:", c, "isAdmin:", isAdmin, "isSupervisor:", isSupervisor);

  // Unhide sections based on claims
  if (isAdmin)      unhideAttr("data-admin-only");
  if (isSupervisor) unhideAttr("data-supervisor-only");

  // Always unhide the main shell once the guard runs
  unhideMain();
});
