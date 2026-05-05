import React, { useState, useEffect, useMemo } from 'react';
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
    Loader,
    Tooltip
} from '@mantine/core';
import {
    IconSearch,
    IconPrinter,
    IconArrowLeft,
    IconCheck,
    IconX,
    IconExternalLink
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { notifications } from '@mantine/notifications';

const FichasTecnicas = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [fichas, setFichas] = useState([]);
    const [selectedId, setSelectedId] = useState(null);

    useEffect(() => {
        fetchFichas();
    }, []);

    const fetchFichas = async () => {
        try {
            setLoading(true);
            const data = await api.get('/production/technical-sheets');
            setFichas(data || []);
        } catch (error) {
            notifications.show({
                title: 'Error cargando fichas',
                message: error?.message || 'No se pudo consultar el listado de fichas técnicas.',
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setLoading(false);
        }
    };

    const filteredFichas = useMemo(() => fichas.filter(ficha =>
        (ficha.otNumber || '').toLowerCase().includes(search.toLowerCase()) ||
        (ficha.cliente || '').toLowerCase().includes(search.toLowerCase()) ||
        (ficha.productName || '').toLowerCase().includes(search.toLowerCase())
    ), [fichas, search]);

    const handleToggleApproval = async (id, approved) => {
        try {
            const result = await api.put(`/production/technical-sheets/${id}/approval`, { approved: !approved });
            setFichas(prev => prev.map(f =>
                f.id === id
                    ? {
                        ...f,
                        approved: result?.approved ?? !approved,
                        approvedAt: result?.approvedAt ?? null,
                        approvedBy: result?.approvedBy ?? null
                    }
                    : f
            ));

            notifications.show({
                title: !approved ? 'Ficha aprobada' : 'Aprobación removida',
                message: `La ficha técnica fue actualizada correctamente.`,
                color: !approved ? 'teal' : 'blue',
                icon: !approved ? <IconCheck size={16} /> : <IconX size={16} />,
            });
        } catch (error) {
            notifications.show({
                title: 'No se pudo actualizar',
                message: error?.message || 'Error al cambiar estado de aprobación.',
                color: 'red',
                icon: <IconX size={16} />,
            });
        }
    };

    const handlePrint = () => {
        if (!selectedId) {
            notifications.show({
                title: 'Selecciona una ficha',
                message: 'Selecciona una fila y luego pulsa Imprimir.',
                color: 'yellow',
            });
            return;
        }
        navigate(`/fichas/imprimir/${selectedId}`);
    };

    const handleOpenDocument = (partId) => {
        if (!partId) {
            return;
        }
        navigate(`/fichas/imprimir/${partId}`);
    };

    const rows = filteredFichas.map((ficha) => (
        <Table.Tr
            key={ficha.id}
            style={{
                cursor: 'pointer',
                background: selectedId === ficha.id ? 'rgba(79,70,229,0.18)' : 'transparent'
            }}
            onClick={() => setSelectedId(ficha.id)}
        >
            <Table.Td onClick={(e) => e.stopPropagation()}>
                <Checkbox
                    checked={Boolean(ficha.approved)}
                    onChange={() => handleToggleApproval(ficha.id, Boolean(ficha.approved))}
                    color="teal"
                />
            </Table.Td>
            <Table.Td
                onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDocument(ficha.id);
                }}
            >
                <Group gap={6}>
                    <Text
                        fw={500}
                        c="blue"
                        style={{ textDecoration: 'underline', cursor: 'pointer' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDocument(ficha.id);
                        }}
                    >
                        {ficha.otNumber}
                    </Text>
                    <Tooltip label="Abrir documento">
                        <IconExternalLink
                            size={14}
                            color="#60a5fa"
                            style={{ cursor: 'pointer' }}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDocument(ficha.id);
                            }}
                        />
                    </Tooltip>
                </Group>
            </Table.Td>
            <Table.Td>{ficha.pieza || '-'}</Table.Td>
            <Table.Td>{ficha.cliente || '-'}</Table.Td>
            <Table.Td>
                <Text size="sm" lineClamp={1}>{ficha.productName || '-'}</Text>
            </Table.Td>
            <Table.Td>{ficha.codigoTroquel || '-'}</Table.Td>
            <Table.Td>
                <Badge
                    color={ficha.approved ? 'teal' : 'gray'}
                    variant="light"
                >
                    {ficha.approved ? 'Aprobado' : 'Pendiente'}
                </Badge>
            </Table.Td>
            <Table.Td>{ficha.productCode || '-'}</Table.Td>
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
                                onClick={handlePrint}
                            >
                                Imprimir Ficha
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
                        {loading ? (
                            <Group justify="center" py="xl">
                                <Loader size="sm" />
                                <Text size="sm" c="dimmed">Cargando fichas...</Text>
                            </Group>
                        ) : (
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
                        )}
                    </ScrollArea>
                </Stack>
            </Paper>
        </Container>
    );
};

export default FichasTecnicas;
