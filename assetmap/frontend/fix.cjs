const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/const \[bypassConsent, setBypassConsent\] = useState\(false\);/, 'const [, setBypassConsent] = useState(false);');
app = app.replace(/const hasConsent = useAssetStore\(\(state\) => state\.hasConsent\);\r?\n/, '');
fs.writeFileSync('src/App.tsx', app);

const reactFiles = [
  'src/components/AnalyticsDashboard.tsx',
  'src/components/insurance/InsuranceCoverageCard.tsx',
  'src/components/insurance/InsuranceGapFinder.tsx',
  'src/components/loan/LoanEligibility.tsx',
  'src/components/settings/ConsentManagerModal.tsx',
  'src/components/unclaimed/UnclaimedResultCard.tsx'
];
for (let f of reactFiles) {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/import React, \{/g, 'import {');
  content = content.replace(/import React from 'react';\r?\n/g, '');
  fs.writeFileSync(f, content);
}

let dormant = fs.readFileSync('src/components/dormant/DormantAccounts.tsx', 'utf8');
dormant = dormant.replace(/const acknowledge =[\s\S]*?catch\(console\.error\);\r?\n  \};\r?\n/, '');
fs.writeFileSync('src/components/dormant/DormantAccounts.tsx', dormant);

let gap = fs.readFileSync('src/components/insurance/InsuranceGapFinder.tsx', 'utf8');
gap = gap.replace(/const \[profile, setProfile\] = useState/g, 'const [profile] = useState');
fs.writeFileSync('src/components/insurance/InsuranceGapFinder.tsx', gap);

let land = fs.readFileSync('src/components/land/LandPropertyMap.tsx', 'utf8');
land = land.replace(/AlertCircle,\s*/g, '');
land = land.replace(/Clock,\s*/g, '');
land = land.replace(/Search,\s*/g, '');
land = land.replace(/Link2,\s*/g, '');
land = land.replace(/Globe,\s*/g, '');
land = land.replace(/MapPinOff,\s*/g, '');
land = land.replace(/Landmark,\s*/g, '');
fs.writeFileSync('src/components/land/LandPropertyMap.tsx', land);

let loan = fs.readFileSync('src/components/loan/LoanEligibility.tsx', 'utf8');
loan = loan.replace(/const \[params, setParams\]/g, 'const [params]');
fs.writeFileSync('src/components/loan/LoanEligibility.tsx', loan);

let unclaim = fs.readFileSync('src/components/unclaimed/UnclaimedSearch.tsx', 'utf8');
unclaim = unclaim.replace(/const \[searchId, setSearchId\]/g, 'const [, setSearchId]');
fs.writeFileSync('src/components/unclaimed/UnclaimedSearch.tsx', unclaim);

let login = fs.readFileSync('src/pages/login/Login.tsx', 'utf8');
login = login.replace(/const \{ type, message \} =/g, 'const { type } =');
fs.writeFileSync('src/pages/login/Login.tsx', login);

let settings = fs.readFileSync('src/pages/Settings.tsx', 'utf8');
settings = settings.replace(/Smartphone,\s*/g, '');
fs.writeFileSync('src/pages/Settings.tsx', settings);
