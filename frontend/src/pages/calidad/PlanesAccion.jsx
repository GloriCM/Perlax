import React from 'react';
import {
    Container,
    Paper,
    Title,
    Text,
    Group,
    Stack,
    Button,
    ActionIcon,
    Box,
    Select,
    Table,
    Badge,
    ScrollArea,
    Progress,
    Tooltip
} from '@mantine/core';
import {
    IconArrowLeft,
    IconRefresh,
    IconRocket,
    IconPlus,
    IconEye,
    IconPencil,
    IconTrash,
    IconDotsVertical
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

const mockPlanesData = [
    {
        id: '1',
        proceso: 'Troquelado',
        hallazgo: 'Falla en el ajuste de presión de la troqueladora, genera rebaba en el borde superior.',
        accion: 'Capacitación a operario y ajuste de parámetros de presión mensual.',
        responsable: 'Barona Erik',
        fechaCompromiso: '20/3/2026',
        estado: 'En ejecución',
        avance: 65,
        semaforo: 'orange',
        dias: 4
    },
    {
        id: '2',
        proceso: 'Impresión',
        hallazgo: 'Defecto de material base (papel) con marcas de agua en el lote 458.',
        accion: 'Devolución a proveedor y cambio de lote con inspección previa.',
        responsable: 'Garantía Calidad',
        fechaCompromiso: '18/3/2026',
        estado: 'Terminado',
        avance: 100,
        semaforo: 'green',
        dias: 0
    }
];

const PlanesAccion = () => {
    const navigate = useNavigate();

    return (
        <Container size="xl" py="md">
            {/* Header */}
            <Paper p="xs" radius="lg" mb="sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Group justify="space-between" align="center">
                    <Group>
                        <Button
                            variant="filled"
                            color="gray.8"
                            size="compact-xs"
                            leftSection={<IconArrowLeft size={14} />}
                            onClick={() => navigate('/')}
                            fw={700}
                        >
                            Volver al Panel
                        </Button>
                        <Title order={4} c="white" ml="xl">Planes de Acción</Title>
                    </Group>
                    <img src="/Nuevo-perla-Sinfondo.png" alt="Perla" style={{ height: 30 }} />
                </Group>
            </Paper>

            <Group justify="space-between" align="flex-end" mb="md">
                <Box>
                    <Group align="center" gap="xs">
                        <IconRocket size={24} color="white" />
                        <Title order={2} c="white">Planes de Acción</Title>
                    </Group>
                </Box>
                <Button variant="filled" color="blue" leftSection={<IconPlus size={18} />} size="sm" fw={700}>
                    + Nuevo Plan
                </Button>
            </Group>

            {/* Main Table */}
            <Paper p="0" radius="md" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <ScrollArea offsetScrollbars scrollbarSize={10}>
                    <Table
                        verticalSpacing={1}
                        horizontalSpacing="md"
                        mih={1200}
                        style={{ tableLayout: 'fixed' }}
                        styles={{
                            th: { padding: '6px 8px !important', fontSize: '10px', background: '#1a1b1e' },
                            td: { padding: '4px 8px !important', fontSize: '11px' }
                        }}
                    >
                        <thead>
                            <tr>
                                <th style={{ color: 'white', width: '40px' }}>ID</th>
                                <th style={{ color: 'white', width: '100px' }}>Proceso</th>
                                <th style={{ color: 'white', width: '250px' }}>Hallazgo / Problema</th>
                                <th style={{ color: 'white', width: '250px' }}>Acción Correctiva</th>
                                <th style={{ color: 'white', width: '130px' }}>Responsable</th>
                                <th style={{ color: 'white', width: '100px' }}>F. Comprom.</th>
                                <th style={{ color: 'white', width: '100px' }}>Estado</th>
                                <th style={{ color: 'white', width: '80px', textAlign: 'center' }}>% Avan.</th>
                                <th style={{ color: 'white', width: '40px', textAlign: 'center' }}>🚦</th>
                                <th style={{ color: 'white', width: '60px', textAlign: 'center' }}>Días</th>
                                <th style={{ color: 'white', width: '100px', textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mockPlanesData.length > 0 ? mockPlanesData.map((item, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ color: 'white', textAlign: 'center' }}>{item.id}</td>
                                    <td style={{ color: 'white' }}>{item.proceso}</td>
                                    <td style={{ color: 'white' }}>{item.hallazgo}</td>
                                    <td style={{ color: 'white' }}>{item.accion}</td>
                                    <td style={{ color: 'white' }}>{item.responsable}</td>
                                    <td style={{ color: 'white' }}>{item.fechaCompromiso}</td>
                                    <td>
                                        <Badge size="xs" variant="filled" color={item.estado === 'Terminado' ? 'green' : 'blue'}>
                                            {item.estado}
                                        </Badge>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <Text size="xs" fw={700} c="white">{item.avance}%</Text>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <Box style={{ width: 12, height: 12, borderRadius: '50%', background: item.semaforo, margin: '0 auto' }} />
                                    </td>
                                    <td style={{ textAlign: 'center', color: 'white' }}>{item.dias}</td>
                                    <td>
                                        <Group gap={4} justify="center" wrap="nowrap">
                                            <ActionIcon variant="subtle" color="blue" size="sm"><IconEye size={16} /></ActionIcon>
                                            <ActionIcon variant="subtle" color="yellow.7" size="sm"><IconPencil size={16} /></ActionIcon>
                                            <ActionIcon variant="subtle" color="red" size="sm"><IconTrash size={16} /></ActionIcon>
                                        </Group>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                        No hay planes de acción registrados
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </ScrollArea>
            </Paper>
        </Container>
    );
};

export default PlanesAccion;
