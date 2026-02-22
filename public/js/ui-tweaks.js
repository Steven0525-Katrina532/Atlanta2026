document.addEventListener("DOMContentLoaded", async () => {
  // run ONLY in "viewing someone else" mode (driver.html?as=...)
  const qs   = new URLSearchParams(location.search);
  const asQ  = (qs.get("as") || "").trim().toLowerCase();
  if (!asQ) return;

  // --- rename the header button and hard-wire it to real Admin console ---
  try {
    // find anchors/buttons that currently say "Supervisor Console"
    const cand = Array.from(document.querySelectorAll("a,button")).filter(el => {
      const t = (el.textContent || "").trim().toLowerCase();
      return t === "supervisor console";
    });

    cand.forEach(el => {
      el.textContent = "Return to Administrators Console";
      el.setAttribute("title","Return to Administrators Console");

      // make sure click goes to /supervisor/ (strip any query like ?as=…)
      const go = () => { location.assign("/supervisor/"); };
      if (el.tagName === "A") {
        el.setAttribute("href","/supervisor/");
        el.addEventListener("click",(e)=>{ e.preventDefault(); go(); }, { once:false });
      } else {
        el.addEventListener("click", go, { once:false });
      }
    });
  } catch {}

  // --- make "ADMIN viewing driver: ..." nice and big so you can't miss it ---
  try {
    let who = document.querySelector("#viewingWho, .viewing-who, [data-viewing]");
    if (!who) {
      who = Array.from(document.querySelectorAll("body *"))
                 .reverse()
                 .find(el => /admin\s+viewing\s+driver\s*:/i.test(el.textContent||""));
    }
    if (who) {
      who.style.fontSize = "200%";
      who.style.fontWeight = "700";
    }
  } catch {}
});
