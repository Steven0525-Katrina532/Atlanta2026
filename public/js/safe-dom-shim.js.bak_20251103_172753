(()=>{if(window.__SAFE_DOM_SHIM__)return;window.__SAFE_DOM_SHIM__=true;
function n(){}function c(){return{add:n,remove:n,toggle:n,contains:()=>!1}}
const f=new Proxy({},{get:(t,p)=>p==="style"?{}:p==="classList"?c():(p==="textContent"||p==="innerText"||p==="innerHTML"||p==="value")?"":n,set:()=>!0});
const g=document.getElementById.bind(document);document.getElementById=(id)=>g(id)||(console.warn("[SAFE_DOM_SHIM] Missing id:",id),f);
const s=document.createElement("style");s.textContent=`html,body{visibility:visible!important;opacity:1!important}
.hidden,[aria-hidden=true]{display:block!important}
.backdrop,.scrim,#backdrop,#splash{position:static!important;pointer-events:auto!important;opacity:1!important}`;
document.documentElement.appendChild(s)})();
