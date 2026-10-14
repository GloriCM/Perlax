import React, { useState } from 'react';
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
    Tooltip,
    ScrollArea
} from '@mantine/core';
import {
    IconArrowLeft,
    IconRefresh,
    IconPlus,
    IconEye,
    IconPencil,
    IconTrash
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

const mockReportData = [
    {
        fecha: '13/3/2026',
        op: '7451',
        referencia: 'PLEG REF: WILDFORK EMPANA...',
        cliente: 'LINK\'T SYSTEMS LLC',
        material: 'FLAUTA E - CART ALLYKING ID...',
        cantProducir: 11000,
        procesos: 1,
        cantRecuperada: 0,
        cantDespacho: 0
    },
    {
        fecha: '11/3/2026',
        op: '7434',
        referencia: 'BOLSA REF: PEQUENA PICANA...',
        cliente: 'LINK\'T SYSTEMS LLC',
        material: '- BOND BLANCO 115GR 47CM',
        cantProducir: 5500,
        procesos: 2,
        cantRecuperada: 0,
        cantDespacho: 0
    },
    {
        fecha: '11/3/2026',
        op: '7444',
        referencia: 'CAJA REF: MR EATS TO GO',
        cliente: 'LINK\'T SYSTEMS LLC',
        material: '- CART. ALLYKING IDEAL 290 G...',
        cantProducir: 5500,
        procesos: 2,
        cantRecuperada: 0,
        cantDespacho: 0
    },
    {
        fecha: '2/3/2026',
        op: '7297',
        referencia: 'BOLSA REF: WAC ULTIMA',
        cliente: 'GRAFICAS ELLIOT SAS EN REO...',
        material: 'C2S GLOSS ARTTECH 230 GRS ...',
        cantProducir: 1100,
        procesos: 2,
        cantRecuperada: 0,
        cantDespacho: 0
    },
];

const ReporteNC = () => {
    const navigate = useNavigate();

    return (
        <Container size="xl" py="md">
            {/* Header */}
            <Paper p="md" radius="lg" mb="sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
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
                        <Title order={4} c="white" ml="xl">Reporte de NC</Title>
                    </Group>
                    <img src="/Nuevo-perla-Sinfondo.png" alt="Perla" style={{ height: 30 }} />
                </Group>
            </Paper>


            {/* Filters Row */}
            <Group gap="md" mb="md" align="flex-end">
                <Group gap="xs">
                    <Select size="xs" label="Mes" placeholder="Marzo" data={['Enero', 'Febrero', 'Marzo']} defaultValue="Marzo" style={{ width: 110 }} />
                    <Select size="xs" label="Año" placeholder="2026" data={['2025', '2026']} defaultValue="2026" style={{ width: 90 }} />
                </Group>

                <Group gap="xs">
                    <Button variant="filled" color="blue" leftSection={<IconRefresh size={16} />} size="xs" fw={700}>
                        Actualizar
                    </Button>
                    <Button variant="filled" color="green" leftSection={<IconPlus size={16} />} size="xs" fw={700}>
                        + Nueva Encuesta
                    </Button>
                </Group>
            </Group>

            {/* Main Table */}
            <Paper p="0" radius="md" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <ScrollArea offsetScrollbars scrollbarSize={10}>
                    <Table
                        verticalSpacing={2}
                        horizontalSpacing="md"
                        mih={1200}
                        style={{ tableLayout: 'fixed' }}
                        styles={{
                            th: { padding: '4px 8px !important', fontSize: '10px' },
                            td: { padding: '4px 8px !important', fontSize: '11px' }
                        }}
                    >
                        <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <tr>
                                <th style={{ color: '#94a3b8', textAlign: 'center', width: '90px' }}>Fecha</th>
                                <th style={{ color: '#94a3b8', textAlign: 'center', width: '70px' }}>OP</th>
                                <th style={{ color: '#94a3b8', width: '250px' }}>Referencia</th>
                                <th style={{ color: '#94a3b8', width: '200px' }}>Cliente</th>
                                <th style={{ color: '#94a3b8', width: '250px' }}>Material</th>
                                <th style={{ color: '#94a3b8', textAlign: 'center', width: '110px' }}>Cant. Producir</th>
                                <th style={{ color: '#94a3b8', textAlign: 'center', width: '80px' }}>Procesos</th>
                                <th style={{ color: '#94a3b8', textAlign: 'center', width: '120px' }}>Cant. Recuperada</th>
                                <th style={{ color: '#94a3b8', textAlign: 'center', width: '120px' }}>Cant. Despacho</th>
                                <th style={{ color: '#94a3b8', textAlign: 'center', width: '100px' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mockReportData.map((item, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ color: 'white', fontSize: '12px', textAlign: 'center' }}>{item.fecha}</td>
                                    <td style={{ color: 'white', fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>{item.op}</td>
                                    <td style={{ color: 'white', fontSize: '11px' }}>
                                        <Text size="xs" truncate="end">{item.referencia}</Text>
                                    </td>
                                    <td style={{ color: 'white', fontSize: '11px' }}>
                                        <Text size="xs" truncate="end">{item.cliente}</Text>
                                    </td>
                                    <td style={{ color: 'white', fontSize: '11px' }}>
                                        <Text size="xs" truncate="end">{item.material}</Text>
                                    </td>
                                    <td style={{ color: 'white', fontSize: '12px', textAlign: 'center' }}>{item.cantProducir.toLocaleString()}</td>
                                    <td style={{ color: '#3b82f6', fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>{item.procesos}</td>
                                    <td style={{ color: 'white', fontSize: '12px', textAlign: 'center' }}>{item.cantRecuperada}</td>
                                    <td style={{ color: 'white', fontSize: '12px', textAlign: 'center' }}>{item.cantDespacho}</td>
                                    <td>
                                        <Group gap={4} justify="center" wrap="nowrap">
                                            <ActionIcon variant="filled" color="blue" size="sm" radius="md">
                                                <IconEye size={16} />
                                            </ActionIcon>
                                            <ActionIcon variant="filled" color="yellow.7" size="sm" radius="md">
                                                <IconPencil size={16} />
                                            </ActionIcon>
                                            <ActionIcon variant="filled" color="red" size="sm" radius="md">
                                                <IconTrash size={16} />
                                            </ActionIcon>
                                        </Group>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </ScrollArea>
            </Paper>
        </Container>
    );
};

export default ReporteNC;
