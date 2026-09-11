const fs = require('fs');
const path = 'E:/Semillas/Perlax/frontend/src/pages/ordenes/PlanesDiseno.jsx';
let c = fs.readFileSync(path, 'utf8');
const crlf = c.includes('\r\n');
c = c.replace(/\r\n/g, '\n');

const oldHelper = `function matchesAssignedPlannerJob(item, jobs) {
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
}`;

const newHelper = `function findMatchingPlannerJob(item, jobs) {
    if (!Array.isArray(jobs) || jobs.length === 0) return null;
    const itemNums = new Set(extractOtNumbers(item.otNumber));
    const product = normalizeSearchText(item.productName);
    for (const job of jobs) {
        const jobNums = extractOtNumbers(job.trabajo);
        if (jobNums.some((n) => itemNums.has(n))) return job;
        const trabajo = normalizeSearchText(job.trabajo).replace(/^\\d+[\\s·.\\-]*/, '').trim();
        if (trabajo.length >= 10 && product.length >= 8 && (product.includes(trabajo) || trabajo.includes(product))) {
            return job;
        }
    }
    return null;
}

function matchesAssignedPlannerJob(item, jobs) {
    return !!findMatchingPlannerJob(item, jobs);
}

function resolvePlannerDesigner(item, jobs) {
    const existing = String(item?.disenador || item?.Disenador || '').trim();
    if (existing) return existing;
    return String(findMatchingPlannerJob(item, jobs)?.responsable || '').trim();
}`;

if (!c.includes('function findMatchingPlannerJob(')) {
  if (!c.includes(oldHelper)) {
    console.log('helper block not found');
  } else {
    c = c.replace(oldHelper, newHelper);
  }
}

c = c.replace(
  `                    createdAt: order.createdAt || order.CreatedAt
                }))
            );
            setOrders(flattened);`,
  `                    createdAt: order.createdAt || order.CreatedAt
                }))
            );
            const jobList = Array.isArray(jobs) ? jobs : [];
            setOrders(flattened.map((item) => ({
                ...item,
                disenador: resolvePlannerDesigner(item, jobList)
            })));`
);

c = c.replace(
  '                const designerName = (item.disenador || \'\').trim();',
  '                const designerName = resolvePlannerDesigner(item, plannerJobs);'
);

c = c.replace(
  `                if (part) {
                    setSelectedOT(mergeOrderPartDetail(order, part));
                }`,
  `                if (part) {
                    const merged = mergeOrderPartDetail(order, part);
                    merged.disenador = resolvePlannerDesigner(merged, plannerJobs);
                    setSelectedOT(merged);
                }`
);

if (!c.includes('plannerJobs]);') && c.includes('[opened, selectedOT?.id, selectedOT?.productionOrderId]);')) {
  c = c.replace(
    '    }, [opened, selectedOT?.id, selectedOT?.productionOrderId]);',
    '    }, [opened, selectedOT?.id, selectedOT?.productionOrderId, plannerJobs]);'
  );
}

if (crlf) c = c.replace(/\n/g, '\r\n');
fs.writeFileSync(path, c);
console.log({
  find: c.includes('function findMatchingPlannerJob'),
  resolve: c.includes('resolvePlannerDesigner'),
  flatten: c.includes('disenador: resolvePlannerDesigner(item, jobList)'),
  row: c.includes('resolvePlannerDesigner(item, plannerJobs)')
});
