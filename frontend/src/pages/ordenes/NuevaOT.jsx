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
    IconChevronRight
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function NuevaOT() {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);

    // Form State
    const [formData, setFormData] = useState({
        otNumber: '',
        ejecutivo: '',
        cliente: '',
        fechaSolicitud: null,
        asignacion: 'Otro',
        lineaPT: 'Otro',
        nPartes: 1,
        codigoSap: '',
        nombreProducto: '',
        nombrePieza: 'Pieza Unica',
        fechaStep2: null,
        alto: '',
        ancho: '',
        largo: '',
        cabida: '',
        fuelle: '',
        altoPliego: '',
        anchoPliego: ''
    });

    const [errors, setErrors] = useState({});
    const [isDuplicate, setIsDuplicate] = useState(false);
    const [loading, setLoading] = useState(false);

    // Mock existing OTs for automatic verification
    const existingOTs = ['12500', '12501', '12111', '2259'];

    useEffect(() => {
        if (formData.otNumber.length > 2) {
            setLoading(true);
            const timer = setTimeout(() => {
                const duplicate = existingOTs.includes(formData.otNumber);
                setIsDuplicate(duplicate);
                setLoading(false);
                if (duplicate) {
                    setErrors(prev => ({ ...prev, otNumber: '¡Esta OT ya existe!' }));
                } else {
                    setErrors(prev => ({ ...prev, otNumber: null }));
                }
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setIsDuplicate(false);
            setErrors(prev => ({ ...prev, otNumber: null }));
        }
    }, [formData.otNumber]);

    const validateStep1 = () => {
        const newErrors = {};
        if (!formData.otNumber) newErrors.otNumber = 'El número de OT es obligatorio';
        if (isDuplicate) newErrors.otNumber = 'Número de OT duplicado';
        if (!formData.ejecutivo) newErrors.ejecutivo = 'Seleccione un ejecutivo';
        if (!formData.cliente) newErrors.cliente = 'Seleccione un cliente';
        if (!formData.fechaSolicitud) newErrors.fechaSolicitud = 'Seleccione la fecha';
        if (!formData.nombreProducto) newErrors.nombreProducto = 'El nombre del producto es obligatorio';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStep2 = () => {
        const newErrors = {};
        if (!formData.nombrePieza) newErrors.nombrePieza = 'Nombre de pieza obligatorio';
        if (!formData.alto || !formData.ancho || !formData.largo) {
            newErrors.dimensiones = 'Ingrese dimensiones (Alto x Ancho x Largo)';
        }

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

    const handleSave = () => {
        if (validateStep2()) {
            alert('¡Orden de Trabajo guardada con éxito!');
            navigate('/');
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
                            <Text size="xs" c="indigo.2" fw={700} tt="uppercase" lts={1}>Orden de Trabajo</Text>
                            <Title order={2} c="white">Clase y Línea de Diseño</Title>
                        </Stack>
                    </Group>
                    <Group gap="md">
                        <Button
                            variant="subtle"
                            color="indigo.1"
                            leftSection={<IconLayoutGrid size={18} />}
                            styles={{ label: { fontWeight: 700 } }}
                        >
                            Diseños creados
                        </Button>
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
            </Card>

            <SimpleGrid cols={{ base: 1, md: 5 }} spacing="xl">
                {/* Main Form Sidebar/Info */}
                <Stack style={{ gridColumn: 'span 2' }}>
                    <Card className="glass-card" p="xl" style={{ borderLeft: '4px solid #6366f1' }}>
                        <Title order={4} c="white" mb="md">Validación de OT</Title>
                        <TextInput
                            label="Número de Orden de Trabajo"
                            placeholder="Ingrese n° de OT..."
                            size="md"
                            value={formData.otNumber}
                            onChange={(e) => setFormData({ ...formData, otNumber: e.currentTarget.value })}
                            error={errors.otNumber}
                            required
                            rightSection={
                                loading ? null :
                                    formData.otNumber && !isDuplicate ? <IconCheck size={18} color="#10b981" /> :
                                        isDuplicate ? <IconAlertCircle size={18} color="#f43f5e" /> : null
                            }
                            styles={{
                                input: {
                                    fontSize: rem(18),
                                    fontWeight: 700,
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'white'
                                }
                            }}
                        />
                        {isDuplicate && (
                            <Alert icon={<IconAlertCircle size={16} />} title="Duplicado Detectado" color="red" mt="md" variant="light">
                                Ya existe un registro con este número.
                            </Alert>
                        )}
                        {!isDuplicate && formData.otNumber.length > 2 && (
                            <Alert icon={<IconCheck size={16} />} title="Número Disponible" color="teal" mt="md" variant="light">
                                El número de OT es válido para un nuevo registro.
                            </Alert>
                        )}
                    </Card>

                    <Card className="glass-card" p="xl">
                        <Stack gap="sm">
                            <Select
                                label="Ejecutivo de cuenta"
                                placeholder="Seleccione ejecutivo..."
                                leftSection={<IconUser size={16} />}
                                data={['Ejecutivo A', 'Ejecutivo B', 'Producción']}
                                variant="filled"
                                value={formData.ejecutivo}
                                onChange={(val) => setFormData({ ...formData, ejecutivo: val })}
                                error={errors.ejecutivo}
                                required
                            />
                            <Select
                                label="Razon Social del Cliente"
                                placeholder="Seleccione cliente..."
                                leftSection={<IconBuildingStore size={16} />}
                                data={['SINFONIA', 'DISTRIBUIDORA EJEMPLO', 'SOCIEDAD CALZADO']}
                                variant="filled"
                                searchable
                                value={formData.cliente}
                                onChange={(val) => setFormData({ ...formData, cliente: val })}
                                error={errors.cliente}
                                required
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
                        <Select
                            label="Linea de PT"
                            placeholder="Seleccione línea de producto terminado"
                            data={['Bolsa Boutique', 'Bolsa Industrial', 'Empaque Flexible', 'Otro']}
                            value={formData.lineaPT}
                            onChange={(val) => setFormData({ ...formData, lineaPT: val })}
                            variant="filled"
                            size="md"
                        />

                        <SimpleGrid cols={2}>
                            <NumberInput
                                label="N partes de OT"
                                value={formData.nPartes}
                                onChange={(val) => setFormData({ ...formData, nPartes: val })}
                                min={1}
                                variant="filled"
                                size="md"
                            />
                            <TextInput
                                label="Codigo SAP"
                                placeholder="Referencia ERP..."
                                leftSection={<IconBarcode size={16} />}
                                value={formData.codigoSap}
                                onChange={(e) => setFormData({ ...formData, codigoSap: e.currentTarget.value })}
                                variant="filled"
                                size="md"
                            />
                        </SimpleGrid>

                        <TextInput
                            label="Nombre del producto y referencia"
                            placeholder="Nombre descriptivo de la orden..."
                            variant="filled"
                            size="lg"
                            value={formData.nombreProducto}
                            onChange={(e) => setFormData({ ...formData, nombreProducto: e.currentTarget.value })}
                            error={errors.nombreProducto}
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
                                <Text size="sm" c="dimmed">Pendiente por aprobación técnica</Text>
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

    // --- STEP 2: DETALLE DE ORDEN DE TRABAJO ---
    const renderStep2 = () => (
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
                                <Title order={2} c="white">ORDEN DE TRABAJO No {formData.otNumber || '2558'}</Title>
                                <Text c="indigo.2" fw={700} size="xl">{formData.nombreProducto || 'Sin título'}</Text>
                            </Group>
                        </Stack>
                    </Group>
                    <Group gap="md">
                        <Button variant="subtle" color="indigo.1" leftSection={<IconPrinter size={18} />}>Imprimir</Button>
                        <Button variant="filled" color="indigo" leftSection={<IconDeviceFloppy size={18} />} radius="md" onClick={handleSave}>Guardar y Salir</Button>
                        <ActionIcon variant="light" color="gray" size="lg" onClick={handleBack}><IconArrowLeft size={20} /></ActionIcon>
                    </Group>
                </Group>
            </Card>

            <SimpleGrid cols={{ base: 1, lg: 12 }} spacing="xl">
                {/* Left Area: General Info (8 cols) */}
                <Box style={{ gridColumn: 'span 8' }}>
                    <Stack gap="xl">
                        {/* Descripción del diseño */}
                        <Card className="glass-card" p="xl">
                            <Divider label="Descripción del diseño" labelPosition="left" mb="md" styles={{ label: { color: '#6366f1', fontWeight: 800, fontSize: 16 } }} />
                            <SimpleGrid cols={2} spacing="lg">
                                <Stack gap="xs">
                                    <SimpleGrid cols={2}>
                                        <TextInput label="Id de OT" value={formData.otNumber || '2558'} readOnly variant="filled" />
                                        <DateInput
                                            label="Fecha"
                                            placeholder="Seleccione..."
                                            variant="filled"
                                            value={formData.fechaStep2}
                                            onChange={(val) => setFormData({ ...formData, fechaStep2: val })}
                                            styles={calendarStyles}
                                            popoverProps={{ shadow: 'xl', position: 'bottom-start' }}
                                            nextIcon={<IconChevronRight size={16} />}
                                            previousIcon={<IconChevronLeft size={16} />}
                                            hideOutsideDates
                                        />
                                    </SimpleGrid>
                                    <TextInput
                                        label="Nombre Pieza"
                                        value={formData.nombrePieza}
                                        onChange={(e) => setFormData({ ...formData, nombrePieza: e.currentTarget.value })}
                                        error={errors.nombrePieza}
                                        variant="filled"
                                        required
                                    />
                                    <Stack gap={0}>
                                        <Text size="sm" fw={500} mb={4}>Alto x Ancho x Largo Producto Final</Text>
                                        <Group grow align="flex-start" gap="xs">
                                            <TextInput placeholder="Alto" variant="filled" value={formData.alto} onChange={(e) => setFormData({ ...formData, alto: e.currentTarget.value })} error={errors.dimensiones ? true : false} />
                                            <TextInput placeholder="Ancho" variant="filled" value={formData.ancho} onChange={(e) => setFormData({ ...formData, ancho: e.currentTarget.value })} error={errors.dimensiones ? true : false} />
                                            <TextInput placeholder="Largo" variant="filled" value={formData.largo} onChange={(e) => setFormData({ ...formData, largo: e.currentTarget.value })} error={errors.dimensiones ? true : false} />
                                        </Group>
                                        {errors.dimensiones && <Text size="xs" color="red" mt={4}>{errors.dimensiones}</Text>}
                                    </Stack>
                                    <TextInput label="Cabida" variant="filled" value={formData.cabida} onChange={(e) => setFormData({ ...formData, cabida: e.currentTarget.value })} />
                                </Stack>
                                <Stack gap="xs">
                                    <Group grow>
                                        <TextInput label="Fuelle" variant="filled" value={formData.fuelle} onChange={(e) => setFormData({ ...formData, fuelle: e.currentTarget.value })} />
                                        <TextInput label="Alto pliego" variant="filled" value={formData.altoPliego} onChange={(e) => setFormData({ ...formData, altoPliego: e.currentTarget.value })} />
                                        <TextInput label="Ancho pliego" variant="filled" value={formData.anchoPliego} onChange={(e) => setFormData({ ...formData, anchoPliego: e.currentTarget.value })} />
                                    </Group>
                                    <Group grow gap="xs">
                                        <Card withBorder style={{ background: 'rgba(255,255,255,0.01)', flex: 2 }} p="xs" radius="md">
                                            <SimpleGrid cols={2} spacing="xs">
                                                <Stack gap={4} align="center"><IconZoomIn size={20} c="indigo" /><Text size="xs" c="dimmed">Ampliaciones</Text></Stack>
                                                <Stack gap={4} align="center"><IconPaperclip size={20} c="indigo" /><Text size="xs" c="dimmed">Adjuntos</Text></Stack>
                                            </SimpleGrid>
                                        </Card>
                                        <Card withBorder style={{ background: 'rgba(255,255,255,0.01)', flex: 1 }} p="xs" radius="md">
                                            <Stack gap={4} align="center"><IconMaximize size={24} c="indigo" /></Stack>
                                        </Card>
                                    </Group>
                                    <Textarea placeholder="Observaciones adicionales..." minRows={3} variant="filled" />
                                </Stack>
                            </SimpleGrid>
                        </Card>

                        {/* Materiales */}
                        <Card className="glass-card" p="xl">
                            <Divider label="Materiales" labelPosition="left" mb="md" styles={{ label: { color: '#6366f1', fontWeight: 800, fontSize: 16 } }} />
                            <SimpleGrid cols={2} spacing="xl">
                                <Stack gap="xs">
                                    <Select label="Sustrato superior - Cal/g:" data={['Cartón 300g', 'Papel 150g']} variant="filled" />
                                    <Select label="Sustrato inferior - Cal/g:" data={['Papel Bond', 'Kraft']} variant="filled" />
                                </Stack>
                                <Stack gap="xs">
                                    <Select label="Sustrato medio - Cal/g:" variant="filled" data={[]} />
                                    <Group grow>
                                        <Select label="Dirección de la fibra:" variant="filled" data={['Horizontal', 'Vertical']} />
                                        <Select label="Dirección de la flauta:" variant="filled" data={[]} />
                                        <Select label="Tipo de flauta/Micro:" defaultValue="Ninguna" data={['Ninguna', 'B', 'E']} variant="filled" />
                                    </Group>
                                </Stack>
                            </SimpleGrid>
                        </Card>

                        {/* Grid for Troquel, Tintas, Manija */}
                        <SimpleGrid cols={3} spacing="xl">
                            {/* Troquel */}
                            <Card className="glass-card" p="md">
                                <Divider label="Troquel" labelPosition="left" mb="sm" styles={{ label: { color: '#6366f1', fontWeight: 700 } }} />
                                <Stack gap="xs">
                                    <Checkbox label="Troquel nuevo" defaultChecked />
                                    <Select label="Codigo Troquel" variant="filled" data={[]} />
                                </Stack>
                            </Card>
                            {/* Tintas */}
                            <Card className="glass-card" p="md">
                                <Divider label="Tintas" labelPosition="left" mb="sm" styles={{ label: { color: '#6366f1', fontWeight: 700 } }} />
                                <Stack gap="xs">
                                    <NumberInput label="Cantidad Tintas" variant="filled" />
                                    <Select label="Colores" variant="filled" data={[]} />
                                    <Checkbox label="Tinta Especial" />
                                </Stack>
                            </Card>
                            {/* Manija */}
                            <Card className="glass-card" p="md">
                                <Divider label="Manija" labelPosition="left" mb="sm" styles={{ label: { color: '#6366f1', fontWeight: 700 } }} />
                                <Stack gap="xs">
                                    <Select label="Tipo de manija" variant="filled" data={[]} />
                                    <Select label="M- Ref" variant="filled" data={[]} />
                                    <NumberInput label="M-Largo (cm)" defaultValue={0} variant="filled" />
                                </Stack>
                            </Card>
                        </SimpleGrid>

                        {/* Terminados and Condiciones */}
                        <SimpleGrid cols={2} spacing="xl">
                            <Card className="glass-card" p="md">
                                <Divider label="Terminados" labelPosition="left" mb="sm" styles={{ label: { color: '#6366f1', fontWeight: 700 } }} />
                                <SimpleGrid cols={2}>
                                    <Stack gap="xs">
                                        <Select label="Terminado 1" variant="filled" data={[]} />
                                        <Checkbox label="Estampado" />
                                    </Stack>
                                    <Stack gap="xs">
                                        <Select label="Terminado 2" variant="filled" data={[]} />
                                        <Select label="Pie de imprenta" variant="filled" data={[]} />
                                    </Stack>
                                </SimpleGrid>
                            </Card>
                            <Card className="glass-card" p="md" style={{ borderLeft: '4px solid #10b981' }}>
                                <Divider label="Condiciones de entrega" labelPosition="left" mb="sm" styles={{ label: { color: '#10b981', fontWeight: 700 } }} />
                                <SimpleGrid cols={2}>
                                    <Checkbox label="Remision" />
                                    <Checkbox label="Certificado de Calidad" />
                                    <Checkbox label="Factura" />
                                    <Checkbox label="Orden de compra" />
                                </SimpleGrid>
                            </Card>
                        </SimpleGrid>
                    </Stack>
                </Box>

                {/* Right Area: Proceso de Fabricación (4 cols) */}
                <Box style={{ gridColumn: 'span 4' }}>
                    <Card className="glass-card" p="xl" style={{ height: '100%' }}>
                        <Group gap="xs" mb="lg">
                            <ThemeIcon variant="light" color="indigo"><IconSettings size={18} /></ThemeIcon>
                            <Title order={4} c="white">Proceso de Fabricación</Title>
                        </Group>
                        <ScrollArea offsetScrollbars>
                            <Table verticalSpacing="xs" striped highlightOnHover style={{ color: '#94a3b8' }}>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Maquina</Table.Th>
                                        <Table.Th>Proceso</Table.Th>
                                        <Table.Th align="right">Capac Estand</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {[
                                        { m: '01a Convertidora', p: 'Corte', c: '20000' },
                                        { m: '01b Convertidora', p: 'Corte', c: '20000' },
                                        { m: '02a Guillotina A', p: 'Corte', c: '40000' },
                                        { m: '02b Guillotina B', p: 'Corte', c: '40000' },
                                        { m: '03 Sordz 72', p: 'Impresión/Barni', c: '20000' },
                                        { m: '04 Sordz 76', p: 'Impresión/Barni', c: '20000' },
                                    ].map((row, i) => (
                                        <Table.Tr key={i}>
                                            <Table.Td>
                                                <Group gap="xs">
                                                    <Checkbox size="xs" />
                                                    <Text size="xs">{row.m}</Text>
                                                </Group>
                                            </Table.Td>
                                            <Table.Td><Text size="xs">{row.p}</Text></Table.Td>
                                            <Table.Td align="right"><Text size="xs" fw={700} c="indigo.3">{row.c}</Text></Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </ScrollArea>
                        <Divider my="xl" opacity={0.1} />
                        <Group grow>
                            <Button variant="subtle" color="gray" size="xs">Anterior</Button>
                            <Button variant="subtle" color="indigo" size="xs">Siguiente</Button>
                            <Button variant="outline" color="indigo" size="xs">Nueva Pieza</Button>
                        </Group>
                    </Card>
                </Box>
            </SimpleGrid>
        </Stack>
    );

    return (
        <Box className="fade-in" style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 40, padding: 20 }}>
            {activeStep === 0 ? renderStep1() : renderStep2()}
        </Box>
    );
}
