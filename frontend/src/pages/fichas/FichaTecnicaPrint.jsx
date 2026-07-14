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
import { useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { getCurrentUser, canAccessRoute, getFirstAllowedPath } from '../../utils/permissions';
import { IconPrinter, IconArrowLeft } from '@tabler/icons-react';
import { api } from '../../utils/api';
import { resolveUploadUrl } from '../../utils/uploadUrl';
import { notifications } from '@mantine/notifications';

/** Casilla impresión: fondo blanco y ✓ si aplica (p. ej. troquel nuevo). */
function FichaCheckBox({ checked, boxSize = 16, border = '2px solid black' }) {
    return (
        <Box
            w={boxSize}
            h={boxSize}
            style={{
                border,
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#fff',
                fontSize: boxSize >= 16 ? 11 : 10,
                fontWeight: 900,
                lineHeight: 1,
                color: '#111',
            }}
        >
            {checked ? '\u2713' : ''}
        </Box>
    );
}

const INK_LETTER = {
    c: '#0097a7',
    m: '#c2185b',
    y: '#f9a825',
    k: '#1a1a1a',
};

/** Letra CMYK en color + casilla con ✕ si está marcada (fondo blanco). */
function FichaTintInkMark({ letter, inkKey, checked }) {
    const color = INK_LETTER[inkKey] ?? '#111';
    const markColor = inkKey === 'k' ? '#111' : inkKey === 'y' ? '#6d4c00' : color;
    return (
        <Group gap={4} align="center" wrap="nowrap">
            <Text size="xs" fw={800} style={{ color, minWidth: 11 }}>
                {letter}
            </Text>
            <Box
                w={14}
                h={14}
                style={{
                    border: '1px solid #222',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#fff',
                    fontSize: 11,
                    fontWeight: 900,
                    lineHeight: 1,
                    color: checked ? markColor : 'transparent',
                }}
            >
                {checked ? '\u2715' : ''}
            </Box>
        </Group>
    );
}

/** Logo corporativo (`frontend/public/empresa-logo.jpeg`). */
function EmpresaLogoMark() {
    return (
        <Stack align="center" justify="center" gap={0}>
            <img
                className="ficha-empresa-logo"
                src="/empresa-logo.jpeg"
                alt="aleph impresores"
                style={{
                    maxHeight: 72,
                    maxWidth: '100%',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    display: 'block',
                }}
            />
        </Stack>
    );
}

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
                    version: response.version ?? '3',
                    codigoDoc: response.codigoDoc ?? 'FO-PD-63',
                    fechaEmision: response.fechaCreacion
                        ? new Date(response.fechaCreacion).toLocaleDateString()
                        : '-',
                    medidas: response?.medidas || {},
                    tintas: response?.tintas || {},
                    terminados: response?.terminados || {},
                    ampliacionesUrls: Array.isArray(response?.ampliacionesUrls)
                        ? response.ampliacionesUrls
                        : [],
                    adjuntosUrls: Array.isArray(response?.adjuntosUrls)
                        ? response.adjuntosUrls
                        : [],
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
        <div className="ficha-print-root">
            <style>
                {`
                @media screen {
                    body { overflow-y: auto !important; height: auto !important; }
                    .ficha-print-root {
                        background: #0f172a;
                        min-height: 100vh;
                        padding-top: 80px;
                        padding-bottom: 40px;
                    }
                    .ficha-ampliacion-img { max-height: 720px; }
                }
                @media print {
                    /* Una sola hoja A4: márgenes mínimos + tipografía compacta + imagen prioritaria */
                    @page { size: A4 portrait; margin: 5mm; }
                    html, body {
                        background: #fff !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        margin: 0 !important;
                        padding: 0 !important;
                        height: auto !important;
                    }
                    body::before {
                        display: none !important;
                        content: none !important;
                        visibility: hidden !important;
                    }
                    #root {
                        background: #fff !important;
                        min-height: 0 !important;
                        overflow: visible !important;
                    }
                    .ficha-print-root {
                        background: #fff !important;
                        padding: 0 !important;
                        min-height: 0 !important;
                    }
                    .print-container {
                        margin: 0 auto !important;
                        padding: 4px 6px !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        border: none !important;
                        box-shadow: none !important;
                    }
                    .no-print { display: none !important; }
                    .main-content-area { margin-top: 0 !important; }
                    /* Cada bloque .ficha-sheet termina en salto de página (excepto el último) */
                    .ficha-sheet {
                        page-break-after: always;
                        break-after: page;
                    }
                    .ficha-sheet:last-child {
                        page-break-after: auto;
                        break-after: auto;
                    }
                    .ficha-sheet--page2 {
                        page-break-before: always;
                        break-before: page;
                    }
                    .ficha-sheet--page2 .print-container { margin-top: 0 !important; }
                    .ficha-print-hoja1 {
                        font-size: 8pt;
                        line-height: 1.12;
                    }
                    .ficha-print-hoja1 .mantine-Title-root { font-size: 0.95rem !important; }
                    .ficha-print-hoja1 .mantine-Divider-root { margin-top: 0.2rem !important; margin-bottom: 0.2rem !important; }
                    .ficha-print-hoja1 .label {
                        font-size: 7px !important;
                        line-height: 1.1 !important;
                    }
                    .ficha-print-hoja1 .value {
                        font-size: 8.5pt !important;
                        min-height: 11px !important;
                        margin-top: 0 !important;
                    }
                    .ficha-print-header-print { margin-bottom: 0.35rem !important; }
                    .ficha-print-left-stack { gap: 4px !important; }
                    .ficha-print-right-stack { gap: 3px !important; }
                    .ficha-print-pre-firmas { margin-top: 0.35rem !important; margin-bottom: 0.35rem !important; }
                    .ficha-print-firmas-line { height: 18px !important; }
                    .ficha-print-legal { font-size: 6.5pt !important; line-height: 1.15 !important; margin-top: 0.35rem !important; }
                    .ficha-ampliacion-stack {
                        min-height: 0 !important;
                        height: auto !important;
                    }
                    .ficha-ampliacion-box {
                        min-height: 0 !important;
                        flex: none !important;
                        max-height: none !important;
                        padding: 4px !important;
                    }
                    .ficha-ampliacion-img {
                        max-height: 122mm !important;
                        width: 100% !important;
                        object-fit: contain !important;
                    }
                    .ficha-terminados-derecha {
                        max-height: 24mm !important;
                        overflow-y: auto !important;
                        margin-top: 0.15rem !important;
                    }
                    .ficha-terminados-derecha .mantine-Divider-root {
                        margin-top: 0.15rem !important;
                        margin-bottom: 0.15rem !important;
                    }
                    .ficha-notas-caja {
                        max-height: 18mm !important;
                        overflow-y: auto !important;
                        font-size: 7pt !important;
                    }
                    .ficha-empresa-logo { max-height: 11mm !important; }
                    .ficha-print-hoja1 { padding: 4px 6px !important; }
                    .ficha-print-hoja1 .ficha-dimension-valor {
                        min-height: 10px !important;
                        font-size: 8.5pt !important;
                    }
                    .ficha-print-hoja2 {
                        min-height: 0 !important;
                        padding: 6px 8px !important;
                    }
                    .ficha-adjunto-img {
                        max-width: 100% !important;
                        max-height: 250mm !important;
                        object-fit: contain !important;
                    }
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

            {/* Documento Ficha Técnica — hoja 1 */}
            <div
                className={
                    (data.adjuntosUrls?.length ?? 0) > 0
                        ? 'ficha-sheet ficha-sheet--page1 ficha-sheet--with-page2'
                        : 'ficha-sheet ficha-sheet--page1'
                }
            >
                <Container size="xl" py="xl" className="print-container main-content-area" style={{ background: 'white', color: 'black', boxShadow: '0 0 40px rgba(0,0,0,0.5)', borderRadius: '4px' }}>
                <Box p="md" className="ficha-print-hoja1" style={{ border: '2px solid black' }}>
                    {/* Header Section */}
                    <Grid align="center" mb="md" className="ficha-print-header-print">
                        <Grid.Col span={3}>
                            <EmpresaLogoMark />
                        </Grid.Col>
                        <Grid.Col span={6}>
                            <Title order={3} ta="center" style={{ textDecoration: 'underline' }}>FICHA TÉCNICA DEL PRODUCTO</Title>
                        </Grid.Col>
                        <Grid.Col span={3}>
                            <Stack gap={0} ta="right">
                                <Text size="xs"><b>N° OT:</b> {data.otNumber ?? '-'}</Text>
                                <Text size="xs"><b>CÓDIGO:</b> {data.codigoDoc}</Text>
                                <Text size="xs"><b>VERSIÓN:</b> {data.version}</Text>
                                <Text size="xs"><b>Fecha de emisión:</b> {data.fechaEmision}</Text>
                                <Text size="xs"><b>Fecha de actualización:</b> {data.fechaActualizacion ? new Date(data.fechaActualizacion).toLocaleDateString() : '-'}</Text>
                            </Stack>
                        </Grid.Col>
                    </Grid>

                    <Grid grow gutter="xs" align="flex-start">
                        <Grid.Col span={5}>
                            {/* Left Column Data */}
                            <Stack gap="xs" className="ficha-print-left-stack">
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

                                <Grid gutter="xs">
                                    <Grid.Col span={4}>
                                        <Text className="label">Fecha solicitud OT:</Text>
                                        <Text className="value">
                                            {data.fechaSolicitud ? new Date(data.fechaSolicitud).toLocaleDateString() : '-'}
                                        </Text>
                                    </Grid.Col>
                                    <Grid.Col span={4}>
                                        <Text className="label">Asignación:</Text>
                                        <Text className="value">{data.asignacion ?? '-'}</Text>
                                    </Grid.Col>
                                    <Grid.Col span={4}>
                                        <Text className="label">Ejecutivo de cuenta:</Text>
                                        <Text className="value">{data.ejecutivo ?? '-'}</Text>
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

                                <Grid gutter="xs" mt={4}>
                                    <Grid.Col span={3}>
                                        <Text className="label">Fuelle:</Text>
                                        <Text className="value">{data.medidas.fuelle ?? '-'}</Text>
                                    </Grid.Col>
                                    <Grid.Col span={3}>
                                        <Text className="label">Cabida:</Text>
                                        <Text className="value">{data.cabida != null && data.cabida !== '' ? data.cabida : '-'}</Text>
                                    </Grid.Col>
                                    <Grid.Col span={3}>
                                        <Text className="label">Alto pliego (cm):</Text>
                                        <Text className="value">{data.altoPliego ?? '-'}</Text>
                                    </Grid.Col>
                                    <Grid.Col span={3}>
                                        <Text className="label">Ancho pliego (cm):</Text>
                                        <Text className="value">{data.anchoPliego ?? '-'}</Text>
                                    </Grid.Col>
                                </Grid>

                                <Group mt="xs" gap="xl">
                                    <Group gap="xs">
                                        <FichaCheckBox checked={data.troquelNuevo} />
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
                                        <FichaTintInkMark letter="C" inkKey="c" checked={!!data.tintas.c} />
                                        <FichaTintInkMark letter="M" inkKey="m" checked={!!data.tintas.m} />
                                        <FichaTintInkMark letter="Y" inkKey="y" checked={!!data.tintas.y} />
                                        <FichaTintInkMark letter="K" inkKey="k" checked={!!data.tintas.k} />
                                    </Group>
                                    <Group gap="xs">
                                        <Text size="xs" fw={700}>Especiales:</Text>
                                        <Text size="xs" style={{ borderBottom: '1px solid #ced4da', flex: 1 }}>{data.tintas.especiales}</Text>
                                    </Group>
                                </Group>
                            </Stack>
                        </Grid.Col>

                        <Grid.Col span={7}>
                            {/* Ampliaciones (OT) — columna derecha más ancha para impresión */}
                            <Stack
                                align="stretch"
                                justify="flex-start"
                                gap="xs"
                                className="ficha-ampliacion-stack ficha-print-right-stack"
                                style={{ minHeight: 0 }}
                            >
                                <Text size="sm" fw={700} ta="center" style={{ width: '100%' }}>
                                    AMPLIACIÓN
                                </Text>
                                <Box
                                    className="ficha-ampliacion-box"
                                    style={{
                                        border: '1px dashed #ced4da',
                                        padding: '10px',
                                        width: '100%',
                                        minHeight: 220,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '12px',
                                    }}
                                >
                                    {(data.ampliacionesUrls?.length ?? 0) > 0 ? (
                                        data.ampliacionesUrls.map((url, i) => (
                                            <img
                                                key={`${url}-${i}`}
                                                className="ficha-ampliacion-img"
                                                src={resolveUploadUrl(url)}
                                                alt={`Ampliación ${i + 1}`}
                                                style={{
                                                    width: '100%',
                                                    maxWidth: '100%',
                                                    height: 'auto',
                                                    objectFit: 'contain',
                                                }}
                                            />
                                        ))
                                    ) : (
                                        <Text size="sm" c="dimmed" ta="center" mt="xl">
                                            Sin imagen de ampliación
                                        </Text>
                                    )}
                                </Box>

                                <Box mt="xs" className="ficha-terminados-derecha" style={{ width: '100%' }}>
                                    <Divider label="TERMINADOS" labelPosition="center" my="xs" />
                                    <Stack gap="xs">
                                        <Box>
                                            <Text className="label">Terminado 1:</Text>
                                            <Text className="value">{data.terminados.t1}</Text>
                                        </Box>
                                        <Box>
                                            <Text className="label">Terminado 2:</Text>
                                            <Text className="value">{data.terminados.t2}</Text>
                                        </Box>
                                        <Group gap="xs">
                                            <FichaCheckBox checked={!!data.terminados.estampado} boxSize={14} border="1px solid black" />
                                            <Text size="xs" fw={700}>Estampado</Text>
                                        </Group>
                                        <Box>
                                            <Text className="label">Pie de imprenta:</Text>
                                            <Text className="value">{data.terminados.pieImprenta}</Text>
                                        </Box>
                                    </Stack>
                                </Box>

                                <Box mt="xs" className="ficha-notas-columna" style={{ width: '100%' }}>
                                    <Text className="label">Notas:</Text>
                                    <Box
                                        p="xs"
                                        className="ficha-notas-caja"
                                        style={{
                                            border: '1px solid #ced4da',
                                            minHeight: '56px',
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            borderRadius: '4px',
                                        }}
                                    >
                                        <Text size="xs" style={{ whiteSpace: 'pre-wrap' }}>{data.notas}</Text>
                                    </Box>
                                </Box>
                            </Stack>
                        </Grid.Col>
                    </Grid>

                    <Box>
                        <Divider my="md" className="ficha-print-pre-firmas" />

                        <Grid grow>
                            <Grid.Col span={4}>
                                <Stack gap={2}>
                                    <Text size="xs"><b>Revisado Diseñador:</b></Text>
                                    <Box className="ficha-print-firmas-line" style={{ borderBottom: '1px solid black', height: '30px', width: '80%' }} />
                                </Stack>
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Stack gap={2}>
                                    <Text size="xs"><b>Revisado Ejecutivo de cuenta:</b></Text>
                                    <Box className="ficha-print-firmas-line" style={{ borderBottom: '1px solid black', height: '30px', width: '80%' }} />
                                </Stack>
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Stack gap={2}>
                                    <Text size="xs"><b>Aprobación Cliente:</b></Text>
                                    <Box className="ficha-print-firmas-line" style={{ borderBottom: '1px solid black', height: '30px', width: '80%' }} />
                                </Stack>
                            </Grid.Col>
                        </Grid>

                        <Box mt="sm">
                            <Text className="ficha-print-legal" size="xs" c="dimmed" style={{ fontStyle: 'italic', lineHeight: 1.3, textAlign: 'justify' }}>
                                <b>IMPORTANTE:</b> Revisar cuidadosamente FICHA TÉCNICA Y TEXTOS ARTE FINAL. LA APROBACIÓN de este material no excluye a ninguno de los que interviene en el proceso. Los COLORES de esta impresión son de referencia. La ÚNICA representación de COLORES CONFIABLE se obtiene con la GUÍA DE COLORES PANTONE, excepto sobre material KRAFT.
                            </Text>
                        </Box>
                    </Box>
                </Box>
            </Container>
            </div>

            {(data.adjuntosUrls?.length ?? 0) > 0 && (
                <div className="ficha-sheet ficha-sheet--page2">
                    <Container
                        size="xl"
                        py="xl"
                        className="print-container main-content-area"
                        style={{
                            background: 'white',
                            color: 'black',
                            boxShadow: '0 0 40px rgba(0,0,0,0.5)',
                            borderRadius: '4px',
                            marginTop: 32,
                        }}
                    >
                        <Box p="md" className="ficha-print-hoja2" style={{ border: '2px solid black', minHeight: '70vh' }}>
                            <Grid align="center" mb="md">
                                <Grid.Col span={3}>
                                    <EmpresaLogoMark />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <Title order={3} ta="center" style={{ textDecoration: 'underline' }}>
                                        ADJUNTO — OT {data.otNumber ?? '-'}
                                    </Title>
                                </Grid.Col>
                                <Grid.Col span={3}>
                                    <Stack gap={0} ta="right">
                                        <Text size="xs"><b>N° OT:</b> {data.otNumber ?? '-'}</Text>
                                        <Text size="xs"><b>Pieza:</b> {data.pieza ?? '-'}</Text>
                                    </Stack>
                                </Grid.Col>
                            </Grid>
                            <Stack gap="lg" align="center">
                                {data.adjuntosUrls.map((url, i) => (
                                    <img
                                        key={`adj-${url}-${i}`}
                                        className="ficha-adjunto-img"
                                        src={resolveUploadUrl(url)}
                                        alt={`Adjunto ${i + 1}`}
                                        style={{
                                            maxWidth: '100%',
                                            width: 'auto',
                                            height: 'auto',
                                            objectFit: 'contain',
                                            display: 'block',
                                        }}
                                    />
                                ))}
                            </Stack>
                        </Box>
                    </Container>
                </div>
            )}
        </div>
    );
};

function FichaTecnicaPrintRoute() {
    const location = useLocation();
    const sessionUser = getCurrentUser();
    if (!canAccessRoute(location.pathname, sessionUser)) {
        return <Navigate to={getFirstAllowedPath(sessionUser)} replace />;
    }
    return <FichaTecnicaPrint />;
}

export default FichaTecnicaPrintRoute;
