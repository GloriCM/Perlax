const fs = require('fs');
const path = 'E:/Semillas/Perlax/frontend/src/pages/ordenes/PlanesDiseno.jsx';
let c = fs.readFileSync(path, 'utf8');
const crlf = c.includes('\r\n');
c = c.replace(/\r\n/g, '\n');

if (!c.includes('const [plannerJobs, setPlannerJobs]')) {
  c = c.replace(
    '    const [orders, setOrders] = useState([]);\n    const [loading, setLoading] = useState(true);',
    '    const [orders, setOrders] = useState([]);\n    const [plannerJobs, setPlannerJobs] = useState([]);\n    const [loading, setLoading] = useState(true);'
  );
}

if (!c.includes("api.get('/design/planner/jobs')")) {
  c = c.replace(
    "            const data = await api.get('/production/orders');\n            const flattened = data.flatMap(order =>",
    `            const [data, jobs] = await Promise.all([
                api.get('/production/orders'),
                api.get('/design/planner/jobs').catch(() => [])
            ]);
            setPlannerJobs(Array.isArray(jobs) ? jobs : []);
            const flattened = data.flatMap(order =>`
  );
}

if (!c.includes('const assignedPlannerJobs = useMemo')) {
  c = c.replace(
    '    const searchTerms = normalizeSearchText(search).split(/\\s+/).filter(Boolean);\n\n    const filteredOrders = useMemo(() => orders.filter((item) => {',
    `    const searchTerms = normalizeSearchText(search).split(/\\s+/).filter(Boolean);
    const assignedPlannerJobs = useMemo(() => {
        const list = Array.isArray(plannerJobs) ? plannerJobs : [];
        return list.filter((job) => isAssignedToCurrentUser(job.responsable, currentUser));
    }, [plannerJobs, currentUser]);

    const filteredOrders = useMemo(() => orders.filter((item) => {`
  );
}

if (crlf) c = c.replace(/\n/g, '\r\n');
fs.writeFileSync(path, c);
console.log({
  state: c.includes('setPlannerJobs'),
  fetch: c.includes('/design/planner/jobs'),
  memo: c.includes('const assignedPlannerJobs = useMemo')
});
