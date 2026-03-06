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
    ThemeIcon,
    Divider,
    Table,
    ScrollArea,
    ActionIcon,
    Badge,
    Tooltip,
    rem
} from '@mantine/core';
import {
    IconSearch,
    IconEdit,
    IconEye,
    IconX,
    IconChevronRight,
    IconCircleCheck,
    IconCircleX
} from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Mock data based on the screenshot provided by the user
const MOCK_DATA = [
    { id: '2559 / 1', linea: 'Otro', cliente: 'LINK SYSTEMS LLC', producto: 'WHITE CREPE HOLDER', pieza: 'Pieza Unica', fecha: '12/01/2026', ejecutivo: 'Claude Levy', siigo: 'Exportación', aprobado: false },
    { id: '2556 / 12026 / 1', linea: 'Caja o Plegadiza', cliente: 'LINK SYSTEMS LLC', producto: 'Plegadizas Ref: tequenos x 20 unds DELICIA', pieza: 'Pieza Unica', fecha: '22/12/2025', ejecutivo: 'Claude Levy', siigo: 'Exportación', aprobado: true },
    { id: '2555 / 122025 / 1', linea: 'Caja o Plegadiza', cliente: 'LINK SYSTEMS LLC', producto: 'Plegadizas Ref: Tequenos 40 unds DELICIAS', pieza: 'Pieza Unica', fecha: '22/12/2025', ejecutivo: 'Claude Levy', siigo: 'Exportación', aprobado: true },
    { id: '2549 / 122025 / 1', linea: 'Caja o Plegadiza', cliente: 'INSTANTA COLOMBIA ZF S.', producto: 'INSK 200 X 12 T-K', pieza: 'Pieza Unica', fecha: '17/12/2025', ejecutivo: 'Claude Levy', siigo: 'Zona Franca', aprobado: false },
    { id: '2540 / 122025 / 1', linea: 'Bolsa', cliente: 'STF GROUP S.A.', producto: 'BOLSA ECOMERCE GRANDE STUDIO F', pieza: 'Pieza Unica', fecha: '12/12/2025', ejecutivo: 'Claude Levy', siigo: 'Nacional', aprobado: false },
];

export default function ListaOT() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [scrolled, setScrolled] = useState(false);

    // Filter logic
    const filteredData = MOCK_DATA.filter(item =>
        Object.values(item).some(val =>
            String(val).toLowerCase().includes(search.toLowerCase())
        )
    );

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

    const rows = filteredData.map((item) => (
        <Table.Tr key={item.id} style={{
            transition: 'background-color 0.2s ease',
            backgroundColor: 'transparent'
        }}>
            <Table.Td>
                <Text size="sm" fw={700} c="indigo.4">{item.id}</Text>
            </Table.Td>
            <Table.Td><Text size="sm">{item.linea}</Text></Table.Td>
            <Table.Td><Text size="sm" fw={500}>{item.cliente}</Text></Table.Td>
            <Table.Td><Text size="sm" style={{ maxWidth: 300 }} truncate>{item.producto}</Text></Table.Td>
            <Table.Td><Text size="sm">{item.pieza}</Text></Table.Td>
            <Table.Td><Text size="sm">{item.fecha}</Text></Table.Td>
            <Table.Td><Text size="sm">{item.ejecutivo}</Text></Table.Td>
            <Table.Td><Text size="sm">{item.siigo}</Text></Table.Td>
            <Table.Td>
                <Badge
                    variant="light"
                    color={item.aprobado ? 'green' : 'yellow'}
                    leftSection={item.aprobado ? <IconCircleCheck size={12} /> : <IconCircleX size={12} />}
                >
                    {item.aprobado ? 'Aprobado' : 'Pendiente'}
                </Badge>
            </Table.Td>
            <Table.Td>
                <Group gap={8} justify="flex-end">
                    {item.aprobado ? (
                        <Tooltip label="OT Aprobada - Solo lectura">
                            <ActionIcon variant="light" color="blue" size="sm">
                                <IconEye size={16} />
                            </ActionIcon>
                        </Tooltip>
                    ) : (
                        <Tooltip label="Editar OT">
                            <ActionIcon
                                variant="light"
                                color="indigo"
                                size="sm"
                                onClick={() => navigate('/ordenes/nueva')}
                            >
                                <IconEdit size={16} />
                            </ActionIcon>
                        </Tooltip>
                    )}
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Stack spacing="lg" p="md">
            <Group justify="space-between" align="flex-end">
                <Stack gap={4}>
                    <Title order={2} style={{ color: '#fff', letterSpacing: '-0.5px' }}>Listado General de OT</Title>
                    <Text c="dimmed" size="sm">Consulta y gestión de órdenes de trabajo</Text>
                </Stack>
                <Button
                    variant="light"
                    color="red"
                    leftSection={<IconX size={18} />}
                    onClick={() => navigate('/')}
                    styles={{ root: { borderRadius: '10px' } }}
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
                        styles={{
                            input: {
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '10px'
                            }
                        }}
                    />
                </Box>

                <ScrollArea h={600} onScrollPositionChange={({ y }) => setScrolled(y !== 0)}>
                    <Table
                        verticalSpacing="sm"
                        horizontalSpacing="md"
                        highlightOnHover
                        stickyHeader
                        styles={{
                            thead: {
                                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                backdropFilter: 'blur(10px)',
                            },
                            th: {
                                color: '#94a3b8',
                                fontSize: '12px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                fontWeight: 700,
                                borderBottom: '1px solid rgba(255,255,255,0.1) !important'
                            },
                            td: {
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                color: '#e2e8f0'
                            }
                        }}
                    >
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>OT No</Table.Th>
                                <Table.Th>Línea</Table.Th>
                                <Table.Th>Cliente</Table.Th>
                                <Table.Th>Producto y Ref</Table.Th>
                                <Table.Th>Pieza N</Table.Th>
                                <Table.Th>Fecha</Table.Th>
                                <Table.Th>Ejecutivo</Table.Th>
                                <Table.Th>SIIGO</Table.Th>
                                <Table.Th>Estado</Table.Th>
                                <Table.Th style={{ textAlign: 'right' }}>Acciones</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>{rows}</Table.Tbody>
                    </Table>
                    {filteredData.length === 0 && (
                        <Box p="xl" style={{ textAlign: 'center' }}>
                            <Text c="dimmed">No se encontraron órdenes de trabajo</Text>
                        </Box>
                    )}
                </ScrollArea>

                <Box p="xs" style={{ background: 'rgba(0,0,0,0.2)', textAlign: 'right' }}>
                    <Text size="xs" c="dimmed" pr="md">Mostrando {filteredData.length} de {MOCK_DATA.length} registros</Text>
                </Box>
            </Card>
        </Stack>
    );
}
