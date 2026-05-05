import React, { useState } from 'react';
import { 
    Container, 
    Paper, 
    Title, 
    Button, 
    Group, 
    Select, 
    Table, 
    ScrollArea, 
    Text, 
    Box, 
    Stack, 
    TextInput 
} from '@mantine/core';
import { IconArrowLeft, IconSearch, IconFileSpreadsheet, IconEraser, IconDeviceFloppy } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar';

export default function CapturaMensual() {
    const navigate = useNavigate();
    const [month, setMonth] = useState('Marzo');
    const [year, setYear] = useState('2026');

    const COLUMNS = [
        { label: 'D', w: 30 },
        { label: 'Operario', w: 150 },
        { label: 'Horario', w: 110 },
        { label: 'Inicio', w: 60 },
        { label: 'Fin', w: 60 },
        { label: 'H. Final', w: 60 },
        { label: 'H. Oper', w: 60 },
        { label: 'Cambios', w: 60 },
        { label: 'P. Punto', w: 60 },
        { label: 'Tiros Eq', w: 65, bg: 'rgba(255, 165, 0, 0.15)' },
        { label: 'T.H. Prod', w: 65, bg: 'rgba(255, 165, 0, 0.15)' },
        { label: 'Promedio', w: 75, bg: 'rgba(255, 165, 0, 0.15)' },
        { label: 'T. Bonif', w: 65, bg: 'rgba(255, 165, 0, 0.15)' },
        { label: '75% Bonif', w: 75, bg: 'rgba(0, 150, 255, 0.15)' },
        { label: 'Vr Bonif', w: 75, bg: 'rgba(0, 150, 255, 0.15)' },
        { label: '75% Meta', w: 75, bg: 'rgba(0, 200, 100, 0.15)' },
        { label: 'Vr Pagar', w: 75, bg: 'rgba(0, 200, 100, 0.15)' },
        { label: 'Mant/Aseo', w: 75 },
        { label: 'Descanso', w: 75 },
        { label: 'Otros', w: 65, bg: 'rgba(255, 255, 255, 0.03)' },
        { label: 'T.H. Aux', w: 75, bg: 'rgba(0, 150, 255, 0.15)' },
        { label: 'T. Trab', w: 65, bg: 'rgba(0, 150, 255, 0.15)' },
        { label: 'Repar', w: 65 },
        { label: 'Otros M.', w: 65 },
    ];

    const generateEmptyRows = (count) => {
        return Array.from({ length: count }, (_, i) => ({
            day: i + 1,
            operario: '',
            horario: '',
        }));
    };

    const rows = generateEmptyRows(15).map((row) => (
        <Table.Tr key={row.day}>
            <Table.Td style={{ background: 'rgba(255,255,255,0.05)', fontWeight: 700, textAlign: 'center', color: 'white' }}>{row.day}</Table.Td>
            <Table.Td><Select size="xs" data={[]} placeholder="--" variant="unstyled" styles={{ input: { color: 'white' } }} /></Table.Td>
            <Table.Td><Select size="xs" data={[]} placeholder="--" variant="unstyled" styles={{ input: { color: 'white' } }} /></Table.Td>
            <Table.Td></Table.Td>
            <Table.Td></Table.Td>
            <Table.Td></Table.Td>
            <Table.Td></Table.Td>
            <Table.Td></Table.Td>
            <Table.Td></Table.Td>
            <Table.Td style={{ background: 'rgba(255, 165, 0, 0.1)' }}></Table.Td>
            <Table.Td style={{ background: 'rgba(255, 165, 0, 0.1)' }}></Table.Td>
            <Table.Td style={{ background: 'rgba(255, 165, 0, 0.1)' }}></Table.Td>
            <Table.Td style={{ background: 'rgba(255, 165, 0, 0.1)' }}></Table.Td>
            <Table.Td style={{ background: 'rgba(0, 150, 255, 0.1)', color: '#60a5fa', fontWeight: 700, textAlign: 'center' }}>0</Table.Td>
            <Table.Td style={{ background: 'rgba(0, 150, 255, 0.1)' }}></Table.Td>
            <Table.Td style={{ background: 'rgba(0, 200, 100, 0.1)' }}></Table.Td>
            <Table.Td style={{ background: 'rgba(0, 200, 100, 0.1)' }}></Table.Td>
            <Table.Td></Table.Td>
            <Table.Td></Table.Td>
            <Table.Td style={{ background: 'rgba(255,255,255,0.02)' }}></Table.Td>
            <Table.Td style={{ background: 'rgba(0, 150, 255, 0.1)' }}></Table.Td>
            <Table.Td style={{ background: 'rgba(0, 150, 255, 0.1)' }}></Table.Td>
            <Table.Td></Table.Td>
            <Table.Td></Table.Td>
        </Table.Tr>
    ));

    return (
        <Box style={{ background: '#0f172a', minHeight: '100vh', width: '100%' }} px="md">
            <TopBar />
            {/* Header Block */}
            <Paper p="lg" radius={0} style={{ background: 'transparent' }}>
                <Group justify="space-between" align="center">
                    <Group>
                        <Button variant="filled" color="gray.8" size="compact-xs" leftSection={<IconArrowLeft size={14} />} onClick={() => navigate('/')} fw={700}>
                            Volver al Panel
                        </Button>
                        <Title order={4} c="white" ml="xl">Administración Master</Title>
                    </Group>
                    <img src="/Nuevo-perla-Sinfondo.png" alt="Perla" style={{ height: 30 }} />
                </Group>
            </Paper>

            <Container size="100%" px="md" pb="xl">
                <Paper p="xl" radius="lg" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <Group justify="space-between" mb="lg" align="center">
                        <Box>
                           <Title order={3} style={{ fontFamily: 'serif', fontStyle: 'italic', color: 'white', marginBottom: 0 }}>
                                aleph <span style={{ color: '#f472b6', fontSize: 13, verticalAlign: 'middle' }}>impresores</span>
                           </Title>
                           <Group gap={6} mt={4}>
                                <Box w={5} h={5} style={{ borderRadius: '50%', background: '#ff0000' }} />
                                <Box w={5} h={5} style={{ borderRadius: '50%', background: '#ffcc00' }} />
                                <Box w={5} h={5} style={{ borderRadius: '50%', background: '#00ccff' }} />
                                <Box w={5} h={5} style={{ borderRadius: '50%', background: '#ffffff' }} />
                           </Group>
                        </Box>
                        <Group gap="xl">
                            <Group gap="xs">
                                <Text size="sm" fw={700} c="dimmed">Mes:</Text>
                                <Select 
                                    data={['Enero', 'Febrero', 'Marzo']} 
                                    value={month} 
                                    onChange={setMonth} 
                                    w={140} 
                                    size="xs" 
                                    styles={{ input: { background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' } }} 
                                />
                            </Group>
                            <Group gap="xs">
                                <Text size="sm" fw={700} c="dimmed">Año:</Text>
                                <Select 
                                    data={['2024', '2025', '2026']} 
                                    value={year} 
                                    onChange={setYear} 
                                    w={90} 
                                    size="xs" 
                                    styles={{ input: { background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' } }} 
                                />
                            </Group>
                        </Group>
                    </Group>

                    <Paper p="md" mb="lg" radius="md" style={{ border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.02)' }}>
                         <Group gap="md" align="center">
                            <Text size="sm" fw={800} tt="uppercase" c="dimmed">Máquina:</Text>
                            <Select 
                                placeholder="-- Seleccionar Máquina --" 
                                data={[]} 
                                flex={1} 
                                size="sm"
                                styles={{ input: { background: 'rgba(255,255,255,0.02)', color: 'white', border: '1px solid rgba(255,255,255,0.05)' } }} 
                            />
                         </Group>
                    </Paper>

                    <Group justify="space-between" mb="xl">
                        <Group gap={10}>
                            <Button size="md" color="indigo.6" fw={700} px={40}>CARGAR</Button>
                            <Button size="md" color="green.7" fw={700} px={40}>Exp</Button>
                        </Group>
                        <Group gap={10}>
                            <Button variant="outline" color="blue" leftSection={<IconFileSpreadsheet size={18} />}>Importar Excel</Button>
                            <Button variant="outline" color="grape" leftSection={<IconSearch size={18} />}>Buscar OP</Button>
                            <Button variant="outline" color="red">Borrar</Button>
                            <Button size="md" color="orange.6" fw={700} px={30}>Limp</Button>
                        </Group>
                    </Group>

                    <Group gap="xl" mb="md" justify="center">
                        <Group gap={6}><Box w={16} h={16} style={{ background: 'rgba(255, 165, 0, 0.2)', border: '1px solid rgba(255, 165, 0, 0.4)' }} /> <Text size="xs" c="dimmed">Festivo</Text></Group>
                        <Group gap={6}><Box w={16} h={16} style={{ background: 'rgba(255, 255, 0, 0.2)', border: '1px solid rgba(255, 255, 0, 0.4)' }} /> <Text size="xs" c="dimmed">Domingo</Text></Group>
                        <Group gap={6}><Box w={16} h={16} style={{ background: 'rgba(0, 255, 100, 0.15)', border: '1px solid rgba(0, 255, 100, 0.3)' }} /> <Text size="xs" c="dimmed">Sábado</Text></Group>
                        <Group gap={6}><Box w={16} h={16} style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }} /> <Text size="xs" c="dimmed">L-V Normal</Text></Group>
                    </Group>

                    <ScrollArea offsetScrollbars scrollbarSize={4} style={{ border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', background: 'rgba(0,0,0,0.1)' }}>
                        <Table withColumnBorders verticalSpacing="sm" styles={{ th: { borderBottom: '1px solid rgba(255,255,255,0.1) !important', borderRight: '1px solid rgba(255,255,255,0.05) !important' }, td: { borderRight: '1px solid rgba(255,255,255,0.05) !important' } }}>
                            <Table.Thead bg="rgba(255,255,255,0.03)">
                                <Table.Tr>
                                    {COLUMNS.map((col, i) => (
                                        <Table.Th key={i} style={{ width: col.w, fontSize: '10px', textAlign: 'center', background: col.bg || 'inherit', color: 'white', fontWeight: 700, whiteSpace: 'nowrap', padding: '10px 4px' }}>
                                            {col.label}
                                        </Table.Th>
                                    ))}
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>{rows}</Table.Tbody>
                        </Table>
                    </ScrollArea>

                    <Group justify="flex-end" mt="xl">
                        <Button color="green.8" size="lg" radius="md" leftSection={<IconDeviceFloppy size={24} />} px={40}>
                            Guardar Cambios
                        </Button>
                    </Group>
                </Paper>
            </Container>
        </Box>
    );
}
