const fs = require('fs');
let content = fs.readFileSync('src/pages/ApplicantDashboard.tsx', 'utf8');

// Find the exact pattern around line 103-104
const idx = content.indexOf('<span className="font-medium">भारत सरकार | Government of India</span>');
if (idx === -1) {
  console.log('Pattern not found');
  process.exit(1);
}

console.log('Found at index:', idx);
console.log('Context:');
console.log(content.substring(idx, idx + 200));