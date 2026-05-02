import {
    Card,
    Title,
    Text,
    Group,
    Button,
    Stack,
    Select,
    TextInput,
    NumberInput,
    SimpleGrid,
    Box,
    ThemeIcon,
    Divider,
    Alert,
    ActionIcon,
    Checkbox,
    Textarea,
    Table,
    ScrollArea,
    rem as mantineRem,
    Autocomplete,
    Loader,
    FileInput
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
    IconArrowRight,
    IconX,
    IconLayoutGrid,
    IconUser,
    IconBuildingStore,
    IconCalendar,
    IconCheck,
    IconAlertCircle,
    IconBarcode,
    IconPrinter,
    IconDeviceFloppy,
    IconArrowLeft,
    IconScissors,
    IconPalette,
    IconHandStop,
    IconClipboardCheck,
    IconSettings,
    IconZoomIn,
    IconPaperclip,
    IconMaximize,
    IconChevronLeft,
    IconChevronRight,
    IconTrash,
    IconPhoto
} from '@tabler/icons-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';

/** Lista alineada con Xpertis — ejecutivo de cuenta */
const EJECUTIVOS_CUENTA_BASE = [
    'Claude Levy',
    'Facturación',
    'Diseño',
    'Producción',
    'Nohora Ortiz',
    'Contabilidad',
    'Juan Prada',
    'Almacén',
    'Digitación',
    'Jose Camilo Velasco',
    'Gestion',
    'Jaime Patiño',
    'Eithan Levy',
];

const NUEVO_EJECUTIVO_VALUE = '__nuevo_ejecutivo__';
const NUEVA_LINEA_PT_VALUE = '__nueva_linea_pt__';

export default function NuevaOT() {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Form State aligned with Backend
    const [formData, setFormData] = useState({
        otNumber: '',
        createdBy: user.username || '',
        cliente: '',
        ejecutivoCuenta: '',
        fechaSolicitud: new Date(),
        asignacion: 'Otro',
        lineaPT: 'Bolsa',
        numeroPartes: 1,
        productCode: '',
        productName: '',
        status: 'Borrador',
        parts: [
            {
                partName: 'Pieza Unica',
                sustratoSup: '', sustratoMed: '', sustratoInf: '',
                direccionFibra: 'Vertical', tipoFlauta: 'Ninguna', direccionFlauta: '',
                alto: 0, largo: 0, ancho: 0, fuelle: 0,
                cabida: '', altoPliego: 0, anchoPliego: 0,
                manijaTipo: '', manijaRef: '', manijaLargo: 0,
                troquelNuevo: true, codigoTroquel: '',
                tintaC: false, tintaM: false, tintaY: false, tintaK: false,
                tintasEspeciales: '', terminado1: '', terminado2: '',
                estampado: false, pieImprenta: '', notas: '',
                condicionRemision: true, condicionCertificado: false,
                condicionFactura: true, condicionOrdenCompra: false,
                fabricationProcessesJson: JSON.stringify([
                    { machine: '01a Convertidora', process: 'Corte', capacity: 20000, equiv: 2000 },
                    { machine: '01b Convertidora', process: 'Corte', capacity: 20000, equiv: 2000 },
                    { machine: '02a Guillotina A', process: 'Corte', capacity: 40000, equiv: 1 },
                    { machine: '03 Sordz 72', process: 'Impresión', capacity: 20000, equiv: 2000 }
                ]),
                adjuntosJson: '[]'
            }
        ]
    });

    const [errors, setErrors] = useState({});
    const [isDuplicate, setIsDuplicate] = useState(false);
    const [loading, setLoading] = useState(false);
    /** Archivos pendientes por índice de pieza; se envían tras crear la OT */
    const [stagedAttachments, setStagedAttachments] = useState({});
    const [lineaOptions, setLineaOptions] = useState(['Bolsa', 'Caja o plegadiza', 'Empaque Flexible', 'Otro']);

    const [ejecutivosExtra, setEjecutivosExtra] = useState([]);
    const [pendingNuevoEjecutivo, setPendingNuevoEjecutivo] = useState(false);
    const [nuevoEjecutivoDraft, setNuevoEjecutivoDraft] = useState('');

    const [clienteSuggestions, setClienteSuggestions] = useState([]);
    const [clienteSuggestLoading, setClienteSuggestLoading] = useState(false);

    const [pendingNuevaLineaPT, setPendingNuevaLineaPT] = useState(false);
    const [nuevaLineaDraft, setNuevaLineaDraft] = useState('');
    const lineaPTBackupRef = useRef(null);

    const ejecutivoSelectData = useMemo(() => {
        const seen = new Set();
        const items = [];
        for (const label of [...EJECUTIVOS_CUENTA_BASE, ...ejecutivosExtra]) {
            if (label && !seen.has(label)) {
                seen.add(label);
                items.push({ value: label, label });
            }
        }
        items.push({ value: NUEVO_EJECUTIVO_VALUE, label: '➕ Nuevo ejecutivo…' });
        return items;
    }, [ejecutivosExtra]);

    const lineaSelectData = useMemo(() => {
        const items = lineaOptions.map((l) => ({ value: l, label: l }));
        items.push({ value: NUEVA_LINEA_PT_VALUE, label: '➕ Nuevo elemento…' });
        return items;
    }, [lineaOptions]);

    useEffect(() => {
        const fetchNextNumber = async () => {
            try {
                const nextNo = await api.get('/production/orders/next-number');
                if (nextNo) {
                    setFormData(prev => ({ ...prev, otNumber: nextNo }));
                }
            } catch (err) {
                console.error("Error fetching next OT number", err);
            }
        };
        fetchNextNumber();
    }, []);

    // Check duplicate by Number
    useEffect(() => {
        if (formData.otNumber.length > 2) {
            // Uniqueness check for OT number could go here
        }
    }, [formData.otNumber]);

    useEffect(() => {
        if (formData.cliente.length > 3 && formData.productName.length > 3) {
            const checkDuplicate = async () => {
                try {
                    const exists = await api.get(`/production/orders/check-duplicate?cliente=${encodeURIComponent(formData.cliente)}&productName=${encodeURIComponent(formData.productName)}`);
                    setIsDuplicate(exists);
                    if (exists) {
                        setErrors(prev => ({ ...prev, productName: 'Ya existe una OT para este cliente con la misma referencia.' }));
                    } else {
                        setErrors(prev => ({ ...prev, productName: null }));
                    }
                } catch (err) {
                    console.error("Error checking duplication", err);
                }
            };
            const timer = setTimeout(checkDuplicate, 800);
            return () => clearTimeout(timer);
        }
    }, [formData.cliente, formData.productName]);

    useEffect(() => {
        const term = (formData.cliente || '').trim();
        if (term.length < 1) {
            setClienteSuggestions([]);
            return;
        }
        const handle = setTimeout(async () => {
            setClienteSuggestLoading(true);
            try {
                const rows = await api.get(
                    `/production/orders/clients-suggestions?q=${encodeURIComponent(term)}&limit=30`
                );
                setClienteSuggestions(Array.isArray(rows) ? rows : []);
            } catch (err) {
                console.error('Error sugerencias cliente', err);
                setClienteSuggestions([]);
            } finally {
                setClienteSuggestLoading(false);
            }
        }, 320);
        return () => clearTimeout(handle);
    }, [formData.cliente]);

    const validateStep1 = () => {
        const newErrors = {};
        if (!formData.otNumber) newErrors.otNumber = 'El número de OT es obligatorio';
        if (!formData.cliente) newErrors.cliente = 'El cliente es obligatorio';
        if (!formData.ejecutivoCuenta) newErrors.ejecutivoCuenta = 'El ejecutivo es obligatorio';
        if (!formData.productName) newErrors.productName = 'El nombre del producto es obligatorio';
        if (isDuplicate) newErrors.productName = 'Duplicado detectado';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep1()) {
            setActiveStep(1);
        }
    };

    const handleBack = () => {
        setErrors({});
        setActiveStep(0);
    };

    const updateStagedAttachments = (partIdx, field, files) => {
        const list = files == null ? [] : Array.isArray(files) ? files : [files];
        setStagedAttachments((prev) => {
            const cur = prev[partIdx] || { ampliaciones: [], adjuntos: [] };
            return {
                ...prev,
                [partIdx]: { ...cur, [field]: list },
            };
        });
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const result = await api.post('/production/orders', formData);

            if (!result) {
                return;
            }

            const orderId = result.id ?? result.Id;
            const partsResp = result.parts ?? result.Parts ?? [];
            const uploadErrors = [];

            if (orderId) {
                for (let pi = 0; pi < formData.parts.length; pi++) {
                    const st = stagedAttachments[pi];
                    if (!st?.ampliaciones?.length && !st?.adjuntos?.length) continue;
                    const partId = partsResp[pi]?.id ?? partsResp[pi]?.Id;
                    if (!partId) {
                        uploadErrors.push(`Pieza ${pi + 1}: no se recibió el id de la pieza para adjuntos.`);
                        continue;
                    }

                    const uploadBatch = async (category, files) => {
                        if (!files?.length) return;
                        const fd = new FormData();
                        fd.append('category', category);
                        fd.append('partId', partId);
                        for (const f of files) {
                            fd.append('files', f, f.name);
                        }
                        await api.postFormData(`/production/orders/${orderId}/attachments`, fd);
                    };

                    try {
                        await uploadBatch('ampliaciones', st.ampliaciones);
                    } catch (e) {
                        uploadErrors.push(`Ampliaciones (pieza ${pi + 1}): ${e.message || e}`);
                    }
                    try {
                        await uploadBatch('adjuntos', st.adjuntos);
                    } catch (e) {
                        uploadErrors.push(`Adjuntos (pieza ${pi + 1}): ${e.message || e}`);
                    }
                }
            }

            if (uploadErrors.length) {
                alert('La orden se guardó. Revise los adjuntos:\n\n' + uploadErrors.join('\n'));
            } else {
                alert('¡Orden de Trabajo guardada con éxito!');
            }
            navigate('/ordenes/lista');
        } catch (error) {
            console.error("Error saving OT", error);
            alert('Error al guardar: ' + (error.message || 'Error desconocido'));
        } finally {
            setLoading(false);
        }
    };

    const calendarStyles = {
        input: {
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white',
            '&:focus': {
                borderColor: '#6366f1',
                background: 'rgba(255, 255, 255, 0.08)',
            }
        },
        dropdown: {
            background: 'rgba(20, 30, 50, 0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            borderRadius: '16px',
            padding: '12px',
        },
        calendarHeaderControl: {
            color: 'white',
            borderRadius: '10px',
            '&:hover': {
                background: 'rgba(255, 255, 255, 0.1)',
            }
        },
        calendarHeaderLevel: {
            color: 'white',
            fontWeight: 800,
            fontSize: '15px',
            borderRadius: '10px',
            '&:hover': {
                background: 'rgba(255, 255, 255, 0.1)',
            }
        },
        weekday: {
            color: '#6366f1',
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '1px',
        },
        day: {
            color: '#e2e8f0',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&[data-selected]': {
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                color: 'white',
                fontWeight: 800,
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
            },
            '&[data-outside]': {
                color: '#475569',
            },
            '&:hover:not([data-selected])': {
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                transform: 'translateY(-1px)',
            }
        }
    };

    const rem = (px) => `${px / 16}rem`;

    // --- STEP 1: CLASE Y LINEA DE DISEÑO ---
    const renderStep1 = () => (
        <Stack gap="xl">
            <Card
                p={0}
                style={{
                    background: 'linear-gradient(90deg, #1e293b 0%, #334155 100%)',
                    overflow: 'hidden',
                    border: 'none',
                    borderRadius: '16px'
                }}
            >
                <Group justify="space-between" align="center" p="xl">
                    <Stack gap={4}>
                        <Title order={2} c="white">
                            Orden de trabajo {formData.otNumber || '…'}
                        </Title>
                        <Text size="sm" c="dimmed">Clase y Línea de Diseño</Text>
                    </Stack>
                    <Group gap="md">
                        <Button
                            variant="subtle"
                            color="indigo.1"
                            leftSection={<IconLayoutGrid size={18} />}
                            styles={{ label: { fontWeight: 700 } }}
                            onClick={() => navigate('/ordenes/lista')}
                        >
                            Diseños creados
                        </Button>
                        <Group gap="xs">
                            <Button
                                variant="filled"
                                color="indigo"
                                rightSection={<IconArrowRight size={18} />}
                                radius="md"
                                onClick={handleNext}
                            >
                                Siguiente
                            </Button>
                            <ActionIcon
                                variant="light"
                                color="red"
                                size="lg"
                                onClick={() => navigate('/')}
                            >
                                <IconX size={20} />
                            </ActionIcon>
                        </Group>
                    </Group>
                </Group>
            </Card>

            <SimpleGrid cols={{ base: 1, md: 5 }} spacing="xl">
                {/* Main Form Sidebar/Info */}
                <Stack style={{ gridColumn: 'span 2' }}>
                    <Card className="glass-card" p="xl" style={{ borderLeft: '4px solid #6366f1' }}>
                        <Title order={4} c="white" mb="md">Validación de OT</Title>
                        <TextInput
                            label="Consecutivo de OT"
                            placeholder="Generando..."
                            size="md"
                            mb="md"
                            value={formData.otNumber}
                            readOnly
                            variant="filled"
                            styles={{ input: { color: '#6366f1', fontWeight: 800, background: 'rgba(99, 102, 241, 0.05)' } }}
                            leftSection={<IconBarcode size={16} />}
                        />
                        <Autocomplete
                            label="Razon Social del Cliente"
                            placeholder="Escriba para buscar clientes guardados…"
                            size="md"
                            value={formData.cliente}
                            onChange={(val) => setFormData((prev) => ({ ...prev, cliente: val }))}
                            data={clienteSuggestions}
                            limit={30}
                            filter={({ options }) => options}
                            maxDropdownHeight={280}
                            error={errors.cliente}
                            required
                            leftSection={<IconBuildingStore size={16} />}
                            rightSection={clienteSuggestLoading ? <Loader size={16} /> : null}
                            comboboxProps={{ withinPortal: true, position: 'bottom-start' }}
                            variant="filled"
                        />
                        {isDuplicate && (
                            <Alert icon={<IconAlertCircle size={16} />} title="Duplicado Detectado" color="red" mt="md" variant="light">
                                Ya existe una orden para este cliente con la misma referencia.
                            </Alert>
                        )}
                    </Card>

                    <Card className="glass-card" p="xl">
                        <Stack gap="sm">
                            <Select
                                label="Ejecutivo de cuenta"
                                placeholder="Seleccione ejecutivo..."
                                leftSection={<IconUser size={16} />}
                                data={ejecutivoSelectData}
                                searchable
                                clearable
                                nothingFoundMessage="Sin coincidencias"
                                value={
                                    pendingNuevoEjecutivo
                                        ? NUEVO_EJECUTIVO_VALUE
                                        : (formData.ejecutivoCuenta || null)
                                }
                                onChange={handleEjecutivoSelectChange}
                                error={errors.ejecutivoCuenta}
                                required
                                variant="filled"
                                comboboxProps={{ withinPortal: true, position: 'bottom-start' }}
                                maxDropdownHeight={280}
                            />
                            {pendingNuevoEjecutivo && (
                                <Stack gap="xs" p="sm" style={{ borderRadius: 8, background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                                    <Text size="xs" fw={600} c="indigo.3">
                                        Ingrese el nombre del nuevo ejecutivo
                                    </Text>
                                    <TextInput
                                        placeholder="Ej. María López — Comercial"
                                        value={nuevoEjecutivoDraft}
                                        onChange={(e) => setNuevoEjecutivoDraft(e.currentTarget.value)}
                                        variant="filled"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                confirmarNuevoEjecutivo();
                                            }
                                        }}
                                        autoFocus
                                    />
                                    <Group gap="xs" justify="flex-end">
                                        <Button variant="subtle" color="gray" size="compact-sm" onClick={cancelarNuevoEjecutivo}>
                                            Cancelar
                                        </Button>
                                        <Button variant="filled" color="indigo" size="compact-sm" onClick={confirmarNuevoEjecutivo}>
                                            Usar este nombre
                                        </Button>
                                    </Group>
                                </Stack>
                            )}

                            <DateInput
                                label="Fecha de solicitud"
                                placeholder="Seleccione fecha..."
                                leftSection={<IconCalendar size={16} />}
                                variant="filled"
                                locale="es"
                                value={formData.fechaSolicitud}
                                onChange={(val) => setFormData({ ...formData, fechaSolicitud: val })}
                                error={errors.fechaSolicitud}
                                required
                                styles={calendarStyles}
                                popoverProps={{ shadow: 'xl', position: 'bottom-start' }}
                                nextIcon={<IconChevronRight size={16} />}
                                previousIcon={<IconChevronLeft size={16} />}
                                hideOutsideDates
                            />
                            <Select
                                label="Asignación"
                                placeholder="Tipo de asignación"
                                data={['Diseño', 'Repetición', 'Otro']}
                                value={formData.asignacion}
                                onChange={(val) => setFormData({ ...formData, asignacion: val })}
                                variant="filled"
                            />
                        </Stack>
                    </Card>
                </Stack>

                {/* Second Section: Detalle del Diseño */}
                <Card className="glass-card" p="xl" style={{ gridColumn: 'span 3' }}>
                    <Group gap="xs" mb="lg">
                        <ThemeIcon variant="light" color="indigo" size="md">
                            <IconLayoutGrid size={18} />
                        </ThemeIcon>
                        <Title order={3} c="white">Detalle del Diseño</Title>
                    </Group>

                    <Stack gap="xl">
                        <Group align="flex-end" grow>
                            <Stack gap="sm" style={{ flex: 1 }}>
                                <Select
                                    label="Linea de PT"
                                    placeholder="Seleccione línea..."
                                    data={lineaSelectData}
                                    value={
                                        pendingNuevaLineaPT
                                            ? NUEVA_LINEA_PT_VALUE
                                            : (formData.lineaPT || null)
                                    }
                                    onChange={handleLineaPTSelectChange}
                                    variant="filled"
                                    size="md"
                                    searchable
                                    nothingFoundMessage="Sin coincidencias"
                                    comboboxProps={{ withinPortal: true, position: 'bottom-start' }}
                                    maxDropdownHeight={280}
                                />
                                {pendingNuevaLineaPT && (
                                    <Stack gap="xs" p="sm" style={{ borderRadius: 8, background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                                        <Text size="xs" fw={600} c="indigo.3">
                                            Ingrese el nombre de la nueva línea de PT
                                        </Text>
                                        <TextInput
                                            placeholder="Ej. Etiqueta, Flow pack…"
                                            value={nuevaLineaDraft}
                                            onChange={(e) => setNuevaLineaDraft(e.currentTarget.value)}
                                            variant="filled"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    confirmarNuevaLineaPT();
                                                }
                                            }}
                                            autoFocus
                                        />
                                        <Group gap="xs" justify="flex-end">
                                            <Button variant="subtle" color="gray" size="compact-sm" onClick={cancelarNuevaLineaPT}>
                                                Cancelar
                                            </Button>
                                            <Button variant="filled" color="indigo" size="compact-sm" onClick={confirmarNuevaLineaPT}>
                                                Agregar línea
                                            </Button>
                                        </Group>
                                    </Stack>
                                )}
                            </Stack>
                        </Group>

                        <SimpleGrid cols={2}>
                            <NumberInput
                                label="N partes de OT"
                                value={formData.numeroPartes}
                                onChange={(val) => setFormData({ ...formData, numeroPartes: val })}
                                min={1}
                                variant="filled"
                                size="md"
                            />
                            <TextInput
                                label="Codigo SAP"
                                placeholder="Referencia ERP..."
                                leftSection={<IconBarcode size={16} />}
                                value={formData.productCode}
                                onChange={(e) => setFormData({ ...formData, productCode: e.currentTarget.value })}
                                variant="filled"
                                size="md"
                            />
                        </SimpleGrid>

                        <TextInput
                            label="Nombre del producto y referencia"
                            placeholder="Nombre descriptivo de la orden..."
                            variant="filled"
                            size="lg"
                            value={formData.productName}
                            onChange={(e) => setFormData({ ...formData, productName: e.currentTarget.value })}
                            error={errors.productName}
                            required
                            styles={{
                                input: {
                                    borderBottom: '2px solid #6366f1',
                                    background: 'rgba(255,255,255,0.03)'
                                }
                            }}
                        />

                        <Divider opacity={0.1} label="Información Adicional" labelPosition="center" />

                        <SimpleGrid cols={2} spacing="xl">
                            <Box>
                                <Text size="sm" fw={700} c="indigo.3" mb={4}>Estado de Flujo</Text>
                                <Text size="sm" c="dimmed">{isDuplicate ? 'Diseño Existente (Posible Repetición)' : 'Nuevo Diseño'}</Text>
                            </Box>
                            <Box style={{ textAlign: 'right' }}>
                                <Text size="xs" c="dimmed">Perla v1.0.0 | Módulo de Ordenes de Trabajo</Text>
                            </Box>
                        </SimpleGrid>
                    </Stack>
                </Card>
            </SimpleGrid>
        </Stack>
    );

    const [currentPartIndex, setCurrentPartIndex] = useState(0);

    const updatePartField = (field, value) => {
        const newParts = [...formData.parts];
        newParts[currentPartIndex] = { ...newParts[currentPartIndex], [field]: value };
        setFormData({ ...formData, parts: newParts });
    };

    const handleEjecutivoSelectChange = (val) => {
        if (val === null || val === '') {
            setPendingNuevoEjecutivo(false);
            setNuevoEjecutivoDraft('');
            setFormData((prev) => ({ ...prev, ejecutivoCuenta: '' }));
            return;
        }
        if (val === NUEVO_EJECUTIVO_VALUE) {
            setPendingNuevoEjecutivo(true);
            setNuevoEjecutivoDraft('');
            setFormData((prev) => ({ ...prev, ejecutivoCuenta: '' }));
            return;
        }
        setPendingNuevoEjecutivo(false);
        setNuevoEjecutivoDraft('');
        setFormData((prev) => ({ ...prev, ejecutivoCuenta: val }));
    };

    const confirmarNuevoEjecutivo = () => {
        const nombre = nuevoEjecutivoDraft.trim();
        if (!nombre) return;
        setEjecutivosExtra((prev) => (prev.includes(nombre) ? prev : [...prev, nombre]));
        setFormData((prev) => ({ ...prev, ejecutivoCuenta: nombre }));
        setPendingNuevoEjecutivo(false);
        setNuevoEjecutivoDraft('');
    };

    const cancelarNuevoEjecutivo = () => {
        setPendingNuevoEjecutivo(false);
        setNuevoEjecutivoDraft('');
        setFormData((prev) => ({ ...prev, ejecutivoCuenta: '' }));
    };

    const handleLineaPTSelectChange = (val) => {
        if (val === null || val === '') {
            setPendingNuevaLineaPT(false);
            setNuevaLineaDraft('');
            setFormData((prev) => ({ ...prev, lineaPT: '' }));
            return;
        }
        if (val === NUEVA_LINEA_PT_VALUE) {
            lineaPTBackupRef.current = formData.lineaPT || 'Bolsa';
            setPendingNuevaLineaPT(true);
            setNuevaLineaDraft('');
            return;
        }
        setPendingNuevaLineaPT(false);
        setNuevaLineaDraft('');
        setFormData((prev) => ({ ...prev, lineaPT: val || prev.lineaPT }));
    };

    const confirmarNuevaLineaPT = () => {
        const name = nuevaLineaDraft.trim();
        if (!name) return;
        setLineaOptions((prev) => (prev.includes(name) ? prev : [...prev, name]));
        setFormData((prev) => ({ ...prev, lineaPT: name }));
        setPendingNuevaLineaPT(false);
        setNuevaLineaDraft('');
    };

    const cancelarNuevaLineaPT = () => {
        setPendingNuevaLineaPT(false);
        setNuevaLineaDraft('');
        const prev = lineaPTBackupRef.current;
        setFormData((fd) => ({ ...fd, lineaPT: prev && prev !== NUEVA_LINEA_PT_VALUE ? prev : 'Bolsa' }));
    };

    const addPart = () => {
        setFormData({
            ...formData,
            parts: [
                ...formData.parts,
                {
                    partName: `Pieza ${formData.parts.length + 1}`,
                    sustratoSup: '', sustratoMed: '', sustratoInf: '',
                    direccionFibra: 'Vertical', tipoFlauta: 'Ninguna', direccionFlauta: '',
                    alto: 0, largo: 0, ancho: 0, fuelle: 0,
                    cabida: '', altoPliego: 0, anchoPliego: 0,
                    manijaTipo: '', manijaRef: '', manijaLargo: 0,
                    troquelNuevo: true, codigoTroquel: '',
                    tintaC: false, tintaM: false, tintaY: false, tintaK: false,
                    tintasEspeciales: '', terminado1: '', terminado2: '',
                    estampado: false, pieImprenta: '', notas: '',
                    condicionRemision: true, condicionCertificado: false,
                    condicionFactura: true, condicionOrdenCompra: false,
                    fabricationProcessesJson: JSON.stringify([
                        { machine: '01a Convertidora', process: 'Corte', capacity: 20000, equiv: 2000 },
                        { machine: '01b Convertidora', process: 'Corte', capacity: 20000, equiv: 2000 },
                        { machine: '02a Guillotina A', process: 'Corte', capacity: 40000, equiv: 1 },
                        { machine: '03 Sordz 72', process: 'Impresión', capacity: 20000, equiv: 2000 }
                    ]),
                    adjuntosJson: '[]'
                }
            ],
            numeroPartes: formData.parts.length + 1
        });
        setCurrentPartIndex(formData.parts.length);
    };

    // --- STEP 2: DETALLE DE ORDEN DE TRABAJO ---
    const renderStep2 = () => {
        const currentPart = formData.parts[currentPartIndex] || {};
        const fabricationProcesses = JSON.parse(currentPart.fabricationProcessesJson || '[]');

        const cabidaForInput = (() => {
            if (currentPart.cabida === '' || currentPart.cabida == null) return undefined;
            const n = Number(String(currentPart.cabida).replace(',', '.'));
            return Number.isFinite(n) ? n : undefined;
        })();

        const staged = stagedAttachments[currentPartIndex] || { ampliaciones: [], adjuntos: [] };

        return (
            <Stack gap="xl">
                {/* Step 2 Header */}
                <Card p={0} style={{ background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)', border: 'none', borderRadius: '16px' }}>
                    <Group justify="space-between" align="center" p="xl">
                        <Stack gap={6}>
                            <Title order={2} c="white">
                                Orden de trabajo {formData.otNumber || '…'}
                            </Title>
                            <Text size="sm" c="indigo.2" fw={600}>{formData.productName || 'Sin nombre de producto'}</Text>
                            <Text size="sm" c="dimmed">Editando: {currentPart.partName || 'Pieza'} ({currentPartIndex + 1} de {formData.parts.length})</Text>
                        </Stack>
                        <Group gap="md">
                            <Button variant="filled" color="indigo" leftSection={<IconDeviceFloppy size={18} />} radius="md" onClick={handleSave} loading={loading}>Guardar OT</Button>
                            <ActionIcon variant="light" color="gray" size="lg" onClick={handleBack}><IconArrowLeft size={20} /></ActionIcon>
                        </Group>
                    </Group>
                </Card>

                <SimpleGrid cols={{ base: 1, lg: 12 }} spacing="xl">
                    {/* Left Area (8 cols) */}
                    <Box style={{ gridColumn: 'span 8' }}>
                        <Stack gap="xl">
                            {/* Descripción del diseño */}
                            <Card className="glass-card" p="xl">
                                <Divider
                                    label={`Orden de trabajo ${formData.otNumber || '…'}`}
                                    labelPosition="left"
                                    mb="md"
                                    styles={{ label: { color: '#6366f1', fontWeight: 800, fontSize: 16 } }}
                                />
                                <SimpleGrid cols={2} spacing="lg">
                                    <Stack gap="md">
                                        <TextInput
                                            label="Nombre de esta Pieza"
                                            value={currentPart.partName}
                                            onChange={(e) => updatePartField('partName', e.currentTarget.value)}
                                            variant="filled"
                                            required
                                        />
                                        <Group grow align="flex-end" gap="sm" wrap="nowrap">
                                            <NumberInput
                                                label="Fuelle"
                                                variant="filled"
                                                value={currentPart.fuelle}
                                                onChange={(val) => updatePartField('fuelle', val)}
                                                min={0}
                                                decimalScale={4}
                                            />
                                            <NumberInput
                                                label="Alto Pliego (mm)"
                                                variant="filled"
                                                value={currentPart.altoPliego}
                                                onChange={(val) => updatePartField('altoPliego', val)}
                                                min={0}
                                                decimalScale={4}
                                            />
                                            <NumberInput
                                                label="Ancho Pliego (mm)"
                                                variant="filled"
                                                value={currentPart.anchoPliego}
                                                onChange={(val) => updatePartField('anchoPliego', val)}
                                                min={0}
                                                decimalScale={4}
                                            />
                                        </Group>
                                        <NumberInput
                                            label="Cabida"
                                            variant="filled"
                                            value={cabidaForInput}
                                            onChange={(val) =>
                                                updatePartField(
                                                    'cabida',
                                                    val === undefined || val === '' ? '' : String(val)
                                                )
                                            }
                                            min={0}
                                            decimalScale={4}
                                        />
                                        <Stack gap={0}>
                                            <Text size="sm" fw={500} mb={4}>Dimensiones (mm): Alto x Ancho x Largo</Text>
                                            <Group grow align="flex-start" gap="xs">
                                                <NumberInput placeholder="Alto" variant="filled" value={currentPart.alto} onChange={(val) => updatePartField('alto', val)} min={0} decimalScale={4} />
                                                <NumberInput placeholder="Ancho" variant="filled" value={currentPart.ancho} onChange={(val) => updatePartField('ancho', val)} min={0} decimalScale={4} />
                                                <NumberInput placeholder="Largo" variant="filled" value={currentPart.largo} onChange={(val) => updatePartField('largo', val)} min={0} decimalScale={4} />
                                            </Group>
                                        </Stack>
                                    </Stack>
                                    <Stack gap="md">
                                        <Textarea
                                            label="Pie de imprenta / Notas"
                                            placeholder="Observaciones..."
                                            minRows={10}
                                            variant="filled"
                                            value={currentPart.notas}
                                            onChange={(e) => updatePartField('notas', e.currentTarget.value)}
                                        />
                                        <Text size="xs" c="dimmed" mb={4}>
                                            Solo imágenes. Se suben al guardar la OT.
                                        </Text>
                                        <FileInput
                                            label="Ampliaciones"
                                            description="Imágenes de ampliación (JPG, PNG, WebP…)"
                                            placeholder="Seleccionar imágenes"
                                            multiple
                                            clearable
                                            accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/tiff"
                                            value={staged.ampliaciones}
                                            onChange={(files) => updateStagedAttachments(currentPartIndex, 'ampliaciones', files)}
                                            leftSection={<IconPhoto size={18} />}
                                            variant="filled"
                                        />
                                        <FileInput
                                            label="Adjuntos"
                                            description="Imágenes adjuntas (JPG, PNG, WebP…)"
                                            placeholder="Seleccionar imágenes"
                                            multiple
                                            clearable
                                            accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/tiff"
                                            value={staged.adjuntos}
                                            onChange={(files) => updateStagedAttachments(currentPartIndex, 'adjuntos', files)}
                                            leftSection={<IconPhoto size={18} />}
                                            variant="filled"
                                        />
                                    </Stack>
                                </SimpleGrid>
                            </Card>

                            {/* Materiales y Flauta */}
                            <Card className="glass-card" p="xl">
                                <Divider label="Materiales y Configuración" labelPosition="left" mb="md" styles={{ label: { color: '#6366f1', fontWeight: 800, fontSize: 16 } }} />
                                <SimpleGrid cols={2} spacing="xl">
                                    <Stack gap="xs">
                                        <TextInput label="Sustrato superior" variant="filled" value={currentPart.sustratoSup} onChange={(e) => updatePartField('sustratoSup', e.currentTarget.value)} />
                                        <TextInput label="Sustrato inferior" variant="filled" value={currentPart.sustratoInf} onChange={(e) => updatePartField('sustratoInf', e.currentTarget.value)} />
                                        <TextInput label="Sustrato medio" variant="filled" value={currentPart.sustratoMed} onChange={(e) => updatePartField('sustratoMed', e.currentTarget.value)} />
                                    </Stack>
                                    <Stack gap="xs">
                                        <Select label="Fibra" variant="filled" data={['Horizontal', 'Vertical']} value={currentPart.direccionFibra} onChange={(val) => updatePartField('direccionFibra', val)} />
                                        <Select label="Tipo Flauta" variant="filled" data={['Ninguna', 'B', 'E', 'BC']} value={currentPart.tipoFlauta} onChange={(val) => updatePartField('tipoFlauta', val)} />
                                        <TextInput label="Dirección Flauta" variant="filled" value={currentPart.direccionFlauta || ''} onChange={(e) => updatePartField('direccionFlauta', e.currentTarget.value)} />
                                    </Stack>
                                </SimpleGrid>
                            </Card>

                            {/* Tintas, Troquel y Manija */}
                            <SimpleGrid cols={3} spacing="xl">
                                <Card className="glass-card" p="md">
                                    <Divider label="Tintas" labelPosition="left" mb="sm" styles={{ label: { color: '#6366f1', fontWeight: 700 } }} />
                                    <Stack gap="xs">
                                        <Group grow>
                                            <Checkbox label="C" checked={currentPart.tintaC} onChange={(e) => updatePartField('tintaC', e.currentTarget.checked)} color="cyan" />
                                            <Checkbox label="M" checked={currentPart.tintaM} onChange={(e) => updatePartField('tintaM', e.currentTarget.checked)} color="pink" />
                                        </Group>
                                        <Group grow>
                                            <Checkbox label="Y" checked={currentPart.tintaY} onChange={(e) => updatePartField('tintaY', e.currentTarget.checked)} color="yellow" />
                                            <Checkbox label="K" checked={currentPart.tintaK} onChange={(e) => updatePartField('tintaK', e.currentTarget.checked)} color="dark" />
                                        </Group>
                                        <TextInput label="Pantones" placeholder="485C..." variant="filled" value={currentPart.tintasEspeciales} onChange={(e) => updatePartField('tintasEspeciales', e.currentTarget.value)} />
                                    </Stack>
                                </Card>
                                <Card className="glass-card" p="md">
                                    <Divider label="Troquel" labelPosition="left" mb="sm" styles={{ label: { color: '#6366f1', fontWeight: 700 } }} />
                                    <Stack gap="xs">
                                        <Checkbox label="Troquel nuevo" checked={currentPart.troquelNuevo} onChange={(e) => updatePartField('troquelNuevo', e.currentTarget.checked)} />
                                        <TextInput label="Codigo" variant="filled" placeholder="N°..." value={currentPart.codigoTroquel} onChange={(e) => updatePartField('codigoTroquel', e.currentTarget.value)} />
                                    </Stack>
                                </Card>
                                <Card className="glass-card" p="md">
                                    <Divider label="Manija (Bolsas)" labelPosition="left" mb="sm" styles={{ label: { color: '#6366f1', fontWeight: 700 } }} />
                                    <Stack gap="xs">
                                        <TextInput label="Tipo" variant="filled" value={currentPart.manijaTipo} onChange={(e) => updatePartField('manijaTipo', e.currentTarget.value)} />
                                        <TextInput label="Ref" variant="filled" value={currentPart.manijaRef} onChange={(e) => updatePartField('manijaRef', e.currentTarget.value)} />
                                        <NumberInput label="Largo (cm)" variant="filled" value={currentPart.manijaLargo} onChange={(val) => updatePartField('manijaLargo', val)} />
                                    </Stack>
                                </Card>
                            </SimpleGrid>

                            {/* Proceso de Fabricación (Table) */}
                            <Card className="glass-card" p="xl">
                                <Group justify="space-between" mb="md">
                                    <Divider label="Proceso de Fabricación" labelPosition="left" styles={{ label: { color: '#6366f1', fontWeight: 800, fontSize: 16 } }} style={{ flex: 1 }} />
                                </Group>
                                <ScrollArea>
                                    <Table verticalSpacing="xs" striped highlightOnHover style={{ minWidth: 600 }}>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th style={{ color: '#94a3b8' }}>Maquina</Table.Th>
                                                <Table.Th style={{ color: '#94a3b8' }}>Proceso</Table.Th>
                                                <Table.Th style={{ color: '#94a3b8' }} align="right">Capacidad</Table.Th>
                                                <Table.Th style={{ color: '#94a3b8' }} align="right">Equiv. Cambio</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {fabricationProcesses.map((proc, i) => (
                                                <Table.Tr key={i}>
                                                    <Table.Td><Group gap="xs"><Checkbox size="xs" /><Text size="xs">{proc.machine}</Text></Group></Table.Td>
                                                    <Table.Td><Text size="xs">{proc.process}</Text></Table.Td>
                                                    <Table.Td align="right"><Text size="xs" fw={700} c="indigo.3">{proc.capacity}</Text></Table.Td>
                                                    <Table.Td align="right"><Text size="xs" c="dimmed">{proc.equiv}</Text></Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                </ScrollArea>
                            </Card>
                        </Stack>
                    </Box>

                    {/* Right Area (4 cols) */}
                    <Box style={{ gridColumn: 'span 4' }}>
                        <Stack gap="xl" style={{ height: '100%' }}>
                            {/* Navigation */}
                            <Card className="glass-card" p="xl">
                                <Group gap="xs" mb="lg">
                                    <ThemeIcon variant="light" color="indigo"><IconSettings size={18} /></ThemeIcon>
                                    <Title order={4} c="white">Configuración de Piezas</Title>
                                </Group>
                                <Stack gap="md">
                                    {formData.parts.map((part, idx) => (
                                        <Button
                                            key={idx}
                                            variant={currentPartIndex === idx ? "filled" : "light"}
                                            color={currentPartIndex === idx ? "indigo" : "gray"}
                                            onClick={() => setCurrentPartIndex(idx)}
                                            fullWidth
                                            justify="flex-start"
                                            leftSection={<Text fw={900}>{idx + 1}</Text>}
                                        >
                                            <Box style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{part.partName || `Pieza ${idx + 1}`}</Box>
                                        </Button>
                                    ))}
                                    <Button variant="outline" color="indigo" leftSection={<IconLayoutGrid size={18} />} onClick={addPart} fullWidth mt="md">Añadir Pieza</Button>

                                    {formData.parts.length > 1 && (
                                        <Button
                                            variant="subtle"
                                            color="red"
                                            size="compact-xs"
                                            mt="xs"
                                            fullWidth
                                            leftSection={<IconTrash size={14} />}
                                            onClick={() => {
                                                const newParts = formData.parts.filter((_, i) => i !== currentPartIndex);
                                                setFormData({ ...formData, parts: newParts, numeroPartes: newParts.length });
                                                setCurrentPartIndex(Math.max(0, currentPartIndex - 1));
                                            }}
                                        >
                                            Eliminar Pieza Actual
                                        </Button>
                                    )}
                                </Stack>
                            </Card>

                            {/* Terminados */}
                            <Card className="glass-card" p="xl">
                                <Divider label="Terminados" labelPosition="left" mb="md" styles={{ label: { color: '#6366f1', fontWeight: 800 } }} />
                                <Stack gap="xs">
                                    <TextInput label="Terminado 1" variant="filled" value={currentPart.terminado1} onChange={(e) => updatePartField('terminado1', e.currentTarget.value)} />
                                    <TextInput label="Terminado 2" variant="filled" value={currentPart.terminado2} onChange={(e) => updatePartField('terminado2', e.currentTarget.value)} />
                                    <Checkbox label="Lleva Estampado" checked={currentPart.estampado} onChange={(e) => updatePartField('estampado', e.currentTarget.checked)} mt="xs" />
                                </Stack>
                            </Card>

                            {/* Condiciones de Entrega */}
                            <Card className="glass-card" p="xl" style={{ borderLeft: '4px solid #10b981' }}>
                                <Divider label="Condiciones de Entrega" labelPosition="left" mb="md" styles={{ label: { color: '#10b981', fontWeight: 800 } }} />
                                <SimpleGrid cols={1} spacing="xs">
                                    <Checkbox label="Remisión" checked={currentPart.condicionRemision} onChange={(e) => updatePartField('condicionRemision', e.currentTarget.checked)} />
                                    <Checkbox label="Certificado de Calidad" checked={currentPart.condicionCertificado} onChange={(e) => updatePartField('condicionCertificado', e.currentTarget.checked)} />
                                    <Checkbox label="Factura" checked={currentPart.condicionFactura} onChange={(e) => updatePartField('condicionFactura', e.currentTarget.checked)} />
                                    <Checkbox label="Orden de compra" checked={currentPart.condicionOrdenCompra} onChange={(e) => updatePartField('condicionOrdenCompra', e.currentTarget.checked)} />
                                </SimpleGrid>
                            </Card>

                            <Box mt="auto" pt="xl">
                                <Alert icon={<IconAlertCircle size={16} />} title="Nota Técnica" color="blue" variant="light">
                                    <Text size="xs">Asegúrese de guardar los cambios antes de salir de la aplicación.</Text>
                                </Alert>
                            </Box>
                        </Stack>
                    </Box>
                </SimpleGrid>
            </Stack>
        );
    };

    return (
        <Box className="fade-in" style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 40, padding: 20 }}>
            {activeStep === 0 ? renderStep1() : renderStep2()}
        </Box>
    );
}
