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
    Badge,
    ScrollArea
} from '@mantine/core';
import {
    IconArrowLeft,
    IconRefresh,
    IconAlertTriangle,
    IconCheck,
    IconList,
    IconClipboardList
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

const SinLlenar = () => (
    <Text span c="red.6" fs="italic" size="xs">
        Sin llenar
    </Text>
);

const mockConsolidadoData = [
    {
        nc: '-',
        fecha: '13/3/2026',
        op: '7451',
        cliente: 'LINK\'T SYSTEMS LLC',
        referencia: 'PLEG REF: WILDFORK EMPA...',
        tipoReclamos: null,
        cantNc: 0,
        cantTotal: 11000,
        item: null,
        descNovedad: '-',
        tipoDefecto: null,
        responsable: null,
        area: null,
        cargo: null,
        valorNc: '$0'
    },
    {
        nc: '-',
        fecha: '11/3/2026',
        op: '7434',
        cliente: 'LINK\'T SYSTEMS LLC',
        referencia: 'BOLSA REF: PEQUENA PICA...',
        tipoReclamos: null,
        cantNc: 0,
        cantTotal: 5500,
        item: null,
        descNovedad: 'se debe tener en cuenta el lado sin escore para pega del fond...',
        tipoDefecto: null,
        responsable: null,
        area: null,
        cargo: null,
        valorNc: '$0'
    },
    {
        nc: '-',
        fecha: '11/3/2026',
        op: '7444',
        cliente: 'LINK\'T SYSTEMS LLC',
        referencia: 'CAJA REF: MR EATS TO GO',
        tipoReclamos: null,
        cantNc: 0,
        cantTotal: 5500,
        item: null,
        descNovedad: 'esta orden va con un incremento del desperdicio d...',
        tipoDefecto: null,
        responsable: null,
        area: null,
        cargo: null,
        valorNc: '$0'
    },
    {
        nc: '-',
        fecha: '2/3/2026',
        op: '7297',
        cliente: 'GRAFICAS ELLIOT SAS EN REO...',
        referencia: 'BOLSA REF: WAC ULTIMA',
        tipoReclamos: null,
        cantNc: 0,
        cantTotal: 1100,
        item: null,
        descNovedad: 'el trabajo se entrega medido a taller externo...',
        tipoDefecto: null,
        responsable: null,
        area: null,
        cargo: null,
        valorNc: '$0'
    },
];

const ConsolidadoNC = () => {
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
                        <Title order={4} c="white" ml="xl">Consolidado de NC</Title>
                    </Group>
                    <img src="/Nuevo-perla-Sinfondo.png" alt="Perla" style={{ height: 30 }} />
                </Group>
            </Paper>

            <Box mt="md" mb="md">
                <Group align="center" gap="xs" mb="xs">
                    <IconClipboardList size={20} color="white" />
                    <Title order={4} c="white">Consolidado de NC</Title>
                </Group>

                <Group gap="xs" mb="md">
                    <Badge
                        variant="filled"
                        color="red.8"
                        leftSection={<IconAlertTriangle size={14} />}
                        radius="xs"
                        size="sm"
                        tt="uppercase"
                    >
                        Pendientes: 4
                    </Badge>
                    <Badge
                        variant="filled"
                        color="green.8"
                        leftSection={<IconCheck size={14} />}
                        radius="xs"
                        size="sm"
                        tt="uppercase"
                    >
                        Completas: 0
                    </Badge>
                    <Badge
                        variant="filled"
                        color="blue.8"
                        leftSection={<IconList size={14} />}
                        radius="xs"
                        size="sm"
                        tt="uppercase"
                    >
                        Total: 4
                    </Badge>
                </Group>

                <Group gap="md" align="flex-end">
                    <Group gap="xs">
                        <Select size="xs" label="Mes" placeholder="Marzo" data={['Enero', 'Febrero', 'Marzo']} defaultValue="Marzo" style={{ width: 110 }} />
                        <Select size="xs" label="Año" placeholder="2026" data={['2025', '2026']} defaultValue="2026" style={{ width: 90 }} />
                    </Group>
                    <Button
                        variant="filled"
                        color="blue"
                        leftSection={<IconRefresh size={16} />}
                        size="xs"
                        fw={700}
                        styles={{ root: { height: 30 } }}
                    >
                        Actualizar
                    </Button>
                </Group>
            </Box>

            {/* Main Table with Horizontal Scroll */}
            <Paper p="0" radius="md" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <ScrollArea offsetScrollbars scrollbarSize={10}>
                    <Table
                        verticalSpacing={2}
                        horizontalSpacing="md"
                        mih={1600}
                        style={{ tableLayout: 'fixed' }}
                        styles={{
                            th: { padding: '4px 8px !important', fontSize: '10px' },
                            td: { padding: '4px 8px !important', fontSize: '11px' }
                        }}
                    >
                        <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <tr>
                                <th style={{ color: '#94a3b8', width: '60px' }}>NC #</th>
                                <th style={{ color: '#94a3b8', width: '90px' }}>Fecha</th>
                                <th style={{ color: '#94a3b8', width: '70px' }}>OP</th>
                                <th style={{ color: '#94a3b8', width: '200px' }}>Cliente</th>
                                <th style={{ color: '#94a3b8', width: '220px' }}>Referencia</th>
                                <th style={{ color: '#94a3b8', width: '120px' }}>Tipo Reclam.</th>
                                <th style={{ color: '#94a3b8', width: '80px', textAlign: 'center' }}>Cant NC</th>
                                <th style={{ color: '#94a3b8', width: '90px', textAlign: 'center' }}>Cant Total</th>
                                <th style={{ color: '#94a3b8', width: '100px' }}>Item</th>
                                <th style={{ color: '#94a3b8', width: '250px' }}>Desc. Novedad</th>
                                <th style={{ color: '#94a3b8', width: '120px' }}>Tipo Defecto</th>
                                <th style={{ color: '#94a3b8', width: '130px' }}>Responsable</th>
                                <th style={{ color: '#94a3b8', width: '100px' }}>Área</th>
                                <th style={{ color: '#94a3b8', width: '80px' }}>Valor NC</th>
                                <th style={{ color: '#94a3b8', width: '120px' }}>Producto</th>
                                <th style={{ color: '#94a3b8', width: '100px' }}>Salida NC</th>
                                <th style={{ color: '#94a3b8', width: '100px' }}>Controles</th>
                                <th style={{ color: '#94a3b8', width: '100px', textAlign: 'center' }}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mockConsolidadoData.map((item, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ color: 'white', fontSize: '12px' }}>{item.nc}</td>
                                    <td style={{ color: 'white', fontSize: '12px' }}>{item.fecha}</td>
                                    <td style={{ color: 'white', fontSize: '12px', fontWeight: 700 }}>{item.op}</td>
                                    <td style={{ color: 'white', fontSize: '11px' }}>
                                        <Text size="xs" truncate="end">{item.cliente}</Text>
                                    </td>
                                    <td style={{ color: 'white', fontSize: '11px' }}>
                                        <Text size="xs" truncate="end">{item.referencia}</Text>
                                    </td>
                                    <td>{item.tipoReclamos || <SinLlenar />}</td>
                                    <td style={{ color: 'white', fontSize: '12px', textAlign: 'center' }}>{item.cantNc}</td>
                                    <td style={{ color: 'white', fontSize: '12px', textAlign: 'center' }}>{item.cantTotal.toLocaleString()}</td>
                                    <td>{item.item || <SinLlenar />}</td>
                                    <td style={{ color: 'white', fontSize: '11px' }}>
                                        <Text size="xs" truncate="end">{item.descNovedad}</Text>
                                    </td>
                                    <td>{item.tipoDefecto || <SinLlenar />}</td>
                                    <td style={{ color: 'white', fontSize: '11px' }}>{item.responsable || <SinLlenar />}</td>
                                    <td style={{ color: 'white', fontSize: '11px' }}>{item.area || <SinLlenar />}</td>
                                    <td style={{ color: '#f97316', fontSize: '12px', fontWeight: 700 }}>{item.valorNc}</td>
                                    <td><SinLlenar /></td>
                                    <td><SinLlenar /></td>
                                    <td><SinLlenar /></td>
                                    <td style={{ textAlign: 'center' }}>
                                        <Button variant="filled" color="orange.7" size="compact-xs" radius="xs" fw={700} style={{ fontSize: '10px' }}>
                                            Llenar
                                        </Button>
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

export default ConsolidadoNC;
