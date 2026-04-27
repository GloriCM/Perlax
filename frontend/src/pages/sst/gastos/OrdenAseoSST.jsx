import React from 'react';
import { Container, Paper, Title, Button, Group, Table, Badge, ScrollArea, Text } from '@mantine/core';
import { IconArrowLeft, IconFileAnalytics, IconRefresh } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

const AUDIT_DATA = [
    { proceso: 'PROCESO DE ALMACEN', auditor: 'Johan rojas', planta: 'PLANTA 2', fecha: '18/03/2026', calif: '5/6' },
    { proceso: 'PROCESO DE IMPRESIÓN', auditor: 'Héctor Hilde, Alejandro ochoa', planta: 'PLANTA 1', fecha: '18/03/2026', calif: '6/6' },
    { proceso: 'PROCESO DE DESPACHOS', auditor: 'Eleonora mirquez, yohao Maria Del Carmen', planta: 'PLANTA 1', fecha: '18/03/2026', calif: '3/6' },
    { proceso: 'PROCESO DE IMPRESIÓN', auditor: 'Josué López Andrés ramirez', planta: 'PLANTA 1', fecha: '18/03/2026', calif: '6/6' },
    { proceso: 'PROCESO DE IMPRESIÓN', auditor: 'José Luis Obando sord 4', planta: 'PLANTA 1', fecha: '18/03/2026', calif: '5/6' },
    { proceso: 'PROCESO DE TROQUELADO', auditor: 'Johan preciado troqueladora rollo', planta: 'PLANTA 1', fecha: '18/03/2026', calif: '6/6' },
    { proceso: 'PROCESO DE COLAMINADORA', auditor: 'Fernanda Bedoya Sandra Pérez', planta: 'PLANTA 1', fecha: '18/03/2026', calif: '6/6' },
    { proceso: 'PROCESO DE COLAMINADORA', auditor: 'Leidy Motta, Karen Martinez, Magaly Millan colanminadora pequeña', planta: 'PLANTA 1', fecha: '18/03/2026', calif: '6/6' },
    { proceso: 'PROCESO DE ESTAMPADORA', auditor: 'Yhan Otoniel sarmiento', planta: 'PLANTA 1', fecha: '18/03/2026', calif: '6/6' },
    { proceso: 'PROCESO DE TROQUELADO', auditor: 'Erik Roldán', planta: 'PLANTA 1', fecha: '18/03/2026', calif: '4/6' },
    { proceso: 'PROCESO DE TROQUELADO', auditor: 'Felipe echavarria', planta: 'PLANTA 1', fecha: '18/03/2026', calif: '5/6' },
];

export default function OrdenAseoSST() {
    const navigate = useNavigate();

    const rows = AUDIT_DATA.map((element, i) => (
        <Table.Tr key={i}>
            <Table.Td style={{ fontSize: '12px', fontWeight: 500 }}>{element.proceso}</Table.Td>
            <Table.Td style={{ fontSize: '12px', color: '#94a3b8' }}>{element.auditor}</Table.Td>
            <Table.Td style={{ fontSize: '12px', color: '#94a3b8' }}>{element.planta}</Table.Td>
            <Table.Td style={{ fontSize: '12px', color: '#94a3b8' }}>{element.fecha}</Table.Td>
            <Table.Td style={{ textAlign: 'center' }}>
                <Text fw={700} c="blue.5" size="sm">{element.calif}</Text>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Container size="xl" py="xl">
            <Paper p="lg" radius="lg" mb="lg" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <Group justify="space-between" align="center">
                    <Group>
                        <Button variant="filled" color="gray.8" size="compact-xs" leftSection={<IconArrowLeft size={14} />} onClick={() => navigate('/')} fw={700}>
                            Volver al Panel
                        </Button>
                        <Title order={4} c="white" ml="xl">Captura de Gastos SST</Title>
                    </Group>
                    <img src="/Nuevo-perla-Sinfondo.png" alt="Perla" style={{ height: 30 }} />
                </Group>
            </Paper>

            <Paper p="md" radius="lg" mb="sm" style={{ background: 'transparent' }}>
                <Group justify="space-between">
                    <Title order={5} c="white">Historial Audit. Orden y Aseo</Title>
                    <Group gap="sm">
                        <Button variant="filled" color="teal.7" size="xs" leftSection={<IconFileAnalytics size={16} />}>Reporte</Button>
                        <Button variant="filled" color="blue.6" size="xs" leftSection={<IconRefresh size={16} />}>Actualizar</Button>
                    </Group>
                </Group>
            </Paper>

            <Paper p="md" radius="lg" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <ScrollArea h={500}>
                    <Table verticalSpacing="sm">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th style={{ color: '#94a3b8', fontSize: '13px' }}>Proceso</Table.Th>
                                <Table.Th style={{ color: '#94a3b8', fontSize: '13px' }}>Auditor</Table.Th>
                                <Table.Th style={{ color: '#94a3b8', fontSize: '13px' }}>Planta</Table.Th>
                                <Table.Th style={{ color: '#94a3b8', fontSize: '13px' }}>Fecha</Table.Th>
                                <Table.Th style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>Calif.</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>{rows}</Table.Tbody>
                    </Table>
                </ScrollArea>
            </Paper>
        </Container>
    );
}
