const fs = require("fs");
const storagePath = "g:/github/Perlax/frontend/src/pages/ajustes/cotizadorCatalogStorage.js";
const viewPath = "g:/github/Perlax/frontend/src/pages/ajustes/CotizadorCatalogos.jsx";
const storage = `export const COTIZADOR_CATALOGS = [
    { value: "maquinas", label: "Maquinas" },
    { value: "materiales", label: "Materiales" },
    { value: "factores", label: "Factores" },
    { value: "micro_flauta", label: "Micro flauta" },
    { value: "planchas", label: "Planchas" },
];
export const FIELD_TYPES = [
    { value: "text", label: "Texto" },
    { value: "number", label: "Numero" },
    { value: "textarea", label: "Texto largo" },
];
const STORAGE_KEY = "perlax-cotizador-catalogs";
const DEFAULT_SCHEMAS = {
    maquinas: [
        { key: "nombre", label: "Nombre", type: "text", required: true },
        { key: "codigo", label: "Codigo", type: "text" },
        { key: "velocidad", label: "Velocidad", type: "number" },
        { key: "costo_hora", label: "Costo hora", type: "number" },
    ],
    materiales: [
        { key: "nombre", label: "Nombre", type: "text", required: true },
        { key: "tipo", label: "Tipo", type: "text" },
        { key: "gramaje", label: "Gramaje", type: "number" },
        { key: "costo", label: "Costo", type: "number" },
    ],
    factores: [
        { key: "nombre", label: "Nombre", type: "text", required: true },
        { key: "valor", label: "Valor", type: "number", required: true },
        { key: "descripcion", label: "Descripcion", type: "textarea" },
    ],
    micro_flauta: [
        { key: "tipo", label: "Tipo", type: "text", required: true },
        { key: "factor", label: "Factor", type: "number" },
        { key: "espesor", label: "Espesor", type: "number" },
    ],
    planchas: [
        { key: "nombre", label: "Nombre", type: "text", required: true },
        { key: "ancho", label: "Ancho", type: "number" },
        { key: "largo", label: "Largo", type: "number" },
        { key: "costo_plancha", label: "Costo plancha", type: "number" },
    ],
};
const emptyStore = () => ({
    schemas: { ...DEFAULT_SCHEMAS },
    records: Object.fromEntries(COTIZADOR_CATALOGS.map((item) => [item.value, []])),
});
export function loadCotizadorCatalogStore() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return emptyStore();
        const parsed = JSON.parse(raw);
        return {
            schemas: { ...DEFAULT_SCHEMAS, ...(parsed.schemas || {}) },
            records: {
                ...Object.fromEntries(COTIZADOR_CATALOGS.map((item) => [item.value, []])),
                ...(parsed.records || {}),
            },
        };
    } catch {
        return emptyStore();
    }
}
export function saveCotizadorCatalogStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}
export function slugifyFieldKey(label) {
    return String(label || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}
export function getCatalogLabel(catalogKey) {
    return COTIZADOR_CATALOGS.find((item) => item.value === catalogKey)?.label || catalogKey;
}
`;
fs.writeFileSync(storagePath, storage, "utf8");
console.log("storage ok", !fs.readFileSync(storagePath).includes(0));

const viewLines = [
    "import { useEffect, useMemo, useState } from 'react';",
    "import { Navigate, useNavigate } from 'react-router-dom';",
    "import { ActionIcon, Badge, Box, Button, Card, Divider, Group, Modal, NumberInput, ScrollArea, Select, SimpleGrid, Stack, Switch, Table, Tabs, Text, TextInput, Textarea, Title, Tooltip } from '@mantine/core';",
    "import { IconArrowLeft, IconDatabase, IconLayoutColumns, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';",
    "import { notifications } from '@mantine/notifications';",
    "import { getCurrentUser, isAdmin } from '../../utils/permissions';",
    "import { COTIZADOR_CATALOGS, FIELD_TYPES, getCatalogLabel, loadCotizadorCatalogStore, saveCotizadorCatalogStore, slugifyFieldKey } from './cotizadorCatalogStorage';",
    "",
    "const emptyFieldForm = { label: '', key: '', type: 'text', required: false };",
    "",
    "function DynamicFieldInput({ field, value, onChange }) {",
    "    if (field.type === 'number') {",
    "        return <NumberInput label={field.label} value={value ?? ''} required={field.required} onChange={(next) => onChange(next ?? '')} min={0} decimalScale={4} />;",
    "    }",
    "    if (field.type === 'textarea') {",
    "        return <Textarea label={field.label} value={value ?? ''} required={field.required} onChange={(event) => onChange(event.currentTarget.value)} minRows={2} />;",
    "    }",
    "    return <TextInput label={field.label} value={value ?? ''} required={field.required} onChange={(event) => onChange(event.currentTarget.value)} />;",
    "}",
    "",
    "export default function CotizadorCatalogos() {",
    "    const navigate = useNavigate();",
    "    const me = getCurrentUser();",
    "    const [store, setStore] = useState(loadCotizadorCatalogStore);",
    "    const [catalogKey, setCatalogKey] = useState(COTIZADOR_CATALOGS[0].value);",
    "    const [fieldModalOpen, setFieldModalOpen] = useState(false);",
    "    const [recordModalOpen, setRecordModalOpen] = useState(false);",
    "    const [editingFieldKey, setEditingFieldKey] = useState(null);",
    "    const [editingRecordId, setEditingRecordId] = useState(null);",
    "    const [fieldForm, setFieldForm] = useState(emptyFieldForm);",
    "    const [recordForm, setRecordForm] = useState({});",
    "    const fields = store.schemas[catalogKey] || [];",
    "    const records = store.records[catalogKey] || [];",
    "    useEffect(() => { saveCotizadorCatalogStore(store); }, [store]);",
    "    const persist = (updater) => setStore((prev) => (typeof updater === 'function' ? updater(prev) : updater));",
    "    const openAddField = () => { setEditingFieldKey(null); setFieldForm(emptyFieldForm); setFieldModalOpen(true); };",
    "    const openEditField = (field) => { setEditingFieldKey(field.key); setFieldForm({ label: field.label, key: field.key, type: field.type, required: !!field.required }); setFieldModalOpen(true); };",
    "    const saveField = () => {",
    "        const label = fieldForm.label.trim();",
    "        if (!label) return notifications.show({ title: 'Campo requerido', message: 'Ingrese el nombre del campo.', color: 'red' });",
    "        const key = (fieldForm.key || slugifyFieldKey(label)).trim();",
    "        if (!key) return notifications.show({ title: 'Clave invalida', message: 'No se pudo generar la clave del campo.', color: 'red' });",
    "        const nextField = { key, label, type: fieldForm.type, required: fieldForm.required };",
    "        persist((prev) => {",
    "            const current = [...(prev.schemas[catalogKey] || [])];",
    "            if (current.some((item) => item.key === key && item.key !== editingFieldKey)) {",
    "                notifications.show({ title: 'Clave duplicada', message: 'Ya existe un campo con esa clave.', color: 'red' });",
    "                return prev;",
    "            }",
    "            const nextFields = editingFieldKey ? current.map((item) => (item.key === editingFieldKey ? nextField : item)) : [...current, nextField];",
    "            const nextRecords = (prev.records[catalogKey] || []).map((record) => {",
    "                const values = { ...record.values };",
    "                if (editingFieldKey && editingFieldKey !== key) { values[key] = values[editingFieldKey]; delete values[editingFieldKey]; }",
    "                if (!editingFieldKey) values[key] = '';",
    "                return { ...record, values };",
    "            });",
    "            return { ...prev, schemas: { ...prev.schemas, [catalogKey]: nextFields }, records: { ...prev.records, [catalogKey]: nextRecords } };",
    "        });",
    "        setFieldModalOpen(false);",
    "        notifications.show({ title: editingFieldKey ? 'Campo actualizado' : 'Campo creado', message: label + ' quedo configurado en ' + getCatalogLabel(catalogKey) + '.', color: 'teal' });",
    "    };",
    "    const deleteField = (fieldKey) => persist((prev) => ({",
    "        ...prev,",
    "        schemas: { ...prev.schemas, [catalogKey]: (prev.schemas[catalogKey] || []).filter((item) => item.key !== fieldKey) },",
    "        records: { ...prev.records, [catalogKey]: (prev.records[catalogKey] || []).map((record) => { const values = { ...record.values }; delete values[fieldKey]; return { ...record, values }; }) },",
    "    }));",
    "    const openAddRecord = () => {",
    "        if (!fields.length) return notifications.show({ title: 'Sin campos', message: 'Primero configure los campos del catalogo.', color: 'yellow' });",
    "        setEditingRecordId(null);",
    "        setRecordForm(Object.fromEntries(fields.map((field) => [field.key, ''])));",
    "        setRecordModalOpen(true);",
    "    };",
    "    const openEditRecord = (record) => { setEditingRecordId(record.id); setRecordForm({ ...record.values }); setRecordModalOpen(true); };",
    "    const saveRecord = () => {",
    "        const missing = fields.filter((field) => field.required && !String(recordForm[field.key] ?? '').trim());",
    "        if (missing.length) return notifications.show({ title: 'Campos obligatorios', message: 'Complete: ' + missing.map((field) => field.label).join(', '), color: 'red' });",
    "        const normalizedValues = Object.fromEntries(fields.map((field) => [field.key, field.type === 'number' ? Number(recordForm[field.key] || 0) : String(recordForm[field.key] ?? '').trim()]));",
    "        persist((prev) => {",
    "            const current = [...(prev.records[catalogKey] || [])];",
    "            const nextRecord = { id: editingRecordId || crypto.randomUUID(), values: normalizedValues };",
    "            const nextRecords = editingRecordId ? current.map((item) => (item.id === editingRecordId ? nextRecord : item)) : [nextRecord, ...current];",
    "            return { ...prev, records: { ...prev.records, [catalogKey]: nextRecords } };",
    "        });",
    "        setRecordModalOpen(false);",
    "        notifications.show({ title: editingRecordId ? 'Registro actualizado' : 'Registro creado', message: 'Se guardo en ' + getCatalogLabel(catalogKey) + '.', color: 'teal' });",
    "    };",
    "    const deleteRecord = (recordId) => persist((prev) => ({ ...prev, records: { ...prev.records, [catalogKey]: (prev.records[catalogKey] || []).filter((item) => item.id !== recordId) } }));",
    "    const catalogOptions = useMemo(() => COTIZADOR_CATALOGS.map((item) => ({ value: item.value, label: item.label })), []);",
    "    if (!isAdmin(me)) return <Navigate to='/' replace />;",
    "    return (",
    "        <Stack p='md' gap='lg' className='fade-in'>",
    "            <Card className='glass-card'>",
    "                <Group justify='space-between' align='flex-start'>",
    "                    <Group align='flex-start'>",
    "                        <Button variant='subtle' color='gray' leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/ajustes')}>Volver</Button>",
    "                        <Stack gap={4}>",
    "                            <Text size='xs' c='dimmed' fw={700} style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>Ajustes del sistema</Text>",
    "                            <Title order={2} c='white'>Catalogos del cotizador</Title>",
    "                            <Text size='sm' c='dimmed'>Configure campos y registros para maquinas, materiales, factores, micro flauta y planchas.</Text>",
    "                        </Stack>",
    "                    </Group>",
    "                    <Select label='Catalogo' data={catalogOptions} value={catalogKey} onChange={(value) => value && setCatalogKey(value)} w={260} searchable />",
    "                </Group>",
    "            </Card>",
    "            <Tabs defaultValue='campos' variant='outline'>",
    "                <Tabs.List>",
    "                    <Tabs.Tab value='campos' leftSection={<IconLayoutColumns size={16} />}>Campos</Tabs.Tab>",
    "                    <Tabs.Tab value='registros' leftSection={<IconDatabase size={16} />}>Registros</Tabs.Tab>",
    "                </Tabs.List>",
    "                <Tabs.Panel value='campos' pt='md'>",
    "                    <Card className='glass-card'>",
    "                        <Group justify='space-between' mb='md'>",
    "                            <Stack gap={2}><Title order={4} c='white'>Campos de {getCatalogLabel(catalogKey)}</Title><Text size='sm' c='dimmed'>Defina que informacion se captura en este catalogo.</Text></Stack>",
    "                            <Button leftSection={<IconPlus size={16} />} onClick={openAddField}>Agregar campo</Button>",
    "                        </Group>",
    "                        <ScrollArea><Table striped highlightOnHover><Table.Thead><Table.Tr><Table.Th>Etiqueta</Table.Th><Table.Th>Clave</Table.Th><Table.Th>Tipo</Table.Th><Table.Th>Obligatorio</Table.Th><Table.Th ta='right'>Acciones</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{fields.map((field) => (<Table.Tr key={field.key}><Table.Td>{field.label}</Table.Td><Table.Td><Text ff='monospace' size='sm'>{field.key}</Text></Table.Td><Table.Td>{FIELD_TYPES.find((item) => item.value === field.type)?.label || field.type}</Table.Td><Table.Td>{field.required ? <Badge color='orange'>Si</Badge> : <Badge color='gray'>No</Badge>}</Table.Td><Table.Td><Group justify='flex-end' gap='xs'><Tooltip label='Editar'><ActionIcon variant='subtle' color='yellow' onClick={() => openEditField(field)}><IconPencil size={16} /></ActionIcon></Tooltip><Tooltip label='Eliminar'><ActionIcon variant='subtle' color='red' onClick={() => deleteField(field.key)}><IconTrash size={16} /></ActionIcon></Tooltip></Group></Table.Td></Table.Tr>))}{!fields.length && <Table.Tr><Table.Td colSpan={5}><Box py='lg' ta='center'><Text c='dimmed'>Este catalogo aun no tiene campos configurados.</Text></Box></Table.Td></Table.Tr>}</Table.Tbody></Table></ScrollArea>",
    "                    </Card>",
    "                </Tabs.Panel>",
    "                <Tabs.Panel value='registros' pt='md'>",
    "                    <Card className='glass-card'>",
    "                        <Group justify='space-between' mb='md'>",
    "                            <Stack gap={2}><Title order={4} c='white'>Registros de {getCatalogLabel(catalogKey)}</Title><Text size='sm' c='dimmed'>{records.length} registro(s) configurado(s).</Text></Stack>",
    "                            <Button leftSection={<IconPlus size={16} />} onClick={openAddRecord}>Nuevo registro</Button>",
    "                        </Group>",
    "                        <ScrollArea><Table striped highlightOnHover><Table.Thead><Table.Tr>{fields.map((field) => <Table.Th key={field.key}>{field.label}</Table.Th>)}<Table.Th ta='right'>Acciones</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{records.map((record) => (<Table.Tr key={record.id}>{fields.map((field) => <Table.Td key={field.key}>{record.values?.[field.key] ?? ''}</Table.Td>)}<Table.Td><Group justify='flex-end' gap='xs'><ActionIcon variant='subtle' color='yellow' onClick={() => openEditRecord(record)}><IconPencil size={16} /></ActionIcon><ActionIcon variant='subtle' color='red' onClick={() => deleteRecord(record.id)}><IconTrash size={16} /></ActionIcon></Group></Table.Td></Table.Tr>))}{!records.length && <Table.Tr><Table.Td colSpan={Math.max(fields.length + 1, 1)}><Box py='lg' ta='center'><Text c='dimmed'>No hay registros en este catalogo.</Text></Box></Table.Td></Table.Tr>}</Table.Tbody></Table></ScrollArea>",
    "                    </Card>",
    "                </Tabs.Panel>",
    "            </Tabs>",
    "            <Modal opened={fieldModalOpen} onClose={() => setFieldModalOpen(false)} title={editingFieldKey ? 'Editar campo' : 'Nuevo campo'} centered><Stack><TextInput label='Nombre del campo' value={fieldForm.label} onChange={(event) => { const label = event.currentTarget.value; setFieldForm((prev) => ({ ...prev, label, key: editingFieldKey ? prev.key : slugifyFieldKey(label) })); }} required /><TextInput label='Clave interna' value={fieldForm.key} onChange={(event) => setFieldForm((prev) => ({ ...prev, key: slugifyFieldKey(event.currentTarget.value) }))} description='Se usa internamente en el cotizador.' /><Select label='Tipo' data={FIELD_TYPES} value={fieldForm.type} onChange={(value) => setFieldForm((prev) => ({ ...prev, type: value || 'text' }))} /><Switch label='Campo obligatorio' checked={fieldForm.required} onChange={(event) => setFieldForm((prev) => ({ ...prev, required: event.currentTarget.checked }))} /><Group justify='flex-end'><Button variant='subtle' color='gray' onClick={() => setFieldModalOpen(false)}>Cancelar</Button><Button onClick={saveField}>Guardar campo</Button></Group></Stack></Modal>",
    "            <Modal opened={recordModalOpen} onClose={() => setRecordModalOpen(false)} title={editingRecordId ? 'Editar registro' : 'Nuevo registro'} centered size='lg'><Stack><SimpleGrid cols={{ base: 1, sm: 2 }}>{fields.map((field) => <DynamicFieldInput key={field.key} field={field} value={recordForm[field.key]} onChange={(value) => setRecordForm((prev) => ({ ...prev, [field.key]: value }))} />)}</SimpleGrid><Divider /><Group justify='flex-end'><Button variant='subtle' color='gray' onClick={() => setRecordModalOpen(false)}>Cancelar</Button><Button onClick={saveRecord}>Guardar registro</Button></Group></Stack></Modal>",
    "        </Stack>",
    "    );",
    "}",
];
fs.writeFileSync(viewPath, viewLines.join("\n"), "utf8");
console.log("view ok", !fs.readFileSync(viewPath).includes(0));

// uploadUrl.js se mantiene en write-auth-image.cjs para no perder fetchAuthenticatedUploadBlob

const mobileHookPath = "g:/github/Perlax/frontend/src/utils/useIsMobileLayout.js";
const mobileHookLines = [
    "import { useEffect, useState } from 'react';",
    "",
    "const MOBILE_BREAKPOINT = 992;",
    "",
    "function detectMobileLayout() {",
    "    if (typeof window === 'undefined') return false;",
    "    return window.innerWidth <= MOBILE_BREAKPOINT;",
    "}",
    "",
    "export function useIsMobileLayout() {",
    "    const [isMobile, setIsMobile] = useState(detectMobileLayout);",
    "    useEffect(() => {",
    "        const sync = () => setIsMobile(detectMobileLayout());",
    "        sync();",
    "        window.addEventListener('resize', sync);",
    "        window.addEventListener('orientationchange', sync);",
    "        return () => {",
    "            window.removeEventListener('resize', sync);",
    "            window.removeEventListener('orientationchange', sync);",
    "        };",
    "    }, []);",
    "    return isMobile;",
    "}",
    "",
    "export const MOBILE_LAYOUT_MAX_WIDTH = MOBILE_BREAKPOINT;",
];
fs.writeFileSync(mobileHookPath, mobileHookLines.join("\n"), "utf8");
console.log("mobileHook ok", !fs.readFileSync(mobileHookPath).includes(0));