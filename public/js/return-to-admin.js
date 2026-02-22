document.addEventListener("DOMContentLoaded", () => {
  // only act when impersonating (URL contains ?as=)
  if (!/\bas=/.test(location.search)) return;

  // find header buttons/links that say "Supervisor Console"
  const els = Array.from(document.querySelectorAll("a,button")).filter(el =>
    (el.textContent || "").trim().toLowerCase() === "supervisor console"
  );

  const go = () => location.assign("/supervisor/"); // real admin page

  els.forEach(el => {
    // set href for anchors, and intercept clicks for both anchors & buttons
    if (el.tagName === "A") el.setAttribute("href", "/supervisor/");
    el.addEventListener("click", (e) => { e.preventDefault(); go(); });
  });
});
