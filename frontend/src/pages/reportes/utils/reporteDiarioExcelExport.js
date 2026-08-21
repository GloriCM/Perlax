/**
 * Exportacion Excel del reporte diario (formato compatible con Excel sin dependencias).
 * - Por operario: Operario | Operario Aux x3 | Fecha | Orden | Inicio | Final | Horas | Actividad | Tiros | Observaciones
 * - Por maquina: Maquina | Fecha | Orden | Inicio | Final | Horas | Actividad | Tiros | Observaciones
 */

const escapeHtml = (value) =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const pad2 = (n) => String(n).padStart(2, '0');

export const formatExcelDate = (value) => {
    if (!value) return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        const [y, m, d] = value.slice(0, 10).split('-');
        return `${Number(d)}/${Number(m)}/${y}`;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

export const formatExcelTime = (value) => {
    if (!value) return '';
    if (typeof value === 'string' && /^\d{2}:\d{2}/.test(value)) {
        const parts = value.split(':');
        return `${parts[0]}:${parts[1]}:${parts[2] || '00'}`;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
};

export const formatExcelHours = (value) => {
    const num = Number(value || 0);
    return num.toFixed(2).replace('.', ',');
};

export const formatExcelTiros = (value) => {
    const num = Number(value || 0);
    return num.toLocaleString('es-CO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

/** Solo codigo padre: "13 Falta de Trabajo · 1301 ..." -> "13 Falta de Trabajo" */
export const toParentActivityLabel = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const parent = raw.split(/\s*·\s*/)[0].trim();
    return parent || raw;
};

const downloadHtmlAsExcel = (filename, headers, rows) => {
    const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
    const body = rows
        .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
        .join('');
    const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
<meta charset="UTF-8" />
</head>
<body>
<table border="1">
<thead><tr>${head}</tr></thead>
<tbody>${body}</tbody>
</table>
</body>
</html>`;

    const blob = new Blob([`\ufeff${html}`], {
        type: 'application/vnd.ms-excel;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const safeName = (value) =>
    String(value || 'reporte')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 40);

/** Exporta filas con columnas de operario (incluye 3 auxiliares vacias). */
export function exportDailyReportByOperator(rows, { dateLabel = '' } = {}) {
    const headers = [
        'Operario',
        'Operario Aux',
        'Operario Aux',
        'Operario Aux',
        'Fecha',
        'Orden',
        'Inicio',
        'Final',
        'Horas',
        'Actividad',
        'Tiros',
        'Observaciones',
    ];

    const sorted = [...rows].sort((a, b) => {
        const byOp = String(a.operatorName || '').localeCompare(String(b.operatorName || ''));
        if (byOp !== 0) return byOp;
        return String(formatExcelTime(a.startTime)).localeCompare(String(formatExcelTime(b.startTime)));
    });

    const excelRows = sorted.map((row) => [
        row.operatorName || '',
        row.operatorAux1 || '',
        row.operatorAux2 || '',
        row.operatorAux3 || '',
        formatExcelDate(row.date),
        row.order || '',
        formatExcelTime(row.startTime),
        formatExcelTime(row.endTime),
        formatExcelHours(row.hours),
        toParentActivityLabel(row.activity),
        formatExcelTiros(row.tiros),
        row.observations || '*',
    ]);

    const firstOp = safeName(sorted[0]?.operatorName || 'operario');
    const datePart = safeName(dateLabel || sorted[0]?.date || 'dia');
    downloadHtmlAsExcel(`reporte_operario_${firstOp}_${datePart}`, headers, excelRows);
}

/** Exporta filas con columnas de maquina. */
export function exportDailyReportByMachine(rows, { dateLabel = '' } = {}) {
    const headers = [
        'Maquina',
        'Fecha',
        'Orden',
        'Inicio',
        'Final',
        'Horas',
        'Actividad',
        'Tiros',
        'Observaciones',
    ];

    const sorted = [...rows].sort((a, b) => {
        const byMachine = String(a.machineName || '').localeCompare(String(b.machineName || ''));
        if (byMachine !== 0) return byMachine;
        return String(formatExcelTime(a.startTime)).localeCompare(String(formatExcelTime(b.startTime)));
    });

    const excelRows = sorted.map((row) => [
        row.machineName || '',
        formatExcelDate(row.date),
        row.order || '',
        formatExcelTime(row.startTime),
        formatExcelTime(row.endTime),
        formatExcelHours(row.hours),
        toParentActivityLabel(row.activity),
        formatExcelTiros(row.tiros),
        row.observations || '*',
    ]);

    const firstMachine = safeName(sorted[0]?.machineName || 'maquina');
    const datePart = safeName(dateLabel || sorted[0]?.date || 'dia');
    downloadHtmlAsExcel(`reporte_maquina_${firstMachine}_${datePart}`, headers, excelRows);
}
