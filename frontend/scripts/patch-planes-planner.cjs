const fs = require('fs');
const path = 'E:/Semillas/Perlax/frontend/src/pages/ordenes/PlanesDiseno.jsx';
let c = fs.readFileSync(path, 'utf8');

if (!c.includes('function extractOtNumbers(')) {
  c = c.replace(
    'function normalizeSearchText(value) {',
    `function extractOtNumbers(value) {
    return [...String(value || '').matchAll(/(?:ext[\\s-]*)?(\\d{2,})/gi)].map((m) => m[1]);
}

function matchesAssignedPlannerJob(item, jobs) {
    if (!Array.isArray(jobs) || jobs.length === 0) return false;
    const itemNums = new Set(extractOtNumbers(item.otNumber));
    const product = normalizeSearchText(item.productName);
    for (const job of jobs) {
        const jobNums = extractOtNumbers(job.trabajo);
        if (jobNums.some((n) => itemNums.has(n))) return true;
        const trabajo = normalizeSearchText(job.trabajo).replace(/^\\d+[\\s·.\\-]*/, '').trim();
        if (trabajo.length >= 10 && product.length >= 8 && (product.includes(trabajo) || trabajo.includes(product))) {
            return true;
        }
    }
    return false;
}

function normalizeSearchText(value) {`
  );
}

if (!c.includes('const [plannerJobs, setPlannerJobs]')) {
  c = c.replace(
    "    const [orders, setOrders] = useState([]);\n",
    "    const [orders, setOrders] = useState([]);\n    const [plannerJobs, setPlannerJobs] = useState([]);\n"
  );
}

c = c.replace(
  `            const data = await api.get('/production/orders');
            const flattened = data.flatMap(order =>`,
  `            const [data, jobs] = await Promise.all([
                api.get('/production/orders'),
                api.get('/design/planner/jobs').catch(() => [])
            ]);
            setPlannerJobs(Array.isArray(jobs) ? jobs : []);
            const flattened = data.flatMap(order =>`
);

c = c.replace(
  `        if (!canSeeAllPlans && !isAssignedToCurrentUser(item.disenador, currentUser)) return false;`,
  `        if (!canSeeAllPlans && !matchesAssignedPlannerJob(item, assignedPlannerJobs)) return false;`
);

c = c.replace(
  '    const searchTerms = normalizeSearchText(search).split(/\\s+/).filter(Boolean);\n',
  `    const searchTerms = normalizeSearchText(search).split(/\\s+/).filter(Boolean);
    const assignedPlannerJobs = useMemo(() => {
        const list = Array.isArray(plannerJobs) ? plannerJobs : [];
        return list.filter((job) => isAssignedToCurrentUser(job.responsable, currentUser));
    }, [plannerJobs, currentUser]);

`
);

c = c.replace(
  '    }), [orders, searchTerms, filterAssignment, filterApproval, filterPriority, canSeeAllPlans, currentUser]);',
  '    }), [orders, searchTerms, filterAssignment, filterApproval, filterPriority, canSeeAllPlans, currentUser, assignedPlannerJobs]);'
);

c = c.replace(
  `                    <Text c="dimmed" size="sm">Seguimiento y control de archivos y aprobaciones</Text>`,
  `                    <Text c="dimmed" size="sm">
                        {canSeeAllPlans
                            ? 'Seguimiento y control de archivos y aprobaciones'
                            : 'Solo las OT de tus trabajos asignados en el planeador'}
                    </Text>`
);

fs.writeFileSync(path, c);
console.log('patched', {
  extract: c.includes('extractOtNumbers'),
  plannerState: c.includes('setPlannerJobs'),
  match: c.includes('matchesAssignedPlannerJob(item, assignedPlannerJobs)'),
  leftoverOld: c.includes('!canSeeAllPlans && !isAssignedToCurrentUser(item.disenador')
});
