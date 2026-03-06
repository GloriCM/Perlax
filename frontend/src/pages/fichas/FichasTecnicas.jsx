import React, { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    Title,
    Text,
    Table,
    Group,
    ActionIcon,
    TextInput,
    Button,
    Badge,
    Checkbox,
    ScrollArea,
    Stack,
    Tooltip
} from '@mantine/core';
import {
    IconSearch,
    IconPrinter,
    IconTrash,
    IconArrowLeft,
    IconCheck,
    IconX
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { notifications } from '@mantine/notifications';

const FichasTecnicas = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [fichas, setFichas] = useState([]);

    // Mock data for initial development (based on screenshot)
    const mockFichas = [
        { id: 1, ot: '2557 / 22026 / 1', pieza: '', cliente: 'LINK\'T SYSTEMS LLC', nombre: '', troquel: '', aprobacion: false, sap: '' },
        { id: 2, ot: '2556 / 12026 / 1', pieza: 'Pieza Unica', cliente: 'LINK\'T SYSTEMS LLC', nombre: 'WHITE CREPE HOLDER', troquel: 'T2-046', aprobacion: false, sap: '' },
        { id: 3, ot: '2555 / 122025 / 1', pieza: 'Pieza Unica', cliente: 'LINK\'T SYSTEMS LLC', nombre: 'Plegadizas Ref: tequenos x 20 unds DELICIAS LLANERAS', troquel: 'T3-003', aprobacion: true, sap: '' },
        { id: 4, ot: '2554 / 122025 / 1', pieza: 'Pieza Unica', cliente: 'LINK\'T SYSTEMS LLC', nombre: 'Plegadizas Ref: tequenos 40 unds DELICIAS LLANERAS', troquel: 'T3-002', aprobacion: true, sap: '' },
        { id: 5, ot: '2553 / 122025 / 1', pieza: 'Pieza Unica', cliente: 'LINK\'T SYSTEMS LLC', nombre: 'Plegadiza Ref: Tequenos x 100 DELICIAS LLANERAS', troquel: 'T3-006', aprobacion: true, sap: '' },
        { id: 6, ot: '2551 / 122025 / 1', pieza: 'Pieza Unica', cliente: 'LINK\'T SYSTEMS LLC', nombre: 'Plegadiza Ref: Cherry Pink KUMS', troquel: '', aprobacion: true, sap: '' },
    ];

    useEffect(() => {
        // In a real scenario, fetch from API
        // api.get('/fichas').then(res => setFichas(res.data));
        setFichas(mockFichas);
        setLoading(false);
    }, []);

    const filteredFichas = fichas.filter(ficha =>
        ficha.ot.toLowerCase().includes(search.toLowerCase()) ||
        ficha.cliente.toLowerCase().includes(search.toLowerCase()) ||
        ficha.nombre.toLowerCase().includes(search.toLowerCase())
    );

    const handleToggleApproval = (id) => {
        setFichas(prev => prev.map(f =>
            f.id === id ? { ...f, aprobacion: !f.aprobacion } : f
        ));

        const isApproved = !fichas.find(f => f.id === id).aprobacion;
        notifications.show({
            title: isApproved ? 'Ficha Aprobada' : 'Aprobación Removida',
            message: `La ficha OT ${fichas.find(f => f.id === id).ot} ha sido actualizada.`,
            color: isApproved ? 'teal' : 'blue',
            icon: isApproved ? <IconCheck size={16} /> : <IconX size={16} />,
        });
    };

    const handlePrint = (id) => {
        navigate(`/fichas/imprimir/${id}`);
    };

    const rows = filteredFichas.map((ficha) => (
        <Table.Tr key={ficha.id} style={{ cursor: 'pointer' }} onClick={() => handlePrint(ficha.id)}>
            <Table.Td onClick={(e) => e.stopPropagation()}>
                <Checkbox
                    checked={ficha.aprobacion}
                    onChange={() => handleToggleApproval(ficha.id)}
                    color="teal"
                />
            </Table.Td>
            <Table.Td>
                <Text fw={500} c="blue">{ficha.ot}</Text>
            </Table.Td>
            <Table.Td>{ficha.pieza}</Table.Td>
            <Table.Td>{ficha.cliente}</Table.Td>
            <Table.Td>
                <Text size="sm" lineClamp={1}>{ficha.nombre}</Text>
            </Table.Td>
            <Table.Td>{ficha.troquel}</Table.Td>
            <Table.Td>
                <Badge
                    color={ficha.aprobacion ? 'teal' : 'gray'}
                    variant="light"
                >
                    {ficha.aprobacion ? 'Aprobado' : 'Pendiente'}
                </Badge>
            </Table.Td>
            <Table.Td>{ficha.sap}</Table.Td>
        </Table.Tr>
    ));

    return (
        <Container size="xl" py="xl">
            <Paper
                p="md"
                radius="md"
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
            >
                <Stack>
                    <Group justify="space-between">
                        <Group>
                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                onClick={() => navigate('/')}
                                title="Volver al Dashboard"
                            >
                                <IconArrowLeft size={20} />
                            </ActionIcon>
                            <div>
                                <Text size="xs" c="dimmed" fw={700} style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    Fichas Técnicas
                                </Text>
                                <Title order={2} c="white">Listado General de Fichas Técnicas</Title>
                            </div>
                        </Group>
                        <Group>
                            <Button
                                variant="light"
                                leftSection={<IconPrinter size={16} />}
                                color="blue"
                            >
                                Imprimir Ficha
                            </Button>
                            <Button
                                variant="light"
                                leftSection={<IconTrash size={16} />}
                                color="red"
                            >
                                Eliminar Ficha
                            </Button>
                            <Button
                                variant="subtle"
                                color="gray"
                                onClick={() => navigate('/')}
                            >
                                Cerrar
                            </Button>
                        </Group>
                    </Group>

                    <TextInput
                        placeholder="Buscar por OT, Cliente o Producto..."
                        leftSection={<IconSearch size={16} />}
                        value={search}
                        onChange={(event) => setSearch(event.currentTarget.value)}
                        styles={{
                            input: {
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: 'white',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                            }
                        }}
                    />

                    <ScrollArea h={600} offsetScrollbars>
                        <Table verticalSpacing="sm" highlightOnHover>
                            <Table.Thead style={{ background: 'rgba(0, 0, 0, 0.2)', position: 'sticky', top: 0, zIndex: 1 }}>
                                <Table.Tr>
                                    <Table.Th style={{ color: 'white' }}>Aprobar</Table.Th>
                                    <Table.Th style={{ color: 'white' }}>Numero OT</Table.Th>
                                    <Table.Th style={{ color: 'white' }}>Pieza N</Table.Th>
                                    <Table.Th style={{ color: 'white' }}>Cliente</Table.Th>
                                    <Table.Th style={{ color: 'white' }}>Nombre del producto y ref</Table.Th>
                                    <Table.Th style={{ color: 'white' }}>Codigo Troquel</Table.Th>
                                    <Table.Th style={{ color: 'white' }}>Aprobación</Table.Th>
                                    <Table.Th style={{ color: 'white' }}>Codigo SAP</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>{rows}</Table.Tbody>
                        </Table>
                    </ScrollArea>
                </Stack>
            </Paper>
        </Container>
    );
};

export default FichasTecnicas;
