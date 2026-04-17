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
    Badge,
    rem as mantineRem
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
    IconBrush,
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
    IconTrash
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';

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
    const [lineaOptions, setLineaOptions] = useState(['Bolsa', 'Caja o plegadiza', 'Empaque Flexible', 'Otro']);

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

    const handleSave = async () => {
        try {
            setLoading(true);
            const result = await api.post('/production/orders', formData);

            if (result) {
                alert('¡Orden de Trabajo guardada con éxito!');
                navigate('/ordenes/lista');
            }
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
                    <Group gap="lg">
                        <ThemeIcon size={64} radius="md" variant="gradient" gradient={{ from: 'indigo', to: 'cyan' }}>
                            <IconBrush size={34} />
                        </ThemeIcon>
                        <Stack gap={0}>
                            <Group gap="xs">
                                <Text size="xs" c="indigo.2" fw={700} tt="uppercase" lts={1}>Orden de Trabajo</Text>
                                <Badge variant="filled" color="indigo" size="sm">Creando OT #{formData.otNumber || '...'}</Badge>
                            </Group>
                            <Title order={2} c="white">Clase y Línea de Diseño</Title>
                        </Stack>
                    </Group>
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
                        <TextInput
                            label="Razon Social del Cliente"
                            placeholder="Nombre del cliente..."
                            size="md"
                            value={formData.cliente}
                            onChange={(e) => setFormData({ ...formData, cliente: e.currentTarget.value })}
                            error={errors.cliente}
                            required
                            leftSection={<IconBuildingStore size={16} />}
                        />
                        {isDuplicate && (
                            <Alert icon={<IconAlertCircle size={16} />} title="Duplicado Detectado" color="red" mt="md" variant="light">
                                Ya existe una orden para este cliente con la misma referencia.
                            </Alert>
                        )}
                    </Card>

                    <Card className="glass-card" p="xl">
                        <Stack gap="sm">
                            <TextInput
                                label="Ejecutivo de cuenta"
                                placeholder="Nombre del ejecutivo..."
                                leftSection={<IconUser size={16} />}
                                value={formData.ejecutivoCuenta}
                                onChange={(e) => setFormData({ ...formData, ejecutivoCuenta: e.currentTarget.value })}
                                error={errors.ejecutivoCuenta}
                                required
                                variant="filled"
                            />

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
                            <Select
                                label="Linea de PT"
                                placeholder="Seleccione línea..."
                                data={[...lineaOptions, 'Nuevo elemento...']}
                                value={formData.lineaPT}
                                onChange={(val) => {
                                    if (val === 'Nuevo elemento...') {
                                        const newVal = prompt('Ingrese nueva línea de PT:');
                                        if (newVal) {
                                            setLineaOptions(prev => [...prev, newVal]);
                                            setFormData({ ...formData, lineaPT: newVal });
                                        }
                                    } else {
                                        setFormData({ ...formData, lineaPT: val });
                                    }
                                }}
                                variant="filled"
                                size="md"
                            />
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

        return (
            <Stack gap="xl">
                {/* Step 2 Header */}
                <Card p={0} style={{ background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)', border: 'none', borderRadius: '16px' }}>
                    <Group justify="space-between" align="center" p="xl">
                        <Group gap="lg">
                            <ThemeIcon size={64} radius="md" variant="gradient" gradient={{ from: 'indigo', to: 'cyan' }}>
                                <IconBrush size={34} />
                            </ThemeIcon>
                            <Stack gap={0}>
                                <Group align="baseline" gap="xs">
                                    <Title order={2} c="white">ORDEN DE TRABAJO</Title>
                                    <Text c="indigo.2" fw={700} size="xl">{formData.productName || 'Sin título'}</Text>
                                </Group>
                                <Text size="sm" c="dimmed">Editando: {currentPart.partName || 'Pieza'} ({currentPartIndex + 1} de {formData.parts.length})</Text>
                            </Stack>
                        </Group>
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
                                <Divider label="Descripción del Diseño y Medidas" labelPosition="left" mb="md" styles={{ label: { color: '#6366f1', fontWeight: 800, fontSize: 16 } }} />
                                <SimpleGrid cols={2} spacing="lg">
                                    <Stack gap="xs">
                                        <TextInput
                                            label="Nombre de esta Pieza"
                                            value={currentPart.partName}
                                            onChange={(e) => updatePartField('partName', e.currentTarget.value)}
                                            variant="filled"
                                            required
                                        />
                                        <Group grow align="flex-end">
                                            <TextInput label="Cabida" variant="filled" value={currentPart.cabida} onChange={(e) => updatePartField('cabida', e.currentTarget.value)} />
                                            <NumberInput label="Fuelle" variant="filled" value={currentPart.fuelle} onChange={(val) => updatePartField('fuelle', val)} />
                                        </Group>
                                        <Stack gap={0}>
                                            <Text size="sm" fw={500} mb={4}>Dimensiones (mm): Alto x Ancho x Largo</Text>
                                            <Group grow align="flex-start" gap="xs">
                                                <NumberInput placeholder="Alto" variant="filled" value={currentPart.alto} onChange={(val) => updatePartField('alto', val)} />
                                                <NumberInput placeholder="Ancho" variant="filled" value={currentPart.ancho} onChange={(val) => updatePartField('ancho', val)} />
                                                <NumberInput placeholder="Largo" variant="filled" value={currentPart.largo} onChange={(val) => updatePartField('largo', val)} />
                                            </Group>
                                        </Stack>
                                    </Stack>
                                    <Stack gap="xs">
                                        <Group grow>
                                            <NumberInput label="Alto Pliego (mm)" variant="filled" value={currentPart.altoPliego} onChange={(val) => updatePartField('altoPliego', val)} />
                                            <NumberInput label="Ancho Pliego (mm)" variant="filled" value={currentPart.anchoPliego} onChange={(val) => updatePartField('anchoPliego', val)} />
                                        </Group>
                                        <Textarea
                                            label="Pie de imprenta / Notas"
                                            placeholder="Observaciones..."
                                            minRows={4}
                                            variant="filled"
                                            value={currentPart.notas}
                                            onChange={(e) => updatePartField('notas', e.currentTarget.value)}
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
