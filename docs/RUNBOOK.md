# RUNBOOK (Commands / Ops)

REPO
- cd $HOME\Atlanta2026
- git status
- git pull

DEPLOY
- cd $HOME\Atlanta2026
- firebase use atlanta-2026-scheduler
- firebase deploy --only hosting
- firebase deploy --only functions
- firebase deploy --only firestore:rules

VERIFY FUNCTIONS
- firebase functions:list

VERIFY CLAIMS
- Open: https://atlanta-2026-scheduler.web.app/whoami.html

CLOUD TASKS QUEUE
- gcloud config set project atlanta-2026-scheduler
- gcloud tasks queues list --location us-central1

SEED VEHICLES
- cd $HOME\Atlanta2026
- .\scripts\seed-vehicles.ps1

SET TEST PASSWORDS (INTERNAL ONLY)
- cd $HOME\Atlanta2026
- .\scripts\set-passwords.ps1 -NewPassword password

FORCE A SINGLE USER PASSWORD
- cd $HOME\Atlanta2026
- .\scripts\force-user-password.ps1 -Email allen.shelley@noratrans.com -NewPassword password

CLOSE TIME + PUBLISH
- setMonthCloseAt is callable (baseLead/ops/global)
- closeMonthTask runs at closeAt+1s via Cloud Tasks
- publishMonth increments publishedVersion and makes TS assignments visible
