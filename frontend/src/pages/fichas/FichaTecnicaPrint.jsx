import React, { useEffect, useState } from 'react';
import {
    Container,
    Grid,
    Text,
    Title,
    Group,
    Stack,
    Box,
    Divider,
    Button,
    Loader
} from '@mantine/core';
import { useParams, useNavigate } from 'react-router-dom';
import { IconPrinter, IconArrowLeft } from '@tabler/icons-react';
import { api } from '../../utils/api';
import { notifications } from '@mantine/notifications';

const FichaTecnicaPrint = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        const loadFicha = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/production/technical-sheets/${id}`);
                setData({
                    ...response,
                    version: '3',
                    codigoDoc: 'FO PD 63',
                    fechaEmision: '2014-07-02',
                    medidas: response?.medidas || {},
                    tintas: response?.tintas || {},
                    terminados: response?.terminados || {},
                });
            } catch (error) {
                notifications.show({
                    title: 'No se pudo cargar la ficha',
                    message: error?.message || 'Error consultando información de impresión.',
                    color: 'red',
                });
            } finally {
                setLoading(false);
            }
        };

        loadFicha();
    }, [id]);

    if (loading) {
        return (
            <Container py="xl">
                <Group justify="center">
                    <Loader size="sm" />
                    <Text size="sm">Cargando ficha técnica...</Text>
                </Group>
            </Container>
        );
    }

    if (!data) {
        return (
            <Container py="xl">
                <Stack align="center">
                    <Text>No se encontró la ficha técnica solicitada.</Text>
                    <Button variant="light" onClick={() => navigate('/fichas/lista')}>Volver</Button>
                </Stack>
            </Container>
        );
    }

    return (
        <div style={{ background: '#0f172a', minHeight: '100vh', paddingTop: '80px', paddingBottom: '40px' }}>
            <style>
                {`
                @media screen {
                    body { overflow-y: auto !important; height: auto !important; }
                }
                @media print {
                    body { background: white !important; -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
                    body::before { display: none !important; }
                    .print-container { margin: 0 !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; border: none !important; }
                    .no-print { display: none !important; }
                    .main-content-area { margin-top: 0 !important; }
                }
                .print-actions-bar {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    background: rgba(15, 23, 42, 0.95);
                    backdrop-filter: blur(10px);
                    padding: 15px;
                    z-index: 1000;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    justify-content: center;
                    gap: 20px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                }
                .label { font-weight: bold; font-size: 11px; text-transform: uppercase; color: #495057; }
                .value { font-size: 13px; border-bottom: 1px solid #ced4da; min-height: 20px; display: block; margin-top: 2px; }
                `}
            </style>

            {/* Acciones flotantes */}
            <div className="print-actions-bar no-print">
                <Button
                    onClick={() => window.print()}
                    color="indigo"
                    leftSection={<IconPrinter size={20} />}
                    size="md"
                    radius="md"
                >
                    Imprimir Ficha
                </Button>
                <Button
                    variant="subtle"
                    color="gray"
                    onClick={() => navigate(-1)}
                    leftSection={<IconArrowLeft size={20} />}
                    size="md"
                    radius="md"
                    c="white"
                >
                    Volver al Listado
                </Button>
            </div>

            {/* Documento Ficha Técnica */}
            <Container size="xl" py="xl" className="print-container main-content-area" style={{ background: 'white', color: 'black', boxShadow: '0 0 40px rgba(0,0,0,0.5)', borderRadius: '4px' }}>
                <Box p="md" style={{ border: '2px solid black' }}>
                    {/* Header Section */}
                    <Grid align="center" mb="md">
                        <Grid.Col span={3}>
                            <Stack gap={0} align="center">
                                <Text fw={900} size="xl" style={{ letterSpacing: '2px' }}>aleph</Text>
                                <Text size="xs" fw={700}>impresores</Text>
                            </Stack>
                        </Grid.Col>
                        <Grid.Col span={6}>
                            <Title order={3} ta="center" style={{ textDecoration: 'underline' }}>FICHA TÉCNICA DEL PRODUCTO</Title>
                        </Grid.Col>
                        <Grid.Col span={3}>
                            <Stack gap={0} ta="right">
                                <Text size="xs"><b>CÓDIGO:</b> {data.codigoDoc}</Text>
                                <Text size="xs"><b>VERSIÓN:</b> {data.version}</Text>
                                <Text size="xs"><b>Fecha de emisión:</b> {data.fechaEmision}</Text>
                                <Text size="xs"><b>Fecha de actualización:</b> {data.fechaActualizacion ? new Date(data.fechaActualizacion).toLocaleDateString() : '-'}</Text>
                            </Stack>
                        </Grid.Col>
                    </Grid>

                    <Grid grow gutter="xs">
                        <Grid.Col span={8}>
                            {/* Left Column Data */}
                            <Stack gap="xs">
                                <Grid gutter="xs">
                                    <Grid.Col span={4}>
                                        <Text className="label">Fecha de creación:</Text>
                                        <Text className="value">{data.fechaCreacion ? new Date(data.fechaCreacion).toLocaleDateString() : '-'}</Text>
                                    </Grid.Col>
                                    <Grid.Col span={4}>
                                        <Text className="label">Fecha Modific:</Text>
                                        <Text className="value">{data.fechaActualizacion ? new Date(data.fechaActualizacion).toLocaleDateString() : '-'}</Text>
                                    </Grid.Col>
                                    <Grid.Col span={4}>
                                        <Text className="label">Cliente:</Text>
                                        <Text className="value">{data.cliente}</Text>
                                    </Grid.Col>
                                </Grid>

                                <Grid gutter="xs">
                                    <Grid.Col span={4}>
                                        <Text className="label">Linea de Producto:</Text>
                                        <Text className="value">{data.linea}</Text>
                                    </Grid.Col>
                                    <Grid.Col span={5}>
                                        <Text className="label">Nombre del producto y ref:</Text>
                                        <Text className="value">{data.producto}</Text>
                                    </Grid.Col>
                                    <Grid.Col span={3}>
                                        <Text className="label">Pieza:</Text>
                                        <Text className="value">{data.pieza}</Text>
                                    </Grid.Col>
                                </Grid>

                                <Divider label="SUSTRATOS" labelPosition="center" my="xs" />
                                <Grid gutter="xs">
                                    <Grid.Col span={6}>
                                        <Text className="label">Sustrato Sup - Cal/g:</Text>
                                        <Text className="value">{data.sustratoSup}</Text>
                                    </Grid.Col>
                                    <Grid.Col span={6}>
                                        <Text className="label">Sustrato med - Cal/g:</Text>
                                        <Text className="value">{data.sustratoMed}</Text>
                                    </Grid.Col>
                                    <Grid.Col span={6}>
                                        <Text className="label">Sustrato Inf - Cal/g:</Text>
                                        <Text className="value">{data.sustratoInf}</Text>
                                    </Grid.Col>
                                    <Grid.Col span={3}>
                                        <Text className="label">Dirección de la fibra:</Text>
                                        <Text className="value">{data.direccionFibra}</Text>
                                    </Grid.Col>
                                    <Grid.Col span={3}>
                                        <Text className="label">Tipo de flauta:</Text>
                                        <Text className="value">{data.tipoFlauta}</Text>
                                    </Grid.Col>
                                </Grid>

                                <Divider label="DIMENSIONES (cm)" labelPosition="center" my="xs" />
                                <Grid gutter="xs" style={{ background: '#2c3e50', padding: '8px', borderRadius: '4px' }}>
                                    <Grid.Col span={3}>
                                        <Text fw={700} size="xs" c="white">ALTO:</Text>
                                        <Text size="md" c="white" style={{ borderBottom: '1px solid rgba(255,255,255,0.3)', minHeight: '25px' }}>{data.medidas.alto}</Text>
                                    </Grid.Col>
                                    <Grid.Col span={3}>
                                        <Text fw={700} size="xs" c="white">LARGO:</Text>
                                        <Text size="md" c="white" style={{ borderBottom: '1px solid rgba(255,255,255,0.3)', minHeight: '25px' }}>{data.medidas.largo}</Text>
                                    </Grid.Col>
                                    <Grid.Col span={3}>
                                        <Text fw={700} size="xs" c="white">ANCHO:</Text>
                                        <Text size="md" c="white" style={{ borderBottom: '1px solid rgba(255,255,255,0.3)', minHeight: '25px' }}>{data.medidas.ancho}</Text>
                                    </Grid.Col>
                                    <Grid.Col span={3}>
                                        <Text fw={700} size="xs" c="white">FUELLE:</Text>
                                        <Text size="md" c="white" style={{ borderBottom: '1px solid rgba(255,255,255,0.3)', minHeight: '25px' }}>{data.medidas.fuelle}</Text>
                                    </Grid.Col>
                                </Grid>

                                <Group mt="xs" gap="xl">
                                    <Group gap="xs">
                                        <Box w={16} h={16} style={{ border: '2px solid black', borderRadius: '3px', background: data.troquelNuevo ? 'black' : 'white' }} />
                                        <Text size="xs" fw={700}>Troquel nuevo</Text>
                                    </Group>
                                    <Group gap="xs">
                                        <Text size="xs" fw={700}>Codigo Troq:</Text>
                                        <Text size="sm" style={{ borderBottom: '1px solid #ced4da', minWidth: '150px' }}>{data.codigoTroq}</Text>
                                    </Group>
                                </Group>

                                <Divider label="TINTAS" labelPosition="center" my="xs" />
                                <Group grow gutter="xs">
                                    <Group gap="md">
                                        <Group gap={4}><Text size="xs" fw={700}>C</Text><Box w={12} h={12} style={{ border: '1px solid black', background: data.tintas.c ? '#00FFFF' : 'white' }} /></Group>
                                        <Group gap={4}><Text size="xs" fw={700}>M</Text><Box w={12} h={12} style={{ border: '1px solid black', background: data.tintas.m ? '#FF00FF' : 'white' }} /></Group>
                                        <Group gap={4}><Text size="xs" fw={700}>Y</Text><Box w={12} h={12} style={{ border: '1px solid black', background: data.tintas.y ? '#FFFF00' : 'white' }} /></Group>
                                        <Group gap={4}><Text size="xs" fw={700}>K</Text><Box w={12} h={12} style={{ border: '1px solid black', background: data.tintas.k ? '#000000' : 'white' }} /></Group>
                                    </Group>
                                    <Group gap="xs">
                                        <Text size="xs" fw={700}>Especiales:</Text>
                                        <Text size="xs" style={{ borderBottom: '1px solid #ced4da', flex: 1 }}>{data.tintas.especiales}</Text>
                                    </Group>
                                </Group>

                                <Divider label="TERMINADOS" labelPosition="center" my="xs" />
                                <Grid gutter="xs">
                                    <Grid.Col span={6}>
                                        <Text className="label">Terminado 1:</Text>
                                        <Text className="value">{data.terminados.t1}</Text>
                                    </Grid.Col>
                                    <Grid.Col span={6}>
                                        <Text className="label">Terminado 2:</Text>
                                        <Text className="value">{data.terminados.t2}</Text>
                                    </Grid.Col>
                                    <Grid.Col span={4}>
                                        <Group gap="xs">
                                            <Box w={14} h={14} style={{ border: '1px solid black', background: data.terminados.estampado ? 'black' : 'white' }} />
                                            <Text size="xs" fw={700}>Estampado</Text>
                                        </Group>
                                    </Grid.Col>
                                    <Grid.Col span={8}>
                                        <Text className="label">Pie de imprenta:</Text>
                                        <Text className="value">{data.terminados.pieImprenta}</Text>
                                    </Grid.Col>
                                </Grid>

                                <Box mt="md">
                                    <Text className="label">Notas:</Text>
                                    <Box p="xs" style={{ border: '1px solid #ced4da', minHeight: '80px', borderRadius: '4px' }}>
                                        <Text size="xs" style={{ whiteSpace: 'pre-wrap' }}>{data.notas}</Text>
                                    </Box>
                                </Box>
                            </Stack>
                        </Grid.Col>

                        <Grid.Col span={4}>
                            {/* Right Column Preview */}
                            <Stack align="center" justify="center" h="100%">
                                <Box style={{ border: '1px dashed #ced4da', padding: '15px', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <Stack align="center" gap={0}>
                                        <Text fw={900} style={{ fontSize: '3.5rem', lineHeight: 1, letterSpacing: '-2px' }}>STUDIO F</Text>
                                        <Text size="xs" fw={700} ta="center" mt={4} style={{ letterSpacing: '1px', lineHeight: 1.2 }}>
                                            MÉXICO · COLOMBIA · PUERTO RICO · PANAMÁ · CHILE<br />
                                            ECUADOR · GUATEMALA · UNITED STATES
                                        </Text>

                                        <Text fw={900} mt="xl" style={{ fontSize: '3.5rem', lineHeight: 1, letterSpacing: '-2px' }}>STUDIO F</Text>
                                        <Text size="xs" mt="lg" ta="center" fw={600}>ESCANEA EL QR Y CONOCE NUESTRAS POLÍTICAS DE DEVOLUCIÓN</Text>

                                        <Group mt="xl" align="center" gap="md">
                                            {/* Mock QR */}
                                            <Box w={70} h={70} style={{ border: '2px solid black', padding: '4px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2px' }}>
                                                {Array(16).fill(0).map((_, i) => (
                                                    <Box key={i} style={{ background: (i % 3 === 0 || i % 5 === 0) ? 'black' : 'white' }} />
                                                ))}
                                            </Box>
                                            <Stack gap={0}>
                                                <Text fw={900} size="lg">STUDIO F</Text>
                                                <Text size="xs">SHOP ONLINE 24/7</Text>
                                                <Text size="xs" fw={800}>STUDIOF.COM</Text>
                                            </Stack>
                                        </Group>
                                    </Stack>
                                </Box>
                            </Stack>
                        </Grid.Col>
                    </Grid>

                    <Divider my="xl" />

                    <Grid grow>
                        <Grid.Col span={4}>
                            <Stack gap={2}>
                                <Text size="xs"><b>Revisado Diseñador:</b></Text>
                                <Box style={{ borderBottom: '1px solid black', height: '30px', width: '80%' }} />
                            </Stack>
                        </Grid.Col>
                        <Grid.Col span={4}>
                            <Stack gap={2}>
                                <Text size="xs"><b>Revisado Ejecutivo de cuenta:</b></Text>
                                <Box style={{ borderBottom: '1px solid black', height: '30px', width: '80%' }} />
                            </Stack>
                        </Grid.Col>
                        <Grid.Col span={4}>
                            <Stack gap={2}>
                                <Text size="xs"><b>Aprobación Cliente:</b></Text>
                                <Box style={{ borderBottom: '1px solid black', height: '30px', width: '80%' }} />
                            </Stack>
                        </Grid.Col>
                    </Grid>

                    <Box mt="xl">
                        <Text size="xs" c="dimmed" style={{ fontStyle: 'italic', lineHeight: 1.3, textAlign: 'justify' }}>
                            <b>IMPORTANTE:</b> Revisar cuidadosamente FICHA TÉCNICA Y TEXTOS ARTE FINAL. LA APROBACIÓN de este material no excluye a ninguno de los que interviene en el proceso. Los COLORES de esta impresión son de referencia. La ÚNICA representación de COLORES CONFIABLE se obtiene con la GUÍA DE COLORES PANTONE, excepto sobre material KRAFT.
                        </Text>
                    </Box>
                </Box>
            </Container>
        </div>
    );
};

export default FichaTecnicaPrint;
