import { auth } from "/js/app-init.js";
if (!window.getRole) {
  window.getRole = async function(_emailLower){
    const t = await auth.currentUser.getIdTokenResult(true);
    return t.claims.role || "driver";
  };
}
