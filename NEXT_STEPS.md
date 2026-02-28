# NEXT STEPS (Atlanta2026 Scheduler)

Last known good state:
- GitHub main is up to date.
- Functions deployed (us-central1): deleteVehicle, resetMonth, setAnyUserRole, upsertVehicle, setMonthCloseAt, closeMonthTask, publishMonth
- Cloud Tasks queue: month-close
- Auth claims working; /whoami.html shows role=globalAdmin
- Seeded: Allen Shelley baseLead; TS roster; Stanley allowedVehicles; vehicles roster (1601–1606 suburban, 1631–1635 equinox)
- Scripts added under /scripts (seed vehicles, set passwords, force user password)

## 1) Wire TS apply/cancel to Firestore (driver.html)
Goal:
- TS can apply for dates (up to 5 per submit) with 30s cooldown
- Remaining = active vehicles count - applied apps per day (realtime)
- Grey out when remaining=0; red border when open
- Cancel allowed only before month close timestamp
- Only allow applying to:
  - Scheduling month (next month) until close time
  - Current month red/open days (late-fill)
Collections:
- monthConfigs, vehicles, applications

Acceptance tests:
- Two accounts apply same date; remaining decrements in realtime
- When remaining hits 0, date is not selectable
- Cancel before close increments remaining immediately
- Cancel after close shows “Schedule is closed…”

## 2) Wire Base Lead dashboard (supervisor page)
Goal:
- Set close timestamp per month (calls setMonthCloseAt)
- After close: show AI results (assignments) in review mode
- Publish/Republish (calls publishMonth) increments publishedVersion
- Late applications queue + blinking indicator
- Base Lead overrides require reason dropdown + republish

Acceptance tests:
- Set closeAt 2 minutes in future; create a few TS apps; verify AI runs at closeAt+1s and state becomes closed_review
- Publish pushes assignments to TS view (vehicles visible only after publish)

## 3) Late applications + change log
Goal:
- Late app creates lateQueue item + decrements remaining immediately
- Base Lead assigns vehicle or rejects; both require reason dropdown
- Post-close changes written to changeLog

## 4) PDFs
Goal:
- Base Lead: print current month schedule + post-close change log
- Ops/Global: print any month up to 24 months back (archives)

## 5) Final security step
- Replace shared test password with email password reset links to each user
- Disable/hide testing-only UI toggles
