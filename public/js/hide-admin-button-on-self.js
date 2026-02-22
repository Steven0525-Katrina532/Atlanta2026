document.addEventListener("DOMContentLoaded", async () => {
  // if we are NOT in view-as mode (no ?as=), hide the button
  const qs = new URLSearchParams(location.search);
  const asParam = (qs.get("as") || "").trim().toLowerCase();

  // optional safety: if ?as equals logged-in user, treat as self
  let me = "";
  try {
    const { auth } = await import("/js/app-init.js");
    me = (auth.currentUser?.email || "").trim().toLowerCase();
  } catch {}

  const isSelf = !asParam || (me && asParam === me);
  if (!isSelf) return; // on view-as pages, do nothing

  // find any header link/button that says Supervisor Console or Return to Administrators Console and hide it
  const els = Array.from(document.querySelectorAll("a,button")).filter(el => {
    const t = (el.textContent || "").trim().toLowerCase();
    return t === "supervisor console" || t === "return to administrators console";
  });
  els.forEach(el => { el.style.display = "none"; });
});
