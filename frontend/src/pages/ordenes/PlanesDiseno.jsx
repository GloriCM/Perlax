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
    Tooltip,
    Modal,
    Divider,
    Checkbox,
    Grid,
    Image,
    Paper,
    rem
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    IconSearch,
    IconEye,
    IconX,
    IconPrinter,
    IconDeviceFloppy,
    IconCircleCheck,
    IconCircleX,
    IconExternalLink,
    IconInfoCircle
} from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// More extensive mock data for Design Plans
const MOCK_DATA = [
    {
        id: '2559 / 1',
        ejecutivo: 'Claude Levy',
        cliente: 'LINK SYSTEMS LLC',
        producto: 'WHITE CREPE HOLDER',
        prioridad: 'Alta',
        disenador: 'Juan Prada',
        recepcion: '12/01/2026',
        boceto: 'OK',
        artes: 'OK',
        ficha: 'No',
        muestra: 'Sí',
        aprobacion: 'Pendiente',
        plancha: 'No',
        fotomecanica: '-',
        op: 'OP-4500'
    },
    {
        id: '2556 / 12026 / 1',
        ejecutivo: 'Claude Levy',
        cliente: 'LINK SYSTEMS LLC',
        producto: 'Plegadizas Ref: tequenos x 20 unds DELICIA',
        prioridad: 'Normal',
        disenador: 'Jaime Patiño',
        recepcion: '22/12/2025',
        boceto: 'OK',
        artes: 'OK',
        ficha: 'OK',
        muestra: 'Sí',
        aprobacion: 'Aprobado',
        plancha: 'OK',
        fotomecanica: 'Enviado',
        op: 'OP-4498'
    },
    {
        id: '2555 / 122025 / 1',
        ejecutivo: 'Claude Levy',
        cliente: 'LINK SYSTEMS LLC',
        producto: 'Plegadizas Ref: Tequenos 40 unds DELICIAS',
        prioridad: 'Urgente',
        disenador: 'Juan Prada',
        recepcion: '22/12/2025',
        boceto: 'Pendiente',
        artes: 'No',
        ficha: 'No',
        muestra: 'No',
        aprobacion: 'Pendiente',
        plancha: 'No',
        fotomecanica: '-',
        op: 'OP-4495'
    }
];

export default function PlanesDiseno() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [opened, { open, close }] = useDisclosure(false);
    const [selectedOT, setSelectedOT] = useState(null);

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

    const rows = MOCK_DATA.filter(item =>
        Object.values(item).some(val => String(val).toLowerCase().includes(search.toLowerCase()))
    ).map((item) => (
        <Table.Tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => handleViewDetail(item)}>
            <Table.Td><Text size="xs" fw={700} c="indigo.3">{item.id}</Text></Table.Td>
            <Table.Td><Text size="xs" truncate>{item.ejecutivo}</Text></Table.Td>
            <Table.Td><Text size="xs" fw={500} truncate>{item.cliente}</Text></Table.Td>
            <Table.Td><Text size="xs" truncate maw={200}>{item.producto}</Text></Table.Td>
            <Table.Td>
                <Badge variant="dot" size="xs" color={item.prioridad === 'Urgente' ? 'red' : item.prioridad === 'Alta' ? 'orange' : 'blue'}>
                    {item.prioridad}
                </Badge>
            </Table.Td>
            <Table.Td><Text size="xs">{item.disenador}</Text></Table.Td>
            <Table.Td><Text size="xs">{item.recepcion}</Text></Table.Td>
            <Table.Td><Badge size="xs" variant="light" color={item.boceto === 'OK' ? 'green' : 'gray'}>{item.boceto}</Badge></Table.Td>
            <Table.Td><Badge size="xs" variant="light" color={item.artes === 'OK' ? 'green' : 'gray'}>{item.artes}</Badge></Table.Td>
            <Table.Td><Text size="xs">{item.ficha}</Text></Table.Td>
            <Table.Td><Text size="xs">{item.muestra}</Text></Table.Td>
            <Table.Td>
                <Badge size="xs" color={item.aprobacion === 'Aprobado' ? 'green' : 'yellow'}>
                    {item.aprobacion}
                </Badge>
            </Table.Td>
            <Table.Td><Text size="xs">{item.op}</Text></Table.Td>
            <Table.Td>
                <ActionIcon variant="subtle" color="gray" size="sm">
                    <IconExternalLink size={14} />
                </ActionIcon>
            </Table.Td>
        </Table.Tr>
    ));

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
                                <Table.Th>Boceto</Table.Th>
                                <Table.Th>Artes</Table.Th>
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
                onClose={close}
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
                                <Text size="xl" fw={900}>{selectedOT?.id}</Text>
                                <Text size="sm" fw={700} c="blue.1">{selectedOT?.cliente}</Text>
                            </Stack>
                        </Group>
                        <Group>
                            <Button variant="white" color="dark" size="xs" leftSection={<IconPrinter size={16} />}>Imprimir</Button>
                            <Button variant="filled" color="red" size="xs" leftSection={<IconDeviceFloppy size={16} />} onClick={close}>Guardar y Salir</Button>
                        </Group>
                    </Group>
                </Box>

                <ScrollArea.Autosize mah="calc(100vh - 180px)" type="auto">
                    <Box p="lg">
                        <Grid gutter="xl">
                            {/* Section 1: Descripción del Diseño */}
                            <Grid.Col span={8}>
                                <Paper withBorder p="md" bg="rgba(255,255,255,0.02)" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                    <Divider label="Descripción del diseño" labelPosition="left" mb="md" styles={{ label: { color: '#6366f1', fontWeight: 800 } }} />
                                    <Grid gutter="xs">
                                        <Grid.Col span={3}><TextInput label="Id de OT" value={selectedOT?.id.split('/')[0].trim()} readOnly variant="filled" size="xs" /></Grid.Col>
                                        <Grid.Col span={4}><TextInput label="Fecha" value={selectedOT?.recepcion} readOnly variant="filled" size="xs" /></Grid.Col>
                                        <Grid.Col span={2}><TextInput label="Fuelle" value="0" readOnly variant="filled" size="xs" /></Grid.Col>
                                        <Grid.Col span={3}><TextInput label="Nombre Pieza" value="Pieza Única" readOnly variant="filled" size="xs" /></Grid.Col>

                                        <Grid.Col span={5}>
                                            <Group gap="xs" grow>
                                                <TextInput label="Ancho" value="6.3" readOnly variant="filled" size="xs" />
                                                <TextInput label="Largo" value="13.6" readOnly variant="filled" size="xs" />
                                                <TextInput label="Fondo" value="14.9" readOnly variant="filled" size="xs" />
                                            </Group>
                                        </Grid.Col>
                                        <Grid.Col span={3}><TextInput label="Alto Pliego" value="53.4" readOnly variant="filled" size="xs" styles={{ label: { color: 'red' } }} /></Grid.Col>
                                        <Grid.Col span={4}><TextInput label="Ancho Pliego" value="50.5" readOnly variant="filled" size="xs" styles={{ label: { color: 'red' } }} /></Grid.Col>

                                        <Grid.Col span={2}><TextInput label="Cabida" value="1.00" readOnly variant="filled" size="xs" /></Grid.Col>
                                        <Grid.Col span={10}>
                                            <Stack gap={2}>
                                                <Text size="xs" fw={700}>Notas de Diseño</Text>
                                                <Paper bg="rgba(0,0,0,0.3)" p="xs" radius="xs" style={{ minHeight: 60, border: '1px solid rgba(255,255,255,0.1)' }}>
                                                    <Text size="xs">MONTAR FICHAS/CUANDO SE CONFIRME APROBADO/SUSTRATO: CARTULINA ESMALTADA CALIBRE 48</Text>
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
                                        <Image src="https://placehold.co/150x150/0f172a/white?text=Arte+1" radius="md" withPlaceholder />
                                        <Image src="https://placehold.co/150x150/0f172a/white?text=Arte+2" radius="md" withPlaceholder />
                                    </SimpleGrid>
                                </Paper>
                            </Grid.Col>

                            {/* Row 2: Materiales, Troquel, Tintas */}
                            <Grid.Col span={4}>
                                <Paper withBorder p="md" bg="rgba(255,255,255,0.02)" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                    <Divider label="Materiales" labelPosition="left" mb="sm" styles={{ label: { color: '#6366f1', fontWeight: 800 } }} />
                                    <Stack gap="xs">
                                        <TextInput label="Sustrato" value="Cartulina Esmaltada" readOnly variant="filled" size="xs" />
                                        <TextInput label="Fibra" value="N/A" readOnly variant="filled" size="xs" />
                                    </Stack>
                                </Paper>
                            </Grid.Col>

                            <Grid.Col span={4}>
                                <Paper withBorder p="md" bg="rgba(255,255,255,0.02)" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                    <Divider label="Troquel" labelPosition="left" mb="sm" styles={{ label: { color: '#6366f1', fontWeight: 800 } }} />
                                    <Group grow>
                                        <TextInput label="Código" value="T3-003" readOnly variant="filled" size="xs" />
                                        <Checkbox label="Troquel Nuevo" checked={false} readOnly pt="lg" size="xs" />
                                    </Group>
                                </Paper>
                            </Grid.Col>

                            <Grid.Col span={4}>
                                <Paper withBorder p="md" bg="rgba(255,255,255,0.02)" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                    <Divider label="Tintas" labelPosition="left" mb="sm" styles={{ label: { color: '#6366f1', fontWeight: 800 } }} />
                                    <Group gap="xs">
                                        <Badge color="cyan" radius="sm">C</Badge>
                                        <Badge color="magenta" radius="sm">M</Badge>
                                        <Badge color="yellow" radius="sm">Y</Badge>
                                        <Badge color="dark" radius="sm">K</Badge>
                                        <Text size="xs" fw={700}>Especial: 0</Text>
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
                                            <Table.Tr>
                                                <Table.Td>Gullotina A</Table.Td>
                                                <Table.Td>Corte</Table.Td>
                                                <Table.Td>40.000</Table.Td>
                                                <Table.Td>1</Table.Td>
                                            </Table.Tr>
                                            <Table.Tr>
                                                <Table.Td>Heidelberg</Table.Td>
                                                <Table.Td>Impresión</Table.Td>
                                                <Table.Td>20.000</Table.Td>
                                                <Table.Td>2.000</Table.Td>
                                            </Table.Tr>
                                        </Table.Tbody>
                                    </Table>
                                </Paper>
                            </Grid.Col>

                            <Grid.Col span={4}>
                                <Paper withBorder p="md" bg="rgba(255,255,255,0.02)" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                    <Divider label="Condiciones de Entrega" labelPosition="left" mb="sm" styles={{ label: { color: '#6366f1', fontWeight: 800 } }} />
                                    <Stack gap={4}>
                                        <Checkbox label="Remisión" checked size="xs" />
                                        <Checkbox label="Certificado Calidad" checked size="xs" />
                                        <Checkbox label="Factura" checked size="xs" />
                                        <Checkbox label="Orden Compra" checked size="xs" />
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
        </Stack>
    );
}
