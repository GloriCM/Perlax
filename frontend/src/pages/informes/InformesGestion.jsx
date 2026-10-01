import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    Button, Card, Group, ScrollArea, Select, SimpleGrid, Stack, Table, Text, TextInput, Title,
} from '@mantine/core';
import { IconDownload, IconRefresh } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../utils/api';

function toCsv(columns, rows) {
    const header = columns.map((c) => c.label).join(';');
    const body = rows.map((row) =>
        columns.map((c) => {
            const raw = row[c.key];
            const val = raw == null ? '' : String(raw).replaceAll('"', '""');
            return `"${val}"`;
        }).join(';')).join('\n');
    return `${header}\n${body}`;
}

function downloadCsv(filename, content) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Convierte valor de filtro (string YYYY-MM-DD, Date, dayjs-like) a ISO UTC.
 * Nunca llama .toISOString() sobre un string (error típico de Mantine DateInput).
 */
function dayBoundIso(value, endOfDay = false) {
    if (value == null || value === '') return null;

    let y;
    let mo;
    let d;

    if (typeof value === 'string') {
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
        if (!m) return null;
        y = Number(m[1]);
        mo = Number(m[2]);
        d = Number(m[3]);
    } else if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null;
        y = value.getFullYear();
        mo = value.getMonth() + 1;
        d = value.getDate();
    } else if (typeof value === 'object' && typeof value.toDate === 'function') {
        try {
            return dayBoundIso(value.toDate(), endOfDay);
        } catch {
            return null;
        }
    } else {
        return null;
    }

    if (!y || !mo || !d) return null;
    const dt = endOfDay
        ? new Date(Date.UTC(y, mo - 1, d, 23, 59, 59, 999))
        : new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0));
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
}

export default function InformesGestion() {
    const { reportKey: routeKey } = useParams();
    const [catalog, setCatalog] = useState([]);
    const [reportKey, setReportKey] = useState(routeKey || null);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [client, setClient] = useState('');
    const [q, setQ] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.get('/production/management-reports')
            .then((data) => {
                setCatalog(data || []);
                if (routeKey && (data || []).some((d) => d.key === routeKey)) {
                    setReportKey(routeKey);
                } else if (!reportKey && data?.length) {
                    setReportKey(data[0].key);
                }
            })
            .catch((error) => {
                notifications.show({ title: 'Error', message: error?.message || 'No se pudo cargar catálogo.', color: 'red' });
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routeKey]);

    const selectedMeta = useMemo(
        () => catalog.find((c) => c.key === reportKey),
        [catalog, reportKey],
    );

    const loadReport = useCallback(async () => {
        if (!reportKey) return;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            const fromIso = dayBoundIso(from, false);
            const toIso = dayBoundIso(to, true);
            if (fromIso) params.set('from', fromIso);
            if (toIso) params.set('to', toIso);
            if (String(client || '').trim()) params.set('client', String(client).trim());
            if (String(q || '').trim()) params.set('q', String(q).trim());
            const qs = params.toString();
            const data = await api.get(`/production/management-reports/${reportKey}${qs ? `?${qs}` : ''}`);
            setResult(data);
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo cargar el informe.', color: 'red' });
        } finally {
            setLoading(false);
        }
    }, [reportKey, from, to, client, q]);

    useEffect(() => {
        if (reportKey) loadReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reportKey]);

    const exportCsv = () => {
        if (!result?.columns?.length) return;
        downloadCsv(`${result.reportKey || 'informe'}.csv`, toCsv(result.columns, result.rows || []));
    };

    const onSelectReport = (key) => {
        if (typeof key !== 'string' || !key) return;
        setReportKey(key);
        setResult(null);
    };

    const onFromChange = (e) => {
        const v = e?.currentTarget?.value;
        setFrom(typeof v === 'string' ? v : '');
    };

    const onToChange = (e) => {
        const v = e?.currentTarget?.value;
        setTo(typeof v === 'string' ? v : '');
    };

    return (
        <Stack gap="md" p="md">
            <div>
                <Title order={2}>Informes de gestión</Title>
                <Text c="dimmed" size="sm">Consultas gerenciales sobre pedidos, producción, despachos, ventas y almacén.</Text>
            </div>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                {(catalog || []).map((item) => (
                    <Card
                        key={item.key}
                        withBorder
                        padding="md"
                        style={{
                            cursor: 'pointer',
                            borderColor: reportKey === item.key ? 'var(--mantine-color-indigo-5)' : undefined,
                        }}
                        onClick={() => onSelectReport(item.key)}
                    >
                        <Text fw={700}>{item.title}</Text>
                        <Text size="sm" c="dimmed">{item.description}</Text>
                    </Card>
                ))}
            </SimpleGrid>

            <Card withBorder>
                <Group align="flex-end" mb="md" wrap="wrap">
                    <Select
                        label="Informe"
                        searchable
                        data={(catalog || []).map((c) => ({ value: c.key, label: c.title }))}
                        value={reportKey}
                        onChange={onSelectReport}
                        style={{ minWidth: 280 }}
                    />
                    <TextInput
                        type="date"
                        label="Desde"
                        value={from}
                        onChange={onFromChange}
                    />
                    <TextInput
                        type="date"
                        label="Hasta"
                        value={to}
                        onChange={onToChange}
                    />
                    <TextInput label="Cliente" value={client} onChange={(e) => setClient(e.currentTarget.value)} />
                    <TextInput label="Buscar" value={q} onChange={(e) => setQ(e.currentTarget.value)} />
                    <Button leftSection={<IconRefresh size={16} />} loading={loading} onClick={loadReport}>Actualizar</Button>
                    <Button variant="light" leftSection={<IconDownload size={16} />} disabled={!result?.rows?.length} onClick={exportCsv}>
                        Exportar CSV
                    </Button>
                </Group>

                {selectedMeta && (
                    <Text size="sm" c="dimmed" mb="sm">{selectedMeta.description}</Text>
                )}

                {result?.externalLink && (
                    <Text mb="sm">
                        <Link to={result.externalLink}>{result.externalLinkLabel || result.externalLink}</Link>
                    </Text>
                )}

                <ScrollArea>
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                {(result?.columns || []).map((c) => (
                                    <Table.Th key={c.key}>{c.label}</Table.Th>
                                ))}
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {(result?.rows || []).map((row, idx) => (
                                <Table.Tr key={idx}>
                                    {(result?.columns || []).map((c) => (
                                        <Table.Td key={c.key}>{row[c.key] ?? '—'}</Table.Td>
                                    ))}
                                </Table.Tr>
                            ))}
                            {!loading && result && !(result.rows || []).length && (
                                <Table.Tr>
                                    <Table.Td colSpan={(result.columns || []).length || 1}>
                                        <Text c="dimmed">Sin filas para los filtros actuales.</Text>
                                    </Table.Td>
                                </Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>
            </Card>
        </Stack>
    );
}
