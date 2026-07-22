import { useEffect, useMemo, useState } from 'react';
import {
    ActionIcon,
    Autocomplete,
    Badge,
    Button,
    Card,
    Checkbox,
    Divider,
    Group,
    Modal,
    NumberInput,
    ScrollArea,
    SegmentedControl,
    Select,
    SimpleGrid,
    Stack,
    Table,
    Text,
    TextInput,
    ThemeIcon,
    Title
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
    IconArrowLeft,
    IconArrowRight,
    IconChevronsLeft,
    IconChevronsRight,
    IconDeviceFloppy,
    IconEdit,
    IconHammer,
    IconPlayerTrackNext,
    IconPlus,
    IconRefresh,
    IconSettings,
    IconTrash
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../utils/api';
import {
    FLOOR_MACHINES,
    FLOOR_OPERATORS,
    SHIFTS,
    formatDuration,
    getActivitiesForDate,
    getSessionsForDate,
    isProductionCode,
    todayKey,
} from './productionExplorerStorage';
import {
    toParentActivityLabel,
} from './reporteDiarioExcelExport';
import {
    buildLocalImportPayloadFromStorage,
    dailyProductionApi,
    mapCatalogMachines,
    mapCatalogOperators,
    mapCatalogProcessCodes,
    normalizeActivity,
} from './dailyProductionApi';
import ReporteDiarioExplorer from './ReporteDiarioExplorer';
import './ReporteDiario.css';

const PROCESS_CODES_STORAGE_KEY = 'perlax_reporte_diario_process_codes_v6';

const DEFAULT_PROCESS_CODES = [
    { code: '01', name: 'Puesta a Punto', subcodes: [] },
    { code: '02', name: 'Produccion', subcodes: [] },
    {
        code: '03',
        name: 'Reparacion',
        subcodes: [
            { code: '301', name: 'Daño electrico' },
            { code: '302', name: 'Daño mecanico' },
            { code: '303', name: 'Daño electroMecanico' },
            { code: '399', name: 'Otro (especificar en observaciones)' },
        ],
    },
    { code: '04', name: 'Descanso', subcodes: [] },
    { code: '10', name: 'Mantenimiento y Aseo', subcodes: [] },
    {
        code: '13',
        name: 'Falta de Trabajo',
        subcodes: [
            { code: '1301', name: 'Esperando material' },
            { code: '1302', name: 'Esperando OP' },
            { code: '1303', name: 'Sin programacion' },
            { code: '1399', name: 'Otro (especificar en observaciones)' },
        ],
    },
    {
        code: '14',
        name: 'Otros Tiempos',
        subcodes: [
            { code: '1401', name: 'Cambio de bateria' },
            { code: '1402', name: 'Calibracion de franjas' },
            { code: '1403', name: 'Reunion programada' },
            { code: '1404', name: 'Lavada de baterias' },
            { code: '1499', name: 'Otro (especificar en observaciones)' },
        ],
    },
    {
        code: '08',
        name: 'Otro Tiempo Muerto',
        subcodes: [
            { code: '801', name: 'Cambio de mantilla' },
            { code: '802', name: 'Esperando repuesto/Mecanico/Tecnico' },
            { code: '803', name: 'Material Defectuoso' },
            { code: '804', name: 'Problemas de humedad' },
            { code: '805', name: 'Problemas de Registro' },
            { code: '806', name: 'Sin fluido electrico' },
            { code: '807', name: 'Tinta no conforme' },
            { code: '808', name: 'Cambio de cuchilla' },
            { code: '809', name: 'Limpieza de cilindros' },
            { code: '810', name: 'Hoja en bateria' },
            { code: '899', name: 'Otro (especificar en observaciones)' },
        ],
    },
];

const cloneDefaultProcessCodes = () =>
    DEFAULT_PROCESS_CODES.map((item) => ({
        ...item,
        subcodes: (item.subcodes || []).map((sub) => ({ ...sub })),
    }));

const formatProcessCodeLabel = (item) => `${item.code} ${item.name}`.trim();

const formatSubcodeLabel = (parent, sub) => `${sub.code} ${sub.name}`.trim();

const normalizeSubcodes = (raw) => {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((sub) => ({
            code: String(sub.code || '').trim(),
            name: String(sub.name || '').trim(),
        }))
        .filter((sub) => sub.code && sub.name);
};

const normalizeProcessCodeItem = (item) => ({
    code: String(item?.code || '').trim(),
    name: String(item?.name || '').trim(),
    subcodes: normalizeSubcodes(item?.subcodes),
});

/** Completa códigos padre faltantes y subcódigos por código (sin borrar los que ya existan). */
const mergeDefaultProcessCodes = (items) => {
    const byCode = new Map(items.map((item) => [item.code, item]));
    DEFAULT_PROCESS_CODES.forEach((def) => {
        const existing = byCode.get(def.code);
        const defaults = normalizeSubcodes(def.subcodes);
        if (!existing) {
            byCode.set(def.code, {
                code: def.code,
                name: def.name,
                subcodes: defaults.map((sub) => ({ ...sub })),
            });
            return;
        }
        const subByCode = new Map((existing.subcodes || []).map((sub) => [sub.code, sub]));
        defaults.forEach((sub) => {
            if (!subByCode.has(sub.code)) subByCode.set(sub.code, { ...sub });
        });
        byCode.set(def.code, {
            ...existing,
            name: existing.name || def.name,
            subcodes: [...subByCode.values()].sort((a, b) =>
                String(a.code).localeCompare(String(b.code), undefined, { numeric: true })
            ),
        });
    });
    return [...byCode.values()].sort((a, b) =>
        String(a.code).localeCompare(String(b.code), undefined, { numeric: true })
    );
};

const loadStoredProcessCodes = () => {
    try {
        const raw =
            localStorage.getItem(PROCESS_CODES_STORAGE_KEY)
            || localStorage.getItem('perlax_reporte_diario_process_codes_v5')
            || localStorage.getItem('perlax_reporte_diario_process_codes_v4')
            || localStorage.getItem('perlax_reporte_diario_process_codes_v3')
            || localStorage.getItem('perlax_reporte_diario_process_codes_v2')
            || localStorage.getItem('perlax_reporte_diario_process_codes');
        if (!raw) return cloneDefaultProcessCodes();
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) {
            return cloneDefaultProcessCodes();
        }
        const normalized = mergeDefaultProcessCodes(
            parsed.map(normalizeProcessCodeItem).filter((item) => item.code && item.name)
        );
        localStorage.setItem(PROCESS_CODES_STORAGE_KEY, JSON.stringify(normalized));
        return normalized;
    } catch {
        return cloneDefaultProcessCodes();
    }
};

const saveStoredProcessCodes = (items) => {
    localStorage.setItem(PROCESS_CODES_STORAGE_KEY, JSON.stringify(items));
};

const toDateOnlyString = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
};

const toTimeString = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

/** Combina fecha + horas de la fila. Si FIN es menor que INICIO se asume que cruza medianoche (turno nocturno). */
const rowInterval = (row) => {
    if (!row.rowDate || !row.startTime || !row.endTime) return null;
    const start = new Date(`${row.rowDate}T${row.startTime}`);
    let end = new Date(`${row.rowDate}T${row.endTime}`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    if (end < start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
};

const rowHours = (row) => {
    const interval = rowInterval(row);
    if (!interval) return 0;
    const diffMs = interval.end.getTime() - interval.start.getTime();
    if (diffMs <= 0) return 0;
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
};

const createEmptyProcess = (rowDate = '') => ({
    operatorName: '',
    machineName: '',
    productionOrderNumber: '',
    processCode: '',
    rowDate,
    startTime: '',
    endTime: '',
    quantityProcessed: 0,
    desperdicio: 0,
    observations: ''
});

// La fecha no cuenta para "vacía": las filas nuevas ya traen la fecha del formulario.
const isProcessRowEmpty = (row) =>
    !row.operatorName &&
    !row.machineName &&
    !row.productionOrderNumber &&
    !row.processCode &&
    !row.startTime &&
    !row.endTime &&
    !Number(row.quantityProcessed || 0) &&
    !Number(row.desperdicio || 0) &&
    !row.observations;

const isProcessRowComplete = (row, mode = 'hours') => {
    const hasIdentity = mode === 'machine'
        ? Boolean(row.operatorName)
        : Boolean(row.machineName);
    return Boolean(
        hasIdentity &&
        row.productionOrderNumber &&
        row.processCode &&
        row.rowDate &&
        row.startTime &&
        row.endTime
    );
};

const LOCAL_MACHINE_NAMES = FLOOR_MACHINES.map((m) => m.name);
const LOCAL_OPERATOR_NAMES = FLOOR_OPERATORS.map((o) => o.name);

const MACHINES_STORAGE_KEY = 'perlax_reporte_diario_machines_v1';

const loadStoredMachines = () => {
    try {
        const raw = localStorage.getItem(MACHINES_STORAGE_KEY);
        if (!raw) return [...LOCAL_MACHINE_NAMES];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) return [...LOCAL_MACHINE_NAMES];
        return parsed.map((m) => String(m || '').trim()).filter(Boolean);
    } catch {
        return [...LOCAL_MACHINE_NAMES];
    }
};

const saveStoredMachines = (items) => {
    localStorage.setItem(MACHINES_STORAGE_KEY, JSON.stringify(items));
};

const mergeUniqueStrings = (...lists) => {
    const seen = new Set();
    const result = [];
    lists.flat().forEach((item) => {
        const value = String(item || '').trim();
        if (!value || seen.has(value)) return;
        seen.add(value);
        result.push(value);
    });
    return result;
};

export default function ReporteDiario() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [catalogs, setCatalogs] = useState({ machines: [], processCodes: [], orderNumbers: [], operators: [] });
    const [records, setRecords] = useState([]);
    const [recordIndex, setRecordIndex] = useState(-1);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [activityMode, setActivityMode] = useState('hours');
    const [rowsToAdd, setRowsToAdd] = useState(3);
    const [selectedRows, setSelectedRows] = useState(() => new Set());
    const [bulkDraft, setBulkDraft] = useState({
        identity: '',
        productionOrderNumber: '',
        processCode: '',
        rowDate: '',
        startTime: '',
        endTime: '',
    });
    const [captureOpen, setCaptureOpen] = useState(false);
    const [mainView, setMainView] = useState('historial');
    const [manualDate, setManualDate] = useState(() => new Date());
    const [explorerRefresh, setExplorerRefresh] = useState(0);
    const [catalogMachines, setCatalogMachines] = useState([]);
    const [catalogOperators, setCatalogOperators] = useState([]);
    const [processCodeItems, setProcessCodeItems] = useState(() => loadStoredProcessCodes());
    const [machineItems, setMachineItems] = useState(() => loadStoredMachines());
    const [machinesModalOpen, setMachinesModalOpen] = useState(false);
    const [machineDraft, setMachineDraft] = useState('');
    const [editingMachineIndex, setEditingMachineIndex] = useState(-1);
    const [codesModalOpen, setCodesModalOpen] = useState(false);
    const [editingCodeIndex, setEditingCodeIndex] = useState(-1);
    const [codeDraft, setCodeDraft] = useState({ code: '', name: '' });
    const [subcodeDraft, setSubcodeDraft] = useState({ code: '', name: '' });
    const [editingSubcodeIndex, setEditingSubcodeIndex] = useState(-1);

    const [form, setForm] = useState({
        processDate: new Date(),
        operatorName: '',
        machineName: '',
        shiftCode: 'T1',
    });

    const [processes, setProcesses] = useState([createEmptyProcess()]);

    const machineOptions = useMemo(
        () => mergeUniqueStrings(catalogs.machines, machineItems, form.machineName),
        [catalogs.machines, machineItems, form.machineName]
    );
    const codeOptions = useMemo(() => {
        const options = [];
        processCodeItems.forEach((item) => {
            const parentLabel = formatProcessCodeLabel(item);
            options.push({ value: parentLabel, label: parentLabel });
            (item.subcodes || []).forEach((sub) => {
                const subLabel = formatSubcodeLabel(item, sub);
                options.push({
                    value: `${parentLabel} · ${subLabel}`,
                    label: `↳ ${parentLabel} · ${subLabel}`,
                });
            });
        });
        return options;
    }, [processCodeItems]);
    const orderOptions = useMemo(() => (catalogs.orderNumbers || []).map(String), [catalogs.orderNumbers]);
    const operatorOptions = useMemo(
        () => mergeUniqueStrings(
            catalogs.operators,
            LOCAL_OPERATOR_NAMES,
            form.operatorName,
            ...processes.map((row) => row.operatorName)
        ),
        [catalogs.operators, form.operatorName, processes]
    );
    const editingCodeItem = editingCodeIndex >= 0 ? processCodeItems[editingCodeIndex] : null;

    const completedProcesses = useMemo(
        () => processes.filter(row => isProcessRowComplete(row, activityMode)),
        [processes, activityMode]
    );

    const totals = useMemo(() => ({
        processes: completedProcesses.length,
        hours: completedProcesses.reduce((acc, cur) => acc + rowHours(cur), 0),
        quantity: completedProcesses.reduce(
            (acc, cur) => acc + (isProductionCode(cur.processCode) ? Number(cur.quantityProcessed || 0) : 0),
            0
        )
    }), [completedProcesses]);

    const inputStyles = {
        label: { color: '#e2e8f0', fontWeight: 700 },
        input: {
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(99, 102, 241, 0.28)',
            borderRadius: '10px',
            color: '#fff',
            colorScheme: 'dark',
            '&:focus': { borderColor: '#6366f1', background: 'rgba(255, 255, 255, 0.07)' }
        }
    };

    const selectStyles = {
        label: { color: '#e2e8f0', fontWeight: 700 },
        input: {
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(99, 102, 241, 0.28)',
            borderRadius: '10px',
            color: '#fff',
            '&:focus': { borderColor: '#6366f1', background: 'rgba(255, 255, 255, 0.07)' }
        },
        dropdown: {
            background: 'rgba(15, 23, 42, 0.98)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            borderRadius: '12px'
        }
    };

    const loadCatalogsAndRecords = async ({ silent = false } = {}) => {
        setRefreshing(true);
        let catalogData = null;
        let reportData = null;
        let catalogError = null;
        let reportError = null;

        try {
            catalogData = await dailyProductionApi.getCatalogs();
        } catch (error) {
            catalogError = error;
        }

        try {
            reportData = await dailyProductionApi.listDailyReports({});
        } catch (error) {
            reportError = error;
        }

        const machines = mapCatalogMachines(catalogData);
        const operators = mapCatalogOperators(catalogData);
        const processCodes = mapCatalogProcessCodes(catalogData);

        setCatalogMachines(machines);
        setCatalogOperators(operators);
        setMachineItems(machines.map((m) => m.name));
        if (processCodes.length > 0) {
            setProcessCodeItems(processCodes);
        } else {
            setProcessCodeItems(loadStoredProcessCodes());
        }

        const nextCatalogs = {
            machines: machines.map((m) => m.name),
            processCodes,
            orderNumbers: Array.isArray(catalogData?.orderNumbers) ? catalogData.orderNumbers : [],
            operators: mergeUniqueStrings(operators.map((o) => o.displayName), LOCAL_OPERATOR_NAMES),
        };
        setCatalogs(nextCatalogs);
        setRecords(Array.isArray(reportData) ? reportData : []);
        setExplorerRefresh((n) => n + 1);

        if (!silent) {
            if (catalogError && reportError) {
                notifications.show({
                    title: 'Sin conexión al servidor',
                    message: 'No se pudieron cargar catálogos ni reportes. Verifique el backend.',
                    color: 'red',
                });
            } else if (catalogError || reportError) {
                notifications.show({
                    title: 'Actualizado parcial',
                    message: (catalogError || reportError)?.message || 'Parte de la información no vino del servidor.',
                    color: 'yellow',
                });
            } else {
                notifications.show({
                    title: 'Actualizado',
                    message: `Catálogos y ${Array.isArray(reportData) ? reportData.length : 0} reporte(s) del servidor.`,
                    color: 'teal',
                });
            }
        }

        setRefreshing(false);
    };

    const changeActivityMode = (mode) => {
        const next = mode === 'machine' ? 'machine' : 'hours';
        setActivityMode(next);
        setProcesses((prev) => {
            if (next === 'machine') {
                return prev.map((row) => ({
                    ...row,
                    machineName: form.machineName || row.machineName,
                    operatorName: row.operatorName || form.operatorName || '',
                }));
            }
            return prev.map((row) => ({
                ...row,
                operatorName: '',
                machineName: row.machineName || form.machineName || '',
            }));
        });
    };

    const openMachinesModal = async () => {
        try {
            const list = await dailyProductionApi.listMachines(true);
            setCatalogMachines(list.map((m) => ({ id: m.id, code: m.code, name: m.name, isActive: m.isActive !== false })));
            setMachineItems(list.map((m) => m.name));
        } catch {
            setMachineItems(loadStoredMachines());
        }
        setMachineDraft('');
        setEditingMachineIndex(-1);
        setMachinesModalOpen(true);
    };

    const persistMachines = (next) => {
        const sorted = [...next].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        setMachineItems(sorted);
        return sorted;
    };

    const saveMachineDraft = async () => {
        const name = machineDraft.trim();
        if (!name) {
            notifications.show({ title: 'Validación', message: 'El nombre de la máquina es obligatorio.', color: 'yellow' });
            return;
        }
        try {
            if (editingMachineIndex >= 0) {
                const current = catalogMachines[editingMachineIndex];
                if (current?.id) {
                    await dailyProductionApi.updateMachine(current.id, { code: current.code || name, name, isActive: true });
                } else {
                    await dailyProductionApi.createMachine({ code: name, name, isActive: true });
                }
                notifications.show({ title: 'Máquina actualizada', message: name, color: 'teal' });
            } else {
                await dailyProductionApi.createMachine({ code: name, name, isActive: true });
                notifications.show({ title: 'Máquina agregada', message: name, color: 'teal' });
            }
            await openMachinesModal();
            await loadCatalogsAndRecords({ silent: true });
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo guardar la máquina', color: 'red' });
        }
    };

    const startEditMachine = (index) => {
        setEditingMachineIndex(index);
        setMachineDraft(machineItems[index] || '');
    };

    const cancelEditMachine = () => {
        setEditingMachineIndex(-1);
        setMachineDraft('');
    };

    const deleteMachine = async (index) => {
        const current = catalogMachines[index];
        const name = current?.name || machineItems[index];
        if (!name) return;
        if (!window.confirm(`¿Eliminar la máquina "${name}"?`)) return;
        try {
            if (current?.id) await dailyProductionApi.deleteMachine(current.id);
            notifications.show({ title: 'Máquina eliminada', message: name, color: 'red' });
            await openMachinesModal();
            await loadCatalogsAndRecords({ silent: true });
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo eliminar', color: 'red' });
        }
    };

    const openCodesModal = async () => {
        try {
            const list = await dailyProductionApi.listActivityCodes(true);
            setProcessCodeItems(mapCatalogProcessCodes({ processCodes: list }));
        } catch {
            setProcessCodeItems(loadStoredProcessCodes());
        }
        setEditingCodeIndex(-1);
        setEditingSubcodeIndex(-1);
        setCodeDraft({ code: '', name: '' });
        setSubcodeDraft({ code: '', name: '' });
        setCodesModalOpen(true);
    };

    const startEditCode = (index) => {
        const item = processCodeItems[index];
        if (!item) return;
        setEditingCodeIndex(index);
        setEditingSubcodeIndex(-1);
        setCodeDraft({ code: item.code, name: item.name });
        setSubcodeDraft({ code: '', name: '' });
    };

    const cancelEditCode = () => {
        setEditingCodeIndex(-1);
        setEditingSubcodeIndex(-1);
        setCodeDraft({ code: '', name: '' });
        setSubcodeDraft({ code: '', name: '' });
    };

    const persistProcessCodes = (next) => {
        const sorted = [...next]
            .map(normalizeProcessCodeItem)
            .sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true }));
        setProcessCodeItems(sorted);
        return sorted;
    };

    const saveCodeDraft = async () => {
        const code = String(codeDraft.code || '').trim();
        const name = String(codeDraft.name || '').trim();
        if (!code || !name) {
            notifications.show({ title: 'Validación', message: 'Código y nombre son obligatorios.', color: 'yellow' });
            return;
        }

        const duplicate = processCodeItems.some(
            (item, idx) => item.code === code && idx !== editingCodeIndex
        );
        if (duplicate) {
            notifications.show({ title: 'Validación', message: `Ya existe el código ${code}.`, color: 'yellow' });
            return;
        }

        try {
            const current = editingCodeIndex >= 0 ? processCodeItems[editingCodeIndex] : null;
            const body = {
                code,
                name,
                requiresOrder: !!current?.requiresOrder,
                allowsProductionQty: code === '02' || !!current?.allowsProductionQty,
                isActive: true,
                subcodes: (current?.subcodes || []).map((s) => ({
                    code: s.code,
                    name: s.name,
                    requiresObservation: !!s.requiresObservation,
                    isActive: true,
                })),
            };
            if (current?.id) {
                await dailyProductionApi.updateActivityCode(current.id, body);
                notifications.show({ title: 'Código actualizado', message: formatProcessCodeLabel({ code, name }), color: 'teal' });
            } else {
                await dailyProductionApi.createActivityCode(body);
                notifications.show({ title: 'Código agregado', message: formatProcessCodeLabel({ code, name }), color: 'teal' });
            }
            await openCodesModal();
            await loadCatalogsAndRecords({ silent: true });
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo guardar el código', color: 'red' });
        }
    };

    const deleteCode = async (index) => {
        const item = processCodeItems[index];
        if (!item) return;
        if (!window.confirm(`¿Eliminar el código ${formatProcessCodeLabel(item)} y sus subcódigos?`)) return;
        try {
            if (item.id) await dailyProductionApi.deleteActivityCode(item.id);
            notifications.show({ title: 'Código eliminado', message: formatProcessCodeLabel(item), color: 'red' });
            await openCodesModal();
            await loadCatalogsAndRecords({ silent: true });
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo eliminar', color: 'red' });
        }
    };

    const startEditSubcode = (subIndex) => {
        const sub = editingCodeItem?.subcodes?.[subIndex];
        if (!sub) return;
        setEditingSubcodeIndex(subIndex);
        setSubcodeDraft({ code: sub.code, name: sub.name });
    };

    const cancelEditSubcode = () => {
        setEditingSubcodeIndex(-1);
        setSubcodeDraft({ code: '', name: '' });
    };

    const saveSubcodeDraft = async () => {
        if (editingCodeIndex < 0 || !editingCodeItem) {
            notifications.show({
                title: 'Selecciona un código',
                message: 'Primero edita un código padre para asignarle subcódigos.',
                color: 'yellow',
            });
            return;
        }

        const code = String(subcodeDraft.code || '').trim();
        const name = String(subcodeDraft.name || '').trim();
        if (!code || !name) {
            notifications.show({ title: 'Validación', message: 'Subcódigo y nombre son obligatorios.', color: 'yellow' });
            return;
        }

        const currentSubs = normalizeSubcodes(editingCodeItem.subcodes);
        const duplicate = currentSubs.some((sub, idx) => sub.code === code && idx !== editingSubcodeIndex);
        if (duplicate) {
            notifications.show({ title: 'Validación', message: `Ya existe el subcódigo ${code} en este código.`, color: 'yellow' });
            return;
        }

        const wasEdit = editingSubcodeIndex >= 0;
        const nextSubs = wasEdit
            ? currentSubs.map((sub, idx) => (idx === editingSubcodeIndex ? { code, name } : sub))
            : [...currentSubs, { code, name }];

        try {
            if (!editingCodeItem.id) throw new Error('Guarde primero el código padre en el servidor.');
            await dailyProductionApi.updateActivityCode(editingCodeItem.id, {
                code: editingCodeItem.code,
                name: editingCodeItem.name,
                requiresOrder: !!editingCodeItem.requiresOrder,
                allowsProductionQty: !!editingCodeItem.allowsProductionQty || editingCodeItem.code === '02',
                isActive: true,
                subcodes: nextSubs.map((s) => ({
                    code: s.code,
                    name: s.name,
                    requiresObservation: /otro/i.test(s.name),
                    isActive: true,
                })),
            });
            cancelEditSubcode();
            notifications.show({
                title: wasEdit ? 'Subcódigo actualizado' : 'Subcódigo agregado',
                message: formatSubcodeLabel({ code: editingCodeItem.code }, { code, name }),
                color: 'teal',
            });
            await openCodesModal();
            await loadCatalogsAndRecords({ silent: true });
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo guardar el subcódigo', color: 'red' });
        }
    };

    const deleteSubcode = async (subIndex) => {
        if (editingCodeIndex < 0 || !editingCodeItem) return;
        const sub = editingCodeItem.subcodes?.[subIndex];
        if (!sub) return;
        if (!window.confirm(`¿Eliminar el subcódigo ${formatSubcodeLabel(editingCodeItem, sub)}?`)) return;

        const nextSubs = normalizeSubcodes(editingCodeItem.subcodes).filter((_, idx) => idx !== subIndex);
        try {
            if (!editingCodeItem.id) throw new Error('Código sin ID de servidor.');
            await dailyProductionApi.updateActivityCode(editingCodeItem.id, {
                code: editingCodeItem.code,
                name: editingCodeItem.name,
                requiresOrder: !!editingCodeItem.requiresOrder,
                allowsProductionQty: !!editingCodeItem.allowsProductionQty || editingCodeItem.code === '02',
                isActive: true,
                subcodes: nextSubs.map((s) => ({
                    code: s.code,
                    name: s.name,
                    requiresObservation: /otro/i.test(s.name),
                    isActive: true,
                })),
            });
            if (editingSubcodeIndex === subIndex) cancelEditSubcode();
            notifications.show({ title: 'Subcódigo eliminado', message: formatSubcodeLabel(editingCodeItem, sub), color: 'red' });
            await openCodesModal();
            await loadCatalogsAndRecords({ silent: true });
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo eliminar', color: 'red' });
        }
    };

    useEffect(() => {
        loadCatalogsAndRecords({ silent: true });
    }, []);

    const newRecord = (preferredMode) => {
        const mode = preferredMode === 'machine' || preferredMode === 'hours'
            ? preferredMode
            : activityMode === 'machine' ? 'machine' : 'hours';
        setEditingId(null);
        setRecordIndex(-1);
        setActivityMode(mode);
        setForm({
            processDate: new Date(),
            operatorName: '',
            machineName: '',
            shiftCode: 'T1',
        });
        setProcesses([createEmptyProcess(toDateOnlyString(new Date()))]);
        setSelectedRows(new Set());
        setBulkDraft({
            identity: '',
            productionOrderNumber: '',
            processCode: '',
            rowDate: '',
            startTime: '',
            endTime: '',
        });
        setCaptureOpen(true);
    };

    const loadRecordById = async (id, index = -1) => {
        try {
            const data = await api.get(`/production/daily-reports/${id}`);
            setEditingId(data.id);
            setRecordIndex(index);
            setCaptureOpen(true);
            setActivityMode('hours');
            setForm({
                processDate: data.processDate ? new Date(data.processDate) : new Date(),
                operatorName: data.operatorName || '',
                machineName: '',
                shiftCode: data.shiftCode || 'T1',
            });

            const mappedProcesses = (data.processes || []).map(proc => ({
                operatorName: '',
                machineName: proc.machineName || '',
                productionOrderNumber: proc.productionOrderNumber || '',
                processCode: proc.processCode || '',
                rowDate: toDateOnlyString(proc.startAt),
                startTime: toTimeString(proc.startAt),
                endTime: toTimeString(proc.endAt),
                quantityProcessed: Number(proc.quantityProcessed || 0),
                desperdicio: Number(proc.desperdicio || proc.waste || 0),
                observations: proc.observations || ''
            }));
            setProcesses([...mappedProcesses, createEmptyProcess(toDateOnlyString(data.processDate))]);
            setSelectedRows(new Set());
        } catch (error) {
            notifications.show({
                title: 'No se pudo cargar registro',
                message: error?.message || 'Error consultando reporte.',
                color: 'red'
            });
        }
    };

    const addProcessRows = (count = 1) => {
        if (activityMode === 'machine') {
            if (!form.machineName.trim()) {
                notifications.show({ title: 'Validación', message: 'Debe asignar MÁQUINA antes de agregar procesos.', color: 'yellow' });
                return;
            }
        } else if (!form.operatorName.trim()) {
            notifications.show({ title: 'Validación', message: 'Debe asignar OPERARIO antes de agregar procesos.', color: 'yellow' });
            return;
        }

        const total = Math.max(1, Math.min(50, Number(count) || 1));
        const rowDate = toDateOnlyString(form.processDate);
        const newRows = Array.from({ length: total }, () => ({
            ...createEmptyProcess(rowDate),
            machineName: activityMode === 'machine' ? form.machineName : '',
        }));
        setProcesses((prev) => {
            // La nueva fila arranca donde terminó la última actividad.
            const lastEnd = prev.length > 0 ? prev[prev.length - 1].endTime : '';
            if (lastEnd && newRows.length > 0) {
                newRows[0] = { ...newRows[0], startTime: lastEnd };
            }
            return [...prev, ...newRows];
        });
    };

    const addProcess = () => addProcessRows(1);

    const updateProcessCell = (index, field, value) => {
        setProcesses((prev) => {
            const next = prev.map((row, idx) => {
                if (idx !== index) return row;
                const updated = { ...row, [field]: value };
                if (field === 'processCode' && !isProductionCode(value)) {
                    updated.quantityProcessed = 0;
                    updated.desperdicio = 0;
                }
                return updated;
            });
            // Encadena: la hora fin pasa a ser la hora inicio de la siguiente actividad.
            if (field === 'endTime' && value && index + 1 < next.length) {
                const following = next[index + 1];
                if (!following.startTime || following.startTime === prev[index].endTime) {
                    next[index + 1] = { ...following, startTime: value };
                }
            }
            return next;
        });
    };

    /** Reconstruye la etiqueta de código como la usan las opciones del Select. */
    const buildProcessCodeLabel = (activity) => {
        const parent = `${activity.activityCode || ''} ${activity.activityName || ''}`.trim();
        if (activity.subcode) {
            return `${parent} · ${activity.subcode} ${activity.subcodeDetail || ''}`.trim();
        }
        return parent;
    };

    /** Al elegir operario, precarga lo que ya se había capturado manualmente ese día. */
    const loadPreviousManualEntries = (operatorName) => {
        const operator = String(operatorName || '').trim();
        if (!operator || editingId) return;

        const hasUserData = processes.some((row) => !isProcessRowEmpty(row));
        if (hasUserData) return;

        const dateKey = todayKey(form.processDate);
        const daySessions = getSessionsForDate(dateKey);
        const sessionById = new Map(daySessions.map((s) => [s.id, s]));
        const previous = getActivitiesForDate(dateKey)
            .filter((a) => a.source === 'reporte-diario' && a.status === 'done' && a.operatorName === operator)
            .sort((a, b) => String(a.startAt || '').localeCompare(String(b.startAt || '')));
        if (previous.length === 0) return;

        const mapped = previous.map((a) => ({
            operatorName: '',
            machineName: sessionById.get(a.sessionId)?.machineName || '',
            productionOrderNumber: a.productionOrderNumber || '',
            processCode: buildProcessCodeLabel(a),
            rowDate: toDateOnlyString(a.startAt) || toDateOnlyString(form.processDate),
            startTime: toTimeString(a.startAt),
            endTime: toTimeString(a.endAt),
            quantityProcessed: Number(a.tiros || 0),
            desperdicio: Number(a.desperdicio || 0),
            observations: a.observations || '',
        }));
        setProcesses([...mapped, createEmptyProcess(toDateOnlyString(form.processDate))]);
        setSelectedRows(new Set());
        notifications.show({
            title: 'Registros previos cargados',
            message: `${mapped.length} proceso(s) que ${operator} ya tenía capturados hoy. Al guardar se actualizan.`,
            color: 'indigo',
        });
    };

    const toggleRowSelection = (index) => {
        setSelectedRows((current) => {
            const next = new Set(current);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const toggleAllRows = () => {
        setSelectedRows((current) => (
            current.size === processes.length
                ? new Set()
                : new Set(processes.map((_, index) => index))
        ));
    };

    const applyBulkValues = () => {
        if (selectedRows.size === 0) {
            notifications.show({
                title: 'Selección requerida',
                message: 'Selecciona al menos una fila.',
                color: 'yellow',
            });
            return;
        }

        const identityField = activityMode === 'machine' ? 'operatorName' : 'machineName';
        const changes = {
            ...(bulkDraft.identity ? { [identityField]: bulkDraft.identity } : {}),
            ...(bulkDraft.productionOrderNumber
                ? { productionOrderNumber: bulkDraft.productionOrderNumber }
                : {}),
            ...(bulkDraft.processCode ? { processCode: bulkDraft.processCode } : {}),
            ...(bulkDraft.rowDate ? { rowDate: bulkDraft.rowDate } : {}),
            ...(bulkDraft.startTime ? { startTime: bulkDraft.startTime } : {}),
            ...(bulkDraft.endTime ? { endTime: bulkDraft.endTime } : {}),
        };

        if (Object.keys(changes).length === 0) {
            notifications.show({
                title: 'Sin datos',
                message: 'Escribe al menos un valor para aplicar.',
                color: 'yellow',
            });
            return;
        }

        setProcesses((current) => current.map((row, index) => {
            if (!selectedRows.has(index)) return row;
            const next = { ...row, ...changes };
            if (changes.processCode && !isProductionCode(changes.processCode)) {
                next.quantityProcessed = 0;
                next.desperdicio = 0;
            }
            return next;
        }));
        notifications.show({
            title: 'Filas actualizadas',
            message: `Se aplicaron los datos a ${selectedRows.size} fila(s).`,
            color: 'teal',
        });
    };

    const removeProcess = (index) => {
        setProcesses(prev => {
            const next = prev.filter((_, idx) => idx !== index);
            return next.length === 0 ? [createEmptyProcess(toDateOnlyString(form.processDate))] : next;
        });
        setSelectedRows(new Set());
    };

    const saveReport = async () => {
        if (!form.processDate) {
            notifications.show({ title: 'Validación', message: 'La FECHA es obligatoria.', color: 'yellow' });
            return;
        }

        if (activityMode === 'machine') {
            if (!form.machineName.trim()) {
                notifications.show({ title: 'Validación', message: 'La MÁQUINA es obligatoria en este modo.', color: 'yellow' });
                return;
            }
        } else if (!form.operatorName.trim()) {
            notifications.show({ title: 'Validación', message: 'El OPERARIO es obligatorio.', color: 'yellow' });
            return;
        }

        if (completedProcesses.length === 0) {
            notifications.show({ title: 'Validación', message: 'Debe agregar por lo menos un proceso.', color: 'yellow' });
            return;
        }

        const hasPartialRows = processes.some(row => !isProcessRowEmpty(row) && !isProcessRowComplete(row, activityMode));
        if (hasPartialRows) {
            notifications.show({ title: 'Validación', message: 'Hay filas incompletas en la tabla. Complete o elimine esas filas.', color: 'yellow' });
            return;
        }

        const hasZeroDuration = completedProcesses.some(row => rowHours(row) <= 0);
        if (hasZeroDuration) {
            notifications.show({ title: 'Validación', message: 'En una o más filas, la hora FIN es igual a la hora INICIO.', color: 'yellow' });
            return;
        }

        const buildProcessPayload = (rows, machineName) => rows.map((proc) => {
            const interval = rowInterval(proc);
            return {
                machineName: machineName || proc.machineName,
                productionOrderNumber: proc.productionOrderNumber,
                processCode: proc.processCode,
                startAt: interval ? interval.start.toISOString() : null,
                endAt: interval ? interval.end.toISOString() : null,
                quantityProcessed: isProductionCode(proc.processCode) ? Number(proc.quantityProcessed || 0) : 0,
                desperdicio: isProductionCode(proc.processCode) ? Number(proc.desperdicio || 0) : 0,
                observations: proc.observations,
            };
        });

        // Agrupa por operario cuando se captura desde la máquina (varios trabajadores).
        const reportGroups = activityMode === 'machine'
            ? Object.entries(
                completedProcesses.reduce((acc, row) => {
                    const key = String(row.operatorName || '').trim();
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(row);
                    return acc;
                }, {})
            ).map(([operatorName, rows]) => ({
                operatorName,
                processes: buildProcessPayload(rows, form.machineName.trim()),
            }))
            : [{
                operatorName: form.operatorName.trim(),
                processes: buildProcessPayload(completedProcesses),
            }];

        if (editingId && reportGroups.length > 1) {
            notifications.show({
                title: 'Validación',
                message: 'Al editar un reporte, todas las filas deben ser del mismo operario.',
                color: 'yellow',
            });
            return;
        }

        // Snapshot para exportar a Excel (por operario / por máquina).
        const exportRows = completedProcesses
            .map((row) => {
                const interval = rowInterval(row);
                return {
                    operatorName: activityMode === 'machine'
                        ? String(row.operatorName || '').trim()
                        : form.operatorName.trim(),
                    operatorAux1: '',
                    operatorAux2: '',
                    operatorAux3: '',
                    machineName: activityMode === 'machine'
                        ? form.machineName.trim()
                        : String(row.machineName || '').trim(),
                    date: row.rowDate || toDateOnlyString(form.processDate),
                    order: row.productionOrderNumber || '',
                    startTime: interval ? interval.start : (row.startTime || ''),
                    endTime: interval ? interval.end : (row.endTime || ''),
                    hours: rowHours(row),
                    activity: toParentActivityLabel(row.processCode),
                    tiros: isProductionCode(row.processCode) ? Number(row.quantityProcessed || 0) : 0,
                    observations: row.observations || '*',
                };
            })
            .sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')));

        try {
            setSaving(true);
            const processDate = toDateOnlyString(form.processDate);
            const batch = {
                processDate,
                shiftCode: form.shiftCode || 'T1',
                idempotencyKey: `manual-${processDate}-${Date.now()}`,
                reports: reportGroups.map((group) => ({
                    processDate,
                    operatorName: group.operatorName,
                    shiftCode: form.shiftCode || 'T1',
                    processes: group.processes,
                })),
            };
            await dailyProductionApi.saveManualBatch(batch);

            notifications.show({
                title: 'Reporte guardado',
                message: reportGroups.length > 1
                    ? `Se guardaron ${reportGroups.length} reportes (uno por operario) en el servidor.`
                    : 'Guardado en el servidor.',
                color: 'teal'
            });

            await loadCatalogsAndRecords({ silent: true });
            setExplorerRefresh((n) => n + 1);
            setCaptureOpen(false);
            setMainView('manual');
            setManualDate(form.processDate instanceof Date ? form.processDate : new Date(form.processDate));
            setEditingId(null);
            setRecordIndex(-1);
            setForm({ processDate: new Date(), operatorName: '', machineName: '', shiftCode: 'T1' });
            setProcesses([createEmptyProcess(toDateOnlyString(new Date()))]);
        } catch (error) {
            notifications.show({
                title: 'No se pudo guardar',
                message: error?.message || 'Error del servidor. El reporte NO quedó persistido.',
                color: 'red'
            });
        } finally {
            setSaving(false);
        }
    };

    const goToFirst = () => {
        if (records.length === 0) return;
        loadRecordById(records[0].id, 0);
    };
    const goToLast = () => {
        if (records.length === 0) return;
        const index = records.length - 1;
        loadRecordById(records[index].id, index);
    };
    const goPrev = () => {
        if (recordIndex <= 0) return;
        const index = recordIndex - 1;
        loadRecordById(records[index].id, index);
    };
    const goNext = () => {
        if (recordIndex < 0 || recordIndex >= records.length - 1) return;
        const index = recordIndex + 1;
        loadRecordById(records[index].id, index);
    };

    const handleImportLocal = async () => {
        if (!window.confirm('¿Importar al servidor los datos locales de este navegador? Esta operación es para migración.')) return;
        try {
            const payload = buildLocalImportPayloadFromStorage();
            const result = await dailyProductionApi.importLocal(payload);
            notifications.show({
                title: 'Importación completada',
                message: `M:${result.machinesCreated} O:${result.operatorsCreated} S:${result.sessionsCreated} A:${result.activitiesCreated}`,
                color: 'teal',
            });
            await loadCatalogsAndRecords({ silent: true });
        } catch (error) {
            notifications.show({ title: 'Error de importación', message: error?.message || 'Falló la importación', color: 'red' });
        }
    };

    return (
        <Stack gap="lg" p="md" className="reporte-diario fade-in">
            <Card className="glass-card" p="lg">
                <Stack gap="md">
                    <Group justify="space-between">
                        <Group gap="md">
                            <ThemeIcon size={40} radius="md" variant="gradient" gradient={{ from: 'indigo', to: 'violet' }}>
                                <IconHammer size={20} />
                            </ThemeIcon>
                            <Title order={2} c="white">Reporte Diario de Operaciones</Title>
                        </Group>
                        <Button
                            variant="light"
                            color="indigo"
                            leftSection={<IconRefresh size={16} />}
                            loading={refreshing}
                            onClick={() => loadCatalogsAndRecords()}
                        >
                            Actualizar
                        </Button>
                    </Group>

                    <Group justify="center" gap="md">
                        <Button
                            variant="outline"
                            color="indigo"
                            leftSection={<IconSettings size={16} />}
                            onClick={openMachinesModal}
                        >
                            Maquinas
                        </Button>
                        <Button
                            variant="outline"
                            color="indigo"
                            leftSection={<IconSettings size={16} />}
                            onClick={openCodesModal}
                        >
                            Editar y Crear Codigos
                        </Button>
                    </Group>

                    <Divider label="Vista" labelPosition="center" />
                    <SegmentedControl
                        className="reporte-diario-segmented"
                        fullWidth
                        color="indigo"
                        value={mainView}
                        onChange={setMainView}
                        data={[
                            { label: 'Historial', value: 'historial' },
                            { label: 'Ingreso manual', value: 'manual' },
                        ]}
                    />
                </Stack>
            </Card>

            {mainView === 'historial' ? (
                <Card className="glass-card" p="lg">
                    <ReporteDiarioExplorer refreshKey={explorerRefresh} />
                </Card>
            ) : (
                <Card className="glass-card" p="lg">
                    <ReporteDiarioExplorer
                        mode="manual"
                        refreshKey={explorerRefresh}
                        externalDate={manualDate}
                        onDateChange={setManualDate}
                        headerExtra={(
                            <>
                                <DateInput
                                    value={manualDate}
                                    onChange={(v) => setManualDate(v || new Date())}
                                    valueFormat="DD/MM/YYYY"
                                    styles={inputStyles}
                                />
                                <Button
                                    color="indigo"
                                    leftSection={<IconPlus size={16} />}
                                    onClick={() => newRecord(activityMode === 'machine' ? 'machine' : 'hours')}
                                >
                                    Nuevo registro
                                </Button>
                                <Button variant="light" color="gray" onClick={handleImportLocal}>
                                    Importar datos locales
                                </Button>
                            </>
                        )}
                    />
                </Card>
            )}

            <Modal
                opened={captureOpen}
                onClose={() => setCaptureOpen(false)}
                title={editingId ? 'Editar reporte' : 'Nuevo registro'}
                size="90%"
                centered
                styles={{
                    content: { maxHeight: '92vh' },
                    body: { maxHeight: 'calc(92vh - 60px)', overflowY: 'auto', paddingRight: 4 },
                }}
            >
                <Stack gap="md">
                    <SegmentedControl
                        className="reporte-diario-segmented"
                        fullWidth
                        color="indigo"
                        value={activityMode === 'machine' ? 'machine' : 'hours'}
                        onChange={changeActivityMode}
                        data={[
                            { label: 'Por Operario', value: 'hours' },
                            { label: 'Por Maquina', value: 'machine' },
                        ]}
                    />
                    <Text size="sm" c="dimmed" ta="center">
                        {activityMode === 'machine'
                            ? 'Perspectiva de máquina: un equipo con varios trabajadores. La máquina va arriba y el operario en cada fila.'
                            : 'Perspectiva de operario: un trabajador en una o varias máquinas. El operario va arriba y la máquina en cada fila.'}
                    </Text>

                    <SimpleGrid cols={{ base: 1, sm: 3 }}>
                        <Card className="glass-card" p="md"><Text c="dimmed" size="xs">Procesos cargados</Text><Title order={3} c="white">{totals.processes}</Title></Card>
                        <Card className="glass-card" p="md"><Text c="dimmed" size="xs">Horas acumuladas</Text><Title order={3} c="white">{totals.hours.toFixed(2)}</Title></Card>
                        <Card className="glass-card" p="md"><Text c="dimmed" size="xs">Cantidad total</Text><Title order={3} c="white">{totals.quantity.toLocaleString()}</Title></Card>
                    </SimpleGrid>

                    <Group grow align="flex-end">
                        <DateInput
                            label="Fecha"
                            value={form.processDate}
                            onChange={(value) => {
                                const processDate = value || new Date();
                                setForm((prev) => ({ ...prev, processDate }));
                                const rowDate = toDateOnlyString(processDate);
                                setProcesses((prev) => prev.map((row) => (
                                    isProcessRowEmpty(row) ? { ...row, rowDate } : row
                                )));
                            }}
                            styles={inputStyles}
                        />
                        <Select
                            label="Horario"
                            data={SHIFTS.map((s) => ({ value: s.code, label: s.name }))}
                            value={form.shiftCode}
                            onChange={(value) => setForm((prev) => ({ ...prev, shiftCode: value || 'T1' }))}
                            styles={selectStyles}
                        />
                        {activityMode === 'machine' ? (
                            <Autocomplete
                                label="Máquina"
                                placeholder="Seleccione o escriba máquina"
                                data={machineOptions}
                                value={form.machineName}
                                onChange={(value) => {
                                    const machineName = value || '';
                                    setForm((prev) => ({ ...prev, machineName }));
                                    setProcesses((prev) => prev.map((row) => (
                                        isProcessRowEmpty(row) ? row : { ...row, machineName: machineName || row.machineName }
                                    )));
                                }}
                                styles={inputStyles}
                            />
                        ) : (
                            <Autocomplete
                                label="Operario"
                                placeholder="Seleccione o escriba operario"
                                data={operatorOptions}
                                value={form.operatorName}
                                onChange={(value) => setForm((prev) => ({ ...prev, operatorName: value || '' }))}
                                onOptionSubmit={(value) => loadPreviousManualEntries(value)}
                                onBlur={() => loadPreviousManualEntries(form.operatorName)}
                                styles={inputStyles}
                            />
                        )}
                    </Group>

                    <Divider label="Carga rápida por tabla" labelPosition="left" />

                    <Card p="sm" withBorder>
                        <Stack gap="xs">
                            <Group justify="space-between">
                                <Text size="sm" fw={700}>
                                    Edición múltiple · {selectedRows.size} fila(s) seleccionada(s)
                                </Text>
                                <Button
                                    size="compact-sm"
                                    variant="light"
                                    onClick={applyBulkValues}
                                    disabled={selectedRows.size === 0}
                                >
                                    Aplicar a seleccionadas
                                </Button>
                            </Group>
                            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                                <Autocomplete
                                    label={activityMode === 'machine' ? 'Operario' : 'Máquina'}
                                    placeholder="Dejar vacío para no cambiar"
                                    data={activityMode === 'machine' ? operatorOptions : machineOptions}
                                    value={bulkDraft.identity}
                                    onChange={(value) => setBulkDraft((prev) => ({ ...prev, identity: value }))}
                                    size="xs"
                                />
                                <Autocomplete
                                    label="OP"
                                    placeholder="Misma OP"
                                    data={orderOptions}
                                    value={bulkDraft.productionOrderNumber}
                                    onChange={(value) => setBulkDraft((prev) => ({
                                        ...prev,
                                        productionOrderNumber: value,
                                    }))}
                                    size="xs"
                                />
                                <Select
                                    label="Código"
                                    placeholder="Misma actividad"
                                    data={codeOptions}
                                    value={bulkDraft.processCode || null}
                                    onChange={(value) => setBulkDraft((prev) => ({
                                        ...prev,
                                        processCode: value || '',
                                    }))}
                                    searchable
                                    clearable
                                    autoSelectOnBlur
                                    size="xs"
                                />
                                <TextInput
                                    label="Fecha"
                                    type="date"
                                    value={bulkDraft.rowDate}
                                    onChange={(event) => setBulkDraft((prev) => ({
                                        ...prev,
                                        rowDate: event.currentTarget.value,
                                    }))}
                                    size="xs"
                                />
                                <TextInput
                                    label="Hora inicio"
                                    type="time"
                                    value={bulkDraft.startTime}
                                    onChange={(event) => setBulkDraft((prev) => ({
                                        ...prev,
                                        startTime: event.currentTarget.value,
                                    }))}
                                    size="xs"
                                />
                                <TextInput
                                    label="Hora fin"
                                    type="time"
                                    value={bulkDraft.endTime}
                                    onChange={(event) => setBulkDraft((prev) => ({
                                        ...prev,
                                        endTime: event.currentTarget.value,
                                    }))}
                                    size="xs"
                                />
                            </SimpleGrid>
                            <Text size="xs" c="dimmed">
                                Solo se aplican los campos diligenciados; los demás valores de cada fila se conservan.
                            </Text>
                        </Stack>
                    </Card>

                    <div className="reporte-diario-table-wrap reporte-diario-capture-table">
                        <ScrollArea.Autosize mah={320} type="auto" offsetScrollbars>
                            <Table
                                highlightOnHover
                                withTableBorder
                                withColumnBorders
                                verticalSpacing={4}
                                horizontalSpacing="xs"
                                styles={{
                                    table: {
                                        background: 'transparent',
                                        tableLayout: 'fixed',
                                        minWidth: 1150,
                                    },
                                    th: {
                                        background: 'rgba(255, 255, 255, 0.06)',
                                        color: '#94a3b8',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        borderColor: 'rgba(255, 255, 255, 0.08)',
                                    },
                                    td: {
                                        color: '#e2e8f0',
                                        borderColor: 'rgba(255, 255, 255, 0.06)',
                                        background: 'transparent',
                                    },
                                }}
                            >
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th style={{ width: 36, resize: 'none' }}>
                                            <Checkbox
                                                aria-label="Seleccionar todas las filas"
                                                checked={processes.length > 0 && selectedRows.size === processes.length}
                                                indeterminate={selectedRows.size > 0 && selectedRows.size < processes.length}
                                                onChange={toggleAllRows}
                                            />
                                        </Table.Th>
                                        <Table.Th style={{ width: 150 }}>{activityMode === 'machine' ? 'Operario' : 'Máquina'}</Table.Th>
                                        <Table.Th style={{ width: 85 }}>Orden</Table.Th>
                                        <Table.Th style={{ width: 160 }}>Código</Table.Th>
                                        <Table.Th style={{ width: 125 }}>Fecha</Table.Th>
                                        <Table.Th style={{ width: 95 }}>Hora inicio</Table.Th>
                                        <Table.Th style={{ width: 95 }}>Hora fin</Table.Th>
                                        <Table.Th style={{ width: 55 }}>Horas</Table.Th>
                                        <Table.Th style={{ width: 80 }}>Tiros</Table.Th>
                                        <Table.Th style={{ width: 80 }}>Desp</Table.Th>
                                        <Table.Th style={{ width: 170 }}>Observaciones</Table.Th>
                                        <Table.Th style={{ width: 55, resize: 'none' }}>Acción</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {processes.map((row, idx) => (
                                        <Table.Tr key={`row-${idx}`}>
                                            <Table.Td>
                                                <Checkbox
                                                    aria-label={`Seleccionar fila ${idx + 1}`}
                                                    checked={selectedRows.has(idx)}
                                                    onChange={() => toggleRowSelection(idx)}
                                                />
                                            </Table.Td>
                                            <Table.Td>
                                                {activityMode === 'machine' ? (
                                                    <Autocomplete
                                                        data={operatorOptions}
                                                        value={row.operatorName}
                                                        onChange={(value) => updateProcessCell(idx, 'operatorName', value || '')}
                                                        placeholder="Operario"
                                                        size="xs"
                                                        styles={inputStyles}
                                                    />
                                                ) : (
                                                    <Autocomplete
                                                        data={machineOptions}
                                                        value={row.machineName}
                                                        onChange={(value) => updateProcessCell(idx, 'machineName', value || '')}
                                                        placeholder="Máquina"
                                                        size="xs"
                                                        styles={inputStyles}
                                                    />
                                                )}
                                            </Table.Td>
                                            <Table.Td>
                                                <Autocomplete
                                                    data={orderOptions}
                                                    value={row.productionOrderNumber}
                                                    onChange={(value) => updateProcessCell(idx, 'productionOrderNumber', value || '')}
                                                    placeholder="OP"
                                                    size="xs"
                                                    styles={inputStyles}
                                                />
                                            </Table.Td>
                                            <Table.Td>
                                                <Select
                                                    data={codeOptions}
                                                    value={row.processCode || null}
                                                    onChange={(value) => updateProcessCell(idx, 'processCode', value || '')}
                                                    searchable
                                                    clearable
                                                    autoSelectOnBlur
                                                    size="xs"
                                                    styles={selectStyles}
                                                    comboboxProps={{ withinPortal: true }}
                                                />
                                            </Table.Td>
                                            <Table.Td>
                                                <TextInput
                                                    type="date"
                                                    value={row.rowDate}
                                                    onChange={(event) => updateProcessCell(idx, 'rowDate', event.currentTarget.value)}
                                                    size="xs"
                                                    styles={inputStyles}
                                                />
                                            </Table.Td>
                                            <Table.Td>
                                                <TextInput
                                                    type="time"
                                                    value={row.startTime}
                                                    onChange={(event) => updateProcessCell(idx, 'startTime', event.currentTarget.value)}
                                                    size="xs"
                                                    styles={inputStyles}
                                                />
                                            </Table.Td>
                                            <Table.Td>
                                                <TextInput
                                                    type="time"
                                                    value={row.endTime}
                                                    onChange={(event) => updateProcessCell(idx, 'endTime', event.currentTarget.value)}
                                                    size="xs"
                                                    styles={inputStyles}
                                                />
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="xs" c="indigo.3" fw={700}>
                                                    {rowHours(row).toFixed(2)}
                                                </Text>
                                            </Table.Td>
                                            <Table.Td>
                                                {isProductionCode(row.processCode) ? (
                                                    <NumberInput
                                                        value={row.quantityProcessed}
                                                        min={0}
                                                        onChange={(value) => updateProcessCell(idx, 'quantityProcessed', Number(value || 0))}
                                                        size="xs"
                                                        styles={inputStyles}
                                                    />
                                                ) : (
                                                    <Text size="xs" c="dimmed" ta="center">—</Text>
                                                )}
                                            </Table.Td>
                                            <Table.Td>
                                                {isProductionCode(row.processCode) ? (
                                                    <NumberInput
                                                        value={row.desperdicio}
                                                        min={0}
                                                        onChange={(value) => updateProcessCell(idx, 'desperdicio', Number(value || 0))}
                                                        size="xs"
                                                        styles={inputStyles}
                                                    />
                                                ) : (
                                                    <Text size="xs" c="dimmed" ta="center">—</Text>
                                                )}
                                            </Table.Td>
                                            <Table.Td>
                                                <TextInput
                                                    value={row.observations}
                                                    onChange={(event) => updateProcessCell(idx, 'observations', event.currentTarget.value)}
                                                    size="xs"
                                                    styles={inputStyles}
                                                />
                                            </Table.Td>
                                            <Table.Td>
                                                <Button variant="subtle" color="red" size="compact-xs" onClick={() => removeProcess(idx)}>
                                                    X
                                                </Button>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </ScrollArea.Autosize>
                    </div>

                    <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                            {activityMode === 'machine' ? (
                                <>Máquina: <strong>{form.machineName || '-'}</strong></>
                            ) : (
                                <>Operario: <strong>{form.operatorName || '-'}</strong></>
                            )}
                            {' '}| Modo: <strong>{activityMode === 'machine' ? 'Por Máquina' : 'Por Operario'}</strong>
                            {' '}| Usuario: <strong>{user.username || 'Sistema'}</strong>
                        </Text>
                        <Group>
                            {records.length > 0 && (
                                <Group gap={4}>
                                    <ActionIcon variant="light" onClick={goToFirst}><IconChevronsLeft size={16} /></ActionIcon>
                                    <ActionIcon variant="light" onClick={goPrev}><IconArrowLeft size={16} /></ActionIcon>
                                    <Badge variant="light">{recordIndex >= 0 ? `${recordIndex + 1} / ${records.length}` : `0 / ${records.length}`}</Badge>
                                    <ActionIcon variant="light" onClick={goNext}><IconArrowRight size={16} /></ActionIcon>
                                    <ActionIcon variant="light" onClick={goToLast}><IconChevronsRight size={16} /></ActionIcon>
                                </Group>
                            )}
                            <Button variant="subtle" color="gray" onClick={() => setCaptureOpen(false)}>Cancelar</Button>
                            <Button variant="light" color="indigo" leftSection={<IconPlayerTrackNext size={16} />} onClick={addProcess}>Siguiente fila</Button>
                            <Group gap={6}>
                                <NumberInput
                                    value={rowsToAdd}
                                    onChange={(value) => setRowsToAdd(Number(value) || 1)}
                                    min={1}
                                    max={50}
                                    w={70}
                                    size="sm"
                                    styles={inputStyles}
                                />
                                <Button
                                    variant="light"
                                    color="teal"
                                    leftSection={<IconPlus size={16} />}
                                    onClick={() => addProcessRows(rowsToAdd)}
                                >
                                    Agregar filas
                                </Button>
                            </Group>
                            <Button color="indigo" leftSection={<IconDeviceFloppy size={16} />} onClick={saveReport} loading={saving}>Guardar</Button>
                        </Group>
                    </Group>
                </Stack>
            </Modal>

            <Modal
                opened={machinesModalOpen}
                onClose={() => {
                    setMachinesModalOpen(false);
                    cancelEditMachine();
                }}
                title="Máquinas"
                size="md"
                centered
            >
                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        Configura los nombres de las máquinas disponibles para los reportes.
                    </Text>

                    <Group align="flex-end" gap="sm">
                        <TextInput
                            label={editingMachineIndex >= 0 ? 'Renombrar máquina' : 'Nueva máquina'}
                            placeholder="Ej: 6 SpeedMaster"
                            value={machineDraft}
                            onChange={(e) => setMachineDraft(e.currentTarget.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveMachineDraft(); }}
                            style={{ flex: 1 }}
                        />
                        {editingMachineIndex >= 0 && (
                            <Button variant="subtle" color="gray" onClick={cancelEditMachine}>Cancelar</Button>
                        )}
                        <Button
                            leftSection={editingMachineIndex >= 0 ? <IconEdit size={16} /> : <IconPlus size={16} />}
                            onClick={saveMachineDraft}
                        >
                            {editingMachineIndex >= 0 ? 'Guardar' : 'Agregar'}
                        </Button>
                    </Group>

                    <Divider label={`Máquinas registradas (${machineItems.length})`} labelPosition="left" />

                    <ScrollArea.Autosize mah={320} type="auto" offsetScrollbars>
                        <Table highlightOnHover verticalSpacing="xs">
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Nombre</Table.Th>
                                    <Table.Th style={{ width: 100 }}>Acciones</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {machineItems.map((name, index) => (
                                    <Table.Tr key={`${name}-${index}`} bg={editingMachineIndex === index ? 'dark.6' : undefined}>
                                        <Table.Td>{name}</Table.Td>
                                        <Table.Td>
                                            <Group gap={4}>
                                                <ActionIcon
                                                    variant="subtle"
                                                    onClick={() => startEditMachine(index)}
                                                    aria-label="Renombrar máquina"
                                                >
                                                    <IconEdit size={16} />
                                                </ActionIcon>
                                                <ActionIcon
                                                    variant="subtle"
                                                    color="red"
                                                    onClick={() => deleteMachine(index)}
                                                    aria-label="Eliminar máquina"
                                                >
                                                    <IconTrash size={16} />
                                                </ActionIcon>
                                            </Group>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                                {machineItems.length === 0 && (
                                    <Table.Tr>
                                        <Table.Td colSpan={2}>
                                            <Text c="dimmed" ta="center">No hay máquinas. Agrega la primera arriba.</Text>
                                        </Table.Td>
                                    </Table.Tr>
                                )}
                            </Table.Tbody>
                        </Table>
                    </ScrollArea.Autosize>
                </Stack>
            </Modal>

            <Modal
                opened={codesModalOpen}
                onClose={() => {
                    setCodesModalOpen(false);
                    cancelEditCode();
                }}
                title="Códigos de proceso"
                size="lg"
                centered
                styles={{
                    content: { maxHeight: '90vh' },
                    body: { maxHeight: 'calc(90vh - 60px)', overflowY: 'auto', paddingRight: 4 },
                }}
            >
                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        Administra códigos y subcódigos del reporte. Edita un código padre para asignarle subcódigos.
                    </Text>

                    <SimpleGrid cols={{ base: 1, sm: 2 }}>
                        <TextInput
                            label="Código"
                            placeholder="01"
                            value={codeDraft.code}
                            onChange={(e) => setCodeDraft((prev) => ({ ...prev, code: e.currentTarget.value }))}
                            required
                        />
                        <TextInput
                            label="Nombre"
                            placeholder="Puesta a Punto"
                            value={codeDraft.name}
                            onChange={(e) => setCodeDraft((prev) => ({ ...prev, name: e.currentTarget.value }))}
                            required
                        />
                    </SimpleGrid>
                    <Group justify="flex-end">
                        {editingCodeIndex >= 0 && (
                            <Button variant="subtle" color="gray" onClick={cancelEditCode}>Cancelar edición</Button>
                        )}
                        <Button
                            leftSection={editingCodeIndex >= 0 ? <IconEdit size={16} /> : <IconPlus size={16} />}
                            onClick={saveCodeDraft}
                        >
                            {editingCodeIndex >= 0 ? 'Guardar cambios' : 'Añadir código'}
                        </Button>
                    </Group>

                    {editingCodeItem && (
                        <>
                            <Divider label={`Subcódigos de ${formatProcessCodeLabel(editingCodeItem)}`} labelPosition="left" />
                            <SimpleGrid cols={{ base: 1, sm: 2 }}>
                                <TextInput
                                    label="Subcódigo"
                                    placeholder="1"
                                    value={subcodeDraft.code}
                                    onChange={(e) => setSubcodeDraft((prev) => ({ ...prev, code: e.currentTarget.value }))}
                                    required
                                />
                                <TextInput
                                    label="Nombre del subcódigo"
                                    placeholder="Ajuste inicial"
                                    value={subcodeDraft.name}
                                    onChange={(e) => setSubcodeDraft((prev) => ({ ...prev, name: e.currentTarget.value }))}
                                    required
                                />
                            </SimpleGrid>
                            <Group justify="flex-end">
                                {editingSubcodeIndex >= 0 && (
                                    <Button variant="subtle" color="gray" onClick={cancelEditSubcode}>Cancelar subcódigo</Button>
                                )}
                                <Button
                                    variant="light"
                                    leftSection={editingSubcodeIndex >= 0 ? <IconEdit size={16} /> : <IconPlus size={16} />}
                                    onClick={saveSubcodeDraft}
                                >
                                    {editingSubcodeIndex >= 0 ? 'Guardar subcódigo' : 'Añadir subcódigo'}
                                </Button>
                            </Group>
                            <ScrollArea.Autosize mah={160} type="auto" offsetScrollbars>
                                <Table highlightOnHover verticalSpacing="xs">
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Subcódigo</Table.Th>
                                            <Table.Th>Nombre</Table.Th>
                                            <Table.Th style={{ width: 100 }}>Acciones</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {(editingCodeItem.subcodes || []).map((sub, subIndex) => (
                                            <Table.Tr key={`${editingCodeItem.code}-${sub.code}-${subIndex}`}>
                                                <Table.Td>
                                                    <Badge variant="outline">{sub.code}</Badge>
                                                </Table.Td>
                                                <Table.Td>{sub.name}</Table.Td>
                                                <Table.Td>
                                                    <Group gap={4}>
                                                        <ActionIcon variant="subtle" onClick={() => startEditSubcode(subIndex)} aria-label="Editar subcódigo">
                                                            <IconEdit size={16} />
                                                        </ActionIcon>
                                                        <ActionIcon variant="subtle" color="red" onClick={() => deleteSubcode(subIndex)} aria-label="Eliminar subcódigo">
                                                            <IconTrash size={16} />
                                                        </ActionIcon>
                                                    </Group>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                        {(editingCodeItem.subcodes || []).length === 0 && (
                                            <Table.Tr>
                                                <Table.Td colSpan={3}>
                                                    <Text c="dimmed" ta="center" size="sm">Sin subcódigos. Añade el primero arriba.</Text>
                                                </Table.Td>
                                            </Table.Tr>
                                        )}
                                    </Table.Tbody>
                                </Table>
                            </ScrollArea.Autosize>
                        </>
                    )}

                    <Divider
                        label={`Códigos registrados (${processCodeItems.length})`}
                        labelPosition="left"
                    />

                    <ScrollArea.Autosize mah={360} type="scroll" offsetScrollbars scrollbarSize={8}>
                        <Table highlightOnHover verticalSpacing="sm">
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Código</Table.Th>
                                    <Table.Th>Nombre</Table.Th>
                                    <Table.Th>Subcódigos</Table.Th>
                                    <Table.Th style={{ width: 100 }}>Acciones</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {processCodeItems.map((item, index) => (
                                    <Table.Tr key={`${item.code}-${index}`} bg={editingCodeIndex === index ? 'dark.6' : undefined}>
                                        <Table.Td>
                                            <Badge variant="light">{item.code}</Badge>
                                        </Table.Td>
                                        <Table.Td>{item.name}</Table.Td>
                                        <Table.Td>
                                            <Text size="sm" c="dimmed">
                                                {(item.subcodes || []).length > 0
                                                    ? (item.subcodes || []).map((sub) => sub.code).join(', ')
                                                    : '—'}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Group gap={4}>
                                                <ActionIcon
                                                    variant="subtle"
                                                    onClick={() => startEditCode(index)}
                                                    aria-label="Editar código"
                                                >
                                                    <IconEdit size={16} />
                                                </ActionIcon>
                                                <ActionIcon
                                                    variant="subtle"
                                                    color="red"
                                                    onClick={() => deleteCode(index)}
                                                    aria-label="Eliminar código"
                                                >
                                                    <IconTrash size={16} />
                                                </ActionIcon>
                                            </Group>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                                {processCodeItems.length === 0 && (
                                    <Table.Tr>
                                        <Table.Td colSpan={4}>
                                            <Text c="dimmed" ta="center">No hay códigos. Añade el primero arriba.</Text>
                                        </Table.Td>
                                    </Table.Tr>
                                )}
                            </Table.Tbody>
                        </Table>
                    </ScrollArea.Autosize>
                </Stack>
            </Modal>
        </Stack>
    );
}
