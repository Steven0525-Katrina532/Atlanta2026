/* Force-open (aggressive): only active with ?open=1 */
(function(){
  try{
    const url = new URL(location.href);
    if (!url.searchParams.has("open")) return; // OFF by default

    // Global CSS to neutralize common blockers
    if (!document.getElementById("force-open2-css")) {
      const st = document.createElement("style"); st.id = "force-open2-css";
      st.textContent = `
        /* Re-enable interaction */
        [aria-disabled="true"], .disabled, .is-disabled, .muted, .inactive, .blocked, .closed, .past, .ghost {
          pointer-events: auto !important;
          opacity: 1 !important;
          filter: none !important;
        }
        /* Kill overlays that block clicks */
        .overlay, .scrim, .modal-backdrop, [data-overlay], [aria-hidden="true"][role="presentation"] {
          pointer-events: none !important;
        }
        /* Make sure day cells actually take clicks */
        [role="gridcell"], .calendar-day, .date-cell, .day, [data-day] {
          pointer-events: auto !important;
          cursor: pointer !important;
        }
      `;
      document.head?.appendChild(st);
    }

    const SELECTOR_CELL = '[role="gridcell"], .calendar-day, .date-cell, .day, [data-day]';

    function stripDisabled(){
      // Remove attributes/classes frameworks reapply
      document.querySelectorAll(SELECTOR_CELL).forEach(el=>{
        el.removeAttribute("aria-disabled");
        el.removeAttribute("disabled");
        el.classList.remove("disabled","is-disabled","muted","inactive","blocked","closed","past","ghost","aria-disabled");
        el.style.pointerEvents = "auto";
        el.style.opacity = "";
        el.style.filter = "";
      });
      // Also nuke obvious overlays
      document.querySelectorAll('.overlay, .scrim, .modal-backdrop, [data-overlay], [aria-hidden="true"][role="presentation"]').forEach(el=>{
        el.style.pointerEvents = "none";
      });
    }

    // Help clicks “get through” even if inner span/button is the real target
    function retargetClicks(){
      window.addEventListener('click', (ev)=>{
        const path = ev.composedPath?.() || [ev.target];
        const cell = path.find(n => n && n.matches && n.matches(SELECTOR_CELL));
        if (!cell) return;
        // If the framework binds to an inner button/link, forward the click there too
        const inner = cell.querySelector('button, [role="button"], a, .click, .day-num, .date-num');
        if (inner && inner !== ev.target) {
          // Let the framework settle first
          setTimeout(()=>{ try { inner.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true})); } catch(_){} }, 0);
        }
      }, {capture:true, passive:true});
    }

    // Keep it active: frameworks may re-render and re-disable
    function loop(){ stripDisabled(); setTimeout(loop, 250); }

    const boot = ()=>{ stripDisabled(); retargetClicks(); loop(); };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, {once:true});
    } else {
      boot();
    }
  }catch(_){}
})();
