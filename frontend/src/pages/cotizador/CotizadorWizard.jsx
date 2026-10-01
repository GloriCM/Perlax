import { useState, useEffect, useRef } from 'react';
import {
    Card,
    Title,
    Text,
    Stack,
    Button,
    Group,
    Stepper,
    TextInput,
    Select,
    NumberInput,
    Checkbox,
    Table,
    Alert,
    Autocomplete,
    Loader,
    Divider,
    Badge,
    Radio,
} from '@mantine/core';
import { IconArrowLeft, IconCalculator, IconDeviceFloppy, IconBuildingStore, IconDownload } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../utils/api';
import { notifications } from '@mantine/notifications';
import { getCurrentUser } from '../../utils/permissions';
import {
    FREIGHT_OPTIONS,
    PLAZO_PAGO_OPTIONS,
    SERVICIO_OPTIONS,
    STEP_LABELS,
    STEPS_BOLSA,
    STEPS_CAJA,
    activatePiece,
    addPiece,
    buildCalculatePayload,
    breakdownRows,
    createInitialForm,
    fetchMaterialOptions,
    fetchMicroOptions,
    fetchBarnizOptions,
    fetchTerminadoOptions,
    fetchCordonOptions,
    fetchFreightFactors,
    fetchPlanchaOptions,
    findQuoteGaps,
    parseLocaleNumber,
    restoreQuoteInputs,
    formatMoney,
    getPrimaryResult,
    normalizeLoadedForm,
    openCotizacionPdf,
    pliegoToMeters,
    previewFreightForPiece,
    removeActivePiece,
    syncActivePieceIntoList,
    toInputNumber,
} from './cotizadorHelpers';
import './CotizadorWizard.css';

const DRAFT_KEY = (id, orderId) =>
    `perlax.cotizador.draft.${id || (orderId ? `ot-${orderId}` : 'nueva')}`;

function readDraft(id, orderId) {
    try {
        const raw = sessionStorage.getItem(DRAFT_KEY(id, orderId));
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function writeDraft(id, orderId, payload) {
    try {
        sessionStorage.setItem(DRAFT_KEY(id, orderId), JSON.stringify(payload));
    } catch {
        // quota / private mode
    }
}

function commitNumber(value) {
    if (value === '' || value === null || value === undefined) return '';
    if (typeof value === 'number') return Number.isFinite(value) ? value : '';
    const text = String(value).trim();
    // El usuario sigue escribiendo "0," o "0."
    if (text === '-' || /[.,]$/.test(text)) return text;
    return parseLocaleNumber(text);
}

function clearDraft(id, orderId) {
    try {
        sessionStorage.removeItem(DRAFT_KEY(id, orderId));
    } catch {
        // ignore
    }
}

export default function CotizadorWizard() {
    const navigate = useNavigate();
    const { id, orderId } = useParams();
    const user = getCurrentUser();
    const draft = !id ? readDraft(id, orderId) : null;
    const [active, setActive] = useState(() => {
        const n = Number(draft?.active);
        return Number.isFinite(n) && n >= 0 ? n : 0;
    });
    const [calcResult, setCalcResult] = useState(() => {
        const saved = draft?.calcResult;
        if (saved && saved.isValid === false) return null;
        return saved ?? null;
    });
    const [saveStatus, setSaveStatus] = useState('idle');
    const [loadingQuote, setLoadingQuote] = useState(Boolean(id));
    const [clienteSuggestions, setClienteSuggestions] = useState([]);
    const [clienteMaster, setClienteMaster] = useState([]); // [{ id, name }]
    const [clienteSuggestLoading, setClienteSuggestLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [materialOptions, setMaterialOptions] = useState([]);
    const [planchaOptions, setPlanchaOptions] = useState([]);
    const [microOptions, setMicroOptions] = useState([]);
    const [barnizOptions, setBarnizOptions] = useState([]);
    const [terminadoOptions, setTerminadoOptions] = useState([]);
    const [cordonOptions, setCordonOptions] = useState([]);
    const [catalogsLoading, setCatalogsLoading] = useState(true);
    const [freightFactors, setFreightFactors] = useState({ relativo: 0.35, local: 96.3, nacional: 428 });
    const [savedQuoteId, setSavedQuoteId] = useState(id || null);
    const [clientTier, setClientTier] = useState('Al3');
    const [form, setForm] = useState(() => {
        if (draft?.form) return normalizeLoadedForm(draft.form, user);
        return createInitialForm(user);
    });
    const blockReason = useRef('');

    const stepIds = form.productType === 'Bolsa' ? STEPS_BOLSA : STEPS_CAJA;
    const currentStepId = stepIds[active] ?? 10;
    const isBolsa = form.productType === 'Bolsa';
    const primaryResult = getPrimaryResult(calcResult);

    // Si cambia Caja/Bolsa y el índice de paso queda fuera de rango, ajustar.
    useEffect(() => {
        if (active > stepIds.length - 1) {
            setActive(Math.max(0, stepIds.length - 1));
        }
    }, [active, stepIds.length]);

    const lastCompleteForm = useRef(null);
    const keptInputs = useRef(null);
    const headerRef = useRef({ clientName: '', workName: '', partName: '', sellerName: '' });

    const rememberHeader = (patch) => {
        if (!patch) return;
        for (const key of ['clientName', 'workName', 'partName', 'sellerName']) {
            if (!(key in patch)) continue;
            const text = String(patch[key] ?? '').trim();
            if (text) headerRef.current[key] = patch[key];
        }
    };

    const applyHeader = (source) => {
        const next = { ...(source || {}) };
        for (const key of ['clientName', 'workName', 'partName', 'sellerName']) {
            if (!String(next[key] ?? '').trim() && String(headerRef.current[key] || '').trim()) {
                next[key] = headerRef.current[key];
            }
        }
        return next;
    };

    const readInputValue = (event) => {
        if (typeof event === 'string' || typeof event === 'number') return String(event);
        return event?.currentTarget?.value ?? event?.target?.value ?? '';
    };

    const isDomEvent = (value) =>
        Boolean(value && typeof value === 'object' && (value.nativeEvent || typeof value.preventDefault === 'function'));

    const stripDom = (value, seen = new WeakSet()) => {
        if (value == null) return value;
        const kind = typeof value;
        if (kind === 'string' || kind === 'number' || kind === 'boolean') return value;
        if (kind === 'function' || isDomEvent(value)) return undefined;
        if (typeof Node !== 'undefined' && value instanceof Node) return undefined;
        if (kind !== 'object') return undefined;
        if (seen.has(value)) return undefined;
        seen.add(value);
        if (Array.isArray(value)) {
            return value.map((item) => stripDom(item, seen)).filter((item) => item !== undefined);
        }
        const out = {};
        for (const [key, item] of Object.entries(value)) {
            const next = stripDom(item, seen);
            if (next !== undefined) out[key] = next;
        }
        return out;
    };

    // Persistir borrador al cambiar de pestaña / remount (solo cotización nueva o desde OT).
    useEffect(() => {
        if (id || loadingQuote) return;
        writeDraft(id, orderId, {
            active,
            form: applyHeader(restoreQuoteInputs(form, keptInputs.current)),
            calcResult,
            savedAt: Date.now(),
        });
    }, [id, orderId, active, form, calcResult, loadingQuote]);
    useEffect(() => {
        const restored = applyHeader(restoreQuoteInputs(form, keptInputs.current));
        keptInputs.current = restored;
        rememberHeader(restored);
        if (!findQuoteGaps(restored)) lastCompleteForm.current = restored;
        const missingHeader = ['clientName', 'workName', 'partName'].some(
            (key) => String(restored[key] || '').trim() && !String(form[key] || '').trim(),
        );
        if (missingHeader) setForm(restored);
    }, [form]);

    useEffect(() => {
        let cancelled = false;
        const loadCatalogs = async () => {
            setCatalogsLoading(true);
            try {
                const [materials, planchas, micros, barnices, terminados, cordones, fleteFactors] = await Promise.all([
                    fetchMaterialOptions(),
                    fetchPlanchaOptions(),
                    fetchMicroOptions(),
                    fetchBarnizOptions(),
                    fetchTerminadoOptions(),
                    fetchCordonOptions(),
                    fetchFreightFactors(),
                ]);
                if (!cancelled) {
                    setMaterialOptions(Array.isArray(materials) ? materials : []);
                    setPlanchaOptions(Array.isArray(planchas) ? planchas : []);
                    setMicroOptions(Array.isArray(micros) ? micros : []);
                    setBarnizOptions(Array.isArray(barnices) ? barnices : []);
                    setTerminadoOptions(Array.isArray(terminados) ? terminados : []);
                    setCordonOptions(Array.isArray(cordones) ? cordones : []);
                    setFreightFactors(fleteFactors && typeof fleteFactors === 'object' ? fleteFactors : { relativo: 0.35, local: 96.3, nacional: 428 });
                }
            } finally {
                if (!cancelled) setCatalogsLoading(false);
            }
        };
        loadCatalogs();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        const loadQuote = async () => {
            setLoadingQuote(true);
            try {
                const quote = await api.get(`/production/cotizador/${id}`);
                if (cancelled || !quote) return;
                if (quote.formDataJson) {
                    const parsed = JSON.parse(quote.formDataJson);
                    const loaded = normalizeLoadedForm(parsed, user);
                    setForm(loaded);
                    // Recalcular siempre: el JSON guardado puede tener PV=0 por factores viejos.
                    try {
                        const isBolsaQuote = String(loaded.productType || '').toLowerCase() === 'bolsa';
                        const data = await api.post(
                            '/production/cotizador/calculate',
                            buildCalculatePayload(loaded, isBolsaQuote),
                        );
                        if (!cancelled) setCalcResult(data);
                    } catch {
                        if (quote.calculationResultJson) {
                            setCalcResult(JSON.parse(quote.calculationResultJson));
                        }
                    }
                } else if (quote.calculationResultJson) {
                    setCalcResult(JSON.parse(quote.calculationResultJson));
                }
            } catch (err) {
                notifications.show({
                    title: 'Error',
                    message: err.message || 'No se pudo cargar la cotización',
                    color: 'red',
                });
                navigate('/cotizador/guardadas');
            } finally {
                if (!cancelled) setLoadingQuote(false);
            }
        };
        loadQuote();
        return () => { cancelled = true; };
    }, [id, navigate]);

    useEffect(() => {
        if (!orderId || id) return;
        let cancelled = false;
        const loadOrder = async () => {
            try {
                const order = await api.get(`/production/orders/${orderId}`);
                if (cancelled || !order) return;
                const isBolsaOrder = String(order.lineaPT || '').toLowerCase().includes('bolsa');
                setForm((prev) => ({
                    ...prev,
                    productType: isBolsaOrder ? 'Bolsa' : 'Caja',
                    clientName: order.cliente || prev.clientName,
                    workName: order.productName || prev.workName,
                    partName: order.parts?.[0]?.partName || prev.partName,
                    sellerName: order.ejecutivoCuenta || prev.sellerName,
                }));
            } catch (err) {
                console.warn('No se pudo precargar OT', err);
            }
        };
        loadOrder();
        return () => { cancelled = true; };
    }, [orderId, id]);

    useEffect(() => {
        let cancelled = false;
        const loadCustomers = async () => {
            setClienteSuggestLoading(true);
            try {
                const rows = await api.get('/production/customers?onlyActive=true');
                if (cancelled) return;
                const list = (Array.isArray(rows) ? rows : [])
                    .map((c) => ({
                        id: c.id,
                        name: (c.name || '').trim(),
                    }))
                    .filter((c) => c.name)
                    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
                setClienteMaster(list);
                setClienteSuggestions(list.map((c) => c.name));
            } catch {
                if (!cancelled) {
                    setClienteMaster([]);
                    setClienteSuggestions([]);
                }
            } finally {
                if (!cancelled) setClienteSuggestLoading(false);
            }
        };
        loadCustomers();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const term = (form.clientName || '').trim().toLowerCase();
        if (!term) {
            setClienteSuggestions(clienteMaster.map((c) => c.name));
            return;
        }
        setClienteSuggestions(
            clienteMaster
                .filter((c) => c.name.toLowerCase().includes(term))
                .map((c) => c.name),
        );
    }, [form.clientName, clienteMaster]);

    const typedByPiece = useRef({});
    const sharedMaterial = useRef({});

    const rememberPiece = (index, patch) => {
        const i = Number.isInteger(index) && index >= 0 ? index : 0;
        typedByPiece.current[i] = { ...(typedByPiece.current[i] || {}), ...patch };
    };

    const mergeTyped = (source) => {
        const base = restoreQuoteInputs(source || {}, keptInputs.current);
        const pieces = (base.pieces?.length ? base.pieces : [base]).map((p) => ({ ...p }));
        const cat = sharedMaterial.current || {};
        const mergedPieces = pieces.map((p, i) => {
            const typed = typedByPiece.current[i] || {};
            const merged = { ...p, ...typed };
            if (cat.materialId) {
                merged.materialId = cat.materialId;
                merged.materialName = cat.materialName || merged.materialName;
            }
            if (parseLocaleNumber(cat.precioMaterialM2) > 0) merged.precioMaterialM2 = cat.precioMaterialM2;
            return merged;
        });
        const active = Math.min(Math.max(0, base.activePieceIndex || 0), mergedPieces.length - 1);
        return syncActivePieceIntoList({
            ...base,
            ...mergedPieces[active],
            pieces: mergedPieces,
            activePieceIndex: active,
        });
    };

    const patchForm = (patch) => setForm((prev) => {
        const safe = { ...(patch || {}) };
        for (const key of ['clientName', 'workName', 'partName', 'sellerName']) {
            if (!(key in safe)) continue;
            const incoming = String(safe[key] ?? '').trim();
            const kept = String(headerRef.current[key] || prev[key] || '').trim();
            if (!incoming && kept) delete safe[key];
            else if (incoming) headerRef.current[key] = safe[key];
        }
        const next = applyHeader(syncActivePieceIntoList({ ...prev, ...safe }));
        keptInputs.current = next;
        return next;
    });

    const patchPiece = (index, patch) => {
        setForm((prev) => {
            const synced = syncActivePieceIntoList(prev);
            const pieces = synced.pieces.map((p, i) => (i === index ? { ...p, ...patch } : p));
            const next = { ...synced, pieces };
            const saved = index === (synced.activePieceIndex || 0)
                ? syncActivePieceIntoList({ ...next, ...patch })
                : next;
            keptInputs.current = saved;
            return saved;
        });
    };

    const onClientChange = (val) => {
        const match = clienteMaster.find((c) => c.name.toLowerCase() === String(val || '').trim().toLowerCase());
        patchForm({
            clientName: val,
            customerId: match?.id || null,
        });
        if (errors.clientName) setErrors((prev) => ({ ...prev, clientName: null }));
    };

    const switchPiece = (index) => setForm((prev) => activatePiece(prev, index));
    const handleAddPiece = () => setForm((prev) => addPiece(prev));
    const handleRemovePiece = () => setForm((prev) => removeActivePiece(prev));

    const validateStep1 = () => {
        const quoted = applyHeader(form);
        const newErrors = {};
        if (!String(quoted.clientName || '').trim()) newErrors.clientName = 'El cliente es obligatorio';
        if (!String(quoted.workName || '').trim()) newErrors.workName = 'El trabajo es obligatorio';
        if (!String(quoted.partName || '').trim()) newErrors.partName = 'El nombre de la pieza es obligatorio';
        setErrors((prev) => {
            const next = { ...prev };
            delete next.clientName;
            delete next.workName;
            delete next.partName;
            return { ...next, ...newErrors };
        });
        blockReason.current = Object.values(newErrors).join('. ');
        return Object.keys(newErrors).length === 0;
    };

    const validateStep2 = () => {
        const newErrors = {};
        const synced = mergeTyped(form);
        const pieces = synced.pieces || [];
        const multi = pieces.length > 1;
        if (multi) {
            pieces.forEach((p, i) => {
                const name = p.partName || `Pieza ${i + 1}`;
                if (!(parseLocaleNumber(p.largoMm) > 0)) newErrors[`largo_${i}`] = `Largo de ${name}`;
                if (!(parseLocaleNumber(p.anchoMm) > 0)) newErrors[`ancho_${i}`] = `Ancho de ${name}`;
                if (!(parseLocaleNumber(p.cabida) > 0)) newErrors[`cabida_${i}`] = `Cabida de ${name}`;
            });
        } else {
            if (!(parseLocaleNumber(synced.largoMm) > 0)) newErrors.largoMm = 'Ingrese el largo del pliego en metros';
            if (!(parseLocaleNumber(synced.anchoMm) > 0)) newErrors.anchoMm = 'Ingrese el ancho del pliego en metros';
            if (!(parseLocaleNumber(synced.cabida) > 0)) newErrors.cabida = 'La cabida es obligatoria';
        }
        const precio = parseLocaleNumber(synced.precioMaterialM2);
        if (!synced.materialId) newErrors.materialId = 'Seleccione un material';
        if (!precio || precio <= 0) newErrors.precioMaterialM2 = 'Ingrese el precio por m²';
        setErrors((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((key) => {
                if (key === 'largoMm' || key === 'anchoMm' || key === 'cabida' || key === 'materialId' || key === 'precioMaterialM2' || /^(largo|ancho|cabida)_\d+$/.test(key)) {
                    delete next[key];
                }
            });
            return { ...next, ...newErrors };
        });
        blockReason.current = Object.values(newErrors).join('. ');
        return Object.keys(newErrors).length === 0;
    };

    const validateStep = (stepId) => {
        if (stepId === 1) return validateStep1();
        if (stepId === 2) return validateStep2();
        return true;
    };

    const goNext = () => {
        if (!validateStep(currentStepId)) {
            notifications.show({
                title: 'No puede seguir todavía',
                message: blockReason.current || 'Complete los campos marcados antes de continuar.',
                color: 'red',
            });
            return;
        }
        const synced = mergeTyped(form);
        setForm(synced);
        setActive((a) => Math.min(stepIds.length - 1, a + 1));
    };

    const goPrev = () => {
        setForm((prev) => syncActivePieceIntoList(prev));
        setActive((a) => Math.max(0, a - 1));
    };

    const handleStepClick = (stepIndex) => {
        const synced = syncActivePieceIntoList(form);
        setForm(synced);
        if (stepIndex <= active) {
            setActive(stepIndex);
            return;
        }
        for (let i = active; i < stepIndex; i++) {
            const sid = stepIds[i];
            if (!validateStep(sid)) {
                notifications.show({
                    title: 'No puede seguir todavía',
                    message: blockReason.current || `Complete el paso ${sid} antes de continuar.`,
                    color: 'red',
                });
                setActive(i);
                return;
            }
        }
        setActive(stepIndex);
    };

    const calculate = async (formOverride) => {
        setCalcResult(null);
        try {
            const incoming = formOverride && !isDomEvent(formOverride) ? formOverride : form;
            const synced = stripDom(applyHeader(mergeTyped(incoming)));
            keptInputs.current = synced;
            setForm(synced);
            const payload = buildCalculatePayload(synced, isBolsa);
            const expectedMat = (payload.largoPliego * payload.anchoPliego / (payload.cabida || 1)) * payload.precioMaterialM2;
            const data = await api.post('/production/cotizador/calculate', payload);
            setCalcResult(data);
            if (!data?.isValid) {
                const missing = Array.isArray(data?.missingFields) ? data.missingFields : [];
                notifications.show({
                    title: 'Falta completar la cotización',
                    message: missing.join(', '),
                    color: 'yellow',
                });
                return;
            }
            const primary = getPrimaryResult(data);
            const gotMat = Number(primary?.breakdown?.material) || 0;
            if (expectedMat >= 1 && gotMat < 0.01) {
                notifications.show({
                    title: 'Material salió $0 (incorrecto)',
                    message: `Con ${payload.largoPliego} × ${payload.anchoPliego} m y $${payload.precioMaterialM2}/m² debería ser ≈ $${expectedMat.toFixed(0)}/u. Recargue la página (Ctrl+F5) y calcule de nuevo.`,
                    color: 'red',
                    autoClose: 12000,
                });
            }
        } catch (err) {
            notifications.show({ title: 'Error al calcular', message: err.message, color: 'red' });
        }
    };

    const save = async ({ stay = true } = {}) => {
        const quoted = stripDom(applyHeader(mergeTyped(form)));
        if (!validateStep1()) {
            notifications.show({
                title: 'Campos obligatorios',
                message: 'Cliente, trabajo y nombre de pieza son obligatorios.',
                color: 'red',
            });
            setActive(stepIds.indexOf(1));
            return null;
        }
        if (!calcResult?.isValid) {
            await calculate();
            return null;
        }
        setSaveStatus('saving');
        setForm(quoted);
        try {
            const synced = quoted;
            const partNames = (synced.pieces || []).map((p) => p.partName).filter(Boolean).join(' / ');
            const payload = {
                sourceType: orderId ? 'FromOT' : 'Manual',
                productionOrderId: orderId || null,
                productType: synced.productType,
                clientName: synced.clientName,
                sellerName: synced.sellerName,
                workName: synced.workName,
                partName: partNames || synced.partName,
                productName: synced.workName,
                freightType: synced.freightType,
                quantities: synced.quantities,
                primaryQuantityIndex: synced.primaryQtyIndex,
                formDataJson: JSON.stringify(synced),
                calculationResult: calcResult,
            };
            let quoteIdResult = id || savedQuoteId;
            if (id || savedQuoteId) {
                const qid = id || savedQuoteId;
                await api.put(`/production/cotizador/${qid}`, payload);
                quoteIdResult = qid;
                setSavedQuoteId(qid);
            } else {
                const quote = await api.post('/production/cotizador', payload);
                quoteIdResult = quote?.id || null;
                if (quoteIdResult) setSavedQuoteId(quoteIdResult);
            }
            clearDraft(id, orderId);
            setSaveStatus('saved');
            notifications.show({ title: 'Guardado', message: 'Cotización almacenada', color: 'green' });
            if (!stay) navigate('/cotizador/guardadas');
            return quoteIdResult;
        } catch (err) {
            setSaveStatus('error');
            notifications.show({ title: 'Error', message: err.message || 'No se pudo guardar', color: 'red' });
            return null;
        }
    };

    const downloadForClient = async () => {
        if (!calcResult?.isValid) {
            await calculate();
            notifications.show({
                title: 'Calcule primero',
                message: 'Pulse Calcular y vuelva a intentar descargar.',
                color: 'yellow',
            });
            return;
        }
        const quoteId = await save({ stay: true });
        if (!quoteId) return;
        openCotizacionPdf(quoteId, 'propuesta', clientTier);
    };

    const priceForClient = (row) => {
        const al15 = Number(row?.precioAl15 ?? row?.PrecioAl15) || 0;
        const al3 = Number(row?.precioAl3 ?? row?.PrecioAl3) || 0;
        const al5 = Number(row?.precioAl5 ?? row?.PrecioAl5) || 0;
        if (clientTier === 'Al15') return al15;
        if (clientTier === 'Al5') return al5;
        return al3;
    };

    const freightPiece = (() => {
        const synced = mergeTyped(form);
        const pieces = synced.pieces?.length ? synced.pieces : [synced];
        const index = Math.min(Math.max(0, synced.activePieceIndex || 0), pieces.length - 1);
        const active = pieces[index] || synced;
        const hasSize = (p) => pliegoToMeters(p?.largoMm || p?.largoPliego) > 0
            && pliegoToMeters(p?.anchoMm || p?.anchoPliego) > 0
            && parseLocaleNumber(p?.cabida) > 0;
        const chosen = hasSize(active) ? active : (pieces.find(hasSize) || active);
        return { ...synced, ...chosen };
    })();
    const freightPreview = previewFreightForPiece(freightPiece, form.freightType, freightFactors);

    const sectionTitle = (text) => (
        <Divider
            label={text}
            labelPosition="left"
            mt="md"
            mb="sm"
            styles={{ label: { fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em' } }}
        />
    );

    const renderStep1 = () => (
        <Stack gap="md">
            <div className="cotizador-wizard-grid">
                <Select
                    label="Tipo de producto"
                    data={['Caja', 'Bolsa']}
                    value={form.productType}
                    onChange={(v) => patchForm({ productType: v || 'Caja' })}
                />
                <TextInput label="Vendedor" value={form.sellerName} onChange={(e) => patchForm({ sellerName: e.target.value })} />
                <Autocomplete
                    label="Cliente"
                    placeholder={clienteSuggestLoading ? 'Cargando clientes…' : 'Seleccione o busque en el maestro'}
                    value={form.clientName}
                    onChange={onClientChange}
                    data={Array.isArray(clienteSuggestions) ? clienteSuggestions : []}
                    limit={50}
                    filter={({ options }) => (Array.isArray(options) ? options : [])}
                    maxDropdownHeight={280}
                    required
                    error={errors.clientName}
                    leftSection={<IconBuildingStore size={16} />}
                    rightSection={clienteSuggestLoading ? <Loader size={16} /> : null}
                    comboboxProps={{ withinPortal: true, position: 'bottom-start' }}
                    description={
                        clienteMaster.length > 0
                            ? `${clienteMaster.length} cliente(s) del maestro`
                            : 'Sin clientes en maestro — cree en Pedidos → Clientes'
                    }
                />
                <TextInput
                    label="Trabajo"
                    value={form.workName}
                    onChange={(e) => {
                        patchForm({ workName: readInputValue(e) });
                        if (errors.workName) setErrors((prev) => ({ ...prev, workName: null }));
                    }}
                    required
                    error={errors.workName}
                />
            </div>
            {sectionTitle('Piezas (multipieza)')}
            <Group gap="xs" wrap="wrap">
                {(form.pieces || [{ partName: form.partName }]).map((p, i) => (
                    <Button
                        key={i}
                        size="xs"
                        variant={i === (form.activePieceIndex || 0) ? 'filled' : 'light'}
                        onClick={() => switchPiece(i)}
                    >
                        {p.partName || `Pieza ${i + 1}`}
                    </Button>
                ))}
                <Button size="xs" variant="outline" onClick={handleAddPiece}>+ Pieza</Button>
                {(form.pieces?.length || 0) > 1 && (
                    <Button size="xs" color="red" variant="subtle" onClick={handleRemovePiece}>
                        Quitar activa
                    </Button>
                )}
            </Group>
            <TextInput
                label="Nombre pieza activa"
                value={form.partName}
                onChange={(e) => {
                    patchForm({ partName: readInputValue(e) });
                    if (errors.partName) setErrors((prev) => ({ ...prev, partName: null }));
                }}
                required
                error={errors.partName}
            />
            <Text size="xs" c="dimmed">
                Tapa y Base se miden en el paso de material. Cada una guarda su propio largo, ancho y cabida.
            </Text>
        </Stack>
    );

    const pieceMeasureFields = (piece, index, multi) => {
        const name = piece.partName || `Pieza ${index + 1}`;
        const write = (patch) => {
            if (multi) patchPiece(index, patch);
            else patchForm(patch);
        };
        const textField = (label, description, field, errorKey) => (
            <TextInput
                id={`cot-${field}-${index}`}
                label={label}
                description={description}
                placeholder={field === 'cabida' ? 'Ej. 1' : 'Ej. 0,35'}
                value={piece[field] === 0 || piece[field] === null || piece[field] === undefined ? '' : String(piece[field])}
                onChange={(e) => {
                    const raw = typeof e === 'string' || typeof e === 'number'
                        ? e
                        : (e?.currentTarget?.value ?? e?.target?.value ?? '');
                    rememberPiece(index, { [field]: raw });
                    write({ [field]: raw });
                    if (errors[errorKey] || errors[field]) {
                        setErrors((prev) => ({ ...prev, [errorKey]: null, [field]: null }));
                    }
                }}
                required
                error={errors[errorKey] || (!multi ? errors[field] : null)}
            />
        );
        return (
            <>
                {textField(
                    multi ? `Largo (m) — ${name}` : 'Medida del pliego — Largo (m)',
                    'Ejemplo: 0,35. Si pensó en mm, escriba 350.',
                    'largoMm',
                    `largo_${index}`,
                )}
                {textField(
                    multi ? `Ancho (m) — ${name}` : 'Medida del pliego — Ancho (m)',
                    'Ejemplo: 0,40. Si pensó en mm, escriba 400.',
                    'anchoMm',
                    `ancho_${index}`,
                )}
                {textField(
                    multi ? `Cabida — ${name}` : 'Cabida',
                    'Unidades por pliego. Ejemplo: 1',
                    'cabida',
                    `cabida_${index}`,
                )}
            </>
        );
    };

    const renderStep2 = () => {
        const pieces = syncActivePieceIntoList(form).pieces || [];
        const multi = pieces.length > 1;
        const active = pieces[form.activePieceIndex || 0] || pieces[0] || form;
        const largoM = pliegoToMeters(active.largoMm);
        const anchoM = pliegoToMeters(active.anchoMm);
        const cabida = parseLocaleNumber(active.cabida);
        const precioM2 = parseLocaleNumber(active.precioMaterialM2);
        const areaM2 = cabida > 0 ? (largoM * anchoM) / cabida : 0;
        const materialUnit = areaM2 * precioM2;
        const rawL = parseLocaleNumber(active.largoMm);
        const rawA = parseLocaleNumber(active.anchoMm);
        const enteredAsMm = rawL >= 50 || rawA >= 50;
        const dimsAmbiguous = rawL >= 1 && rawL < 50 && rawA >= 1 && rawA < 50;

        return (
            <Stack gap="md">
                <Alert color="gray" title="Medidas y material">
                    <Text size="sm">
                        {multi
                            ? 'El largo, el ancho y la cabida de este paso son las medidas de cada pieza. Tapa va con las suyas y Base con las suyas.'
                            : 'Medidas del pliego en metros, cabida y papel. Ejemplo: largo 0,35 · ancho 0,40 · cabida 1. Si escribe mm (350 × 400), se convierten a metros.'}
                    </Text>
                </Alert>
                {multi && pieces.map((p, i) => (
                    <Card key={`${p.partName || 'pieza'}-${i}`} withBorder p="md" className="glass-card">
                        <Text fw={700} mb="sm">{p.partName || `Pieza ${i + 1}`}</Text>
                        <div className="cotizador-wizard-grid">
                            {pieceMeasureFields(p, i, true)}
                        </div>
                    </Card>
                ))}
                <div className="cotizador-wizard-grid">
                    {!multi && pieceMeasureFields(form, 0, false)}
                    <Select
                        label="Nombre del material"
                        placeholder={catalogsLoading ? 'Cargando…' : 'Seleccione un material'}
                        data={(Array.isArray(materialOptions) ? materialOptions : [])
                            .filter((m) => m && m.id != null && m.id !== '')
                            .map((m) => ({ value: String(m.id), label: m.name || 'Material' }))}
                        value={form.materialId != null && form.materialId !== '' ? String(form.materialId) : null}
                        onChange={(matId) => {
                            if (!matId) return;
                            const mat = materialOptions.find((m) => String(m.id) === String(matId));
                            const price = mat?.pricePerM2 > 0 ? mat.pricePerM2 : form.precioMaterialM2;
                            sharedMaterial.current = {
                                materialId: String(matId),
                                materialName: mat?.name || '',
                                precioMaterialM2: price,
                            };
                            patchForm({
                                materialId: String(matId),
                                materialName: mat?.name || '',
                                precioMaterialM2: price,
                            });
                            if (errors.materialId) setErrors((prev) => ({ ...prev, materialId: null }));
                        }}
                        searchable
                        nothingFoundMessage="Sin materiales configurados"
                        rightSection={catalogsLoading ? <Loader size={16} /> : null}
                        required
                        error={errors.materialId}
                    />
                    <NumberInput
                        label="Precio por m² del material"
                        description="Si queda en 0, Material y Tinta saldrán $0"
                        value={toInputNumber(form.precioMaterialM2)}
                        onChange={(v) => {
                            const next = commitNumber(v);
                            if (parseLocaleNumber(next) > 0) {
                                sharedMaterial.current = { ...sharedMaterial.current, precioMaterialM2: next };
                            }
                            patchForm({ precioMaterialM2: next });
                            if (errors.precioMaterialM2) setErrors((prev) => ({ ...prev, precioMaterialM2: null }));
                        }}
                        hideControls
                        min={0}
                        decimalScale={2}
                        decimalSeparator=","
                        thousandSeparator="."
                        prefix="$ "
                        required
                        error={errors.precioMaterialM2}
                    />
                </div>

                <Card withBorder p="md" className="glass-card">
                    <Title order={5} c="white" mb="xs">Vista previa materia prima</Title>
                    <Text size="sm">
                        Usando: {largoM.toFixed(4)} m × {anchoM.toFixed(4)} m
                        {enteredAsMm ? ' (convertido desde mm)' : ''}
                    </Text>
                    <Text size="sm">
                        Fórmula: ({largoM.toFixed(4)} × {anchoM.toFixed(4)}) / {cabida || '—'} ={' '}
                        <b>{areaM2.toFixed(6)} m²</b>
                    </Text>
                    <Text size="sm">
                        Material = área × precio m² = {areaM2.toFixed(6)} × {precioM2 || 0} ={' '}
                        <b>${formatMoney(materialUnit)}</b> /u
                    </Text>
                    {precioM2 <= 0 && (
                        <Alert color="red" mt="sm" title="Precio del material en $0">
                            Seleccione un material con precio o escriba el precio por m². Sin eso, Material y Tinta quedan en cero.
                        </Alert>
                    )}
                    {areaM2 > 0 && precioM2 > 0 && materialUnit < 0.01 && (
                        <Alert color="red" mt="sm" title="Área demasiado pequeña">
                            Con estas medidas el material sale casi $0. El largo y el ancho van en <b>metros</b>
                            (ejemplo: 0,35 × 0,40). Si pensó en mm, escriba 350 y 400.
                        </Alert>
                    )}
                    {dimsAmbiguous && (
                        <Alert color="yellow" mt="sm" title="Revise la unidad">
                            Valores entre 1 y 50 se tratan como <b>metros</b>. Si quiso decir milímetros, escriba 350 × 400 (no 35 × 40).
                        </Alert>
                    )}
                </Card>
            </Stack>
        );
    };

    const renderStep3 = () => (
        <Stack gap="md">
            <Text size="sm" c="dimmed">Impresión, barniz y terminados para la cotización.</Text>
            {sectionTitle('Impresión')}
            <div className="cotizador-wizard-grid">
                <NumberInput
                    label="Pasadas por Máquina de Impresión"
                    value={toInputNumber(form.vecesImprimir)}
                    onChange={(v) => patchForm({ vecesImprimir: v ?? 1 })}
                    hideControls
                    min={1}
                />
                <NumberInput
                    label="Número de planchas"
                    value={toInputNumber(form.numeroPlanchas)}
                    onChange={(v) => {
                        const next = commitNumber(v);
                        patchForm({ numeroPlanchas: next });
                    }}
                    error={errors.numeroPlanchas}
                    hideControls
                    min={1}
                />
                <Select
                    label="Nombre de la plancha"
                    placeholder="Seleccione plancha"
                    data={(Array.isArray(planchaOptions) ? planchaOptions : []).filter((p) => p?.id != null).map((p) => ({ value: String(p.id), label: p.name || 'Plancha' }))}
                    value={planchaOptions.find((p) => p.name === form.nombrePlancha)?.id || null}
                    onChange={(planchaId) => {
                        const plancha = planchaOptions.find((p) => p.id === planchaId);
                        if (plancha) {
                            patchForm({ nombrePlancha: plancha.name, precioPlancha: plancha.price });
                        }
                    }}
                    searchable
                    clearable
                    nothingFoundMessage="Sin planchas — ingrese precio manual"
                />
                <NumberInput
                    label="Precio por plancha"
                    value={toInputNumber(form.precioPlancha)}
                    onChange={(v) => {
                        const next = commitNumber(v);
                        patchForm({ precioPlancha: next });
                    }}
                    error={errors.precioPlancha}
                    hideControls
                    min={0}
                    prefix="$ "
                    disabled={planchaOptions.length > 0 && Boolean(form.nombrePlancha)}
                />
                <NumberInput
                    label="Cubrimiento (%)"
                    description="Puede ser mayor que 100. Ejemplo: 150."
                    value={toInputNumber(form.cubrimiento)}
                    onChange={(v) => {
                        const next = commitNumber(v);
                        patchForm({ cubrimiento: next });
                    }}
                    error={errors.cubrimiento}
                    hideControls
                    min={0}
                    max={300}
                />
            </div>
            {sectionTitle('Barniz')}
            <div className="cotizador-wizard-grid">
                <Select
                    label="Tipo de barniz"
                    placeholder="Seleccione del catálogo Materiales"
                    data={(Array.isArray(barnizOptions) ? barnizOptions : []).filter((b) => b?.id != null).map((b) => ({ value: String(b.id), label: `${b.name || 'Barniz'} (${b.factor})` }))}
                    value={barnizOptions.find((b) => b.name === form.tipoBarniz || b.id === form.tipoBarniz)?.id || null}
                    onChange={(id) => {
                        const opt = barnizOptions.find((b) => b.id === id);
                        patchForm({
                            tipoBarniz: opt?.name || '',
                            factorBarniz: opt ? (opt.factor ?? 0) : 0,
                        });
                    }}
                    searchable
                    clearable
                    nothingFoundMessage="Configure barnices en Catálogos del cotizador"
                />
                <NumberInput
                    label="Factor del barniz"
                    value={toInputNumber(form.factorBarniz)}
                    onChange={(v) => patchForm({ factorBarniz: v ?? 0 })}
                    hideControls
                    min={0}
                    decimalScale={4}
                />
            </div>
            {sectionTitle('Terminados')}
            <div className="cotizador-wizard-grid">
                <Select
                    label="Nombre del terminado"
                    placeholder="Seleccione del catálogo"
                    data={(Array.isArray(terminadoOptions) ? terminadoOptions : []).filter((t) => t?.id != null).map((t) => ({ value: String(t.id), label: t.name || 'Terminado' }))}
                    value={terminadoOptions.find((t) => t.name === form.terminadoNombre)?.id || null}
                    onChange={(id) => {
                        const opt = terminadoOptions.find((t) => t.id === id);
                        patchForm({
                            terminadoNombre: opt?.name || '',
                            precioTerminadoM2: opt?.pricePerM2 ?? form.precioTerminadoM2,
                        });
                    }}
                    searchable
                    clearable
                    nothingFoundMessage="Configure terminados en Catálogos del cotizador"
                />
                <NumberInput
                    label="Precio por m² del terminado"
                    value={toInputNumber(form.precioTerminadoM2)}
                    onChange={(v) => patchForm({ precioTerminadoM2: v ?? 0 })}
                    hideControls
                    min={0}
                    prefix="$ "
                />
            </div>
        </Stack>
    );

    const renderStep4 = () => (
        <Stack gap="md">
            <Text size="sm" c="dimmed">Micro/flauta y cordón de la pieza.</Text>
            {sectionTitle('Micro / Flauta')}
            <div className="cotizador-wizard-grid">
                <Select
                    label="Tipo micro/flauta"
                    placeholder="Seleccione del catálogo o deje manual"
                    data={(Array.isArray(microOptions) ? microOptions : []).filter((m) => m?.id != null).map((m) => ({ value: String(m.id), label: m.name || 'Micro' }))}
                    value={form.microId}
                    onChange={(microId) => {
                        const micro = microOptions.find((m) => m.id === microId);
                        patchForm({
                            microId: microId,
                            microName: micro?.name || '',
                            precioMicroM2: micro?.pricePerM2 ?? form.precioMicroM2,
                        });
                    }}
                    searchable
                    clearable
                />
                <TextInput
                    label="Nombre micro/flauta"
                    value={form.microName}
                    onChange={(e) => patchForm({ microName: e.target.value })}
                />
                <NumberInput
                    label="Precio por m² micro/flauta"
                    value={toInputNumber(form.precioMicroM2)}
                    onChange={(v) => patchForm({ precioMicroM2: v ?? 0 })}
                    hideControls
                    min={0}
                    prefix="$ "
                />
            </div>
            {sectionTitle('Cordón')}
            <div className="cotizador-wizard-grid">
                <Select
                    label="Tipo de cordón"
                    placeholder="Seleccione del catálogo"
                    data={(Array.isArray(cordonOptions) ? cordonOptions : []).filter((c) => c?.id != null).map((c) => ({ value: String(c.id), label: c.name || 'Cordón' }))}
                    value={cordonOptions.find((c) => c.name === form.tipoCordon)?.id || null}
                    onChange={(id) => {
                        const opt = cordonOptions.find((c) => c.id === id);
                        patchForm({
                            tipoCordon: opt?.name || '',
                            precioCordon: opt?.pricePerManija ?? form.precioCordon,
                        });
                    }}
                    searchable
                    clearable
                    nothingFoundMessage="Configure cordones en Catálogos del cotizador"
                />
                <NumberInput
                    label="Largo del cordón (cm)"
                    value={toInputNumber(form.largoCordon)}
                    onChange={(v) => patchForm({ largoCordon: v ?? 0 })}
                    hideControls
                    min={0}
                />
                <NumberInput
                    label="Precio por manija del cordón"
                    value={toInputNumber(form.precioCordon)}
                    onChange={(v) => patchForm({ precioCordon: v ?? 0 })}
                    hideControls
                    min={0}
                    prefix="$ "
                />
            </div>
        </Stack>
    );

    const renderStep5 = () => (
        <Stack gap="md">
            <Text size="sm" c="dimmed">Refuerzos y ventanillas (solo bolsa).</Text>
            {sectionTitle('Refuerzos')}
            <div className="cotizador-wizard-grid">
                <NumberInput
                    label="Número de refuerzos"
                    value={toInputNumber(form.numeroRefuerzos)}
                    onChange={(v) => patchForm({ numeroRefuerzos: v ?? 0 })}
                    hideControls
                    min={0}
                />
            </div>
            {sectionTitle('Ventanillas')}
            <div className="cotizador-wizard-grid">
                <NumberInput
                    label="Ancho ventanilla (cm)"
                    value={toInputNumber(form.anchoVentanilla)}
                    onChange={(v) => patchForm({ anchoVentanilla: v ?? 0 })}
                    hideControls
                    min={0}
                />
                <NumberInput
                    label="Largo ventanilla (cm)"
                    value={toInputNumber(form.largoVentanilla)}
                    onChange={(v) => patchForm({ largoVentanilla: v ?? 0 })}
                    hideControls
                    min={0}
                />
            </div>
        </Stack>
    );

    const renderStep6 = () => (
        <Stack gap="md">
            <Text size="sm" c="dimmed">Troquel y películas.</Text>
            <NumberInput
                label="Costo total del troquel"
                value={toInputNumber(form.precioTroquel)}
                onChange={(v) => patchForm({ precioTroquel: v ?? 0 })}
                hideControls
                min={0}
                prefix="$ "
            />
            <Checkbox
                label="Incluir películas"
                checked={Boolean(form.usaPeliculas)}
                onChange={(e) => patchForm({ usaPeliculas: e.currentTarget.checked })}
            />
        </Stack>
    );

    const renderStep7 = () => (
        <Stack gap="md">
            <Text size="sm" c="dimmed">
                Cantidades a cotizar. Marque la cantidad principal para resaltar en el resumen.
            </Text>
            <div className="cotizador-wizard-grid-qty">
                {(Array.isArray(form.quantities) ? form.quantities : []).map((qty, index) => (
                    <Stack key={index} gap="xs">
                        <NumberInput
                            label={`Cantidad ${index + 1}`}
                            value={toInputNumber(qty)}
                            onChange={(v) => {
                                const next = [...form.quantities];
                                next[index] = Number(v) || 0;
                                patchForm({ quantities: next });
                            }}
                            hideControls
                            min={0}
                            allowDecimal={false}
                            thousandSeparator="."
                            decimalSeparator=","
                        />
                        <Radio
                            checked={form.primaryQtyIndex === index}
                            onChange={() => patchForm({ primaryQtyIndex: index })}
                            label="Cantidad principal"
                            size="xs"
                        />
                    </Stack>
                ))}
            </div>
        </Stack>
    );

    const renderStep8 = () => (
        <Stack gap="md">
            <Text size="sm" c="dimmed">Procesos de máquina y contrato de servicios por unidad.</Text>
            {sectionTitle('Procesos')}
            <div className="cotizador-wizard-grid-servicios">
                {SERVICIO_OPTIONS.map(({ key, label }) => (
                    <Checkbox
                        key={key}
                        label={label}
                        checked={Boolean(form.servicios?.[key])}
                        onChange={(e) =>
                            patchForm({
                                servicios: { ...(form.servicios || {}), [key]: e.currentTarget.checked },
                            })
                        }
                    />
                ))}
            </div>
            {sectionTitle('Contrato de servicios')}
            <NumberInput
                label="Valor contrato servicios (por unidad)"
                value={toInputNumber(form.contratoServicios)}
                onChange={(v) => patchForm({ contratoServicios: v ?? 0 })}
                hideControls
                min={0}
                prefix="$ "
                thousandSeparator="."
                decimalSeparator=","
            />
        </Stack>
    );

    const renderStep9 = () => (
        <Stack gap="md">
            <Alert color="blue" title="Cómo se aplica el flete">
                <Text size="sm">
                    Primero se calcula un <b>flete base</b> con el área de la pieza
                    {' '}((largo × ancho) / cabida × factor). Luego existen dos opciones:
                    <b> Local</b> y <b>Nacional</b>. Usted elige cuál aplica
                    y solo ese valor entra al costo unitario, junto con materia prima, servicios y contrato.
                </Text>
            </Alert>

            <Radio.Group
                label="Tipo de flete"
                description="Local, nacional o sin flete"
                value={form.freightType}
                onChange={(v) => patchForm({ freightType: v || 'SinFlete' })}
            >
                <Group mt="xs">
                    {FREIGHT_OPTIONS.map((opt) => (
                        <Radio key={opt.value} value={opt.value} label={opt.label} />
                    ))}
                </Group>
            </Radio.Group>

            <Card withBorder p="md" className="glass-card">
                <Title order={5} c="white" mb="sm">Vista previa (pieza activa)</Title>
                <Table striped withTableBorder>
                    <Table.Tbody>
                        <Table.Tr>
                            <Table.Td>Área unitaria (m²)</Table.Td>
                            <Table.Td ta="right" ff="monospace">{freightPreview.area.toFixed(6)}</Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                            <Table.Td>Flete base (área × {freightPreview.relativo})</Table.Td>
                            <Table.Td ta="right" ff="monospace">${formatMoney(freightPreview.bx)}</Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                            <Table.Td>Flete local (× {freightPreview.multLocal})</Table.Td>
                            <Table.Td ta="right" ff="monospace" fw={form.freightType === 'Local' ? 700 : 400}>
                                ${formatMoney(freightPreview.by)}
                                {form.freightType === 'Local' ? ' ← aplica' : ''}
                            </Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                            <Table.Td>Flete nacional (× {freightPreview.multNacional})</Table.Td>
                            <Table.Td ta="right" ff="monospace" fw={form.freightType === 'Nacional' ? 700 : 400}>
                                ${formatMoney(freightPreview.bz)}
                                {form.freightType === 'Nacional' ? ' ← aplica' : ''}
                            </Table.Td>
                        </Table.Tr>
                        <Table.Tr>
                            <Table.Td fw={700}>Flete calculado ($/u)</Table.Td>
                            <Table.Td ta="right" fw={700} ff="monospace">
                                ${formatMoney(freightPreview.selected)}
                            </Table.Td>
                        </Table.Tr>
                    </Table.Tbody>
                </Table>
                {freightPreview.area <= 0 && (
                    <Alert color="yellow" mt="sm" title="El flete sale en $0">
                        Esta vista usa el largo, el ancho y la cabida de la pieza. Si el área está en 0, vuelva a Medidas y material y confirme esos tres datos. Con Nacional, el flete es área × 0,35 × 428.
                    </Alert>
                )}
                <Text size="xs" c="dimmed" mt="sm">
                    Factores editables en Ajustes → Catálogos del cotizador → Factores.
                    Si hay varias piezas, el cálculo suma el flete de cada una.
                </Text>
            </Card>

            <NumberInput
                label="Flete por unidad que entra al costo"
                description={`El cálculo da $${formatMoney(freightPreview.selected)} por unidad. Si el flete real es otro, escríbalo aquí (por ejemplo 90). Vacío usa el cálculo.`}
                value={toInputNumber(form.fleteManual)}
                onChange={(v) => patchForm({ fleteManual: v === '' || v === null || v === undefined ? '' : v })}
                hideControls
                min={0}
                decimalScale={2}
                decimalSeparator=","
                thousandSeparator="."
                prefix="$ "
                placeholder={formatMoney(freightPreview.selected)}
            />

            <Select
                label="Plazo de pago"
                description="Afecta el margen del precio de venta (no el costo de flete)"
                data={PLAZO_PAGO_OPTIONS}
                value={String(form.plazoPagoDias ?? 0)}
                onChange={(v) => patchForm({ plazoPagoDias: Number(v) || 0 })}
            />
        </Stack>
    );

    const renderStep10 = () => {
        const quoted = mergeTyped(form);
        const quoteLines = (quoted.pieces || []).map((p, i) => {
            const name = p.partName || `Pieza ${i + 1}`;
            const largo = pliegoToMeters(p.largoMm);
            const ancho = pliegoToMeters(p.anchoMm);
            const cabida = parseLocaleNumber(p.cabida);
            const precio = parseLocaleNumber(p.precioMaterialM2);
            return `${name}: ${largo || '—'} m × ${ancho || '—'} m, cabida ${cabida || '—'}, ${p.materialName || 'sin material'} a $${formatMoney(precio)}/m²`;
        });
        return (
        <Stack gap="md">
            <Text size="sm">
                Calcular usa estas medidas: {quoteLines.join(' · ') || 'todavía no hay medidas escritas.'}
            </Text>
            <Group>
                <Button leftSection={<IconCalculator size={16} />} onClick={() => calculate()}>
                    Calcular
                </Button>
                {calcResult?.isValid && (
                    <Button
                        color="green"
                        leftSection={<IconDeviceFloppy size={16} />}
                        onClick={() => save({ stay: true })}
                        loading={saveStatus === 'saving'}
                    >
                        Guardar cotización
                    </Button>
                )}
                {calcResult?.isValid && (
                    <Button
                        color="teal"
                        leftSection={<IconDownload size={16} />}
                        onClick={() => downloadForClient()}
                        loading={saveStatus === 'saving'}
                    >
                        Descargar para cliente
                    </Button>
                )}
                {(savedQuoteId || id) && (
                    <Button variant="light" onClick={() => navigate('/cotizador/guardadas')}>
                        Ir a guardadas
                    </Button>
                )}
            </Group>

            {calcResult?.results?.length > 0 && (
                <Text size="sm" c="dimmed">
                    Las tres opciones quedan siempre a la vista, con precio por unidad y total del pedido.
                    Pulse la que quiere marcar como sugerida en la cotización. Las otras dos también salen en el PDF.
                </Text>
            )}

            {saveStatus === 'saved' && (
                <Alert color="green">
                    Cotización guardada. Puede descargar la propuesta para enviársela al cliente
                    (se abre en el navegador: use Imprimir → Guardar como PDF).
                </Alert>
            )}
            {saveStatus === 'error' && (
                <Alert color="red">Error al guardar. Inténtelo de nuevo.</Alert>
            )}

            {Array.isArray(calcResult?.missingFields) && calcResult.missingFields.length > 0 && (
                <Alert color="yellow" title="No se puede calcular todavía">
                    {calcResult.missingFields.join(', ')}.
                </Alert>
            )}

            {calcResult?.results?.length > 0 && calcResult.results.every((r) => Number(r.precioAl3) === 0) && (
                <Alert color="red" title="Precios de venta en $0">
                    Reinicie el backend y pulse Calcular de nuevo. Suele deberse al factor
                    «Base plazo pago» mal cargado en catálogos (debe ser 30, no 0.04).
                </Alert>
            )}

            {primaryResult?.breakdown && Number(primaryResult.breakdown.material) === 0 && (
                <Alert color="red" title="Material en $0">
                    Con pliego <b>0,35 × 0,40</b>, cabida <b>1</b> y precio <b>$1.900/m²</b> el material debe ser
                    ≈ <b>$266 /u</b> ((0,35×0,40)/1×1900).
                    Vuelva al paso Medidas, confirme metros (no mm) y pulse <b>Calcular</b> otra vez.
                    Si el precio quedó en 0, seleccione de nuevo el material en el catálogo.
                </Alert>
            )}

            {calcResult?.results?.length > 0 && (
                <>
                    <Title order={5} c="white">Tres opciones de precio</Title>
                    <Card withBorder p={0} className="glass-card" style={{ overflow: 'auto' }}>
                        <Table highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Cantidad</Table.Th>
                                    {[
                                        { id: 'Al15', label: 'Al 1.5', hint: 'el más bajo' },
                                        { id: 'Al3', label: 'Al 3', hint: 'el habitual' },
                                        { id: 'Al5', label: 'Al 5', hint: 'el más alto' },
                                    ].map((tier) => (
                                        <Table.Th key={tier.id} ta="right" style={{ background: clientTier === tier.id ? 'rgba(32, 201, 151, 0.18)' : undefined }}>
                                            <Stack gap={2} align="flex-end">
                                                <Button
                                                    size="compact-sm"
                                                    variant={clientTier === tier.id ? 'filled' : 'light'}
                                                    color={clientTier === tier.id ? 'teal' : 'gray'}
                                                    onClick={() => setClientTier(tier.id)}
                                                >
                                                    {tier.label}
                                                    {clientTier === tier.id ? ' · se envía' : ''}
                                                </Button>
                                                <Text size="xs" c="dimmed">{tier.hint}</Text>
                                            </Stack>
                                        </Table.Th>
                                    ))}
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {(Array.isArray(calcResult.results) ? calcResult.results : []).map((r) => {
                                    const qty = Number(r.quantity) || 0;
                                    const options = [
                                        { id: 'Al15', unit: Number(r.precioAl15 ?? r.PrecioAl15) || 0 },
                                        { id: 'Al3', unit: Number(r.precioAl3 ?? r.PrecioAl3) || 0 },
                                        { id: 'Al5', unit: Number(r.precioAl5 ?? r.PrecioAl5) || 0 },
                                    ];
                                    return (
                                        <Table.Tr key={r.quantity}>
                                            <Table.Td>
                                                <Text fw={700}>{qty.toLocaleString()} u</Text>
                                                {r.isPrimary && <Badge size="xs" color="blue">Referencia</Badge>}
                                                <Text size="xs" c="dimmed">Costo interno ${formatMoney(r.costoTotalUnitario)}</Text>
                                            </Table.Td>
                                            {options.map((opt) => (
                                                <Table.Td
                                                    key={opt.id}
                                                    ta="right"
                                                    style={{ background: clientTier === opt.id ? 'rgba(32, 201, 151, 0.12)' : undefined, cursor: 'pointer' }}
                                                    onClick={() => setClientTier(opt.id)}
                                                >
                                                    <Text fw={700}>${formatMoney(opt.unit)}</Text>
                                                    <Text size="xs" c="dimmed">por unidad</Text>
                                                    <Text size="sm">Total ${formatMoney(opt.unit * qty)}</Text>
                                                </Table.Td>
                                            ))}
                                        </Table.Tr>
                                    );
                                })}
                            </Table.Tbody>
                        </Table>
                    </Card>
                </>
            )}

            {primaryResult?.breakdown && (
                <>
                    <Title order={5} c="white">
                        Desglose — cantidad principal ({Number(primaryResult.quantity).toLocaleString()} u)
                    </Title>
                    <Card withBorder p={0} className="glass-card" style={{ overflow: 'hidden' }}>
                        <Table striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Concepto</Table.Th>
                                    <Table.Th ta="right">Valor ($/u)</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {breakdownRows(primaryResult.breakdown).map((row) => (
                                    <Table.Tr key={row.label}>
                                        <Table.Td>{row.label}</Table.Td>
                                        <Table.Td ta="right" ff="monospace">
                                            {row.display != null ? row.display : formatMoney(row.value)}
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                                <Table.Tr>
                                    <Table.Td fw={700}>Costo total unitario</Table.Td>
                                    <Table.Td ta="right" fw={700} ff="monospace">
                                        {formatMoney(primaryResult.costoTotalUnitario)}
                                    </Table.Td>
                                </Table.Tr>
                                {[
                                    { id: 'Al15', label: 'Al 1.5' },
                                    { id: 'Al3', label: 'Al 3' },
                                    { id: 'Al5', label: 'Al 5' },
                                ].map((tier) => {
                                    const unit = tier.id === 'Al15'
                                        ? Number(primaryResult.precioAl15 ?? primaryResult.PrecioAl15) || 0
                                        : tier.id === 'Al5'
                                            ? Number(primaryResult.precioAl5 ?? primaryResult.PrecioAl5) || 0
                                            : Number(primaryResult.precioAl3 ?? primaryResult.PrecioAl3) || 0;
                                    const selected = clientTier === tier.id;
                                    return (
                                        <Table.Tr key={tier.id} style={{ background: selected ? 'rgba(32, 201, 151, 0.12)' : undefined }}>
                                            <Table.Td fw={selected ? 700 : 500}>
                                                {tier.label}{selected ? ' — se envía al cliente' : ''}
                                            </Table.Td>
                                            <Table.Td ta="right" ff="monospace">
                                                {formatMoney(unit)} /u · total {formatMoney(unit * Number(primaryResult.quantity))}
                                            </Table.Td>
                                        </Table.Tr>
                                    );
                                })}
                            </Table.Tbody>
                        </Table>
                    </Card>
                </>
            )}
        </Stack>
        );
    };

    const renderStep = () => {
        switch (currentStepId) {
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            case 4: return renderStep4();
            case 5: return renderStep5();
            case 6: return renderStep6();
            case 7: return renderStep7();
            case 8: return renderStep8();
            case 9: return renderStep9();
            case 10: return renderStep10();
            default: return null;
        }
    };

    if (loadingQuote) {
        return (
            <Stack p="md" align="center" justify="center" mih={320}>
                <Loader />
                <Text c="dimmed">Cargando cotización…</Text>
            </Stack>
        );
    }

    return (
        <Stack p="md" gap="lg" className="cotizador-wizard">
            <Group justify="space-between">
                <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/cotizador')}>
                    Volver
                </Button>
                <Title order={3} c="white">{id ? 'Editar' : 'Nueva'} cotización</Title>
            </Group>
            <Card className="glass-card cotizador-wizard-card">
                <div className="cotizador-wizard-stepper">
                    <Stepper active={active} onStepClick={handleStepClick} size="sm" iconSize={28}>
                        {stepIds.map((sid, index) => (
                            <Stepper.Step
                                key={sid}
                                label={`Paso ${index + 1}`}
                                description={STEP_LABELS[sid]}
                            />
                        ))}
                    </Stepper>
                </div>
                <Stack mt="md" gap="md">
                    <Title order={4} c="white">{STEP_LABELS[currentStepId]}</Title>
                    {renderStep()}
                </Stack>
                <Group justify="space-between" mt="md">
                    <Button variant="default" disabled={active === 0} onClick={goPrev}>
                        Anterior
                    </Button>
                    <Button disabled={active >= stepIds.length - 1} onClick={goNext}>
                        Siguiente
                    </Button>
                </Group>
            </Card>
        </Stack>
    );
}
