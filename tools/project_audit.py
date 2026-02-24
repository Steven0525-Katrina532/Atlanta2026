"""
tools/project_audit.py

Creates:
- TRUTH_REPORT.md
- TRUTH_REPORT.pdf
- audit_artifacts/*.txt (raw command outputs)

No repo changes, no deployments, no secrets.
"""
from __future__ import annotations

import os
import re
import subprocess
from datetime import datetime
from pathlib import Path
from typing import List, Tuple, Optional

REPO_ROOT = Path(__file__).resolve().parents[1]
ART = REPO_ROOT / "audit_artifacts"
MD_OUT = REPO_ROOT / "TRUTH_REPORT.md"
PDF_OUT = REPO_ROOT / "TRUTH_REPORT.pdf"

def run(cmd: List[str], outfile: Optional[Path] = None) -> str:
    try:
        p = subprocess.run(
            cmd,
            cwd=REPO_ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            check=False,
        )
        out = p.stdout.strip()
    except Exception as e:
        out = f"[ERROR running {cmd}]: {e}"
    if outfile:
        outfile.write_text(out + "\n", encoding="utf-8")
    return out

def read_text(rel: str, max_chars: int = 120_000) -> str:
    p = REPO_ROOT / rel
    if not p.exists():
        return f"[MISSING] {rel}"
    s = p.read_text(encoding="utf-8", errors="replace")
    return s[:max_chars]

def find_exported_functions_ts(src: str) -> List[str]:
    # simplistic but effective: export const <name> =
    names = re.findall(r"\bexport\s+const\s+([A-Za-z0-9_]+)\s*=", src)
    return sorted(set(names))

def grep_paths(pattern: str, paths: List[Path]) -> List[Tuple[str, int, str]]:
    hits = []
    rx = re.compile(pattern)
    for p in paths:
        try:
            lines = p.read_text(encoding="utf-8", errors="replace").splitlines()
        except Exception:
            continue
        for i, line in enumerate(lines, start=1):
            if rx.search(line):
                hits.append((str(p.relative_to(REPO_ROOT)), i, line.strip()))
    return hits

def list_files(globpat: str) -> List[Path]:
    return sorted(REPO_ROOT.glob(globpat))

def md_section(title: str, body: str) -> str:
    return f"\n## {title}\n\n{body.strip()}\n"

def render_pdf(text: str, outpath: Path) -> None:
    # ReportLab: simple monospaced, wrapped lines, multiple pages
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas

    width, height = letter
    c = canvas.Canvas(str(outpath), pagesize=letter)
    c.setTitle("Scheduler Truth Report")

    margin = 40
    y = height - margin
    line_h = 10
    c.setFont("Courier", 9)

    def draw_line(s: str):
        nonlocal y
        if y < margin:
            c.showPage()
            c.setFont("Courier", 9)
            y = height - margin
        c.drawString(margin, y, s)
        y -= line_h

    # Wrap long lines
    max_chars = 110
    for raw in text.splitlines():
        if len(raw) <= max_chars:
            draw_line(raw)
        else:
            for j in range(0, len(raw), max_chars):
                draw_line(raw[j : j + max_chars])

    c.save()

def main() -> None:
    ART.mkdir(exist_ok=True)

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    header = f"# Scheduler Truth Report\n\nGenerated: {now}\n\nRepo: {REPO_ROOT}\n"

    # Git / project info
    git_head = run(["git", "rev-parse", "HEAD"], ART / "git_head.txt")
    git_branch = run(["git", "branch", "--show-current"], ART / "git_branch.txt")
    git_status = run(["git", "status"], ART / "git_status.txt")
    git_diff_names = run(["git", "diff", "--name-only"], ART / "git_diff_name_only.txt")

    firebase_use = run(["firebase", "use"], ART / "firebase_use.txt")
    functions_list = run(["firebase", "functions:list"], ART / "firebase_functions_list.txt")

    # Entrypoint exports
    index_ts = read_text("functions/src/index.ts")
    exported_modules = re.findall(r'export\s+\*\s+from\s+"([^"]+)"', index_ts)
    exported_modules_md = "\n".join(f"- {m}" for m in exported_modules) or "[none found]"

    # Enumerate exports from exported modules
    exported_fn_names: List[str] = []
    for m in exported_modules:
        # normalize "./scheduler" -> functions/src/scheduler.ts
        rel = m.replace("./", "functions/src/") + ".ts"
        mod_text = read_text(rel)
        if mod_text.startswith("[MISSING]"):
            continue
        exported_fn_names += find_exported_functions_ts(mod_text)
    exported_fn_names = sorted(set(exported_fn_names))

    exported_fn_md = "\n".join(f"- {n}" for n in exported_fn_names) or "[none detected]"

    # Public routes/pages
    routes_html = read_text("public/routes.html")
    public_pages = [p.name for p in list_files("public/*.html")]
    public_pages_md = "\n".join(f"- {n}" for n in public_pages) or "[none]"

    # Check role gating: allowlists vs role-based
    role_gate_js = read_text("public/js/role-gate.js")
    allowlist_signals = []
    if "SUPERVISORS" in role_gate_js or "ADMIN" in role_gate_js:
        allowlist_signals.append("Detected hardcoded allowlists in public/js/role-gate.js")
    if "globalAdmin" in role_gate_js or "opsManager" in role_gate_js or "baseLead" in role_gate_js:
        allowlist_signals.append("Detected role keywords in role-gate.js (verify real RBAC).")

    allowlist_md = "\n".join(f"- {x}" for x in allowlist_signals) or "- No obvious allowlist patterns detected."

    # Find UI calls to callable functions (front-end)
    public_js = list_files("public/**/*.js")
    call_hits = grep_paths(r'httpsCallable\(|submitApplications|cancelDate|setCloseAt|publishSchedule|republishSchedule|setUserRole', public_js + list_files("public/*.html"))
    call_hits_md = "\n".join(f"- {p}:{ln} :: {line}" for p, ln, line in call_hits[:200]) or "[no hits]"

    # Find calls to functions that are NOT deployed (e.g., admin-tools.js references)
    suspected = ["upsertDriver", "removeDriver", "addSupervisor", "demoteSupervisor", "adminResetDemo"]
    missing_refs = []
    for name in suspected:
        if re.search(rf'"{re.escape(name)}"|{re.escape(name)}', read_text("public/js/admin-tools.js")):
            if name not in functions_list:
                missing_refs.append(name)
    missing_refs_md = "\n".join(f"- {n} (referenced in UI but not shown in firebase functions:list)" for n in missing_refs) or "- None detected."

    # Gap checklist vs your locked spec (high-level)
    required = [
        ("submitApplications", "Apply up to 5 days, 30s cooldown"),
        ("cancelDate", "Cancel >7 days; <7 blocked"),
        ("setCloseAt", "Base lead sets close timestamp (local tz)"),
        ("publishSchedule", "Create snapshot + publish"),
        ("republishSchedule", "New snapshot version + push updates"),
        ("listUsersForDropdown", "Remote view dropdown"),
        ("setUserRole", "Role provisioning"),
        ("provisionRolesOnSignUp", "First-login provisioning"),
        ("exportMonthlyPdf", "On-demand PDF export (Ops/Global only)"),
        ("lockdown", "Emergency lockdown control"),
        ("destructiveDelete", "Delete base/all (after lockdown)"),
        ("resetMonth", "Global reset base+month (typed RESET)"),
    ]
    gaps = []
    for fn, desc in required:
        # functions_list contains deployed cloud functions names
        present = fn in functions_list or fn in exported_fn_names
        gaps.append((fn, "✅" if present else "❌", desc))
    gaps_md = "\n".join(f"- {mark} `{fn}` — {desc}" for fn, mark, desc in gaps)

    md = header
    md += md_section("Current Git State", f"**Branch:** {git_branch}\n\n**HEAD:** {git_head}\n\n```\n{git_status}\n```\n\n**Diff (names only):**\n```\n{git_diff_names}\n```")
    md += md_section("Firebase Target", f"```\n{firebase_use}\n```")
    md += md_section("Deployed Functions (firebase functions:list)", f"```\n{functions_list}\n```")
    md += md_section("Functions Entrypoint Exports", f"**functions/src/index.ts exports:**\n{exported_modules_md}\n\n**Detected exported function names in those modules:**\n{exported_fn_md}")
    md += md_section("Public Pages", public_pages_md)
    md += md_section("Routes Page (first lines)", f"```\n{routes_html[:1200]}\n```")
    md += md_section("Role Gate Notes", allowlist_md)
    md += md_section("UI → Callable References (first 200 hits)", call_hits_md)
    md += md_section("UI References to Non-Deployed Functions", missing_refs_md)
    md += md_section("Gap Checklist vs Locked Spec", gaps_md)

    MD_OUT.write_text(md, encoding="utf-8")
    render_pdf(md, PDF_OUT)

    print(f"Wrote {MD_OUT}")
    print(f"Wrote {PDF_OUT}")
    print(f"Artifacts in {ART}")

if __name__ == "__main__":
    main()
