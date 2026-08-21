import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Badge,
    Button,
    Checkbox,
    Group,
    Modal,
    NumberInput,
    Select,
    Stack,
    Stepper,
    Table,
    Text,
    TextInput,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { schedulingApi } from '../../../services/schedulingApi';
import { dailyProductionApi } from '../../reportes/utils/dailyProductionApi';
import { api } from '../../../utils/api';

const PROCESS_ROLE_HINT = {
    Impresion: 'Impresora',
    Corrugacion: 'Corrugadora',
    Troquelado: 'Troquel',
    Colaminado: 'Colaminadora',
    Pegadora: 'Pegadora',
};

function emptyProcessRow(code, label, sortOrder) {
    return {
        processCode: code,
        label,
        sortOrder,
        machineId: '',
        plannedStart: null,
        plannedEnd: null,
        estimatedHours: null,
        notes: '',
    };
}

function addDays(date, days) {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
}

export default function PlaneacionProgramWizard({ opened, onClose, processes, defaultYear, defaultMonth, onSaved }) {
    const [active, setActive] = useState(0);
    const [loading, setLoading] = useState(false);
    const [openOrders, setOpenOrders] = useState([]);
    const [machines, setMachines] = useState([]);
    const [cotizadorMachines, setCotizadorMachines] = useState([]);
    const [selectedOrderId, setSelectedOrderId] = useState('');
    const [prefill, setPrefill] = useState(null);
    const [isUrgency, setIsUrgency] = useState(false);
    const [processRows, setProcessRows] = useState([]);

    const orderOptions = useMemo(() => openOrders.map((row) => ({
        value: row.id,
        label: `${row.opNumber} | ${row.otNumber} | ${row.clientName}${row.hasSchedule ? ' (programada)' : ''}`,
    })), [openOrders]);

    const machineOptions = useMemo(() => machines.map((m) => ({
        value: String(m.id ?? m.Id),
        label: `${m.code ?? m.Code} - ${m.name ?? m.Name}`,
        processCode: m.processCode ?? m.ProcessCode ?? null,
    })), [machines]);

    const machinesForProcess = useCallback((processCode) => (
        machineOptions.filter((m) => m.processCode === processCode)
    ), [machineOptions]);

    const [rosterHints, setRosterHints] = useState({});

    const reset = useCallback(() => {
        setActive(0);
        setSelectedOrderId('');
        setPrefill(null);
        setIsUrgency(false);
        setProcessRows(processes.map((p) => emptyProcessRow(p.code, p.label, p.sortOrder)));
    }, [processes]);

    useEffect(() => {
        if (!opened) return;
        reset();
        (async () => {
            try {
                const [orders, machineRows, cotRows] = await Promise.all([
                    schedulingApi.listOpenOrders(),
                    dailyProductionApi.listMachines(),
                    api.get('/production/cotizador/machines').catch(() => []),
                ]);
                setOpenOrders(Array.isArray(orders) ? orders : []);
                setMachines(Array.isArray(machineRows) ? machineRows : []);
                setCotizadorMachines(Array.isArray(cotRows) ? cotRows : []);
            } catch {
                notifications.show({ title: 'Error', message: 'No se pudieron cargar catalogos.', color: 'red' });
            }
        })();
    }, [opened, reset]);

    useEffect(() => {
        if (!selectedOrderId) {
            setPrefill(null);
            return;
        }
        (async () => {
            setLoading(true);
            try {
                const data = await schedulingApi.getOrderPrefill(selectedOrderId);
                setPrefill(data);
                if (Array.isArray(data.existingProcesses) && data.existingProcesses.length > 0) {
                    setProcessRows(processes.map((p) => {
                        const existing = data.existingProcesses.find((x) => x.processCode === p.code);
                        if (!existing) return emptyProcessRow(p.code, p.label, p.sortOrder);
                        return {
                            processCode: p.code,
                            label: p.label,
                            sortOrder: existing.sortOrder ?? p.sortOrder,
                            machineId: existing.machineId || '',
                            plannedStart: new Date(existing.plannedStart),
                            plannedEnd: new Date(existing.plannedEnd),
                            estimatedHours: existing.estimatedHours ?? null,
                            notes: existing.notes || '',
                        };
                    }));
                    setIsUrgency(data.existingProcesses.some((x) => x.isUrgency));
                } else if (Array.isArray(data.suggestedProcesses) && data.suggestedProcesses.length > 0) {
                    const suggestedRows = data.suggestedProcesses.map((s, index) => {
                        const catalog = processes.find((p) => p.code === s.processCode);
                        const partLabel = s.partName ? `${s.partName} · ` : '';
                        return {
                            processCode: s.processCode,
                            label: `${partLabel}${catalog?.label || s.label || s.processCode}`,
                            sortOrder: catalog?.sortOrder ?? index + 1,
                            machineId: '',
                            plannedStart: null,
                            plannedEnd: null,
                            estimatedHours: null,
                            notes: [s.partName, s.machine, s.notes].filter(Boolean).join(' — '),
                            partName: s.partName || '',
                            rowKey: `${s.partName || 'p'}-${s.processCode}-${index}`,
                        };
                    });
                    setProcessRows(suggestedRows);
                } else {
                    setProcessRows(processes.map((p) => emptyProcessRow(p.code, p.label, p.sortOrder)));
                }
            } catch (error) {
                notifications.show({ title: 'Error', message: error?.message || 'No se pudo cargar la OP.', color: 'red' });
            } finally {
                setLoading(false);
            }
        })();
    }, [selectedOrderId, processes]);

    useEffect(() => {
        if (!opened || active !== 2) return;
        (async () => {
            const hints = {};
            await Promise.all(processRows.map(async (row) => {
                if (!row.plannedStart) return;
                try {
                    const data = await schedulingApi.getAvailableOperators({
                        weekStart: row.plannedStart,
                        processCode: row.processCode,
                        date: row.plannedStart,
                    });
                    const names = (data?.operators || [])
                        .map((o) => o.operatorName)
                        .filter(Boolean);
                    hints[row.processCode] = names.length
                        ? `En turno: ${names.join(', ')}`
                        : 'Sin operarios en turno para esta fecha';
                } catch {
                    hints[row.processCode] = '';
                }
            }));
            setRosterHints(hints);
        })();
    }, [opened, active, processRows]);

    const estimateHours = (processCode) => {
        const qty = Number(prefill?.quantityToProduce || 0);
        const role = PROCESS_ROLE_HINT[processCode];
        const cot = cotizadorMachines.find((m) => role && String(m.serviceRole).toLowerCase() === role.toLowerCase());
        if (!cot || qty <= 0) return 8;
        const shots = Number(cot.shotsPerHour || 0);
        const setup = Number(cot.setupTimeHours || 0);
        if (shots <= 0) return Math.max(setup, 4);
        return Math.round((qty / shots + setup) * 10) / 10;
    };

    const applyEstimatedHours = () => {
        setProcessRows((rows) => rows.map((row) => ({
            ...row,
            estimatedHours: estimateHours(row.processCode),
        })));
    };

    const applySequentialDates = () => {
        const base = new Date(Date.UTC(defaultYear, defaultMonth - 1, 1));
        let cursor = base;
        setProcessRows((rows) => rows.map((row) => {
            if (!row.estimatedHours || row.estimatedHours <= 0) return row;
            const days = Math.max(1, Math.ceil(row.estimatedHours / 8));
            const start = new Date(cursor);
            const end = addDays(start, days - 1);
            cursor = addDays(end, 1);
            return { ...row, plannedStart: start, plannedEnd: end };
        }));
    };

    const updateRow = (index, patch) => {
        setProcessRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    };

    const handleSave = async () => {
        if (!selectedOrderId) {
            notifications.show({ title: 'Datos incompletos', message: 'Seleccione una OP.', color: 'orange' });
            return;
        }
        const payloadProcesses = processRows
            .filter((row) => row.plannedStart && row.plannedEnd)
            .map((row, index) => ({
                processCode: row.processCode,
                machineId: row.machineId || null,
                plannedStart: row.plannedStart,
                plannedEnd: row.plannedEnd,
                sortOrder: row.sortOrder || index + 1,
                estimatedHours: row.estimatedHours,
                notes: row.notes || null,
            }));

        if (payloadProcesses.length === 0) {
            notifications.show({ title: 'Datos incompletos', message: 'Asigne fechas al menos a un proceso.', color: 'orange' });
            return;
        }

        setLoading(true);
        try {
            await schedulingApi.programOrder({
                manufacturingOrderId: selectedOrderId,
                isUrgency,
                processes: payloadProcesses,
            });
            notifications.show({ title: 'Programado', message: 'La OP quedo programada en el Gantt.', color: 'green' });
            onSaved?.();
            onClose();
        } catch (error) {
            notifications.show({ title: 'Error al programar', message: error?.message || 'No se pudo guardar.', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal opened={opened} onClose={onClose} title="Programar OP" size="xl" centered>
            <Stepper active={active} onStepClick={setActive} allowNextStepsSelect={false}>
                <Stepper.Step label="Datos OP" description="Seleccion y referencia">
                    <Stack gap="sm" mt="md">
                        <Select
                            label="Orden de produccion abierta"
                            placeholder="Buscar OP"
                            searchable
                            data={orderOptions}
                            value={selectedOrderId}
                            onChange={(value) => setSelectedOrderId(value || '')}
                        />
                        <Checkbox
                            label="Marcar como urgencia (permite reprogramar OP existente)"
                            checked={isUrgency}
                            onChange={(e) => setIsUrgency(e.currentTarget.checked)}
                        />
                        {prefill && (
                            <Stack gap={4}>
                                <Text size="sm"><strong>OP:</strong> {prefill.opNumber} | <strong>OT:</strong> {prefill.otNumber}</Text>
                                <Text size="sm"><strong>Cliente:</strong> {prefill.clientName}</Text>
                                <Text size="sm"><strong>Referencia:</strong> {prefill.referenceName || prefill.productName}</Text>
                                <Text size="sm"><strong>Cantidad a producir:</strong> {Number(prefill.quantityToProduce || 0).toLocaleString('es-CO')}</Text>
                                <Text size="sm"><strong>OC:</strong> {prefill.purchaseOrderNumber || '—'}</Text>
                                {Array.isArray(prefill.suggestedProcesses) && prefill.suggestedProcesses.length > 0 && (
                                    <Alert color="indigo" variant="light" title="Procesos sugeridos de la OP" mt="sm">
                                        <Text size="xs" mb="xs">
                                            Se cargaron los procesos de la ficha/OP. Puede ajustar máquinas y fechas en los siguientes pasos.
                                        </Text>
                                        <Table striped withTableBorder verticalSpacing={4}>
                                            <Table.Thead>
                                                <Table.Tr>
                                                    <Table.Th>Pieza</Table.Th>
                                                    <Table.Th>Proceso</Table.Th>
                                                    <Table.Th>Máquina (PDF)</Table.Th>
                                                    <Table.Th>Notas</Table.Th>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {prefill.suggestedProcesses.map((s, i) => (
                                                    <Table.Tr key={`${s.partName || 'p'}-${s.processCode}-${i}`}>
                                                        <Table.Td><Text size="sm">{s.partName || '—'}</Text></Table.Td>
                                                        <Table.Td><Badge variant="light">{s.label || s.processCode}</Badge></Table.Td>
                                                        <Table.Td><Text size="sm">{s.machine || '—'}</Text></Table.Td>
                                                        <Table.Td><Text size="xs">{s.notes || '—'}</Text></Table.Td>
                                                    </Table.Tr>
                                                ))}
                                            </Table.Tbody>
                                        </Table>
                                    </Alert>
                                )}
                            </Stack>
                        )}
                    </Stack>
                </Stepper.Step>

                <Stepper.Step label="Calculo" description="Horas estimadas">
                    <Stack gap="sm" mt="md">
                        <Group>
                            <Button variant="light" onClick={applyEstimatedHours} disabled={!prefill}>Calcular horas sugeridas</Button>
                            <Button variant="light" onClick={applySequentialDates} disabled={!processRows.some((r) => r.estimatedHours)}>Distribuir fechas secuenciales</Button>
                        </Group>
                        <Table striped highlightOnHover withTableBorder>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Proceso</Table.Th>
                                    <Table.Th>Maquina</Table.Th>
                                    <Table.Th>Horas est.</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {processRows.map((row, index) => (
                                    <Table.Tr key={row.rowKey || `${row.processCode}-${index}`}>
                                        <Table.Td>{row.label}</Table.Td>
                                        <Table.Td>
                                            <Select
                                                placeholder="Maquina del proceso"
                                                data={machinesForProcess(row.processCode)}
                                                value={row.machineId}
                                                onChange={(value) => updateRow(index, { machineId: value || '' })}
                                                searchable
                                                clearable
                                            />
                                        </Table.Td>
                                        <Table.Td>
                                            <NumberInput
                                                min={0}
                                                decimalScale={1}
                                                value={row.estimatedHours ?? ''}
                                                onChange={(value) => updateRow(index, { estimatedHours: value })}
                                            />
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Stack>
                </Stepper.Step>

                <Stepper.Step label="Procesos" description="Fechas por proceso">
                    <Stack gap="sm" mt="md">
                        <Table striped highlightOnHover withTableBorder>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Proceso</Table.Th>
                                    <Table.Th>Inicio</Table.Th>
                                    <Table.Th>Fin</Table.Th>
                                    <Table.Th>Notas</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {processRows.map((row, index) => (
                                    <Table.Tr key={row.rowKey || `${row.processCode}-${index}`}>
                                        <Table.Td>
                                            <Stack gap={2}>
                                                <Group gap={6}>
                                                    <Text size="sm">{row.label}</Text>
                                                    {row.estimatedHours ? <Badge size="xs" variant="light">{row.estimatedHours}h</Badge> : null}
                                                </Group>
                                                {rosterHints[row.processCode] && (
                                                    <Text size="xs" c="dimmed">{rosterHints[row.processCode]}</Text>
                                                )}
                                            </Stack>
                                        </Table.Td>
                                        <Table.Td>
                                            <DateInput
                                                value={row.plannedStart}
                                                onChange={(value) => updateRow(index, { plannedStart: value })}
                                            />
                                        </Table.Td>
                                        <Table.Td>
                                            <DateInput
                                                value={row.plannedEnd}
                                                minDate={row.plannedStart || undefined}
                                                onChange={(value) => updateRow(index, { plannedEnd: value })}
                                            />
                                        </Table.Td>
                                        <Table.Td>
                                            <TextInput
                                                value={row.notes}
                                                onChange={(e) => updateRow(index, { notes: e.currentTarget.value })}
                                            />
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Stack>
                </Stepper.Step>
            </Stepper>

            <Group justify="space-between" mt="lg">
                <Button variant="default" onClick={onClose}>Cancelar</Button>
                <Group>
                    {active > 0 && <Button variant="light" onClick={() => setActive((v) => v - 1)}>Anterior</Button>}
                    {active < 2 ? (
                        <Button onClick={() => setActive((v) => v + 1)} disabled={active === 0 && !selectedOrderId}>Siguiente</Button>
                    ) : (
                        <Button onClick={handleSave} loading={loading}>Programar</Button>
                    )}
                </Group>
            </Group>
        </Modal>
    );
}