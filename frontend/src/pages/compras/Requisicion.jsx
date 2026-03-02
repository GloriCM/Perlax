import {
    Table,
    Card,
    Title,
    Text,
    Group,
    Button,
    ActionIcon,
    Badge,
    Box,
    rem,
    TextInput,
    Pagination,
    Modal,
    SimpleGrid,
    Divider,
    Stack,
    Image,
    Tabs,
    Textarea,
    Tooltip
} from '@mantine/core';
import {
    IconPlus,
    IconEdit,
    IconEye,
    IconSearch,
    IconFileDownload,
    IconPrinter,
    IconClipboardList,
    IconDownload,
    IconSend,
    IconShoppingCartCog,
    IconX,
    IconArrowLeft,
    IconPackage,
    IconCheck
} from '@tabler/icons-react';
import { useState } from 'react';
import { useDisclosure } from '@mantine/hooks';

// Mock data reduced to 2 items as requested
const mockData = [
    {
        id: '2260',
        date: '2/10/2025',
        op: '',
        product: 'BOLSA FASHION 33X37.8X13 JOSH',
        total: 110500.0,
        client: 'SOCIEDAD DISTRIBUIDORA DE CALZADO SAS',
        qtyToProduce: '4.400',
        createdBy: 'Producción Producción',
        items: [
            { category: 'CORDONES CINTAS Y MANIJAS', productName: 'HILAZA POLIESTER NEGRO MASA UN CABO', description: 'Procesar 8.200 cordones con corte a 35 cms con cargo a la orden de producción 8547', unit: 'Kg', requested: 13.00, inventory: 83.40, priority: 'Urgente', toBuy: 20.00, unitCost: 8500.0 }
        ]
    },
    {
        id: '2259',
        date: '21/04/2025',
        op: '12111 01',
        product: 'BOLSA FASHION 33X37.8X13 JOSH',
        total: 110500.0,
        client: 'DISTRIBUIDORA EJEMPLO LTDA',
        qtyToProduce: '2.500',
        createdBy: 'Producción Producción',
        items: [
            { category: 'ADITIVOS', productName: 'PEGA BLANCA INDUSTRIAL', description: 'PEGA BLANCA INDUSTRIAL', unit: 'Gl', requested: 5.00, inventory: 12.00, priority: 'Normal', toBuy: 0.00, unitCost: 12000.0 }
        ]
    },
];

export default function Requisicion() {
    const [search, setSearch] = useState('');
    const [opened, { open, close }] = useDisclosure(false);
    const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
    const [selectedReq, setSelectedReq] = useState(null);

    const handlePreview = (item) => {
        setSelectedReq(item);
        open();
    };

    const handleEdit = (item) => {
        setSelectedReq(item);
        openEdit();
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 1
        }).format(value);
    };

    const totalSum = mockData.reduce((acc, curr) => acc + curr.total, 0);

    const rows = mockData.map((item, index) => (
        <Table.Tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <Table.Td>
                <Text size="sm" fw={600} c="indigo.4">{item.id}</Text>
            </Table.Td>
            <Table.Td>
                <Text size="sm" c="dimmed">{item.date}</Text>
            </Table.Td>
            <Table.Td>
                <Badge variant="dot" color={item.op ? "teal" : "gray"} radius="sm">
                    {item.op || 'N/A'}
                </Badge>
            </Table.Td>
            <Table.Td>
                <Text size="sm" c="white" fw={500}>{item.product || '---'}</Text>
            </Table.Td>
            <Table.Td align="right">
                <Text size="sm" fw={700} c={item.total > 0 ? "white" : "dimmed"}>
                    {formatCurrency(item.total)}
                </Text>
            </Table.Td>
            <Table.Td>
                <Group gap={4} justify="flex-end">
                    <Tooltip label="Ver Detalle" position="top">
                        <ActionIcon variant="subtle" color="indigo" size="sm" onClick={() => handlePreview(item)}>
                            <IconEye size={16} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Editar Pedido" position="top">
                        <ActionIcon variant="subtle" color="indigo" size="sm" onClick={() => handleEdit(item)}>
                            <IconEdit size={16} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <div className="fade-in" style={{ paddingBottom: 40 }}>
            {/* Header Section */}
            <Card className="glass-card" mb="xl" style={{ borderLeft: '4px solid #6366f1' }}>
                <Group justify="space-between" align="center">
                    <div>
                        <Group gap="xs" mb={4}>
                            <IconClipboardList size={22} color="#6366f1" />
                            <Title order={3} c="white">Requerimientos de Producción</Title>
                        </Group>
                        <Text size="sm" c="dimmed">Listado maestro de requisiciones y órdenes de insumos.</Text>
                    </div>
                    <Group>
                        <Button leftSection={<IconPlus size={18} />} variant="filled" color="indigo" radius="md">
                            Nuevo
                        </Button>
                        <Button leftSection={<IconPrinter size={18} />} variant="light" color="gray" radius="md">
                            Vista Previa
                        </Button>
                    </Group>
                </Group>
            </Card>

            {/* Table Section */}
            <Card className="glass-card" p={0}>
                <Box p="md" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <Group justify="space-between">
                        <TextInput
                            placeholder="Buscar por ID, OP o Producto..."
                            leftSection={<IconSearch size={16} stroke={1.5} />}
                            size="sm"
                            style={{ width: 350 }}
                            variant="filled"
                            styles={{
                                input: {
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white',
                                    '&:focus': {
                                        borderColor: '#6366f1'
                                    }
                                }
                            }}
                        />
                        <ActionIcon variant="light" color="gray" size="lg">
                            <IconFileDownload size={20} />
                        </ActionIcon>
                    </Group>
                </Box>

                <Table verticalSpacing="sm" highlightOnHover>
                    <Table.Thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <Table.Tr>
                            <Table.Th c="dimmed" fw={600}>Nº</Table.Th>
                            <Table.Th c="dimmed" fw={600}>Fecha de creación</Table.Th>
                            <Table.Th c="dimmed" fw={600}>Orden de Producción</Table.Th>
                            <Table.Th c="dimmed" fw={600}>Nombre del producto y ref</Table.Th>
                            <Table.Th c="dimmed" fw={600} align="right" style={{ textAlign: 'right' }}>Total</Table.Th>
                            <Table.Th />
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{rows}</Table.Tbody>
                    <Table.Tfoot style={{ background: 'rgba(99, 102, 241, 0.05)' }}>
                        <Table.Tr>
                            <Table.Td colSpan={4}>
                                <Text fw={700} c="white" size="lg">TOTAL ACUMULADO</Text>
                            </Table.Td>
                            <Table.Td align="right">
                                <Text fw={800} c="indigo.4" size="lg">
                                    {formatCurrency(totalSum)}
                                </Text>
                            </Table.Td>
                            <Table.Td />
                        </Table.Tr>
                    </Table.Tfoot>
                </Table>

                <Box p="md">
                    <Group justify="space-between">
                        <Text size="xs" c="dimmed">Mostrando 1 a 2 de 2,253 registros</Text>
                        <Pagination total={174} size="sm" radius="md" color="indigo" />
                    </Group>
                </Box>
            </Card>

            {/* Modal Detail (REVISAR) */}
            <Modal
                opened={opened}
                onClose={close}
                size="80%"
                radius="lg"
                padding={0}
                withCloseButton={false}
                styles={{
                    content: {
                        background: '#0f172a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                    }
                }}
            >
                {selectedReq && (
                    <Box p={40}>
                        {/* Modal Header */}
                        <Group justify="space-between" align="flex-start" mb={40}>
                            <Stack gap={4}>
                                <Title order={2} c="white" fw={800}>
                                    ORDEN DE REQUERIMIENTO <Text span c="red.6" inherit>N° {selectedReq.id}</Text>
                                </Title>
                                <Text size="sm" c="dimmed">Viernes, 27 de febrero de 2026 | 11:48:12 a. m.</Text>
                            </Stack>
                            <img src="/Nuevo-perla-Sinfondo.png" alt="Logo" style={{ height: 60, opacity: 0.8 }} />
                        </Group>

                        {/* Info Grid */}
                        <Box
                            mb={40}
                            p="xl"
                            style={{
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: 16,
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}
                        >
                            <SimpleGrid cols={1} spacing="xs">
                                <Group wrap="nowrap">
                                    <Text w={180} size="sm" fw={700} c="indigo.3">Fecha solicitud</Text>
                                    <Text size="sm" c="white">{selectedReq.date}</Text>
                                </Group>
                                <Divider opacity={0.1} />
                                <Group wrap="nowrap">
                                    <Text w={180} size="sm" fw={700} c="indigo.3">Cliente</Text>
                                    <Text size="sm" c="white" tt="uppercase">{selectedReq.client}</Text>
                                </Group>
                                <Divider opacity={0.1} />
                                <Group wrap="nowrap">
                                    <Text w={180} size="sm" fw={700} c="indigo.3">Trabajo</Text>
                                    <Text size="sm" c="white">{selectedReq.product}</Text>
                                </Group>
                                <Divider opacity={0.1} />
                                <Group wrap="nowrap">
                                    <Text w={180} size="sm" fw={700} c="indigo.3">Ctd a producir</Text>
                                    <Text size="sm" c="white">{selectedReq.qtyToProduce}</Text>
                                </Group>
                                <Divider opacity={0.1} />
                                <Group wrap="nowrap">
                                    <Text w={180} size="sm" fw={700} c="indigo.3">Orden de Produ.</Text>
                                    <Text size="sm" c="white">{selectedReq.op || 'S/N'}</Text>
                                </Group>
                            </SimpleGrid>
                        </Box>

                        {/* Items Table */}
                        <Title order={5} c="white" mb="md" fw={700}>Detalle de Insumos</Title>
                        <Table
                            verticalSpacing="md"
                            style={{
                                borderRadius: 12,
                                overflow: 'hidden',
                                background: 'rgba(255,255,255,0.02)'
                            }}
                        >
                            <Table.Thead style={{ background: 'rgba(99,102,241,0.2)' }}>
                                <Table.Tr>
                                    <Table.Th c="white" style={{ border: 'none' }}>Categoría</Table.Th>
                                    <Table.Th c="white" style={{ border: 'none' }}>Descripción</Table.Th>
                                    <Table.Th c="white" style={{ border: 'none' }} align="center">Uni</Table.Th>
                                    <Table.Th c="white" style={{ border: 'none' }} align="right">Ctd Solicitud</Table.Th>
                                    <Table.Th c="white" style={{ border: 'none' }} align="right">Inv Almacén</Table.Th>
                                    <Table.Th c="white" style={{ border: 'none' }}>Prioridad</Table.Th>
                                    <Table.Th c="white" style={{ border: 'none' }} align="right">Cant a comprar</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {selectedReq.items.map((row, i) => (
                                    <Table.Tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <Table.Td>
                                            <Text size="xs" fw={700} c="indigo.4">{row.category}</Text>
                                        </Table.Td>
                                        <Table.Td style={{ maxWidth: 300 }}>
                                            <Text size="xs" c="white">{row.description}</Text>
                                        </Table.Td>
                                        <Table.Td align="center">
                                            <Text size="xs" c="dimmed">{row.unit}</Text>
                                        </Table.Td>
                                        <Table.Td align="right">
                                            <Text size="xs" fw={700} c="white">{row.requested.toFixed(2)}</Text>
                                        </Table.Td>
                                        <Table.Td align="right">
                                            <Text size="xs" c="teal.4">{row.inventory.toFixed(2)}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge size="xs" variant="light" color={row.priority === 'Urgente' ? 'red' : 'indigo'}>
                                                {row.priority}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td align="right">
                                            <Text size="xs" fw={700} c="orange.4">{row.toBuy.toFixed(2)}</Text>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>

                        {/* Modal Footer */}
                        <Group justify="space-between" mt={40}>
                            <Text size="xs" c="dimmed">Perla v1.0.0 | Página 1 de 1</Text>
                            <Group>
                                <Button variant="light" color="gray" radius="md" onClick={close}>Cerrar</Button>
                                <Button leftSection={<IconDownload size={18} />} variant="filled" color="indigo" radius="md">Descargar PDF</Button>
                            </Group>
                        </Group>
                    </Box>
                )}
            </Modal>

            {/* Modal Edit (OPCIONES DE EDICIÓN) */}
            <Modal
                opened={editOpened}
                onClose={closeEdit}
                size="95%"
                radius="lg"
                padding={0}
                withCloseButton={false}
                styles={{
                    content: {
                        background: '#0f172a',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }
                }}
            >
                {selectedReq && (
                    <Box>
                        {/* Custom Header Blue Bar */}
                        <Box sx={{ background: '#1e293b' }} p="md">
                            <Group justify="space-between">
                                <Group gap="xs">
                                    <IconPackage size={32} color="#6366f1" />
                                    <Title order={3} c="white">Pedido de Requerimiento <Text span fw={900} c="white">n° {selectedReq.id}</Text></Title>
                                </Group>
                                <Group>
                                    <Text size="sm" c="dimmed">Estado</Text>
                                    <Badge color="blue" variant="light">Nuevo</Badge>
                                </Group>
                            </Group>

                            {/* Legacy-style Toolbar */}
                            <Group mt="xl" justify="center" gap={40}>
                                <Stack align="center" gap={4} style={{ cursor: 'pointer' }}>
                                    <IconArrowLeft size={24} color="#94a3b8" />
                                    <Text size="xs" c="dimmed">Lista de Solicitudes</Text>
                                </Stack>
                                <Stack align="center" gap={4} style={{ cursor: 'pointer' }}>
                                    <IconPrinter size={24} color="#94a3b8" />
                                    <Text size="xs" c="dimmed">Imprimir</Text>
                                </Stack>
                                <Stack align="center" gap={4} style={{ cursor: 'pointer' }}>
                                    <IconSend size={24} color="#94a3b8" />
                                    <Text size="xs" c="dimmed">Enviar a Compras</Text>
                                </Stack>
                                <Stack align="center" gap={4} style={{ cursor: 'pointer' }}>
                                    <IconShoppingCartCog size={24} color="#94a3b8" />
                                    <Text size="xs" c="dimmed">Gestión Compra</Text>
                                </Stack>
                                <Stack align="center" gap={4} style={{ cursor: 'pointer' }}>
                                    <IconX size={24} color="#f43f5e" />
                                    <Text size="xs" c="dimmed">Cancelar compra</Text>
                                </Stack>
                                <Stack align="center" gap={4} style={{ cursor: 'pointer' }} onClick={closeEdit}>
                                    <IconCheck size={24} color="#10b981" />
                                    <Text size="xs" c="dimmed">Guardar y Cerrar</Text>
                                </Stack>
                            </Group>
                        </Box>

                        <Box p="xl">
                            {/* Main Form Area */}
                            <Card withBorder style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }} p="xl" radius="md">
                                <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
                                    <Stack gap="sm">
                                        <TextInput label="Orden Produc." placeholder="Buscar OP..." variant="filled" value={selectedReq.op} styles={{ input: { background: 'rgba(255,255,255,0.05)' } }} />
                                        <TextInput label="Creado por" value={selectedReq.createdBy} readOnly variant="filled" styles={{ input: { background: 'rgba(255,255,255,0.03)' } }} />
                                        <TextInput label="Enviado por" readOnly variant="filled" styles={{ input: { background: 'rgba(255,255,255,0.03)' } }} />
                                        <TextInput label="Aprobado por" readOnly variant="filled" styles={{ input: { background: 'rgba(255,255,255,0.03)' } }} />
                                    </Stack>

                                    <Stack gap="sm">
                                        <TextInput label="Fecha prevista" value={selectedReq.date} variant="filled" styles={{ input: { background: 'rgba(255,255,255,0.05)' } }} />
                                        <TextInput label="Fecha de creación" value={selectedReq.date} readOnly variant="filled" styles={{ input: { background: 'rgba(255,255,255,0.03)' } }} />
                                        <TextInput label="Fecha de envío" readOnly variant="filled" styles={{ input: { background: 'rgba(255,255,255,0.03)' } }} />
                                        <TextInput label="Fecha de aprobación" readOnly variant="filled" styles={{ input: { background: 'rgba(255,255,255,0.03)' } }} />
                                    </Stack>

                                    <Stack gap="sm">
                                        <Textarea label="Notas" placeholder="Observaciones adicionales..." minRows={8} variant="filled" styles={{ input: { background: 'rgba(255,255,255,0.05)' } }} />
                                    </Stack>
                                </SimpleGrid>
                            </Card>

                            {/* Tabs Detail */}
                            <Box mt="xl">
                                <Tabs defaultValue="detalle" variant="outline" styles={{
                                    tab: {
                                        color: '#94a3b8',
                                        '&[data-active]': { color: '#6366f1', borderColor: '#6366f1' }
                                    }
                                }}>
                                    <Tabs.List>
                                        <Tabs.Tab value="detalle">Detalle</Tabs.Tab>
                                        <Tabs.Tab value="adjuntos">Adjuntos</Tabs.Tab>
                                    </Tabs.List>

                                    <Tabs.Panel value="detalle" pt="xs">
                                        <Table withColumnBorders verticalSpacing="sm" style={{ background: 'rgba(255,255,255,0.01)' }}>
                                            <Table.Thead>
                                                <Table.Tr>
                                                    <Table.Th>Producto</Table.Th>
                                                    <Table.Th>Detalles</Table.Th>
                                                    <Table.Th>Ctd almacén</Table.Th>
                                                    <Table.Th>Costo unitario</Table.Th>
                                                    <Table.Th>Precio total</Table.Th>
                                                    <Table.Th>Prioridad de compra</Table.Th>
                                                    <Table.Th>Cantidad a comprar</Table.Th>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {selectedReq.items.map((item, i) => (
                                                    <Table.Tr key={i}>
                                                        <Table.Td><Text size="xs">{item.productName}</Text></Table.Td>
                                                        <Table.Td><Text size="xs" c="dimmed" lineClamp={2}>{item.description}</Text></Table.Td>
                                                        <Table.Td align="right"><Text size="xs">{item.inventory}</Text></Table.Td>
                                                        <Table.Td align="right"><Text size="xs">{formatCurrency(item.unitCost)}</Text></Table.Td>
                                                        <Table.Td align="right"><Text size="xs" fw={700}>{formatCurrency(item.total || (item.requested * item.unitCost))}</Text></Table.Td>
                                                        <Table.Td><Badge size="xs" color={item.priority === 'Urgente' ? 'red' : 'blue'}>{item.priority}</Badge></Table.Td>
                                                        <Table.Td align="right"><Text size="xs" fw={700} c="indigo.4">{item.toBuy}</Text></Table.Td>
                                                    </Table.Tr>
                                                ))}
                                            </Table.Tbody>
                                        </Table>
                                    </Tabs.Panel>
                                </Tabs>
                            </Box>
                        </Box>
                    </Box>
                )}
            </Modal>
        </div>
    );
}
