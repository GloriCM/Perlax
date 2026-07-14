import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Badge,
    Button,
    Card,
    Group,
    Menu,
    Modal,
    NumberInput,
    ScrollArea,
    Stack,
    Table,
    Text,
    TextInput,
    Title
} from '@mantine/core';
import { IconCheck, IconDotsVertical, IconMail, IconPencil, IconPrinter, IconSearch, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../utils/api';

const getCurrentExecutiveName = () => {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
        return fullName || user?.username || 'Ejecutivo de Cuenta';
    } catch {
        return 'Ejecutivo de Cuenta';
    }
};

const formatCurrency = (value) =>
    Number(value || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('es-CO');
};

const buildReceiptHtml = (order) => {
    const items = order?.items || [];
    const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.approvedUnitPrice || 0)), 0);
    const iva = Math.round(subtotal * 0.19);
    const total = subtotal + iva;
    const executiveName = getCurrentExecutiveName();

    const rowsHtml = items.map((item, index) => {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.approvedUnitPrice || 0);
        const lineTotal = quantity * unitPrice;
        return `
            <tr>
                <td>${index + 1}</td>
                <td>${item.productName || '-'}</td>
                <td>${formatCurrency(quantity)}</td>
                <td>$ ${formatCurrency(unitPrice)}</td>
                <td>$ ${formatCurrency(lineTotal)}</td>
            </tr>
        `;
    }).join('');

    return `
<!doctype html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <title>Nota de Pedido ${order.orderNumber || ''}</title>
    <style>
        body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
        .logo { width: 210px; object-fit: contain; }
        .title-wrap { text-align: center; flex: 1; }
        .title-wrap h1 { margin: 0; font-size: 40px; color: #dc2626; font-weight: 700; }
        .title-wrap h2 { margin: 0 0 8px 0; font-size: 42px; font-weight: 700; color: #111827; }
        .meta-right { text-align: right; font-size: 24px; line-height: 1.4; }
        .meta-grid { border-top: 2px solid #1e3a5f; border-bottom: 2px solid #1e3a5f; padding: 12px 0; margin: 14px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; font-size: 22px; }
        .meta-row { display: flex; gap: 8px; }
        .meta-label { min-width: 190px; font-weight: 700; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 21px; }
        thead th { background: #1e4b7a; color: white; padding: 10px 8px; text-align: left; }
        tbody td { border-bottom: 1px solid #d1d5db; padding: 9px 8px; }
        .num { text-align: right; }
        .totals { margin-left: auto; margin-top: 12px; width: 420px; font-size: 22px; }
        .totals-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #cbd5e1; }
        .totals-row.total { font-size: 32px; font-weight: 700; color: #1e3a5f; border-bottom: none; }
        .notes { margin-top: 28px; font-size: 20px; line-height: 1.35; }
        .signatures { margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: end; }
        .signature-box { text-align: center; }
        .signature-line { border-top: 1px solid #334155; margin-bottom: 8px; height: 24px; }
        .signature-name { font-size: 22px; font-weight: 700; }
        .signature-role { font-size: 18px; color: #475569; }
    </style>
</head>
<body>
    <div class="header">
        <img id="company-logo" src="" alt="Aleph" class="logo" />
        <div class="title-wrap">
            <h2>NOTA DE PEDIDO</h2>
            <h1>N° ${order.orderNumber || '-'}</h1>
        </div>
        <div class="meta-right">
            <div>Código: FO CO 04</div>
            <div>Versión 1</div>
        </div>
    </div>

    <div class="meta-grid">
        <div class="meta-row"><div class="meta-label">Cliente</div><div>${order.clientName || '-'}</div></div>
        <div class="meta-row"><div class="meta-label">Fecha de Pedido</div><div>${formatDate(order.orderDate)}</div></div>
        <div class="meta-row"><div class="meta-label">Dirección</div><div>-</div></div>
        <div class="meta-row"><div class="meta-label">Fecha de Entrega</div><div>${formatDate(order.agreedDeliveryDate)}</div></div>
        <div class="meta-row"><div class="meta-label">Crédito (días)</div><div>-</div></div>
        <div class="meta-row"><div class="meta-label">Orden de Compra</div><div>${order.purchaseOrderNumber || '-'}</div></div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 90px;">Código ID</th>
                <th>Nombre o referencia</th>
                <th class="num" style="width: 150px;">Cantidad</th>
                <th class="num" style="width: 190px;">Precio aprob.</th>
                <th class="num" style="width: 180px;">Valor Total</th>
            </tr>
        </thead>
        <tbody>
            ${rowsHtml}
        </tbody>
    </table>

    <div class="totals">
        <div class="totals-row"><span>Subtotal</span><strong>$ ${formatCurrency(subtotal)}</strong></div>
        <div class="totals-row"><span>IVA 19%</span><strong>$ ${formatCurrency(iva)}</strong></div>
        <div class="totals-row total"><span>Total Pedido</span><span>$ ${formatCurrency(total)}</span></div>
    </div>

    <div class="notes">
        SOLICITAMOS QUE A PARTIR DE LA FECHA LOS ANTICIPOS CORRESPONDIENTES AL 50% DEL TRABAJO SEAN REALIZADOS A LA SIGUIENTE ENTIDAD FINANCIERA.
    </div>

    <div class="signatures">
        <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-name">${executiveName}</div>
            <div class="signature-role">Ejecutivo de Cuenta</div>
        </div>
        <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-name">Firma del Cliente</div>
            <div class="signature-role">&nbsp;</div>
        </div>
    </div>
</body>
</html>
    `;
};

export default function InformePedidos() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [search, setSearch] = useState('');
    const [approvalModal, setApprovalModal] = useState({ opened: false, orderId: null });
    const [approvalRows, setApprovalRows] = useState([]);

    const loadLogoDataUrl = async () => {
        try {
            const response = await fetch('/empresa-logo.jpeg', { cache: 'no-store' });
            if (!response.ok) return '';
            const blob = await response.blob();
            return await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
                reader.readAsDataURL(blob);
            });
        } catch {
            return '';
        }
    };

    const openReceiptPreview = async (orderId, triggerMail = false) => {
        let order = null;
        try {
            order = await api.get(`/production/customer-orders/${orderId}`);
        } catch {
            notifications.show({
                title: 'Pedido no encontrado',
                message: 'No se pudo generar el formato de nota para este pedido.',
                color: 'yellow'
            });
            return;
        }
        if (!order) return;

        const receiptWindow = window.open('', '_blank', 'width=1200,height=900');
        if (!receiptWindow) {
            notifications.show({
                title: 'Ventana bloqueada',
                message: 'Permite ventanas emergentes para generar la nota de pedido.',
                color: 'yellow'
            });
            return;
        }

        const logoDataUrl = await loadLogoDataUrl();
        receiptWindow.document.open();
        receiptWindow.document.write(buildReceiptHtml(order));
        receiptWindow.document.close();

        const logoElement = receiptWindow.document.getElementById('company-logo');
        const logoCandidates = [
            logoDataUrl,
            `${window.location.origin}/empresa-logo.jpeg`,
            `${window.location.origin}/empresa-logo.png`,
            `${window.location.origin}/Logo Aleph (fondo oscuro).png`
        ].filter(Boolean);

        const setLogoWithFallback = () => new Promise((resolve) => {
            if (!logoElement || logoCandidates.length === 0) {
                resolve();
                return;
            }
            let idx = 0;
            const tryNext = () => {
                if (idx >= logoCandidates.length) {
                    resolve();
                    return;
                }
                const candidate = logoCandidates[idx++];
                logoElement.onload = () => resolve();
                logoElement.onerror = tryNext;
                logoElement.src = candidate;
            };
            tryNext();
        });

        if (triggerMail) {
            const subject = encodeURIComponent(`Nota de pedido ${order.orderNumber || ''}`);
            const body = encodeURIComponent(`Adjunto nota de pedido ${order.orderNumber || ''}.`);
            window.location.href = `mailto:?subject=${subject}&body=${body}`;
            return;
        }

        await setLogoWithFallback();
        receiptWindow.focus();
        receiptWindow.onafterprint = () => {
            try { receiptWindow.close(); } catch { }
        };
        receiptWindow.print();
    };

    const fetchRows = async () => {
        try {
            setLoading(true);
            const apiRows = await api.get('/production/customer-orders');
            setRows(Array.isArray(apiRows) ? apiRows : []);
        } catch (error) {
            notifications.show({
                title: 'Error cargando pedidos',
                message: error?.message || 'No se pudo consultar el informe.',
                color: 'red'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRows();
    }, []);

    const filteredRows = useMemo(() => rows.filter(item =>
        (item.orderNumber || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.clientName || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.productName || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.referenceName || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.purchaseOrderNumber || '').toLowerCase().includes(search.toLowerCase())
    ), [rows, search]);

    const openApprovalModal = async (orderId) => {
        try {
            const order = await api.get(`/production/customer-orders/${orderId}`);
            const approvalData = (order?.items || []).map(item => ({
                orderPartId: item.orderPartId,
                productName: item.productName,
                referenceName: item.referenceName,
                quantity: item.quantity,
                approvedUnitPrice: Number(item.approvedUnitPrice || 0)
            }));
            setApprovalRows(approvalData);
            setApprovalModal({ opened: true, orderId });
        } catch (error) {
            notifications.show({
                title: 'No se pudo abrir aprobación',
                message: error?.message || 'Error consultando el pedido.',
                color: 'red'
            });
        }
    };

    const submitApproval = async () => {
        const hasInvalid = approvalRows.some(item => item.approvedUnitPrice == null || item.approvedUnitPrice < 0);
        if (hasInvalid) {
            notifications.show({
                title: 'Precios incompletos',
                message: 'Todos los items deben tener PV unitario mayor o igual a cero.',
                color: 'yellow'
            });
            return;
        }

        try {
            await api.put(`/production/customer-orders/${approvalModal.orderId}/approve`, {
                items: approvalRows.map(item => ({
                    orderPartId: item.orderPartId,
                    approvedUnitPrice: Number(item.approvedUnitPrice || 0)
                }))
            });
            notifications.show({
                title: 'Pedido aprobado',
                message: 'El pedido ahora queda disponible para producción y facturación.',
                color: 'teal'
            });
            setApprovalModal({ opened: false, orderId: null });
            setApprovalRows([]);
            fetchRows();
        } catch (error) {
            notifications.show({
                title: 'Error aprobando',
                message: error?.message || 'No se pudo aprobar el pedido.',
                color: 'red'
            });
        }
    };

    const grouped = useMemo(() => {
        const map = new Map();
        for (const row of filteredRows) {
            if (!map.has(row.id)) map.set(row.id, []);
            map.get(row.id).push(row);
        }
        return Array.from(map.values()).flat();
    }, [filteredRows]);

    return (
        <Stack gap="lg" p="md">
            <Group justify="space-between">
                <Stack gap={2}>
                    <Title order={2} c="white">Informe de Pedidos</Title>
                    <Text c="dimmed" size="sm">Listado de pedidos elaborados parcial o totalmente.</Text>
                </Stack>
                <Group>
                    <Button onClick={() => navigate('/pedidos/nuevo')}>Nuevo pedido</Button>
                    <Button variant="light" color="red" leftSection={<IconX size={16} />} onClick={() => navigate('/')}>
                        Cerrar
                    </Button>
                </Group>
            </Group>

            <Card className="glass-card">
                <TextInput
                    placeholder="Buscar por pedido, cliente, producto, referencia u OC..."
                    leftSection={<IconSearch size={16} />}
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    mb="md"
                />

                <ScrollArea h={620}>
                    <Table stickyHeader highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Pedido</Table.Th>
                                <Table.Th>No. Pedido</Table.Th>
                                <Table.Th>Fecha de pedido</Table.Th>
                                <Table.Th>Fecha pactada</Table.Th>
                                <Table.Th>Cliente</Table.Th>
                                <Table.Th>Nombre del producto</Table.Th>
                                <Table.Th>Referencia</Table.Th>
                                <Table.Th>Orden de compra</Table.Th>
                                <Table.Th>Cantidad pedida</Table.Th>
                                <Table.Th>PV unitario</Table.Th>
                                <Table.Th style={{ width: 70, textAlign: 'center' }}>Acciones</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {grouped.map((item, index) => (
                                <Table.Tr key={`${item.id}-${item.referenceName}-${index}`}>
                                    <Table.Td>
                                        <Badge color={item.isApproved ? 'teal' : 'gray'}>
                                            {item.isApproved ? 'Aprobado' : 'Pendiente'}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text
                                            c="blue"
                                            fw={700}
                                            style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                            onClick={() => navigate(`/pedidos/nuevo/${item.id}`)}
                                        >
                                            {item.orderNumber}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>{item.orderDate ? new Date(item.orderDate).toLocaleDateString() : '-'}</Table.Td>
                                    <Table.Td>{item.dispatchDate ? new Date(item.dispatchDate).toLocaleDateString() : '-'}</Table.Td>
                                    <Table.Td>{item.clientName}</Table.Td>
                                    <Table.Td>{item.productName || '-'}</Table.Td>
                                    <Table.Td>{item.referenceName || '-'}</Table.Td>
                                    <Table.Td>{item.purchaseOrderNumber}</Table.Td>
                                    <Table.Td>{item.quantity || 0}</Table.Td>
                                    <Table.Td>{Number(item.approvedUnitPrice ?? 0).toLocaleString()}</Table.Td>
                                    <Table.Td style={{ textAlign: 'center' }}>
                                        <Menu withinPortal position="bottom-end" shadow="md">
                                            <Menu.Target>
                                                <Button variant="subtle" size="compact-sm" px={6} aria-label="Acciones del pedido">
                                                    <IconDotsVertical size={16} />
                                                </Button>
                                            </Menu.Target>
                                            <Menu.Dropdown>
                                                {!item.isApproved && (
                                                    <Menu.Item
                                                        leftSection={<IconCheck size={14} />}
                                                        onClick={() => openApprovalModal(item.id)}
                                                    >
                                                        Aprobar y asignar PV
                                                    </Menu.Item>
                                                )}
                                                <Menu.Item
                                                    leftSection={<IconPencil size={14} />}
                                                    onClick={() => navigate(`/pedidos/nuevo/${item.id}`)}
                                                >
                                                    Editar pedido
                                                </Menu.Item>
                                                <Menu.Item
                                                    leftSection={<IconPrinter size={14} />}
                                                    onClick={() => openReceiptPreview(item.id, false)}
                                                >
                                                    Imprimir nota
                                                </Menu.Item>
                                                <Menu.Item
                                                    leftSection={<IconMail size={14} />}
                                                    onClick={() => openReceiptPreview(item.id, true)}
                                                >
                                                    Enviar por correo
                                                </Menu.Item>
                                            </Menu.Dropdown>
                                        </Menu>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>

                    {!loading && grouped.length === 0 && (
                        <Stack align="center" py="xl">
                            <Text c="dimmed">No hay pedidos registrados.</Text>
                        </Stack>
                    )}
                </ScrollArea>
            </Card>

            <Modal
                opened={approvalModal.opened}
                onClose={() => setApprovalModal({ opened: false, orderId: null })}
                title="Aprobar pedido y asignar precios unitarios"
                size="lg"
            >
                <Stack>
                    {approvalRows.map((item, index) => (
                        <Card key={`${item.orderPartId}-${index}`} withBorder>
                            <Group justify="space-between" align="flex-end">
                                <Stack gap={1}>
                                    <Text fw={600}>{item.productName}</Text>
                                    <Text size="sm" c="dimmed">{item.referenceName} | Cantidad: {item.quantity}</Text>
                                </Stack>
                                <NumberInput
                                    label="Precio unitario aprobado"
                                    min={0}
                                    value={item.approvedUnitPrice}
                                    onChange={(value) => setApprovalRows(prev => prev.map((row, idx) => (
                                        idx === index ? { ...row, approvedUnitPrice: Number(value || 0) } : row
                                    )))}
                                />
                            </Group>
                        </Card>
                    ))}
                    <Group justify="flex-end">
                        <Button variant="light" onClick={() => setApprovalModal({ opened: false, orderId: null })}>
                            Cancelar
                        </Button>
                        <Button onClick={submitApproval}>Aprobar pedido</Button>
                    </Group>
                </Stack>
            </Modal>
        </Stack>
    );
}
