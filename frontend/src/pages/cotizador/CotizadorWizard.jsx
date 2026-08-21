import { useState, useEffect } from 'react';
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
import { IconArrowLeft, IconCalculator, IconDeviceFloppy, IconBuildingStore } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../utils/api';
import { notifications } from '@mantine/notifications';
import { getCurrentUser } from '../../utils/permissions';
import {
    BARNIZ_OPTIONS,
    FREIGHT_OPTIONS,
    SERVICIO_OPTIONS,
    STEP_LABELS,
    STEPS_BOLSA,
    STEPS_CAJA,
    buildCalculatePayload,
    breakdownRows,
    createInitialForm,
    fetchMachineOptions,
    fetchMaterialOptions,
    fetchMicroOptions,
    fetchPlanchaOptions,
    formatMoney,
    getPrimaryResult,
    toInputNumber,
} from './cotizadorHelpers';
import './CotizadorWizard.css';

export default function CotizadorWizard() {
    const navigate = useNavigate();
    const { id, orderId } = useParams();
    const user = getCurrentUser();
    const [active, setActive] = useState(0);
    const [calcResult, setCalcResult] = useState(null);
    const [saveStatus, setSaveStatus] = useState('idle');
    const [loadingQuote, setLoadingQuote] = useState(Boolean(id));
    const [clienteSuggestions, setClienteSuggestions] = useState([]);
    const [clienteSuggestLoading, setClienteSuggestLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [materialOptions, setMaterialOptions] = useState([]);
    const [machineOptions, setMachineOptions] = useState([]);
    const [planchaOptions, setPlanchaOptions] = useState([]);
    const [microOptions, setMicroOptions] = useState([]);
    const [catalogsLoading, setCatalogsLoading] = useState(true);
    const [form, setForm] = useState(() => createInitialForm(user));

    const stepIds = form.productType === 'Bolsa' ? STEPS_BOLSA : STEPS_CAJA;
    const currentStepId = stepIds[active] ?? 10;
    const isBolsa = form.productType === 'Bolsa';
    const primaryResult = getPrimaryResult(calcResult);

    useEffect(() => {
        let cancelled = false;
        const loadCatalogs = async () => {
            setCatalogsLoading(true);
            try {
                const [materials, machines, planchas, micros] = await Promise.all([
                    fetchMaterialOptions(),
                    fetchMachineOptions(),
                    fetchPlanchaOptions(),
                    fetchMicroOptions(),
                ]);
                if (!cancelled) {
                    setMaterialOptions(materials);
                    setMachineOptions(machines);
                    setPlanchaOptions(planchas);
                    setMicroOptions(micros);
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
                    setForm((prev) => ({ ...prev, ...parsed }));
                }
                if (quote.calculationResultJson) {
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
        const term = (form.clientName || '').trim();
        if (term.length < 1) {
            setClienteSuggestions([]);
            return;
        }
        const handle = setTimeout(async () => {
            setClienteSuggestLoading(true);
            try {
                const rows = await api.get(
                    `/production/orders/clients-suggestions?q=${encodeURIComponent(term)}&limit=30`
                );
                setClienteSuggestions(Array.isArray(rows) ? rows : []);
            } catch {
                setClienteSuggestions([]);
            } finally {
                setClienteSuggestLoading(false);
            }
        }, 320);
        return () => clearTimeout(handle);
    }, [form.clientName]);

    const patchForm = (patch) => setForm((prev) => ({ ...prev, ...patch }));

    const validateStep1 = () => {
        const newErrors = {};
        if (!form.clientName?.trim()) newErrors.clientName = 'El cliente es obligatorio';
        if (!form.workName?.trim()) newErrors.workName = 'El trabajo es obligatorio';
        if (!form.partName?.trim()) newErrors.partName = 'El nombre de la pieza es obligatorio';
        setErrors((prev) => {
            const next = { ...prev };
            delete next.clientName;
            delete next.workName;
            delete next.partName;
            return { ...next, ...newErrors };
        });
        return Object.keys(newErrors).length === 0;
    };

    const validateStep2 = () => {
        const newErrors = {};
        const largo = Number(form.largoMm);
        const ancho = Number(form.anchoMm);
        const cabida = Number(form.cabida);
        const precio = Number(form.precioMaterialM2);
        if (!largo || largo <= 0) newErrors.largoMm = 'Ingrese el largo en mm';
        if (!ancho || ancho <= 0) newErrors.anchoMm = 'Ingrese el ancho en mm';
        if (!cabida || cabida <= 0) newErrors.cabida = 'La cabida es obligatoria';
        if (!form.materialId) newErrors.materialId = 'Seleccione un material';
        if (!precio || precio <= 0) newErrors.precioMaterialM2 = 'Ingrese el precio por m²';
        setErrors((prev) => {
            const next = { ...prev };
            delete next.largoMm;
            delete next.anchoMm;
            delete next.cabida;
            delete next.materialId;
            delete next.precioMaterialM2;
            return { ...next, ...newErrors };
        });
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
                title: 'Campos obligatorios',
                message: 'Complete los campos marcados antes de continuar.',
                color: 'red',
            });
            return;
        }
        setActive((a) => Math.min(stepIds.length - 1, a + 1));
    };

    const handleStepClick = (stepIndex) => {
        if (stepIndex <= active) {
            setActive(stepIndex);
            return;
        }
        for (let i = active; i < stepIndex; i++) {
            const sid = stepIds[i];
            if (!validateStep(sid)) {
                notifications.show({
                    title: 'Campos obligatorios',
                    message: `Complete el paso ${sid} antes de continuar.`,
                    color: 'red',
                });
                setActive(i);
                return;
            }
        }
        setActive(stepIndex);
    };

    const calculate = async () => {
        try {
            const data = await api.post('/production/cotizador/calculate', buildCalculatePayload(form, isBolsa));
            setCalcResult(data);
            if (!data?.isValid) {
                notifications.show({
                    title: 'Campos pendientes',
                    message: (data?.missingFields || []).join(', '),
                    color: 'yellow',
                });
            }
        } catch (err) {
            notifications.show({ title: 'Error al calcular', message: err.message, color: 'red' });
        }
    };

    const save = async () => {
        if (!validateStep1()) {
            notifications.show({
                title: 'Campos obligatorios',
                message: 'Cliente, trabajo y nombre de pieza son obligatorios.',
                color: 'red',
            });
            setActive(stepIds.indexOf(1));
            return;
        }
        if (!calcResult?.isValid) {
            await calculate();
            return;
        }
        setSaveStatus('saving');
        try {
            const payload = {
                sourceType: orderId ? 'FromOT' : 'Manual',
                productionOrderId: orderId || null,
                productType: form.productType,
                clientName: form.clientName,
                sellerName: form.sellerName,
                workName: form.workName,
                partName: form.partName,
                productName: form.workName,
                freightType: form.freightType,
                quantities: form.quantities,
                primaryQuantityIndex: form.primaryQtyIndex,
                formDataJson: JSON.stringify(form),
                calculationResult: calcResult,
            };
            if (id) await api.put(`/production/cotizador/${id}`, payload);
            else await api.post('/production/cotizador', payload);
            setSaveStatus('saved');
            notifications.show({ title: 'Guardado', message: 'Cotización almacenada', color: 'green' });
            navigate('/cotizador/guardadas');
        } catch (err) {
            setSaveStatus('error');
            notifications.show({ title: 'Error', message: err.message || 'No se pudo guardar', color: 'red' });
        }
    };

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
                placeholder="Escriba para buscar clientes guardados…"
                value={form.clientName}
                onChange={(val) => {
                    patchForm({ clientName: val });
                    if (errors.clientName) setErrors((prev) => ({ ...prev, clientName: null }));
                }}
                data={clienteSuggestions}
                limit={30}
                filter={({ options }) => options}
                maxDropdownHeight={280}
                required
                error={errors.clientName}
                leftSection={<IconBuildingStore size={16} />}
                rightSection={clienteSuggestLoading ? <Loader size={16} /> : null}
                comboboxProps={{ withinPortal: true, position: 'bottom-start' }}
            />
            <TextInput
                label="Trabajo"
                value={form.workName}
                onChange={(e) => {
                    patchForm({ workName: e.target.value });
                    if (errors.workName) setErrors((prev) => ({ ...prev, workName: null }));
                }}
                required
                error={errors.workName}
            />
            <TextInput
                label="Nombre pieza"
                value={form.partName}
                onChange={(e) => {
                    patchForm({ partName: e.target.value });
                    if (errors.partName) setErrors((prev) => ({ ...prev, partName: null }));
                }}
                required
                error={errors.partName}
            />
        </div>
    );

    const renderStep2 = () => (
        <Stack gap="md">
            <Text size="sm" c="dimmed">
                Seleccione las medidas del pliego en milímetros, la cabida y el material del papel / cartón.
            </Text>
            <div className="cotizador-wizard-grid">
                <NumberInput
                    label="Medida del pliego — Largo (mm)"
                    value={toInputNumber(form.largoMm)}
                    onChange={(v) => {
                        patchForm({ largoMm: v });
                        if (errors.largoMm) setErrors((prev) => ({ ...prev, largoMm: null }));
                    }}
                    hideControls
                    min={0}
                    required
                    error={errors.largoMm}
                />
                <NumberInput
                    label="Medida del pliego — Ancho (mm)"
                    value={toInputNumber(form.anchoMm)}
                    onChange={(v) => {
                        patchForm({ anchoMm: v });
                        if (errors.anchoMm) setErrors((prev) => ({ ...prev, anchoMm: null }));
                    }}
                    hideControls
                    min={0}
                    required
                    error={errors.anchoMm}
                />
                <NumberInput
                    label="Cabida"
                    value={toInputNumber(form.cabida)}
                    onChange={(v) => {
                        patchForm({ cabida: v });
                        if (errors.cabida) setErrors((prev) => ({ ...prev, cabida: null }));
                    }}
                    hideControls
                    min={1}
                    required
                    error={errors.cabida}
                />
                <Select
                    label="Nombre del material"
                    placeholder={catalogsLoading ? 'Cargando…' : 'Seleccione un material'}
                    data={materialOptions.map((m) => ({ value: m.id, label: m.name }))}
                    value={form.materialId}
                    onChange={(matId) => {
                        const mat = materialOptions.find((m) => m.id === matId);
                        patchForm({
                            materialId: matId,
                            materialName: mat?.name || '',
                            precioMaterialM2: mat?.pricePerM2 > 0 ? mat.pricePerM2 : form.precioMaterialM2,
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
                    value={toInputNumber(form.precioMaterialM2)}
                    onChange={(v) => {
                        patchForm({ precioMaterialM2: v });
                        if (errors.precioMaterialM2) setErrors((prev) => ({ ...prev, precioMaterialM2: null }));
                    }}
                    hideControls
                    min={0}
                    prefix="$ "
                    required
                    error={errors.precioMaterialM2}
                />
            </div>
        </Stack>
    );

    const renderStep3 = () => (
        <Stack gap="md">
            <Text size="sm" c="dimmed">Impresión, barniz y terminados para la cotización.</Text>
            {sectionTitle('Impresión')}
            <div className="cotizador-wizard-grid">
                <Select
                    label="Máquina impresora"
                    placeholder="Seleccione impresora"
                    data={machineOptions.map((m) => ({ value: m.id, label: m.name }))}
                    value={form.impresoraMachineId}
                    onChange={(machineId) => {
                        const machine = machineOptions.find((m) => m.id === machineId);
                        patchForm({ impresoraMachineId: machineId, impresoraName: machine?.name || '' });
                    }}
                    searchable
                    nothingFoundMessage="Configure impresoras en catálogos"
                />
                <NumberInput
                    label="Número de planchas"
                    value={toInputNumber(form.numeroPlanchas)}
                    onChange={(v) => patchForm({ numeroPlanchas: v ?? 0 })}
                    hideControls
                    min={1}
                />
                <Select
                    label="Nombre de la plancha"
                    placeholder="Seleccione plancha"
                    data={planchaOptions.map((p) => ({ value: p.id, label: p.name }))}
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
                    onChange={(v) => patchForm({ precioPlancha: v ?? 0 })}
                    hideControls
                    min={0}
                    prefix="$ "
                    disabled={planchaOptions.length > 0 && Boolean(form.nombrePlancha)}
                />
                <NumberInput
                    label="Cubrimiento (%)"
                    value={toInputNumber(form.cubrimiento)}
                    onChange={(v) => patchForm({ cubrimiento: v ?? 0 })}
                    hideControls
                    min={0}
                    max={100}
                />
                <NumberInput
                    label="Número de veces a imprimir"
                    value={toInputNumber(form.vecesImprimir)}
                    onChange={(v) => patchForm({ vecesImprimir: v ?? 1 })}
                    hideControls
                    min={1}
                />
            </div>
            {sectionTitle('Barniz')}
            <div className="cotizador-wizard-grid">
                <Select
                    label="Tipo de barniz"
                    placeholder="Seleccione tipo"
                    data={BARNIZ_OPTIONS.map((b) => ({ value: b.value, label: b.label }))}
                    value={form.tipoBarniz}
                    onChange={(tipo) => {
                        const opt = BARNIZ_OPTIONS.find((b) => b.value === tipo);
                        patchForm({ tipoBarniz: tipo || '', factorBarniz: opt?.factor ?? form.factorBarniz });
                    }}
                    clearable
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
                <TextInput
                    label="Nombre del terminado"
                    placeholder="Ej: Laminado mate"
                    value={form.terminadoNombre}
                    onChange={(e) => patchForm({ terminadoNombre: e.target.value })}
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
                    data={microOptions.map((m) => ({ value: m.id, label: m.name }))}
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
                <TextInput
                    label="Tipo de cordón"
                    placeholder="Ej: Cordón negro 3mm"
                    value={form.tipoCordon}
                    onChange={(e) => patchForm({ tipoCordon: e.target.value })}
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
            <Text size="sm" c="dimmed">Costo total del troquel para repartir entre unidades.</Text>
            <NumberInput
                label="Costo total del troquel"
                value={toInputNumber(form.precioTroquel)}
                onChange={(v) => patchForm({ precioTroquel: v ?? 0 })}
                hideControls
                min={0}
                prefix="$ "
            />
        </Stack>
    );

    const renderStep7 = () => (
        <Stack gap="md">
            <Text size="sm" c="dimmed">
                Cantidades a cotizar. Marque la cantidad principal para resaltar en el resumen.
            </Text>
            <div className="cotizador-wizard-grid-qty">
                {form.quantities.map((qty, index) => (
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
                            thousandSeparator="."
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
                        checked={form.servicios[key]}
                        onChange={(e) =>
                            patchForm({
                                servicios: { ...form.servicios, [key]: e.currentTarget.checked },
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
            />
        </Stack>
    );

    const renderStep9 = () => (
        <Stack gap="md">
            <Text size="sm" c="dimmed">Tipo de flete incluido en el costo unitario.</Text>
            <Select
                label="Tipo de flete"
                data={FREIGHT_OPTIONS}
                value={form.freightType}
                onChange={(v) => patchForm({ freightType: v || 'SinFlete' })}
            />
        </Stack>
    );

    const renderStep10 = () => (
        <Stack gap="md">
            <Group>
                <Button leftSection={<IconCalculator size={16} />} onClick={calculate}>
                    Calcular
                </Button>
                {calcResult?.isValid && (
                    <Button
                        color="green"
                        leftSection={<IconDeviceFloppy size={16} />}
                        onClick={save}
                        loading={saveStatus === 'saving'}
                    >
                        Guardar cotización
                    </Button>
                )}
            </Group>

            {saveStatus === 'saved' && (
                <Alert color="green">Cotización guardada correctamente.</Alert>
            )}
            {saveStatus === 'error' && (
                <Alert color="red">Error al guardar. Inténtelo de nuevo.</Alert>
            )}

            {calcResult?.missingFields?.length > 0 && (
                <Alert color="yellow" title="Faltan datos para calcular">
                    {calcResult.missingFields.join(', ')}
                </Alert>
            )}

            {calcResult?.results?.length > 0 && (
                <>
                    <Title order={5} c="white">Precios por cantidad</Title>
                    <div className="cotizador-wizard-grid-resultados">
                        {calcResult.results.map((r) => (
                            <Card key={r.quantity} withBorder p="sm" className="glass-card">
                                <Group justify="space-between" mb="xs">
                                    <Text fw={700}>{Number(r.quantity).toLocaleString()} u</Text>
                                    {r.isPrimary && <Badge color="blue">Principal</Badge>}
                                </Group>
                                <Text size="sm">Costo/u: ${formatMoney(r.costoTotalUnitario)}</Text>
                                <Text size="sm" c="dimmed">Al 1.5: ${formatMoney(r.precioAl15)}</Text>
                                <Text size="sm" c="teal">Al 3: ${formatMoney(r.precioAl3)}</Text>
                                <Text size="sm" c="dimmed">Al 5: ${formatMoney(r.precioAl5)}</Text>
                            </Card>
                        ))}
                    </div>
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
                                            {formatMoney(row.value)}
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                                <Table.Tr>
                                    <Table.Td fw={700}>Costo total unitario</Table.Td>
                                    <Table.Td ta="right" fw={700} ff="monospace">
                                        {formatMoney(primaryResult.costoTotalUnitario)}
                                    </Table.Td>
                                </Table.Tr>
                            </Table.Tbody>
                        </Table>
                    </Card>
                </>
            )}
        </Stack>
    );

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
                    <Button variant="default" disabled={active === 0} onClick={() => setActive((a) => Math.max(0, a - 1))}>
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
