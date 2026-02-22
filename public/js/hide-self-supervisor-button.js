document.addEventListener("DOMContentLoaded", () => {
  // if viewing someone else (driver.html?as=...), keep the button
  if (new URLSearchParams(location.search).has("as")) return;

  // hide the floating button if it exists
  const btn = document.getElementById("supervisorTopBtn");
  if (btn) btn.style.display = "none";
});
