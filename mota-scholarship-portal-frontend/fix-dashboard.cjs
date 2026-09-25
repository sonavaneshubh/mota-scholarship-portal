const fs = require('fs');
let content = fs.readFileSync('src/pages/ApplicantDashboard.tsx', 'utf8');

const oldStr = '<span className="font-medium">भारत सरकार | Government of India</span>\n            </div>\n          </div>\n        </div>\n    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">';

const newStr = '<span className="font-medium">भारत सरकार | Government of India</span>\n            </div>\n          </div>\n        </div>\n      </div>\n      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">';

content = content.replace(oldStr, newStr);
fs.writeFileSync('src/pages/ApplicantDashboard.tsx', content);
console.log('Fixed');