param(
  [string]$ProjectId = "atlanta-2026-scheduler",
  [string]$NewPassword = "password",
  [string]$SkipUid = "pIJj9g7er3VVUZJK0uTsd9s2cMh1"
)

$ErrorActionPreference = "Stop"
cd "$PSScriptRoot\..\functions"

Remove-Item Env:\GOOGLE_APPLICATION_CREDENTIALS -ErrorAction SilentlyContinue
$env:GOOGLE_APPLICATION_CREDENTIALS = "$env:APPDATA\gcloud\application_default_credentials.json"

node -e "const admin=require('firebase-admin');admin.initializeApp({projectId:'$ProjectId'});const auth=admin.auth();const NEW_PW='$NewPassword';const SKIP='$SkipUid';(async()=>{let next;let changed=0;let skipped=0;do{const page=await auth.listUsers(1000,next);for(const u of page.users){if(!u.email)continue;if(u.uid===SKIP){skipped++;continue;}await auth.updateUser(u.uid,{password:NEW_PW});changed++;}next=page.pageToken;}while(next);console.log('✅ Updated',changed,'users to:',NEW_PW,'• skipped',skipped);process.exit(0);})().catch(e=>{console.error(e);process.exit(1);});"
