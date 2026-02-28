import { watchClaims } from "./claims.js";

const ROLE_TO_PATH = {
  ts: "/driver/",
  baseLead: "/supervisor/",
  opsManager: "/admin-roles.html",
  globalAdmin: "/global/",
};

function isUtilityPath(pathname) {
  if (pathname === "/whoami.html") return true;
  if (pathname.startsWith("/js/")) return true;
  if (pathname.startsWith("/assets/")) return true;
  if (pathname.endsWith(".js")) return true;
  return false;
}

function normalizeRole(claims) {
  const raw = (claims?.role ?? "ts").toString().trim();
  const r = raw.toLowerCase();

  if (r === "globaladmin") return "globalAdmin";
  if (r === "opsmanager") return "opsManager";
  if (r === "baselead") return "baseLead";
  if (r === "ts") return "ts";

  // backward compat if older pages ever set "driver"
  if (r === "driver") return "ts";
  if (r === "supervisor") return "baseLead";

  return "ts";
}

watchClaims(
  (_user, claims) => {
    if (isUtilityPath(location.pathname)) return;

    const role = normalizeRole(claims);
    const target = ROLE_TO_PATH[role] || ROLE_TO_PATH.ts;

    if (location.pathname === target || location.pathname.startsWith(target)) return;

    location.replace(target);
  },
  () => {
    if (isUtilityPath(location.pathname)) return;
    if (!location.pathname.startsWith("/login")) location.replace("/login/");
  }
);

