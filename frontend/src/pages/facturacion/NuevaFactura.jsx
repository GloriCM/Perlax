import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Button, Card, Group, NumberInput, Select, Stack, Text, Textarea, Title,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconArrowLeft, IconDeviceFloppy } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../utils/api';

const money = (v) => Number(v || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export default function NuevaFactura() {
    const navigate = useNavigate();
    const [number, setNumber] = useState('');
    const [pending, setPending] = useState([]);
    const [remisionId, setRemisionId] = useState(null);
    const [invoiceDate, setInvoiceDate] = useState(new Date());
    const [dueDate, setDueDate] = useState(null);
    const [taxRate, setTaxRate] = useState(19);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const selected = pending.find((p) => p.remisionId === remisionId);

    useEffect(() => {
        const load = async () => {
            try {
                const [rows, next] = await Promise.all([
                    api.get('/production/facturas/pending-remisiones'),
                    api.get('/production/facturas/next-number'),
                ]);
                setPending(rows || []);
                setNumber(String(next || ''));
            } catch (error) {
                notifications.show({ title: 'Error', message: error?.message || 'No se pudo cargar facturación.', color: 'red' });
            }
        };
        load();
    }, []);

    const save = async () => {
        if (!remisionId) {
            notifications.show({ title: 'Remisión requerida', message: 'Seleccione una remisión pendiente.', color: 'yellow' });
            return;
        }
        setSaving(true);
        try {
            const created = await api.post('/production/facturas', {
                remisionId, invoiceDate, dueDate, notes, taxRate,
            });
            notifications.show({ title: 'Factura creada', message: created.invoiceNumber, color: 'green' });
            navigate('/facturacion/informe');
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo crear la factura.', color: 'red' });
        } finally {
            setSaving(false);
        }
    };

    const subtotal = selected?.estimatedSubtotal || 0;
    const tax = Math.round(subtotal * (taxRate || 0) / 100);
    const total = subtotal + tax;

    return (
        <Stack gap="md" p="md">
            <Group justify="space-between">
                <Group>
                    <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/facturacion/informe')}>Volver</Button>
                    <div>
                        <Title order={2}>Nueva factura</Title>
                        <Text c="dimmed" size="sm">{number}</Text>
                    </div>
                </Group>
                <Button leftSection={<IconDeviceFloppy size={16} />} loading={saving} onClick={save}>Guardar</Button>
            </Group>

            <Card withBorder>
                <Stack>
                    <Select
                        label="Remisión pendiente"
                        searchable
                        data={(pending || []).map((p) => ({
                            value: p.remisionId,
                            label: `${p.remisionNumber} · ${p.clientName} · ${money(p.estimatedSubtotal)}`,
                        }))}
                        value={remisionId}
                        onChange={setRemisionId}
                    />
                    <Group grow>
                        <DateInput label="Fecha factura" value={invoiceDate} onChange={setInvoiceDate} />
                        <DateInput label="Vencimiento" value={dueDate} onChange={setDueDate} clearable />
                        <NumberInput label="% IVA" min={0} max={100} value={taxRate} onChange={setTaxRate} />
                    </Group>
                    <Textarea label="Observaciones" value={notes} onChange={(e) => setNotes(e.currentTarget.value)} />
                    {selected && (
                        <Group>
                            <Text>Subtotal: <b>{money(subtotal)}</b></Text>
                            <Text>IVA: <b>{money(tax)}</b></Text>
                            <Text>Total: <b>{money(total)}</b></Text>
                        </Group>
                    )}
                </Stack>
            </Card>
        </Stack>
    );
}
