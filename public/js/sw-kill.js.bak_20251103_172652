(()=>{try{const sw=navigator.serviceWorker;if(sw){sw.register=async()=>{console.warn("[SW-KILL] blocked register");throw new Error("SW disabled")};sw.getRegistrations&&sw.getRegistrations().then(rs=>rs.forEach(r=>r.unregister()))}}catch(e){}
try{if(window.caches&&caches.keys){caches.keys().then(ks=>ks.forEach(k=>caches.delete(k)))}}catch(e){}
try{if(!sessionStorage.getItem("__sw_kill_reload")){sessionStorage.setItem("__sw_kill_reload","1");location.replace(location.href.split("#")[0])}}catch(e){}
})();
