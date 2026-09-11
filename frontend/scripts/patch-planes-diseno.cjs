const fs = require('fs');
const path = 'E:/Semillas/Perlax/frontend/src/pages/ordenes/PlanesDiseno.jsx';
let c = fs.readFileSync(path, 'utf8');

if (!c.includes("from '../../utils/permissions'")) {
  c = c.replace(
    "import { notifications } from '@mantine/notifications';",
    "import { notifications } from '@mantine/notifications';\nimport { isAdmin, isAssignedToCurrentUser } from '../../utils/permissions';"
  );
}

if (!c.includes('function pickUploadFile(')) {
  c = c.replace(
    'function normalizeSearchText(value) {',
    `function pickUploadFile(fileOrList) {
    if (!fileOrList) return null;
    if (Array.isArray(fileOrList)) return fileOrList[0] || null;
    return fileOrList;
}

function normalizeSearchText(value) {`
  );
}

c = c.replace(
  "    const [search, setSearch] = useState('');\n    const [filterAssignment, setFilterAssignment] = useState('all');",
  "    const [search, setSearch] = useState('');\n    const canSeeAllPlans = isAdmin(currentUser);\n    const [filterAssignment, setFilterAssignment] = useState(canSeeAllPlans ? 'all' : 'mine');"
);

c = c.replace(
  `            const flattened = data.flatMap(order =>
                order.parts.map(part => ({
                    ...part,
                    otNumber: order.otNumber || order.otNumber || order.OTNumber,
                    cliente: order.cliente || order.Cliente,
                    ejecutivo: order.ejecutivoCuenta || order.ejecutivoCuenta || order.EjecutivoCuenta,
                    productName: order.productName || order.productName || order.ProductName,
                    createdAt: order.createdAt || order.CreatedAt
                }))
            );`,
  `            const flattened = data.flatMap(order =>
                (order.parts || []).map(part => ({
                    ...part,
                    productionOrderId: part.productionOrderId || part.ProductionOrderId || order.id || order.Id,
                    otNumber: order.otNumber || order.OTNumber,
                    cliente: order.cliente || order.Cliente,
                    ejecutivo: order.ejecutivoCuenta || order.EjecutivoCuenta,
                    productName: order.productName || order.ProductName,
                    createdAt: order.createdAt || order.CreatedAt
                }))
            );`
);

c = c.replace(
  `    const handleUploadAttachment = async (file, category) => {
        if (!file || !selectedOT?.productionOrderId || !selectedOT?.id) return;
        const orderId = selectedOT.productionOrderId;
        const partId = selectedOT.id;`,
  `    const handleUploadAttachment = async (fileOrList, category) => {
        const file = pickUploadFile(fileOrList);
        const orderId = selectedOT?.productionOrderId || selectedOT?.ProductionOrderId;
        const partId = selectedOT?.id;
        if (!file) return;
        if (!orderId || !partId) {
            notifications.show({
                title: 'No se puede subir',
                message: 'Falta el identificador de la OT o de la pieza.',
                color: 'yellow'
            });
            return;
        }`
);

c = c.replace(
  `        if (filterAssignment === 'mine' && (!isAssigned || designerNormalized !== currentUserName)) return false;
        if (filterAssignment === 'assigned' && !isAssigned) return false;
        if (filterAssignment === 'unassigned' && isAssigned) return false;`,
  `        if (!canSeeAllPlans && !isAssignedToCurrentUser(item.disenador, currentUser)) return false;

        if (canSeeAllPlans) {
            if (filterAssignment === 'mine' && (!isAssigned || !isAssignedToCurrentUser(item.disenador, currentUser))) return false;
            if (filterAssignment === 'assigned' && !isAssigned) return false;
            if (filterAssignment === 'unassigned' && isAssigned) return false;
        }`
);

c = c.replace(
  '    }), [orders, searchTerms, filterAssignment, filterApproval, filterPriority, currentUserName]);',
  '    }), [orders, searchTerms, filterAssignment, filterApproval, filterPriority, currentUserName, canSeeAllPlans, currentUser]);'
);

c = c.replace(
  `                            <Select
                                label="Asignación"
                                value={filterAssignment}
                                onChange={(value) => setFilterAssignment(value || 'all')}
                                data={[
                                    { value: 'all', label: 'Todas' },
                                    { value: 'mine', label: 'Asignadas a mí' },
                                    { value: 'assigned', label: 'Con diseñador' },
                                    { value: 'unassigned', label: 'Sin asignar' }
                                ]}
                                variant="filled"
                            />`,
  `                            {canSeeAllPlans && (
                            <Select
                                label="Asignación"
                                value={filterAssignment}
                                onChange={(value) => setFilterAssignment(value || 'all')}
                                data={[
                                    { value: 'all', label: 'Todas' },
                                    { value: 'mine', label: 'Asignadas a mí' },
                                    { value: 'assigned', label: 'Con diseñador' },
                                    { value: 'unassigned', label: 'Sin asignar' }
                                ]}
                                variant="filled"
                            />
                            )}`
);

const uploadButton = (label, category) => `<Button
                                                    component="label"
                                                    size="xs"
                                                    variant="light"
                                                    leftSection={<IconUpload size={14} />}
                                                    loading={uploading}
                                                    disabled={uploading}
                                                >
                                                    ${label}
                                                    <input
                                                        type="file"
                                                        accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/tiff"
                                                        hidden
                                                        onChange={(e) => {
                                                            const picked = e.currentTarget.files?.[0];
                                                            if (picked) handleUploadAttachment(picked, '${category}');
                                                            e.currentTarget.value = '';
                                                        }}
                                                    />
                                                </Button>`;

c = c.replace(
  /<FileInput[\s\S]*?onChange=\{\(file\) => file && handleUploadAttachment\(file, 'ampliaciones'\)\}\s*\/>/,
  uploadButton('Subir ampliación', 'ampliaciones')
);
c = c.replace(
  /<FileInput[\s\S]*?onChange=\{\(file\) => file && handleUploadAttachment\(file, 'adjuntos'\)\}\s*\/>/,
  uploadButton('Subir adjunto', 'adjuntos')
);

c = c.split('disabled={uploading || detailLoading}').join('disabled={uploading}');

if (!c.includes('FileInput')) {
  c = c.replace('\n    FileInput,', '');
}

fs.writeFileSync(path, c);
console.log('patched ok', {
  canSeeAllPlans: c.includes('canSeeAllPlans'),
  assignedHelper: c.includes('isAssignedToCurrentUser'),
  nativeUpload: c.includes("type=\"file\""),
  leftoverFileInput: c.includes('FileInput')
});
