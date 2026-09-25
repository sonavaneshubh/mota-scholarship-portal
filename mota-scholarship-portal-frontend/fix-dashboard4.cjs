const fs = require('fs');
let content = fs.readFileSync('src/pages/ApplicantDashboard.tsx', 'utf8');

// Use regex to find the pattern with flexible whitespace
const regex = /(<span className="font-medium">भारत सरकार \| Government of India<\/span>\s*)(<div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">)/;
const replacement = '$1\n            </div>\n          </div>\n        </div>\n      </div>\n      $2';

content = content.replace(regex, replacement);
fs.writeFileSync('src/pages/ApplicantDashboard.tsx', content);
console.log('Fixed');