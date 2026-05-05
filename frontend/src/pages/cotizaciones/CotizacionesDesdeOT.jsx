import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, Group, ScrollArea, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';
import { api } from '../../utils/api';

export default function CotizacionesDesdeOT() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const run = async () => {
            const data = await api.get('/production/quotations/from-ot');
            setOrders(data || []);
        };
        run();
    }, []);

    const filtered = useMemo(() =>
        orders.filter(o =>
            (o.otNumber || '').toLowerCase().includes(search.toLowerCase()) ||
            (o.cliente || '').toLowerCase().includes(search.toLowerCase()) ||
            (o.productName || '').toLowerCase().includes(search.toLowerCase())),
        [orders, search]
    );

    return (
        <Stack gap="lg" p="md">
            <Group justify="space-between">
                <Stack gap={2}>
                    <Title order={2} c="white">Cotización desde una OT</Title>
                    <Text c="dimmed" size="sm">Doble clic en Numero OT para abrir el formulario de cotización.</Text>
                </Stack>
                <Group>
                    <Button variant="light" color="violet" onClick={() => navigate('/cotizaciones/manual')}>
                        Ir a Cotización Manual
                    </Button>
                    <Button variant="light" color="red" leftSection={<IconX size={16} />} onClick={() => navigate('/')}>
                        Cerrar
                    </Button>
                </Group>
            </Group>

            <Card className="glass-card">
                <TextInput
                    placeholder="Buscar OT, cliente o producto..."
                    leftSection={<IconSearch size={16} />}
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    mb="md"
                />
                <ScrollArea h={620}>
                    <Table highlightOnHover stickyHeader>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Numero OT</Table.Th>
                                <Table.Th>Cliente</Table.Th>
                                <Table.Th>Producto y Ref</Table.Th>
                                <Table.Th>Fecha</Table.Th>
                                <Table.Th>Estado</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {filtered.map(item => (
                                <Table.Tr key={item.id}>
                                    <Table.Td>
                                        <Text
                                            c="blue"
                                            fw={700}
                                            style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                            onDoubleClick={() => navigate(`/cotizaciones/desde-ot/${item.id}`)}
                                        >
                                            {item.otNumber}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>{item.cliente}</Table.Td>
                                    <Table.Td>{item.productName}</Table.Td>
                                    <Table.Td>{new Date(item.createdAt).toLocaleDateString()}</Table.Td>
                                    <Table.Td><Badge color="gray">Disponible</Badge></Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>
            </Card>
        </Stack>
    );
}
