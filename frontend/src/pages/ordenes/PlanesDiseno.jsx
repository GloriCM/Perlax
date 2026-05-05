import {
    Card,
    Title,
    Text,
    Group,
    Button,
    Stack,
    TextInput,
    SimpleGrid,
    Box,
    Table,
    ScrollArea,
    ActionIcon,
    Badge,
    Modal,
    Divider,
    Checkbox,
    Grid,
    Image,
    Paper,
    FileInput,
    Loader,
    Menu,
    Select
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    IconSearch,
    IconX,
    IconPrinter,
    IconDeviceFloppy,
    IconDotsVertical,
    IconUpload
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, getApiOrigin } from '../../utils/api';
import { notifications } from '@mantine/notifications';

function absoluteUploadUrl(publicPath) {
    if (!publicPath || typeof publicPath !== 'string') return '';
    const trimmed = publicPath.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    const origin = getApiOrigin();
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${origin}${path}`;
}

function mergeOrderPartDetail(order, part) {
    return {
        ...part,
        otNumber: order.otNumber ?? order.OTNumber,
        cliente: order.cliente ?? order.Cliente,
        ejecutivo: order.ejecutivoCuenta ?? order.EjecutivoCuenta,
        productName: order.productName ?? order.ProductName,
        createdAt: order.createdAt ?? order.CreatedAt
    };
}

/** Devuelve URLs públicas por categoría desde AdjuntosJson de la pieza. */
function parseAttachmentsByCategory(adjuntosJson) {
    if (!adjuntosJson) return { ampliaciones: [], adjuntos: [] };
    try {
        const list = JSON.parse(adjuntosJson);
        if (!Array.isArray(list)) return { ampliaciones: [], adjuntos: [] };
        const ampliaciones = [];
        const adjuntos = [];
        for (const item of list) {
            const cat = String(item.category ?? item.Category ?? '').toLowerCase();
            const kind = String(item.kind ?? item.Kind ?? '').toLowerCase();
            const url = item.publicUrl ?? item.PublicUrl;
            if (!url) continue;
            if (cat === 'ampliaciones' || kind === 'ampliacion') ampliaciones.push(url);
            else if (cat === 'adjuntos' || kind === 'adjunto') adjuntos.push(url);
        }
        return { ampliaciones, adjuntos };
    } catch {
        return { ampliaciones: [], adjuntos: [] };
    }
}

const INK_LETTER = {
    c: '#0097a7',
    m: '#c2185b',
    y: '#f9a825',
    k: '#1a1a1a'
};

function PlanDisenoTintInkMark({ letter, inkKey, checked }) {
    const color = INK_LETTER[inkKey] ?? '#111';
    const markColor = inkKey === 'k' ? '#111' : inkKey === 'y' ? '#6d4c00' : color;
    return (
        <Group gap={4} align="center" wrap="nowrap">
            <Text size="xs" fw={800} style={{ color, minWidth: 11 }}>
                {letter}
            </Text>
            <Box
                w={14}
                h={14}
                style={{
                    border: '1px solid rgba(255,255,255,0.35)',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#fff',
                    fontSize: 11,
                    fontWeight: 900,
                    lineHeight: 1,
                    color: checked ? markColor : 'transparent'
                }}
            >
                {checked ? '\u2715' : ''}
            </Box>
        </Group>
    );
}

function parseFabricationProcesses(jsonStr) {
    if (!jsonStr) return [];
    try {
        const arr = JSON.parse(jsonStr);
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

function getAttachmentStatusByCategory(adjuntosJson) {
    const parsed = parseAttachmentsByCategory(adjuntosJson);
    return {
        ampliacionesOk: parsed.ampliaciones.length > 0,
        adjuntosOk: parsed.adjuntos.length > 0
    };
}

function normalizeSearchText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

export default function PlanesDiseno() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [search, setSearch] = useState('');
    const [opened, { open, close }] = useDisclosure(false);
    const [previewOpened, { open: openPreview, close: closePreview }] = useDisclosure(false);
    const [previewUrl, setPreviewUrl] = useState('');
    const [selectedOT, setSelectedOT] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editorOpened, { open: openEditor, close: closeEditor }] = useDisclosure(false);
    const [editingItem, setEditingItem] = useState(null);
    const [editSaving, setEditSaving] = useState(false);
    const [editPrioridad, setEditPrioridad] = useState('Normal');
    const [editDesignerOption, setEditDesignerOption] = useState('');
    const [editDesignerCustom, setEditDesignerCustom] = useState('');
    const [pendingOtToOpen, setPendingOtToOpen] = useState(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    useEffect(() => {
        const ot = searchParams.get('ot');
        if (!ot) return;
        setSearch(ot);
        setPendingOtToOpen(ot.trim());
    }, [searchParams]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const data = await api.get('/production/orders');
            // Flatten parts if needed or just show the orders
            // For Design Plans, we usually want to see each Part as a row
            const flattened = data.flatMap(order =>
                order.parts.map(part => ({
                    ...part,
                    otNumber: order.otNumber || order.otNumber || order.OTNumber,
                    cliente: order.cliente || order.Cliente,
                    ejecutivo: order.ejecutivoCuenta || order.ejecutivoCuenta || order.EjecutivoCuenta,
                    productName: order.productName || order.productName || order.ProductName,
                    createdAt: order.createdAt || order.CreatedAt
                }))
            );
            setOrders(flattened);
        } catch (error) {
            console.error('Error fetching design plans:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudieron cargar los planes de diseño',
                color: 'red'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!opened || !selectedOT?.productionOrderId || !selectedOT?.id) return undefined;
        const orderId = selectedOT.productionOrderId;
        const partId = selectedOT.id;
        let cancelled = false;

        const loadDetail = async () => {
            try {
                setDetailLoading(true);
                const order = await api.get(`/production/orders/${orderId}`);
                if (cancelled) return;
                const part = (order.parts || []).find((p) => p.id === partId);
                if (part) {
                    setSelectedOT(mergeOrderPartDetail(order, part));
                }
            } catch (error) {
                if (!cancelled) {
                    console.error(error);
                    notifications.show({
                        title: 'Error',
                        message: 'No se pudo actualizar el detalle de la OT.',
                        color: 'red'
                    });
                }
            } finally {
                if (!cancelled) setDetailLoading(false);
            }
        };

        loadDetail();
        return () => {
            cancelled = true;
        };
    }, [opened, selectedOT?.id, selectedOT?.productionOrderId]);

    const handleUploadAttachment = async (file, category) => {
        if (!file || !selectedOT?.productionOrderId || !selectedOT?.id) return;
        const orderId = selectedOT.productionOrderId;
        const partId = selectedOT.id;
        try {
            setUploading(true);
            const fd = new FormData();
            fd.append('category', category);
            fd.append('partId', partId);
            fd.append('files', file, file.name);
            await api.postFormData(`/production/orders/${orderId}/attachments`, fd);
            notifications.show({
                title: 'Archivo guardado',
                message: 'El adjunto se subió correctamente.',
                color: 'green'
            });
            const order = await api.get(`/production/orders/${orderId}`);
            const part = (order.parts || []).find((p) => p.id === partId);
            if (part) setSelectedOT(mergeOrderPartDetail(order, part));
            fetchOrders();
        } catch (error) {
            console.error(error);
            notifications.show({
                title: 'Error al subir',
                message: error?.message || 'No se pudo guardar el archivo.',
                color: 'red'
            });
        } finally {
            setUploading(false);
        }
    };

    const openImagePreview = (publicUrl) => {
        const full = absoluteUploadUrl(publicUrl);
        if (!full) return;
        setPreviewUrl(full);
        openPreview();
    };

    const handlePrintFicha = () => {
        if (!selectedOT?.id) {
            notifications.show({
                title: 'Sin pieza',
                message: 'No hay identificador de pieza para imprimir.',
                color: 'yellow'
            });
            return;
        }
        window.open(`/fichas/imprimir/${selectedOT.id}`, '_blank', 'noopener,noreferrer');
    };

    const openQuickEditor = (item) => {
        const rawDesigner = (item.disenador || '').trim();
        const isPreset = rawDesigner === 'Juan' || rawDesigner === 'Karen' || rawDesigner === '';
        setEditingItem(item);
        setEditPrioridad(item.prioridad || 'Normal');
        if (!rawDesigner) {
            setEditDesignerOption('');
            setEditDesignerCustom('');
        } else if (isPreset) {
            setEditDesignerOption(rawDesigner);
            setEditDesignerCustom('');
        } else {
            setEditDesignerOption('Otro');
            setEditDesignerCustom(rawDesigner);
        }
        openEditor();
    };

    const handleSaveQuickEditor = async () => {
        if (!editingItem?.productionOrderId || !editingItem?.id) return;
        const designer = editDesignerOption === 'Otro'
            ? editDesignerCustom.trim()
            : editDesignerOption.trim();
        if (editDesignerOption === 'Otro' && !designer) {
            notifications.show({
                title: 'Diseñador requerido',
                message: 'Escribe un nombre para el diseñador personalizado.',
                color: 'yellow'
            });
            return;
        }
        try {
            setEditSaving(true);
            await api.put(`/production/orders/${editingItem.productionOrderId}/parts/${editingItem.id}/design-plan`, {
                prioridad: editPrioridad,
                disenador: designer || null
            });
            notifications.show({
                title: 'Actualizado',
                message: 'Prioridad y diseñador guardados correctamente.',
                color: 'green'
            });
            closeEditor();
            await fetchOrders();
            if (opened && selectedOT?.id === editingItem.id) {
                const order = await api.get(`/production/orders/${editingItem.productionOrderId}`);
                const part = (order.parts || []).find((p) => p.id === editingItem.id);
                if (part) setSelectedOT(mergeOrderPartDetail(order, part));
            }
        } catch (error) {
            console.error(error);
            const isMissingEndpoint = String(error?.message || '').includes('404');
            notifications.show({
                title: 'No se pudo guardar',
                message: isMissingEndpoint
                    ? 'El backend activo no tiene el endpoint nuevo. Reinicia el backend y vuelve a intentar.'
                    : (error?.message || 'Error actualizando la pieza.'),
                color: 'red'
            });
        } finally {
            setEditSaving(false);
        }
    };

    const adjuntosParsed = selectedOT
        ? parseAttachmentsByCategory(selectedOT.adjuntosJson)
        : { ampliaciones: [], adjuntos: [] };
    const urlArte1 = adjuntosParsed.ampliaciones[0];
    const urlArte2 = adjuntosParsed.adjuntos[0];
    const procesosFab = selectedOT ? parseFabricationProcesses(selectedOT.fabricationProcessesJson) : [];

    const glassStyles = {
        root: {
            background: 'rgba(20, 30, 50, 0.7)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
            overflow: 'hidden'
        }
    };

    const handleViewDetail = (item) => {
        setSelectedOT(item);
        open();
    };

    const searchTerms = normalizeSearchText(search).split(/\s+/).filter(Boolean);

    const rows = orders.filter((item) => {
        if (searchTerms.length === 0) return true;
        const attachmentStatus = getAttachmentStatusByCategory(item.adjuntosJson);
        const searchable = normalizeSearchText([
            item.otNumber,
            item.partName,
            item.cliente,
            item.productName,
            item.ejecutivo,
            item.prioridad,
            item.disenador,
            item.estadoFicha,
            item.estadoMuestra,
            item.estadoAprobacion,
            attachmentStatus.ampliacionesOk ? 'ampliaciones ok' : 'ampliaciones pendiente',
            attachmentStatus.adjuntosOk ? 'adjuntos ok' : 'adjuntos pendiente'
        ].join(' '));
        return searchTerms.every((term) => searchable.includes(term));
    }).map((item) => (
        <Table.Tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => handleViewDetail(item)}>
            {(() => {
                const attachmentStatus = getAttachmentStatusByCategory(item.adjuntosJson);
                return (
                    <>
            <Table.Td><Text size="xs" fw={700} c="indigo.3">{item.otNumber} / {item.partName}</Text></Table.Td>
            <Table.Td><Text size="xs" truncate>{item.ejecutivo}</Text></Table.Td>
            <Table.Td><Text size="xs" fw={500} truncate>{item.cliente}</Text></Table.Td>
            <Table.Td><Text size="xs" truncate maw={200}>{item.productName}</Text></Table.Td>
            <Table.Td>
                <Badge variant="dot" size="xs" color={item.prioridad === 'Urgente' ? 'red' : item.prioridad === 'Alta' ? 'orange' : 'blue'}>
                    {item.prioridad}
                </Badge>
            </Table.Td>
            <Table.Td><Text size="xs">{item.disenador || 'No asignado'}</Text></Table.Td>
            <Table.Td><Text size="xs">{new Date(item.createdAt).toLocaleDateString()}</Text></Table.Td>
            <Table.Td>
                <Badge size="xs" variant="light" color={attachmentStatus.ampliacionesOk ? 'green' : 'gray'}>
                    {attachmentStatus.ampliacionesOk ? 'OK' : 'Pendiente'}
                </Badge>
            </Table.Td>
            <Table.Td>
                <Badge size="xs" variant="light" color={attachmentStatus.adjuntosOk ? 'green' : 'gray'}>
                    {attachmentStatus.adjuntosOk ? 'OK' : 'Pendiente'}
                </Badge>
            </Table.Td>
            <Table.Td><Text size="xs">{item.estadoFicha}</Text></Table.Td>
            <Table.Td><Text size="xs">{item.estadoMuestra}</Text></Table.Td>
            <Table.Td>
                <Badge size="xs" color={item.estadoAprobacion === 'Aprobado' ? 'green' : (item.estadoAprobacion === 'Rechazado' ? 'red' : 'yellow')}>
                    {item.estadoAprobacion}
                </Badge>
            </Table.Td>
            <Table.Td><Text size="xs">{item.otNumber}</Text></Table.Td>
            <Table.Td>
                <Menu withinPortal position="bottom-end">
                    <Menu.Target>
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                        >
                            <IconDotsVertical size={16} />
                        </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
                        <Menu.Item onClick={() => openQuickEditor(item)}>
                            Editar prioridad / diseñador
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </Table.Td>
                    </>
                );
            })()}
        </Table.Tr>
    ));

    useEffect(() => {
        if (!pendingOtToOpen || orders.length === 0 || opened) return;
        const target = pendingOtToOpen.toLowerCase();
        const firstMatch = orders.find((o) => String(o.otNumber || '').toLowerCase() === target);
        if (firstMatch) {
            setSelectedOT(firstMatch);
            open();
        }
        setPendingOtToOpen(null);
    }, [pendingOtToOpen, orders, opened, open]);

    return (
        <Stack gap="lg" p="md">
            <Group justify="space-between" align="flex-end">
                <Stack gap={4}>
                    <Title order={2} style={{ color: '#fff' }}>Planes de Diseño</Title>
                    <Text c="dimmed" size="sm">Seguimiento y control de archivos y aprobaciones</Text>
                </Stack>
                <Button
                    variant="light"
                    color="red"
                    leftSection={<IconX size={18} />}
                    onClick={() => navigate('/')}
                >
                    Cerrar
                </Button>
            </Group>

            <Card styles={glassStyles} p={0}>
                <Box p="md" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <TextInput
                        placeholder="Buscar por OT, cliente, producto..."
                        leftSection={<IconSearch size={18} stroke={1.5} />}
                        value={search}
                        onChange={(e) => setSearch(e.currentTarget.value)}
                        variant="filled"
                        styles={{ input: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' } }}
                    />
                </Box>

                <ScrollArea h={650}>
                    <Table stickyHeader verticalSpacing="xs" horizontalSpacing="sm" highlightOnHover
                        styles={{
                            thead: { backgroundColor: 'rgba(15, 23, 42, 0.95)' },
                            th: { color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 },
                            td: { borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#e2e8f0' }
                        }}
                    >
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>OT No</Table.Th>
                                <Table.Th>Ejecutivo</Table.Th>
                                <Table.Th>Cliente</Table.Th>
                                <Table.Th>Producto</Table.Th>
                                <Table.Th>Prioridad</Table.Th>
                                <Table.Th>Diseñador</Table.Th>
                                <Table.Th>Recepción</Table.Th>
                                <Table.Th>Ampliaciones</Table.Th>
                                <Table.Th>Adjuntos</Table.Th>
                                <Table.Th>Ficha</Table.Th>
                                <Table.Th>Muestra</Table.Th>
                                <Table.Th>Aprobación</Table.Th>
                                <Table.Th>Nº OP</Table.Th>
                                <Table.Th></Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>{rows}</Table.Tbody>
                    </Table>
                </ScrollArea>
            </Card>

            {/* DETAILED OT MODAL (Replica of Expertis View) */}
            <Modal
                opened={opened}
                onClose={() => {
                    closePreview();
                    close();
                }}
                size="95%"
                padding={0}
                withCloseButton={false}
                overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
                styles={{ content: { background: '#0f172a', color: '#fff', borderRadius: 16, overflow: 'hidden' } }}
            >
                {/* Header of Modal */}
                <Box p="md" style={{ background: 'linear-gradient(90deg, #1e3a8a 0%, #172554 100%)', position: 'relative' }}>
                    <Group justify="space-between">
                        <Group>
                            <Box style={{ background: '#fff', padding: 8, borderRadius: 8 }}>
                                <Image src="/logo-icon.png" w={40} fallbackSrc="https://placehold.co/40x40" />
                            </Box>
                            <Stack gap={0}>
                                <Title order={3} fw={800} tt="uppercase">Orden de Trabajo</Title>
                                <Text size="xl" fw={900}>OT {selectedOT?.otNumber || 'N/A'}</Text>
                                <Text size="sm" fw={700} c="blue.1">{selectedOT?.cliente}</Text>
                            </Stack>
                        </Group>
                        <Group>
                            <Button
                                variant="white"
                                color="dark"
                                size="xs"
                                leftSection={<IconPrinter size={16} />}
                                onClick={handlePrintFicha}
                                disabled={!selectedOT?.id || detailLoading}
                            >
                                Imprimir
                            </Button>
                            <Button
                                variant="filled"
                                color="red"
                                size="xs"
                                leftSection={<IconDeviceFloppy size={16} />}
                                onClick={() => {
                                    closePreview();
                                    close();
                                }}
                            >
                                Guardar y Salir
                            </Button>
                        </Group>
                    </Group>
                </Box>

                <ScrollArea.Autosize mah="calc(100vh - 180px)" type="auto">
                    <Box p="lg" pos="relative">
                        {detailLoading && (
                            <Box
                                pos="absolute"
                                top={0}
                                left={0}
                                right={0}
                                bottom={0}
                                style={{
                                    zIndex: 10,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(15, 23, 42, 0.55)',
                                    borderRadius: 8
                                }}
                            >
                                <Loader color="indigo" />
                            </Box>
                        )}
                        <Grid gutter="xl">
                            {/* Section 1: Descripción del Diseño */}
                            <Grid.Col span={8}>
                                <Paper withBorder p="md" bg="rgba(255,255,255,0.02)" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                    <Divider label="Descripción del diseño" labelPosition="left" mb="md" styles={{ label: { color: '#6366f1', fontWeight: 800 } }} />
                                    <Grid gutter="xs">
                                        <Grid.Col span={3}><TextInput label="No. de OT" value={selectedOT?.otNumber} readOnly variant="filled" size="xs" /></Grid.Col>
                                        <Grid.Col span={4}><TextInput label="Fecha" value={selectedOT?.createdAt ? new Date(selectedOT.createdAt).toLocaleDateString() : ''} readOnly variant="filled" size="xs" /></Grid.Col>
                                        <Grid.Col span={2}><TextInput label="Fuelle" value={selectedOT?.fuelle || 0} readOnly variant="filled" size="xs" /></Grid.Col>
                                        <Grid.Col span={3}><TextInput label="Nombre Pieza" value={selectedOT?.partName} readOnly variant="filled" size="xs" /></Grid.Col>

                                        <Grid.Col span={5}>
                                            <Group gap="xs" grow>
                                                <TextInput label="Ancho" value={selectedOT?.ancho || 0} readOnly variant="filled" size="xs" />
                                                <TextInput label="Largo" value={selectedOT?.largo || 0} readOnly variant="filled" size="xs" />
                                                <TextInput label="Fondo" value={selectedOT?.alto || 0} readOnly variant="filled" size="xs" />
                                            </Group>
                                        </Grid.Col>
                                        <Grid.Col span={3}><TextInput label="Alto Pliego" value={selectedOT?.altoPliego || 0} readOnly variant="filled" size="xs" styles={{ label: { color: 'red' } }} /></Grid.Col>
                                        <Grid.Col span={4}><TextInput label="Ancho Pliego" value={selectedOT?.anchoPliego || 0} readOnly variant="filled" size="xs" styles={{ label: { color: 'red' } }} /></Grid.Col>

                                        <Grid.Col span={2}><TextInput label="Cabida" value={selectedOT?.cabida || '1.00'} readOnly variant="filled" size="xs" /></Grid.Col>
                                        <Grid.Col span={10}>
                                            <Stack gap={2}>
                                                <Text size="xs" fw={700}>Notas de Diseño</Text>
                                                <Paper bg="rgba(0,0,0,0.3)" p="xs" radius="xs" style={{ minHeight: 60, border: '1px solid rgba(255,255,255,0.1)' }}>
                                                    <Text size="xs">{selectedOT?.notas || 'Sin notas'}</Text>
                                                </Paper>
                                            </Stack>
                                        </Grid.Col>
                                    </Grid>
                                </Paper>
                            </Grid.Col>

                            {/* Adjuntos Section */}
                            <Grid.Col span={4}>
                                <Paper withBorder p="md" bg="rgba(255,255,255,0.02)" h="100%" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                    <Group justify="space-between" mb="xs">
                                        <Text size="xs" fw={800} c="blue.3">Ampliaciones / Adjuntos</Text>
                                    </Group>
                                    <SimpleGrid cols={2}>
                                        <Stack gap="xs" align="stretch">
                                            <Text size="10px" fw={700} c="dimmed" tt="uppercase">
                                                Arte 1 (ampliación)
                                            </Text>
                                            {urlArte1 ? (
                                                <Box
                                                    onClick={() => openImagePreview(urlArte1)}
                                                    style={{
                                                        cursor: 'zoom-in',
                                                        borderRadius: 8,
                                                        overflow: 'hidden',
                                                        border: '1px solid rgba(255,255,255,0.12)',
                                                        background: 'rgba(0,0,0,0.2)'
                                                    }}
                                                >
                                                    <Image
                                                        src={absoluteUploadUrl(urlArte1)}
                                                        alt="Ampliación"
                                                        mah={200}
                                                        maw="100%"
                                                        mx="auto"
                                                        fit="contain"
                                                        fallbackSrc="https://placehold.co/200x120/0f172a/94a3b8?text=Imagen"
                                                    />
                                                </Box>
                                            ) : (
                                                <FileInput
                                                    placeholder="Subir ampliación"
                                                    accept="image/*"
                                                    leftSection={<IconUpload size={14} />}
                                                    disabled={uploading || detailLoading}
                                                    size="xs"
                                                    clearable
                                                    styles={{
                                                        input: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }
                                                    }}
                                                    onChange={(file) => file && handleUploadAttachment(file, 'ampliaciones')}
                                                />
                                            )}
                                        </Stack>
                                        <Stack gap="xs" align="stretch">
                                            <Text size="10px" fw={700} c="dimmed" tt="uppercase">
                                                Arte 2 (adjunto)
                                            </Text>
                                            {urlArte2 ? (
                                                <Box
                                                    onClick={() => openImagePreview(urlArte2)}
                                                    style={{
                                                        cursor: 'zoom-in',
                                                        borderRadius: 8,
                                                        overflow: 'hidden',
                                                        border: '1px solid rgba(255,255,255,0.12)',
                                                        background: 'rgba(0,0,0,0.2)'
                                                    }}
                                                >
                                                    <Image
                                                        src={absoluteUploadUrl(urlArte2)}
                                                        alt="Adjunto"
                                                        mah={200}
                                                        maw="100%"
                                                        mx="auto"
                                                        fit="contain"
                                                        fallbackSrc="https://placehold.co/200x120/0f172a/94a3b8?text=Imagen"
                                                    />
                                                </Box>
                                            ) : (
                                                <FileInput
                                                    placeholder="Subir adjunto"
                                                    accept="image/*"
                                                    leftSection={<IconUpload size={14} />}
                                                    disabled={uploading || detailLoading}
                                                    size="xs"
                                                    clearable
                                                    styles={{
                                                        input: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }
                                                    }}
                                                    onChange={(file) => file && handleUploadAttachment(file, 'adjuntos')}
                                                />
                                            )}
                                        </Stack>
                                    </SimpleGrid>
                                </Paper>
                            </Grid.Col>

                            {/* Row 2: Materiales, Troquel, Tintas */}
                            <Grid.Col span={4}>
                                <Paper withBorder p="md" bg="rgba(255,255,255,0.02)" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                    <Divider label="Materiales" labelPosition="left" mb="sm" styles={{ label: { color: '#6366f1', fontWeight: 800 } }} />
                                    <Stack gap="xs">
                                        <TextInput label="Sustrato" value={selectedOT?.sustratoSup || 'No definido'} readOnly variant="filled" size="xs" />
                                        <TextInput label="Fibra" value={selectedOT?.direccionFibra || 'N/A'} readOnly variant="filled" size="xs" />
                                    </Stack>
                                </Paper>
                            </Grid.Col>

                            <Grid.Col span={4}>
                                <Paper withBorder p="md" bg="rgba(255,255,255,0.02)" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                    <Divider label="Troquel" labelPosition="left" mb="sm" styles={{ label: { color: '#6366f1', fontWeight: 800 } }} />
                                    <Group grow>
                                        <TextInput label="Código" value={selectedOT?.codigoTroquel || 'N/A'} readOnly variant="filled" size="xs" />
                                        <Checkbox label="Troquel Nuevo" checked={selectedOT?.troquelNuevo} readOnly pt="lg" size="xs" />
                                    </Group>
                                </Paper>
                            </Grid.Col>

                            <Grid.Col span={4}>
                                <Paper withBorder p="md" bg="rgba(255,255,255,0.02)" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                    <Divider label="Tintas" labelPosition="left" mb="sm" styles={{ label: { color: '#6366f1', fontWeight: 800 } }} />
                                    <Group gap="md" align="center">
                                        <PlanDisenoTintInkMark letter="C" inkKey="c" checked={!!selectedOT?.tintaC} />
                                        <PlanDisenoTintInkMark letter="M" inkKey="m" checked={!!selectedOT?.tintaM} />
                                        <PlanDisenoTintInkMark letter="Y" inkKey="y" checked={!!selectedOT?.tintaY} />
                                        <PlanDisenoTintInkMark letter="K" inkKey="k" checked={!!selectedOT?.tintaK} />
                                        <Text size="xs" fw={700}>
                                            Especial: {selectedOT?.tintasEspeciales || '0'}
                                        </Text>
                                    </Group>
                                </Paper>
                            </Grid.Col>

                            {/* Row 3: Proceso y Entrega */}
                            <Grid.Col span={8}>
                                <Paper withBorder p="md" bg="rgba(255,255,255,0.02)" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                    <Divider label="Proceso de Fabricación" labelPosition="left" mb="sm" styles={{ label: { color: '#6366f1', fontWeight: 800 } }} />
                                    <Table size="xs" styles={{ th: { color: '#94a3b8' }, td: { color: '#e2e8f0' } }}>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Máquina</Table.Th>
                                                <Table.Th>Proceso</Table.Th>
                                                <Table.Th>Capacidad</Table.Th>
                                                <Table.Th>Cambio</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {procesosFab.length > 0 ? procesosFab.map((proc, idx) => (
                                                <Table.Tr key={idx}>
                                                    <Table.Td>{proc.machine}</Table.Td>
                                                    <Table.Td>{proc.process}</Table.Td>
                                                    <Table.Td>{proc.capacity}</Table.Td>
                                                    <Table.Td>{proc.equiv}</Table.Td>
                                                </Table.Tr>
                                            )) : (
                                                <Table.Tr><Table.Td colSpan={4}><Text size="xs" c="dimmed" ta="center">Sin procesos definidos</Text></Table.Td></Table.Tr>
                                            )}
                                        </Table.Tbody>
                                    </Table>
                                </Paper>
                            </Grid.Col>

                            <Grid.Col span={4}>
                                <Paper withBorder p="md" bg="rgba(255,255,255,0.02)" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                    <Divider label="Condiciones de Entrega" labelPosition="left" mb="sm" styles={{ label: { color: '#6366f1', fontWeight: 800 } }} />
                                    <Stack gap={4}>
                                        <Checkbox label="Remisión" checked={selectedOT?.condicionRemision} readOnly size="xs" />
                                        <Checkbox label="Certificado Calidad" checked={selectedOT?.condicionCertificado} readOnly size="xs" />
                                        <Checkbox label="Factura" checked={selectedOT?.condicionFactura} readOnly size="xs" />
                                        <Checkbox label="Orden Compra" checked={selectedOT?.condicionOrdenCompra} readOnly size="xs" />
                                    </Stack>
                                </Paper>
                            </Grid.Col>
                        </Grid>
                    </Box>
                </ScrollArea.Autosize>

                <Box p="sm" bg="rgba(0,0,0,0.3)" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <Group justify="center" gap="xl">
                        <Button variant="subtle" size="xs"> {"<<< Pieza Anterior"} </Button>
                        <Text size="sm" fw={800} c="blue.4">{"Pieza Siguiente >>>"}</Text>
                        <Button variant="outline" color="indigo" size="xs">Nueva Pieza</Button>
                    </Group>
                </Box>
            </Modal>

            <Modal
                opened={previewOpened}
                onClose={closePreview}
                title="Vista ampliada"
                centered
                size="xl"
                overlayProps={{ backgroundOpacity: 0.65, blur: 4 }}
                styles={{ content: { background: '#0f172a', color: '#fff' } }}
            >
                {previewUrl ? (
                    <Box style={{ textAlign: 'center' }}>
                        <img
                            src={previewUrl}
                            alt="Vista previa"
                            style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: 8 }}
                        />
                    </Box>
                ) : null}
            </Modal>

            <Modal
                opened={editorOpened}
                onClose={closeEditor}
                title="Editar prioridad y diseñador"
                centered
                size="sm"
            >
                <Stack gap="sm">
                    <Select
                        label="Prioridad"
                        data={['Baja', 'Normal', 'Alta', 'Urgente']}
                        value={editPrioridad}
                        onChange={(value) => setEditPrioridad(value || 'Normal')}
                    />
                    <Select
                        label="Diseñador"
                        placeholder="Selecciona diseñador"
                        data={[
                            { value: 'Juan', label: 'Juan' },
                            { value: 'Karen', label: 'Karen' },
                            { value: 'Otro', label: 'Otro (personalizado)' }
                        ]}
                        value={editDesignerOption}
                        onChange={(value) => setEditDesignerOption(value || '')}
                        clearable
                    />
                    {editDesignerOption === 'Otro' && (
                        <TextInput
                            label="Nuevo diseñador"
                            placeholder="Escribe el nombre"
                            value={editDesignerCustom}
                            onChange={(e) => setEditDesignerCustom(e.currentTarget.value)}
                        />
                    )}
                    <Group justify="flex-end" mt="xs">
                        <Button variant="default" onClick={closeEditor} disabled={editSaving}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveQuickEditor} loading={editSaving}>
                            Guardar cambios
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Stack>
    );
}
