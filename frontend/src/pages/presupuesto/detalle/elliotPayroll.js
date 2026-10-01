/** Tasas iguales a ElliotPayrollRates (backend / Excel Ideal). */
export const PAYROLL_RATES = {
    cesantiaPrima: 0.0833,
    interesCesantia: 0.12,
    vacaciones: 0.0416,
    arl: 0.025,
    salud: 0.085,
    pension: 0.12,
    caja: 0.04,
    cooperativaPrestaciones: 0.52
};

function round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
}

/** Prestaciones + total de una persona (mismo criterio del Excel). */
export function computePersonPayroll(person) {
    const salary = round2(person?.salary);
    const transport = round2(person?.transportSubsidy);
    const section = person?.section || '';

    if (section === 'Cooperative') {
        const prestaciones = round2(salary * PAYROLL_RATES.cooperativaPrestaciones);
        return {
            salary,
            transport,
            cesantia: 0,
            interesCesantia: 0,
            prima: 0,
            vacaciones: 0,
            arl: 0,
            salud: 0,
            pension: 0,
            caja: 0,
            prestaciones,
            total: round2(salary + transport + prestaciones)
        };
    }

    const cesantia = round2((salary + transport) * PAYROLL_RATES.cesantiaPrima);
    const interesCesantia = round2(cesantia * PAYROLL_RATES.interesCesantia);
    const prima = round2((salary + transport) * PAYROLL_RATES.cesantiaPrima);
    const vacaciones = round2(salary * PAYROLL_RATES.vacaciones);
    const arl = round2(salary * PAYROLL_RATES.arl);
    const salud = round2(salary * PAYROLL_RATES.salud);
    const pension = round2(salary * PAYROLL_RATES.pension);
    const caja = round2((salary + vacaciones) * PAYROLL_RATES.caja);
    const prestaciones = round2(cesantia + interesCesantia + prima + vacaciones + arl + salud + pension + caja);

    return {
        salary,
        transport,
        cesantia,
        interesCesantia,
        prima,
        vacaciones,
        arl,
        salud,
        pension,
        caja,
        prestaciones,
        total: round2(salary + transport + prestaciones)
    };
}

export const PRESTACION_LABELS = [
    { key: 'cesantia', label: 'Cesantía' },
    { key: 'interesCesantia', label: 'Interés cesantía' },
    { key: 'prima', label: 'Prima' },
    { key: 'vacaciones', label: 'Vacaciones' },
    { key: 'arl', label: 'ARL' },
    { key: 'salud', label: 'Salud' },
    { key: 'pension', label: 'Pensión' },
    { key: 'caja', label: 'Caja compensación' }
];
