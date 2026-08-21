import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Accordion,
    Alert,
    Badge,
    Button,
    Card,
    Checkbox,
    FileInput,
    Group,
    NumberInput,
    ScrollArea,
    SimpleGrid,
    Stack,
    Table,
    Text,
    Textarea,
    TextInput,
    Title,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconDatabaseImport, IconFileTypePdf } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import '@mantine/dates/styles.css';
import { manufacturingOrdersApi } from '../../../services/manufacturingOrdersApi';

function toDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function parseProcesses(json) {
    try {
        const arr = JSON.parse(json || '[]');
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

export default function RegistrarOpExistente() {
    const navigate = useNavigate();
    const [fichaPdf, setFichaPdf] = useState(null);
    const [opPdf, setOpPdf] = useState(null);
    const [parsed, setParsed] = useState(null);
    const [form, setForm] = useState(null);
    const [parsing, setParsing] = useState(false);
    const [saving, setSaving] = useState(false);

    const canParse = useMemo(() => !!fichaPdf && !!opPdf, [fichaPdf, opPdf]);

    const setField = (key, value) => setForm((f) => (f ? { ...f, [key]: value } : f));

    const handleParse = async () => {
        if (!canParse) {
            notifications.show({
                title: 'Faltan PDFs',
                message: 'Suba la ficha técnica y la orden de producción (PDF).',
                color: 'yellow',
            });
            return;
        }
        try {
            setParsing(true);
            setParsed(null);
            setForm(null);
            const data = await manufacturingOrdersApi.parseExistingPdfs(fichaPdf, opPdf);
            setParsed(data);
            setForm({
                ...data,
                openingDate: toDate(data.openingDate) || new Date(),
                agreedDeliveryDate: toDate(data.agreedDeliveryDate),
            });
            notifications.show({
                title: 'Datos leídos',
                message: `Se extrajo la OP ${data.opNumber}. Revise, corrija si hace falta y guarde.`,
                color: 'teal',
            });
        } catch (err) {
            notifications.show({
                title: 'No se pudo leer los PDFs',
                message: err?.message || String(err),
                color: 'red',
            });
        } finally {
            setParsing(false);
        }
    };

    const handleSave = async () => {
        if (!canParse || !form) return;
        try {
            setSaving(true);
            const overrides = {
                opNumber: form.opNumber,
                otNumber: form.otNumber,
                clientName: form.clientName,
                productName: form.productName,
                referenceName: form.referenceName,
                purchaseOrderNumber: form.purchaseOrderNumber,
                ejecutivoCuenta: form.ejecutivoCuenta,
                lineaPT: form.lineaPT,
                quantityToProduce: Number(form.quantityToProduce),
                quantityOrdered: Number(form.quantityOrdered) || Number(form.quantityToProduce),
                openingDate: form.openingDate instanceof Date ? form.openingDate.toISOString() : form.openingDate,
                agreedDeliveryDate: form.agreedDeliveryDate
                    ? (form.agreedDeliveryDate instanceof Date ? form.agreedDeliveryDate.toISOString() : form.agreedDeliveryDate)
                    : null,
                codigoTroquel: form.codigoTroquel,
                materialNotes: form.materialNotes,
                fabricationProcessesJson: form.fabricationProcessesJson,
                alto: form.alto,
                ancho: form.ancho,
                largo: form.largo,
                fuelle: form.fuelle,
                terminado1: form.terminado1,
                terminado2: form.terminado2,
                pieImprenta: form.pieImprenta,
                tintaC: !!form.tintaC,
                tintaM: !!form.tintaM,
                tintaY: !!form.tintaY,
                tintaK: !!form.tintaK,
                parts: Array.isArray(form.parts) ? form.parts : [],
            };
            const created = await manufacturingOrdersApi.registerExistingFromPdfs(
                fichaPdf,
                opPdf,
                JSON.stringify(overrides)
            );
            notifications.show({
                title: 'OP registrada',
                message: `Se guardó la OP ${created.opNumber} con textos PDF en la base de datos para revisión.`,
                color: 'green',
            });
            setFichaPdf(null);
            setOpPdf(null);
            setParsed(null);
            setForm(null);
            navigate('/produccion/estado-ordenes');
        } catch (err) {
            notifications.show({
                title: 'No se pudo registrar',
                message: err?.message || String(err),
                color: 'red',
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fade-in" style={{ paddingBottom: 40 }}>
            <Card className="glass-card" mb="xl" style={{ borderLeft: '4px solid #6366f1' }}>
                <Group gap="xs" mb={4}>
                    <IconDatabaseImport size={22} color="#6366f1" />
                    <Title order={3} c="white">Registrar OP existente</Title>
                </Group>
                <Text size="sm" c="dimmed">
                    Suba los dos PDFs (ficha técnica y orden de producción). El sistema lee los datos,
                    permite corregirlos y guarda también los textos extraídos para revisarlos después.
                </Text>
            </Card>

            <Card className="glass-card" p="xl">
                <Stack gap="md">
                    <Alert color="blue" variant="light" title="Documentos requeridos">
                        Necesita <strong>dos PDFs</strong>: ficha técnica y OP. Al guardar se crea la OP{' '}
                        <strong>Abierta</strong> y se almacenan los textos crudos en la pieza (para revisión).
                    </Alert>

                    <SimpleGrid cols={{ base: 1, md: 2 }}>
                        <FileInput
                            label="PDF ficha técnica"
                            placeholder="Seleccionar ficha…"
                            accept="application/pdf,.pdf"
                            leftSection={<IconFileTypePdf size={16} />}
                            value={fichaPdf}
                            onChange={(file) => {
                                setFichaPdf(file);
                                setParsed(null);
                                setForm(null);
                            }}
                            clearable
                            required
                        />
                        <FileInput
                            label="PDF orden de producción"
                            placeholder="Seleccionar OP…"
                            accept="application/pdf,.pdf"
                            leftSection={<IconFileTypePdf size={16} />}
                            value={opPdf}
                            onChange={(file) => {
                                setOpPdf(file);
                                setParsed(null);
                                setForm(null);
                            }}
                            clearable
                            required
                        />
                    </SimpleGrid>

                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => navigate('/produccion/estado-ordenes')}>
                            Cancelar
                        </Button>
                        <Button variant="light" loading={parsing} disabled={!canParse} onClick={handleParse}>
                            Leer PDFs
                        </Button>
                        <Button loading={saving} disabled={!canParse || !form} onClick={handleSave}>
                            Guardar en la base de datos
                        </Button>
                    </Group>

                    {form && (
                        <Card withBorder padding="md" radius="md" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <Group justify="space-between" mb="sm">
                                <Text fw={600}>Datos extraídos (editables)</Text>
                                <Badge color="indigo">OP {form.opNumber}</Badge>
                            </Group>

                            {(parsed?.warnings || []).length > 0 && (
                                <Alert color="yellow" variant="light" mb="md" title="Revisar">
                                    <Stack gap={4}>
                                        {parsed.warnings.map((w) => (
                                            <Text key={w} size="sm">{w}</Text>
                                        ))}
                                    </Stack>
                                </Alert>
                            )}

                            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
                                <TextInput label="Número OP" value={form.opNumber || ''} onChange={(e) => setField('opNumber', e.target.value)} required />
                                <TextInput label="Cliente" value={form.clientName || ''} onChange={(e) => setField('clientName', e.target.value)} required />
                                <TextInput label="Producto / trabajo" value={form.productName || ''} onChange={(e) => setField('productName', e.target.value)} required />
                                <TextInput label="Referencia" value={form.referenceName || ''} onChange={(e) => setField('referenceName', e.target.value)} />
                                <TextInput label="O. compra" value={form.purchaseOrderNumber || ''} onChange={(e) => setField('purchaseOrderNumber', e.target.value)} />
                                <TextInput label="Ejecutivo" value={form.ejecutivoCuenta || ''} onChange={(e) => setField('ejecutivoCuenta', e.target.value)} />
                                <TextInput label="Línea" value={form.lineaPT || ''} onChange={(e) => setField('lineaPT', e.target.value)} />
                                <NumberInput label="Cantidad a producir" min={1} value={form.quantityToProduce} onChange={(v) => setField('quantityToProduce', v)} />
                                <DateInput label="Fecha apertura" value={form.openingDate} onChange={(v) => setField('openingDate', v)} />
                                <DateInput label="Fecha despacho" value={form.agreedDeliveryDate} onChange={(v) => setField('agreedDeliveryDate', v)} />
                                <TextInput label="Troquel" value={form.codigoTroquel || ''} onChange={(e) => setField('codigoTroquel', e.target.value)} />
                                <NumberInput label="Alto" decimalScale={2} value={form.alto} onChange={(v) => setField('alto', v)} />
                                <NumberInput label="Ancho" decimalScale={2} value={form.ancho} onChange={(v) => setField('ancho', v)} />
                                <NumberInput label="Largo" decimalScale={2} value={form.largo} onChange={(v) => setField('largo', v)} />
                                <NumberInput label="Fuelle" decimalScale={2} value={form.fuelle} onChange={(v) => setField('fuelle', v)} />
                                <TextInput label="Terminado 1" value={form.terminado1 || ''} onChange={(e) => setField('terminado1', e.target.value)} />
                                <TextInput label="Terminado 2" value={form.terminado2 || ''} onChange={(e) => setField('terminado2', e.target.value)} />
                            </SimpleGrid>

                            <Group gap="md" mt="sm">
                                <Checkbox label="C" checked={!!form.tintaC} onChange={(e) => setField('tintaC', e.currentTarget.checked)} />
                                <Checkbox label="M" checked={!!form.tintaM} onChange={(e) => setField('tintaM', e.currentTarget.checked)} />
                                <Checkbox label="Y" checked={!!form.tintaY} onChange={(e) => setField('tintaY', e.currentTarget.checked)} />
                                <Checkbox label="K" checked={!!form.tintaK} onChange={(e) => setField('tintaK', e.currentTarget.checked)} />
                            </Group>

                            <Textarea
                                mt="md"
                                label="Material / notas (pieza principal)"
                                minRows={2}
                                value={form.materialNotes || ''}
                                onChange={(e) => setField('materialNotes', e.target.value)}
                            />

                            {(Array.isArray(form.parts) ? form.parts : []).length > 0 ? (
                                <Accordion mt="md" variant="separated" defaultValue={form.parts[0]?.partName || 'p0'}>
                                    {form.parts.map((part, pi) => (
                                        <Accordion.Item key={`${part.partName}-${pi}`} value={part.partName || `p${pi}`}>
                                            <Accordion.Control>
                                                <Group gap="sm">
                                                    <Text fw={600} size="sm">{part.partName || `Pieza ${pi + 1}`}</Text>
                                                    <Badge size="sm" variant="light">
                                                        {parseProcesses(part.fabricationProcessesJson).length} procesos
                                                    </Badge>
                                                </Group>
                                            </Accordion.Control>
                                            <Accordion.Panel>
                                                <Stack gap="sm">
                                                    <Text size="sm" c="dimmed">{part.material || part.notas || '—'}</Text>
                                                    <SimpleGrid cols={{ base: 2, md: 4 }}>
                                                        <NumberInput label="Alto" decimalScale={2} value={part.alto} onChange={(v) => {
                                                            const next = [...form.parts];
                                                            next[pi] = { ...next[pi], alto: v };
                                                            setField('parts', next);
                                                        }} />
                                                        <NumberInput label="Ancho" decimalScale={2} value={part.ancho} onChange={(v) => {
                                                            const next = [...form.parts];
                                                            next[pi] = { ...next[pi], ancho: v };
                                                            setField('parts', next);
                                                        }} />
                                                        <NumberInput label="Alto pliego" decimalScale={2} value={part.altoPliego} onChange={(v) => {
                                                            const next = [...form.parts];
                                                            next[pi] = { ...next[pi], altoPliego: v };
                                                            setField('parts', next);
                                                        }} />
                                                        <NumberInput label="Ancho pliego" decimalScale={2} value={part.anchoPliego} onChange={(v) => {
                                                            const next = [...form.parts];
                                                            next[pi] = { ...next[pi], anchoPliego: v };
                                                            setField('parts', next);
                                                        }} />
                                                    </SimpleGrid>
                                                    <Table striped highlightOnHover withTableBorder verticalSpacing="xs">
                                                        <Table.Thead>
                                                            <Table.Tr>
                                                                <Table.Th>Máquina / proceso</Table.Th>
                                                                <Table.Th>Catálogo</Table.Th>
                                                                <Table.Th>Notas</Table.Th>
                                                            </Table.Tr>
                                                        </Table.Thead>
                                                        <Table.Tbody>
                                                            {parseProcesses(part.fabricationProcessesJson).length === 0 ? (
                                                                <Table.Tr>
                                                                    <Table.Td colSpan={3}>
                                                                        <Text size="sm" c="dimmed">No se detectaron procesos en esta pieza.</Text>
                                                                    </Table.Td>
                                                                </Table.Tr>
                                                            ) : parseProcesses(part.fabricationProcessesJson).map((proc, i) => (
                                                                <Table.Tr key={`${proc.machine || 'p'}-${i}`}>
                                                                    <Table.Td>
                                                                        <Text size="sm" fw={600}>{proc.machine || '—'}</Text>
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        <Badge size="sm" variant="light" color={proc.processCode ? 'indigo' : 'gray'}>
                                                                            {proc.processCode || proc.process || '—'}
                                                                        </Badge>
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        <Text size="xs">{proc.notes || '—'}</Text>
                                                                    </Table.Td>
                                                                </Table.Tr>
                                                            ))}
                                                        </Table.Tbody>
                                                    </Table>
                                                </Stack>
                                            </Accordion.Panel>
                                        </Accordion.Item>
                                    ))}
                                </Accordion>
                            ) : (
                            <Stack gap={6} mt="md">
                                <Group justify="space-between">
                                    <Text fw={600} size="sm">Procesos de la OP</Text>
                                    <Badge variant="light">{parseProcesses(form.fabricationProcessesJson).length}</Badge>
                                </Group>
                                <ScrollArea>
                                    <Table striped highlightOnHover withTableBorder verticalSpacing="xs">
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Máquina / proceso</Table.Th>
                                                <Table.Th>Catálogo</Table.Th>
                                                <Table.Th>Notas</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {parseProcesses(form.fabricationProcessesJson).length === 0 ? (
                                                <Table.Tr>
                                                    <Table.Td colSpan={3}>
                                                        <Text size="sm" c="dimmed">No se detectaron procesos en el PDF.</Text>
                                                    </Table.Td>
                                                </Table.Tr>
                                            ) : parseProcesses(form.fabricationProcessesJson).map((proc, i) => (
                                                <Table.Tr key={`${proc.machine || 'p'}-${i}`}>
                                                    <Table.Td>
                                                        <Text size="sm" fw={600}>{proc.machine || '—'}</Text>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Badge size="sm" variant="light" color={proc.processCode ? 'indigo' : 'gray'}>
                                                            {proc.processCode || proc.process || '—'}
                                                        </Badge>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Text size="xs">{proc.notes || '—'}</Text>
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                </ScrollArea>
                            </Stack>
                            )}

                            <Accordion mt="md" variant="separated">
                                <Accordion.Item value="raw">
                                    <Accordion.Control>Textos extraídos del PDF (se guardan en BD)</Accordion.Control>
                                    <Accordion.Panel>
                                        <SimpleGrid cols={{ base: 1, md: 2 }}>
                                            <Textarea
                                                label="Texto ficha"
                                                minRows={10}
                                                readOnly
                                                value={parsed?.rawFichaText || ''}
                                                styles={{ input: { fontFamily: 'monospace', fontSize: 11 } }}
                                            />
                                            <Textarea
                                                label="Texto OP"
                                                minRows={10}
                                                readOnly
                                                value={parsed?.rawOpText || ''}
                                                styles={{ input: { fontFamily: 'monospace', fontSize: 11 } }}
                                            />
                                        </SimpleGrid>
                                    </Accordion.Panel>
                                </Accordion.Item>
                            </Accordion>
                        </Card>
                    )}
                </Stack>
            </Card>
        </div>
    );
}
