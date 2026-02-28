# NEXT STEPS (Atlanta2026 Scheduler)

CURRENT CHECKPOINT
- GitHub main is up to date.
- Firebase project: atlanta-2026-scheduler
- Functions region: us-central1
- Cloud Tasks queue: month-close
- Auth claims verified at /whoami.html (globalAdmin works).
- Seeded users:
  - Allen Shelley baseLead: allen.shelley@noratrans.com
  - TS roster created
  - Stanley allowedVehicles = 1601–1606
- Seeded vehicles:
  - 1601–1606 suburban
  - 1631–1635 equinox
- Functions deployed:
  - deleteVehicle, resetMonth, setAnyUserRole, upsertVehicle
  - setMonthCloseAt, closeMonthTask (HTTPS), publishMonth
- Testing approach:
  - Only Steven signs in until external testing
  - Temporary shared password allowed for internal testing only
  - Final step will be email reset links (do not do early)

PRIORITY ORDER TO FINISH (RECOMMENDED)

1) Wire TS apply/cancel to Firestore (driver.html)
Goal:
- Apply: up to 5 dates per submit, 30s cooldown
- Remaining = active vehicles count - applied applications per day (real time)
- Grey if remaining=0; red styling for open days
- Cancel allowed only BEFORE closeAt; after close show message:
  "This schedule is closed. Contact your Base Lead to make changes."
Rules:
- TS can apply to Scheduling Month (next month) until closeAt
- TS can apply to Current Month only on open/red days (late fill)
Collections:
- monthConfigs, vehicles, applications
Acceptance tests:
- Two TS apply same date: remaining decrements live
- When remaining hits 0: date becomes unselectable
- Cancel pre-close: remaining increments immediately
- Cancel post-close: blocked with message

2) Wire Base Lead dashboard (supervisor page)
Goal:
- Set close timestamp per month (calls setMonthCloseAt)
- After closeAt+1s: AI assigns -> assignments created, month state becomes closed_review
- Review + Publish/Republish (calls publishMonth; increments publishedVersion)
- Late queue list + blinking indicator
- Overrides/late actions require reason dropdown + republish
Acceptance tests:
- Set closeAt ~2 minutes ahead
- Create several applications
- Verify closeMonthTask ran at closeAt+1s and state is closed_review
- Publish makes vehicles visible to TS

3) Late apps + change log
Goal:
- Late submit creates lateQueue item + decrements remaining immediately
- Base Lead assigns vehicle or rejects (reason required)
- Post-close changes write changeLog entries

4) PDFs + archive retention (24 months)
Goal:
- Base Lead: print current month + post-close change log
- Ops/Global: print any month up to 24 months back

5) Final security step (only at the end)
- Generate and email password reset links to all users
- Disable/hide testing tools (Jump-into-TS remains Global-only)
