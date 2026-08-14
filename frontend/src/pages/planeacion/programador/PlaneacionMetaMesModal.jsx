import { useCallback, useEffect, useState } from 'react';
import { Button, Group, Modal, NumberInput, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { schedulingApi } from '../../../services/schedulingApi';

export default function PlaneacionMetaMesModal({ opened, onClose, year, month, monthName, onSaved }) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [monthlyGoal, setMonthlyGoal] = useState(0);
    const [weekCount, setWeekCount] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await schedulingApi.getBillingMeta({ year, month });
            setMonthlyGoal(Number(data?.monthlyGoal) || 0);
            setWeekCount(Number(data?.weekCount) || 0);
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: error?.message || 'No se pudo cargar la meta.',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    }, [year, month]);

    useEffect(() => {
        if (opened) load();
    }, [opened, load]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await schedulingApi.setBillingMeta({ year, month, monthlyGoal: monthlyGoal || 0 });
            notifications.show({ title: 'Meta guardada', message: 'Meta de facturacion actualizada.', color: 'green' });
            onSaved?.();
            onClose();
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: error?.message || 'No se pudo guardar la meta.',
                color: 'red',
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={`Meta de facturacion - ${monthName} ${year}`}
            size="sm"
        >
            <Stack gap="sm">
                <Text size="sm" c="dimmed">
                    La meta mensual se divide en partes iguales entre las {weekCount || '—'} semanas del mes.
                    Si una semana cierra sin cumplir la meta, el faltante se arrastra a la siguiente.
                </Text>
                <NumberInput
                    label="Meta mensual ($)"
                    placeholder="Ej: 80000000"
                    value={monthlyGoal}
                    onChange={(value) => setMonthlyGoal(typeof value === 'number' ? value : 0)}
                    thousandSeparator=","
                    min={0}
                    disabled={loading}
                />
                <Group justify="flex-end" mt="md">
                    <Button variant="default" onClick={onClose}>Cancelar</Button>
                    <Button color="teal" onClick={handleSave} loading={saving || loading}>Guardar meta</Button>
                </Group>
            </Stack>
        </Modal>
    );
}
