param(
  [string]$ProjectId = "atlanta-2026-scheduler"
)

$ErrorActionPreference = "Stop"
cd "$PSScriptRoot\..\functions"

Remove-Item Env:\GOOGLE_APPLICATION_CREDENTIALS -ErrorAction SilentlyContinue
$env:GOOGLE_APPLICATION_CREDENTIALS = "$env:APPDATA\gcloud\application_default_credentials.json"

node -e "const admin=require('firebase-admin');admin.initializeApp({projectId:'$ProjectId'});const db=admin.firestore();(async()=>{const subs=[1601,1602,1603,1604,1605,1606].map(n=>({vehicleNumber:n,type:'suburban',active:true,label:'Suburban '+n}));const eq=[1631,1632,1633,1634,1635].map(n=>({vehicleNumber:n,type:'equinox',active:true,label:'Equinox '+n}));const vs=[...subs,...eq];const b=db.batch();for(const v of vs){b.set(db.collection('vehicles').doc(String(v.vehicleNumber)),v,{merge:true});}await b.commit();console.log('✅ Vehicles seeded:',vs.map(v=>v.vehicleNumber).join(', '));process.exit(0);})().catch(e=>{console.error(e);process.exit(1);});"
