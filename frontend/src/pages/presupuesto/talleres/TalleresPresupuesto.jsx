import { useState } from 'react';
import { Title, Text, Group, Select, Box, ActionIcon } from '@mantine/core';
import {
    IconArrowLeft,
    IconTools,
    IconDeviceFloppy
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import './TalleresPresupuesto.css';

const RUBROS = [
    "Acompañamiento",
    "ALIMENTACION POR TIEMPO EXTRA",
    "ALQUILER MONTACARGAS",
    "Estibas plásticas para despacho"
];

const MONTHS = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
];

export default function TalleresPresupuesto() {
    const navigate = useNavigate();
    const [year, setYear] = useState('2026');
    const [data, setData] = useState(() => {
        // Initialize mock data
        const initialData = {};
        RUBROS.forEach(rubro => {
            initialData[rubro] = {};
            MONTHS.forEach(month => {
                initialData[rubro][month] = rubro === "ALIMENTACION POR TIEMPO EXTRA" ? 50000 : 0;
            });
        });
        return initialData;
    });

    const handleInputChange = (rubro, month, value) => {
        const numValue = parseInt(value.replace(/\./g, '')) || 0;
        setData(prev => ({
            ...prev,
            [rubro]: {
                ...prev[rubro],
                [month]: numValue
            }
        }));
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'decimal',
            minimumFractionDigits: 0
        }).format(value);
    };

    const calculateTotalAnnual = () => {
        let total = 0;
        Object.values(data).forEach(rubroData => {
            Object.values(rubroData).forEach(val => {
                total += val;
            });
        });
        return total;
    };

    return (
        <div className="talleres-presupuesto-container fade-in">
            {/* Custom Header */}
            <div className="budget-view-header">
                <button className="back-button" onClick={() => navigate('/')}>
                    <IconArrowLeft size={18} />
                    Volver al Panel
                </button>
                <Title order={4} c="white">Gestión de Presupuestos</Title>
                <img src="/Nuevo-perla-Sinfondo.png" alt="Perla" style={{ height: 32 }} />
            </div>


            {/* Title Row */}
            <div className="budget-title-row">
                <Group gap="sm">
                    <IconTools size={28} color="#94a3b8" />
                    <Title order={3} c="white">Gestión de Presupuestos Talleres</Title>
                </Group>
                <Group gap="xs">
                    <Text size="sm" c="dimmed">Año:</Text>
                    <Select
                        data={['2024', '2025', '2026', '2027']}
                        value={year}
                        onChange={setYear}
                        size="xs"
                        w={100}
                        styles={{
                            input: {
                                background: 'white',
                                color: 'black',
                                borderRadius: 4,
                                fontWeight: 600
                            }
                        }}
                    />
                </Group>
            </div>

            {/* Summary Box */}
            <div className="summary-box">
                <div className="summary-label">Resumen {year}</div>
                <div className="summary-value">Total Anual: $ {formatCurrency(calculateTotalAnnual())}</div>
            </div>

            {/* Budget Table */}
            <div className="budget-table-container">
                <table className="budget-table">
                    <thead>
                        <tr>
                            <th>Rubro</th>
                            {MONTHS.map(m => <th key={m}>{m}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {RUBROS.map(rubro => (
                            <tr key={rubro}>
                                <td className="rubro-cell">{rubro}</td>
                                {MONTHS.map(month => (
                                    <td key={month}>
                                        <input
                                            className="budget-input"
                                            value={formatCurrency(data[rubro][month])}
                                            onChange={(e) => handleInputChange(rubro, month, e.target.value)}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer Actions */}
            <div className="footer-actions">
                <button className="save-button">
                    <IconDeviceFloppy size={20} />
                    Guardar Cambios
                </button>
            </div>
        </div>
    );
}
