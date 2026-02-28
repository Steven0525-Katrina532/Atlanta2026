param(
  [string]$ProjectId = "atlanta-2026-scheduler",
  [Parameter(Mandatory=$true)][string]$Email,
  [string]$NewPassword = "password"
)

$ErrorActionPreference = "Stop"
cd "$PSScriptRoot\..\functions"

Remove-Item Env:\GOOGLE_APPLICATION_CREDENTIALS -ErrorAction SilentlyContinue
$env:GOOGLE_APPLICATION_CREDENTIALS = "$env:APPDATA\gcloud\application_default_credentials.json"

node -e "const admin=require('firebase-admin');admin.initializeApp({projectId:'$ProjectId'});const auth=admin.auth();(async()=>{const email='$Email';const u=await auth.getUserByEmail(email);console.log('✅ Found',email,'UID:',u.uid,'providers:',u.providerData.map(p=>p.providerId));await auth.updateUser(u.uid,{password:'$NewPassword'});console.log('✅ Forced password for',email);process.exit(0);})().catch(e=>{console.error(e);process.exit(1);});"
