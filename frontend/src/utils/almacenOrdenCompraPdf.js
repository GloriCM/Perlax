import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calcularImpuestosColombia } from '../data/almacenConstants';

const LOGO_CANDIDATES = ['/empresa-logo.jpeg', '/Nuevo-perla-Sinfondo.png'];

function formatMoney(value) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);
}

function formatDate(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('es-CO');
}

async function loadLogoDataUrl() {
    for (const src of LOGO_CANDIDATES) {
        try {
            const response = await fetch(src);
            if (!response.ok) continue;
            const blob = await response.blob();
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            return { dataUrl, format: src.endsWith('.png') ? 'PNG' : 'JPEG' };
        } catch {
            // try next
        }
    }
    return null;
}

function buildPdfDocument({ titulo, proveedor, nit, telefono, fechaPedido, fechaEntrega, lineas, categoriaProveedor, responsableIva, consolidada = false }) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    return { doc, pageWidth, meta: { titulo, proveedor, nit, telefono, fechaPedido, fechaEntrega, lineas, categoriaProveedor, responsableIva, consolidada } };
}

async function renderOrdenPdf({ doc, pageWidth, meta, logo }) {
    const { titulo, proveedor, nit, telefono, fechaPedido, fechaEntrega, lineas, categoriaProveedor, responsableIva, consolidada } = meta;

    if (logo?.dataUrl) {
        doc.addImage(logo.dataUrl, logo.format, 14, 10, 28, 18);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(titulo, pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Proveedor: ${proveedor || '—'}`, 14, 34);
    doc.text(`NIT: ${nit || '—'}`, 14, 40);
    doc.text(`Teléfono: ${telefono || '—'}`, 14, 46);
    doc.text(`Fecha pedido: ${formatDate(fechaPedido)}`, pageWidth - 14, 34, { align: 'right' });
    doc.text(`Entrega estimada: ${formatDate(fechaEntrega)}`, pageWidth - 14, 40, { align: 'right' });
    if (consolidada) {
        doc.setFont('helvetica', 'italic');
        doc.text('Orden consolidada — múltiples requisiciones', pageWidth - 14, 46, { align: 'right' });
        doc.setFont('helvetica', 'normal');
    }

    const tableBody = (lineas || []).map((l) => [
        l.requisicionCodigo || l.codigo || '—',
        l.productoNombre || '—',
        String(l.cantidad ?? ''),
        formatMoney(l.precioUnitario),
        formatMoney(l.subtotal ?? (Number(l.cantidad) * Number(l.precioUnitario))),
    ]);

    autoTable(doc, {
        startY: 54,
        head: [['Cód. Req.', 'Producto / Insumo', 'Cantidad', 'Precio unit.', 'Subtotal']],
        body: tableBody,
        styles: { fontSize: 9, cellPadding: 2.5 },
        headStyles: { fillColor: [30, 58, 95], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    const subtotal = (lineas || []).reduce(
        (acc, l) => acc + (Number(l.subtotal) || Number(l.cantidad) * Number(l.precioUnitario) || 0),
        0,
    );
    const impuestos = calcularImpuestosColombia({
        subtotal,
        categoriaProveedor,
        responsableIva,
    });

    let y = (doc.lastAutoTable?.finalY || 54) + 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen fiscal (Colombia)', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    impuestos.desglose.forEach((row) => {
        doc.text(row.label, 14, y);
        doc.text(formatMoney(row.value), pageWidth - 14, y, { align: 'right' });
        y += 5;
    });

    return doc;
}

/**
 * @param {object} orden — OrdenCompraDetailDto del backend
 * @param {object} [opts]
 */
export async function generarOrdenCompraPdf(orden, opts = {}) {
    const lineas = orden.lineas || orden.Lineas || [];
    const { doc, pageWidth, meta } = buildPdfDocument({
        titulo: `ORDEN DE COMPRA ${orden.numeroOrdenCompra || orden.NumeroOrdenCompra || ''}`,
        proveedor: orden.nombreProveedor || orden.NombreProveedor,
        nit: orden.nitProveedor || orden.NitProveedor,
        telefono: orden.telefonoProveedor || orden.TelefonoProveedor,
        fechaPedido: orden.fechaPedido || orden.FechaPedido,
        fechaEntrega: orden.fechaEntregaEstimada || orden.FechaEntregaEstimada,
        lineas,
        categoriaProveedor: opts.categoriaProveedor || '',
        responsableIva: opts.responsableIva || false,
        consolidada: false,
    });

    const logo = await loadLogoDataUrl();
    const pdf = await renderOrdenPdf({ doc, pageWidth, meta, logo });
    const numero = orden.numeroOrdenCompra || orden.NumeroOrdenCompra || 'OC';
    pdf.save(`${numero}.pdf`);
    return pdf;
}

/**
 * PDF para orden consolidada (misma estructura, múltiples líneas de requisición).
 */
export async function generarOrdenCompraConsolidadaPdf(orden, opts = {}) {
    const lineas = orden.lineas || orden.Lineas || [];
    const { doc, pageWidth, meta } = buildPdfDocument({
        titulo: `ORDEN DE COMPRA CONSOLIDADA ${orden.numeroOrdenCompra || orden.NumeroOrdenCompra || ''}`,
        proveedor: orden.nombreProveedor || orden.NombreProveedor,
        nit: orden.nitProveedor || orden.NitProveedor,
        telefono: orden.telefonoProveedor || orden.TelefonoProveedor,
        fechaPedido: orden.fechaPedido || orden.FechaPedido,
        fechaEntrega: orden.fechaEntregaEstimada || orden.FechaEntregaEstimada,
        lineas,
        categoriaProveedor: opts.categoriaProveedor || '',
        responsableIva: opts.responsableIva || false,
        consolidada: true,
    });

    const logo = await loadLogoDataUrl();
    const pdf = await renderOrdenPdf({ doc, pageWidth, meta, logo });
    const numero = orden.numeroOrdenCompra || orden.NumeroOrdenCompra || 'OC-CONS';
    pdf.save(`${numero}-consolidada.pdf`);
    return pdf;
}
