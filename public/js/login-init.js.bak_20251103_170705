/* Renders FirebaseUI into #firebaseui-auth-container (Email/Password only) */
(() => {
  async function boot(){
    try{
      const res = await fetch("/config/firebaseConfig.json", { cache: "no-store" });
      const cfg = await res.json();
      if (!window.firebase?.apps?.length) firebase.initializeApp(cfg);

      // FirebaseUI config — EMAIL/PASSWORD ONLY
      const uiConfig = {
        signInFlow: "popup",
        signInOptions: [
          {
            provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
            requireDisplayName: false,
            // Turn this ON to prevent new sign-ups (existing users can still sign in)
            disableSignUp: { status: true, helpLink: "mailto:admin@yourorg.com" }
          }
        ],
        callbacks: {
          signInSuccessWithAuthResult: () => false // router-auth will redirect by role
        },
        tosUrl: "#",
        privacyPolicyUrl: "#"
      };

      const mount = "#firebaseui-auth-container";
      const el = document.querySelector(mount);
      if (!el) { console.error("Missing", mount); return; }

      const ui = firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(firebase.auth());
      ui.start(mount, uiConfig);
      console.log("[login-init] FirebaseUI (email only) started");
    }catch(e){ console.error("[login-init] error", e); }
  }

  function waitCDNs(){ return new Promise(res=>{
    let tries=0; const t=setInterval(()=>{
      if (window.firebase && window.firebaseui) { clearInterval(t); res(); }
      else if (++tries>240) { clearInterval(t); res(); }
    },25);
  });}

  (async ()=>{ await waitCDNs(); await boot(); })();
})();
