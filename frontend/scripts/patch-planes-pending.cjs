const fs = require('fs');
const path = 'E:/Semillas/Perlax/frontend/src/pages/ordenes/PlanesDiseno.jsx';
let c = fs.readFileSync(path, 'utf8');
const crlf = c.includes('\r\n');
c = c.replace(/\r\n/g, '\n');
c = c.replace(
  '            if (!canSeeAllPlans && !isAssignedToCurrentUser(o.disenador, currentUser)) return false;',
  '            if (!canSeeAllPlans && !matchesAssignedPlannerJob(o, assignedPlannerJobs)) return false;'
);
c = c.replace(
  '    }, [pendingOtToOpen, orders, opened, open, canSeeAllPlans, currentUser]);',
  '    }, [pendingOtToOpen, orders, opened, open, canSeeAllPlans, currentUser, assignedPlannerJobs]);'
);
if (crlf) c = c.replace(/\n/g, '\r\n');
fs.writeFileSync(path, c);
console.log('pending ok');
