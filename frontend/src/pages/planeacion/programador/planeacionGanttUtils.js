const DAY_INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const ZOOM_MODES = [
    { value: 'mes', label: 'Mes' },
    { value: 'semana', label: 'Semana' },
    { value: 'dia', label: 'Dia' },
];

export const WEEK_COLORS = [
    'planeacion-gantt__week--c0', /* S1 */
    'planeacion-gantt__week--c1', /* S2 */
    'planeacion-gantt__week--c2', /* S3 */
    'planeacion-gantt__week--c3', /* S4 */
    'planeacion-gantt__week--c4', /* S5 */
];

export function daysInMonthCount(year, month) {
    return new Date(year, month, 0).getDate();
}

export function isSameUtcDay(a, b) {
    const d1 = new Date(a);
    const d2 = new Date(b);
    return d1.getUTCFullYear() === d2.getUTCFullYear()
        && d1.getUTCMonth() === d2.getUTCMonth()
        && d1.getUTCDate() === d2.getUTCDate();
}

export function utcDate(year, month, day) {
    return new Date(Date.UTC(year, month - 1, day));
}

export function addUtcDays(value, days) {
    const date = new Date(value);
    date.setUTCDate(date.getUTCDate() + days);
    return date;
}

export function parseTimeToMinutes(value) {
    if (!value) return 0;
    const parts = String(value).split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
}

export function formatHourShort(totalMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatHourMilitary(totalMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (m === 0) return `${String(h).padStart(2, '0')}:00`;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const DEFAULT_DAY_WINDOW = {
    startMinutes: 7 * 60,
    endMinutes: 16 * 60 + 30,
    slotMinutes: 30,
};

/** Ventana horaria del dia segun catalogo de turnos (ej. 7:00 - 4:30 pm). */
export function buildDayHourWindow(shifts = []) {
    const active = (shifts || []).filter((s) => s.isActive !== false && !s.crossesMidnight);
    let startMinutes = DEFAULT_DAY_WINDOW.startMinutes;
    let endMinutes = DEFAULT_DAY_WINDOW.endMinutes;

    if (active.length > 0) {
        startMinutes = Math.min(...active.map((s) => parseTimeToMinutes(s.startTime)));
        endMinutes = Math.max(...active.map((s) => parseTimeToMinutes(s.endTime)));
    }

    const slotMinutes = DEFAULT_DAY_WINDOW.slotMinutes;
    const slots = [];
    for (let minutes = startMinutes; minutes < endMinutes; minutes += slotMinutes) {
        const minute = minutes % 60;
        slots.push({
            col: slots.length + 1,
            minutes,
            hourLabel: minute === 0 ? formatHourMilitary(minutes) : null,
            isHalfHour: minute === 30,
            isHourStart: minute === 0,
        });
    }

    return {
        startMinutes,
        endMinutes,
        slotMinutes,
        slots,
        columnCount: Math.max(1, slots.length),
        rangeLabel: `${formatHourMilitary(startMinutes)} - ${formatHourMilitary(endMinutes)}`,
        endLabel: formatHourMilitary(endMinutes),
    };
}

export function utcDateTime(year, month, day, totalMinutes) {
    const date = utcDate(year, month, day);
    date.setUTCHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
    return date;
}

function isEndOfDayUtc(date) {
    const d = new Date(date);
    return d.getUTCHours() === 23 && d.getUTCMinutes() >= 59;
}

function defaultDayDurationMinutes(block, dayHourWindow) {
    const hours = Number(block.estimatedHours);
    if (hours > 0) return Math.round(hours * 60);
    const span = (dayHourWindow?.endMinutes ?? DEFAULT_DAY_WINDOW.endMinutes)
        - (dayHourWindow?.startMinutes ?? DEFAULT_DAY_WINDOW.startMinutes);
    return Math.min(8 * 60, Math.max(dayHourWindow?.slotMinutes ?? 30, span));
}

/** Convierte bloques solo-fecha a franja horaria visible en vista dia. */
export function materializeBlockDayTimes(block, year, month, selectedDay, dayHourWindow) {
    const start = new Date(block.plannedStart);
    const end = new Date(block.plannedEnd);
    const targetTs = Date.UTC(year, month - 1, selectedDay);
    const onSelectedDay = blockDayTimestamp(start) <= targetTs && blockDayTimestamp(end) >= targetTs;

    const hasExplicitTime = !isMidnightUtc(start)
        && (!isMidnightUtc(end) && !isEndOfDayUtc(end));

    if (onSelectedDay && hasExplicitTime) {
        return { plannedStart: start, plannedEnd: end };
    }

    if (!onSelectedDay) {
        return { plannedStart: start, plannedEnd: end };
    }

    const windowStart = dayHourWindow?.startMinutes ?? DEFAULT_DAY_WINDOW.startMinutes;
    const windowEnd = dayHourWindow?.endMinutes ?? DEFAULT_DAY_WINDOW.endMinutes;
    const duration = defaultDayDurationMinutes(block, dayHourWindow);
    const startMin = blockDayTimestamp(start) === targetTs && !isMidnightUtc(start)
        ? Math.max(windowStart, start.getUTCHours() * 60 + start.getUTCMinutes())
        : windowStart;
    const endMin = Math.min(windowEnd, startMin + duration);

    return {
        plannedStart: utcDateTime(year, month, selectedDay, startMin),
        plannedEnd: utcDateTime(year, month, selectedDay, Math.max(startMin + (dayHourWindow?.slotMinutes ?? 30), endMin)),
    };
}

export function applyBlockDrag(block, mode, deltaDays, dayHourWindow = null, dayContext = null) {
    let working = block;
    if (dayHourWindow?.slotMinutes && dayContext) {
        const materialized = materializeBlockDayTimes(
            block,
            dayContext.year,
            dayContext.month,
            dayContext.selectedDay,
            dayHourWindow,
        );
        working = { ...block, ...materialized };
    }

    const start = new Date(working.plannedStart);
    const end = new Date(working.plannedEnd);

    if (dayHourWindow?.slotMinutes) {
        const deltaMs = deltaDays * dayHourWindow.slotMinutes * 60 * 1000;
        const windowStartMs = (dayHourWindow.startMinutes ?? 0) * 60 * 1000;
        const windowEndMs = (dayHourWindow.endMinutes ?? 24 * 60) * 60 * 1000;
        const minDuration = dayHourWindow.slotMinutes * 60 * 1000;

        if (mode === 'resize-start') {
            let nextStart = new Date(start.getTime() + deltaMs);
            if (dayContext) {
                const dayStart = utcDate(dayContext.year, dayContext.month, dayContext.selectedDay);
                const minTs = dayStart.getTime() + windowStartMs;
                const maxTs = end.getTime() - minDuration;
                nextStart = new Date(Math.min(Math.max(nextStart.getTime(), minTs), maxTs));
            } else if (nextStart.getTime() > end.getTime() - minDuration) {
                nextStart = new Date(end.getTime() - minDuration);
            }
            return { plannedStart: nextStart, plannedEnd: end };
        }
        if (mode === 'resize-end') {
            let nextEnd = new Date(end.getTime() + deltaMs);
            if (dayContext) {
                const dayStart = utcDate(dayContext.year, dayContext.month, dayContext.selectedDay);
                const minTs = start.getTime() + minDuration;
                const maxTs = dayStart.getTime() + windowEndMs;
                nextEnd = new Date(Math.min(Math.max(nextEnd.getTime(), minTs), maxTs));
            } else if (nextEnd.getTime() < start.getTime() + minDuration) {
                nextEnd = new Date(start.getTime() + minDuration);
            }
            return { plannedStart: start, plannedEnd: nextEnd };
        }
        let nextStart = new Date(start.getTime() + deltaMs);
        let nextEnd = new Date(end.getTime() + deltaMs);
        if (dayContext) {
            const dayStart = utcDate(dayContext.year, dayContext.month, dayContext.selectedDay);
            const minTs = dayStart.getTime() + windowStartMs;
            const maxTs = dayStart.getTime() + windowEndMs;
            const duration = end.getTime() - start.getTime();
            if (nextStart.getTime() < minTs) {
                nextStart = new Date(minTs);
                nextEnd = new Date(minTs + duration);
            }
            if (nextEnd.getTime() > maxTs) {
                nextEnd = new Date(maxTs);
                nextStart = new Date(maxTs - duration);
            }
        }
        return { plannedStart: nextStart, plannedEnd: nextEnd };
    }

    if (mode === 'resize-start') {
        const nextStart = addUtcDays(start, deltaDays);
        if (nextStart.getTime() > end.getTime()) return { plannedStart: end, plannedEnd: end };
        return { plannedStart: nextStart, plannedEnd: end };
    }
    if (mode === 'resize-end') {
        const nextEnd = addUtcDays(end, deltaDays);
        if (nextEnd.getTime() < start.getTime()) return { plannedStart: start, plannedEnd: start };
        return { plannedStart: start, plannedEnd: nextEnd };
    }
    return {
        plannedStart: addUtcDays(start, deltaDays),
        plannedEnd: addUtcDays(end, deltaDays),
    };
}

export function columnFromClientX(element, clientX, columnCount) {
    if (!element || columnCount < 1) return 1;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0) return 1;
    const ratio = (clientX - rect.left) / rect.width;
    return Math.min(columnCount, Math.max(1, Math.floor(ratio * columnCount) + 1));
}

export function minutesFromDayColumn(col, dayHourWindow) {
    if (!dayHourWindow?.slots?.length) return dayHourWindow?.startMinutes ?? 0;
    const slot = dayHourWindow.slots[col - 1];
    return slot?.minutes ?? dayHourWindow.startMinutes;
}

export function dayFromViewColumn(zoomMode, year, month, weekIndex, selectedDay, col, dayHourWindow = null) {
    if (zoomMode === 'dia') return selectedDay;
    if (zoomMode === 'mes') return col;
    const startDay = weekIndex * 7 + 1;
    const day = startDay + col - 1;
    const total = daysInMonthCount(year, month);
    if (day < 1 || day > total) return null;
    return day;
}

export function toBlockPayload(block, overrides = {}) {
    return {
        manufacturingOrderId: block.manufacturingOrderId ?? null,
        processCode: overrides.processCode ?? block.processCode,
        machineId: block.machineId ?? null,
        blockType: block.blockType || 'Op',
        plannedStart: overrides.plannedStart ?? block.plannedStart,
        plannedEnd: overrides.plannedEnd ?? block.plannedEnd,
        status: block.status || 'Programado',
        sortOrder: block.sortOrder || 0,
        notes: block.notes || null,
        isUrgency: !!block.isUrgency,
        estimatedHours: block.estimatedHours ?? null,
    };
}

const WEEKDAY_LONG = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const MONTH_LONG = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Etiqueta legible sin desfase por zona horaria (usa componentes calendario UTC). */
export function formatCalendarDayLabel(year, month, day) {
    const date = utcDate(year, month, day);
    const weekday = WEEKDAY_LONG[date.getUTCDay()];
    const monthName = MONTH_LONG[month - 1];
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    return `${cap(weekday)}, ${day} de ${monthName}`;
}

export function getMondayOfWeek(year, month, day) {
    const d = new Date(Date.UTC(year, month - 1, day));
    const dow = d.getUTCDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    d.setUTCDate(d.getUTCDate() + diff);
    return d;
}

export function shiftWeekStart(weekStart, deltaWeeks) {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + deltaWeeks * 7);
    return d;
}

export function formatWeekRange(weekStart) {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    const fmt = (dt) => dt.toISOString().slice(0, 10);
    return `${fmt(start)} -> ${fmt(end)}`;
}

export function buildWeeks(year, month) {
    const total = daysInMonthCount(year, month);
    const count = Math.ceil(total / 7);
    return Array.from({ length: count }, (_, index) => {
        const startDay = index * 7 + 1;
        const endDay = Math.min(startDay + 6, total);
        return {
            index,
            label: `S${index + 1}`,
            startDay,
            endDay,
            colorClass: WEEK_COLORS[index % WEEK_COLORS.length],
            rangeLabel: `${startDay}-${endDay} ${MONTH_SHORT[month - 1]}`,
        };
    });
}

export function buildMonthDays(year, month) {
    const total = daysInMonthCount(year, month);
    const today = new Date();
    return Array.from({ length: total }, (_, idx) => {
        const day = idx + 1;
        const date = utcDate(year, month, day);
        const dow = date.getUTCDay();
        const mondayIndex = dow === 0 ? 6 : dow - 1;
        return {
            day,
            date,
            initial: DAY_INITIALS[mondayIndex],
            isToday: isSameUtcDay(date, today),
            weekIndex: Math.floor((day - 1) / 7),
            colorClass: WEEK_COLORS[Math.floor((day - 1) / 7) % WEEK_COLORS.length],
        };
    });
}

export function buildWeekDays(year, month, weekIndex) {
    const startDay = weekIndex * 7 + 1;
    const total = daysInMonthCount(year, month);
    const today = new Date();
    const weekColor = WEEK_COLORS[weekIndex % WEEK_COLORS.length];
    return Array.from({ length: 7 }, (_, idx) => {
        const day = startDay + idx;
        if (day > total) {
            return { day: null, empty: true, col: idx + 1 };
        }
        const date = utcDate(year, month, day);
        const dow = date.getUTCDay();
        const mondayIndex = dow === 0 ? 6 : dow - 1;
        return {
            day,
            date,
            empty: false,
            col: idx + 1,
            initial: DAY_INITIALS[mondayIndex],
            isToday: isSameUtcDay(date, today),
            colorClass: weekColor,
        };
    });
}

export function weekIndexForDay(day) {
    return Math.floor((day - 1) / 7);
}

export function weekColorClassForDay(day) {
    return WEEK_COLORS[weekIndexForDay(day) % WEEK_COLORS.length];
}

function blockDayTimestamp(date) {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function isMidnightUtc(date) {
    return date.getUTCHours() === 0 && date.getUTCMinutes() === 0;
}

function blockScheduleBounds(block) {
    const start = new Date(block.plannedStart);
    const end = new Date(block.plannedEnd);
    return {
        start,
        end,
        startDay: start.getUTCDate(),
        endDay: end.getUTCDate(),
        startMonth: start.getUTCMonth() + 1,
        endMonth: end.getUTCMonth() + 1,
        startYear: start.getUTCFullYear(),
        endYear: end.getUTCFullYear(),
    };
}

function clipBlockSpanMonth(block, year, month) {
    const { startDay, endDay, startMonth, endMonth, startYear, endYear } = blockScheduleBounds(block);
    const total = daysInMonthCount(year, month);

    let visStart = startDay;
    let visEnd = endDay;
    if (startYear < year || (startYear === year && startMonth < month)) visStart = 1;
    if (endYear > year || (endYear === year && endMonth > month)) visEnd = total;
    if (startYear > year || (startYear === year && startMonth > month)) return null;
    if (endYear < year || (endYear === year && endMonth < month)) return null;
    if (visStart > total || visEnd < 1 || visStart > visEnd) return null;

    return {
        startCol: visStart,
        endCol: visEnd + 1,
        span: Math.max(1, visEnd - visStart + 1),
    };
}

function clipBlockSpanDayView(block, year, month, selectedDay, dayHourWindow) {
    const start = new Date(block.plannedStart);
    const end = new Date(block.plannedEnd);
    const targetTs = Date.UTC(year, month - 1, selectedDay);
    const blockStartDay = blockDayTimestamp(start);
    const blockEndDay = blockDayTimestamp(end);

    if (targetTs < blockStartDay || targetTs > blockEndDay) return null;

    const windowStart = dayHourWindow?.startMinutes ?? DEFAULT_DAY_WINDOW.startMinutes;
    const windowEnd = dayHourWindow?.endMinutes ?? DEFAULT_DAY_WINDOW.endMinutes;
    const slotMinutes = dayHourWindow?.slotMinutes ?? DEFAULT_DAY_WINDOW.slotMinutes;
    const columnCount = dayHourWindow?.columnCount ?? 1;

    const startIsDateOnly = isMidnightUtc(start);
    const endIsDateOnly = isMidnightUtc(end) || isEndOfDayUtc(end);
    let visibleStart = windowStart;
    let visibleEnd = windowEnd;

    if (startIsDateOnly && endIsDateOnly) {
        const duration = defaultDayDurationMinutes(block, dayHourWindow);
        visibleStart = windowStart;
        visibleEnd = Math.min(windowEnd, windowStart + duration);
    } else {
        const dayStartMin = targetTs === blockStartDay
            ? (startIsDateOnly ? windowStart : start.getUTCHours() * 60 + start.getUTCMinutes())
            : windowStart;
        const dayEndMin = targetTs === blockEndDay
            ? (endIsDateOnly ? windowEnd : end.getUTCHours() * 60 + end.getUTCMinutes())
            : windowEnd;
        visibleStart = Math.max(windowStart, dayStartMin);
        visibleEnd = Math.min(windowEnd, Math.max(dayEndMin, visibleStart + slotMinutes));
    }

    const startCol = Math.floor((visibleStart - windowStart) / slotMinutes) + 1;
    const endCol = Math.min(columnCount + 1, Math.ceil((visibleEnd - windowStart) / slotMinutes) + 1);
    if (startCol >= endCol) return null;

    return { startCol, endCol, span: endCol - startCol };
}

export function clipBlockSpan(block, year, month, viewMode, weekIndex, selectedDay, dayHourWindow = null) {
    if (viewMode === 'dia') {
        return clipBlockSpanDayView(block, year, month, selectedDay, dayHourWindow);
    }

    if (viewMode === 'semana') {
        const total = daysInMonthCount(year, month);
        const weekStart = weekIndex * 7 + 1;
        const weekEnd = Math.min(weekStart + 6, total);
        const monthSpan = clipBlockSpanMonth(block, year, month);
        if (!monthSpan) return null;
        const visStart = Math.max(monthSpan.startCol, weekStart);
        const visEnd = Math.min(monthSpan.endCol - 1, weekEnd);
        if (visStart > weekEnd || visEnd < weekStart) return null;
        return {
            startCol: visStart - weekStart + 1,
            endCol: visEnd - weekStart + 2,
            span: visEnd - visStart + 1,
        };
    }

    return clipBlockSpanMonth(block, year, month);
}

export function getViewColumnCount(viewMode, year, month, dayHourWindow = null) {
    if (viewMode === 'dia') return dayHourWindow?.columnCount ?? buildDayHourWindow().columnCount;
    if (viewMode === 'semana') return 7;
    return daysInMonthCount(year, month);
}

export function shiftViewPeriod({ year, month, zoomMode, weekIndex, selectedDay }, delta) {
    if (zoomMode === 'mes') {
        const date = new Date(Date.UTC(year, month - 1 + delta, 1));
        const nextYear = date.getUTCFullYear();
        const nextMonth = date.getUTCMonth() + 1;
        const today = new Date();
        const day = (today.getFullYear() === nextYear && today.getMonth() + 1 === nextMonth)
            ? today.getDate() : 1;
        return {
            year: nextYear,
            month: nextMonth,
            weekIndex: weekIndexForDay(day),
            selectedDay: day,
        };
    }

    if (zoomMode === 'semana') {
        let nextWeek = weekIndex + delta;
        let nextYear = year;
        let nextMonth = month;
        const weeks = buildWeeks(year, month);
        if (nextWeek >= weeks.length) {
            const bumped = shiftViewPeriod({ year, month, zoomMode: 'mes', weekIndex: 0, selectedDay: 1 }, 1);
            return { ...bumped, zoomMode: 'semana', weekIndex: 0, selectedDay: 1 };
        }
        if (nextWeek < 0) {
            const bumped = shiftViewPeriod({ year, month, zoomMode: 'mes', weekIndex: 0, selectedDay: 1 }, -1);
            const prevWeeks = buildWeeks(bumped.year, bumped.month);
            return {
                ...bumped,
                zoomMode: 'semana',
                weekIndex: prevWeeks.length - 1,
                selectedDay: prevWeeks[prevWeeks.length - 1].startDay,
            };
        }
        return { year: nextYear, month: nextMonth, weekIndex: nextWeek, selectedDay: weeks[nextWeek].startDay, zoomMode: 'semana' };
    }

    let nextDay = selectedDay + delta;
    let nextYear = year;
    let nextMonth = month;
    const total = daysInMonthCount(year, month);
    if (nextDay > total) {
        const bumped = shiftViewPeriod({ year, month, zoomMode: 'mes', weekIndex, selectedDay }, 1);
        return { ...bumped, zoomMode: 'dia', selectedDay: 1, weekIndex: 0 };
    }
    if (nextDay < 1) {
        const bumped = shiftViewPeriod({ year, month, zoomMode: 'mes', weekIndex, selectedDay }, -1);
        const prevTotal = daysInMonthCount(bumped.year, bumped.month);
        return { ...bumped, zoomMode: 'dia', selectedDay: prevTotal, weekIndex: weekIndexForDay(prevTotal) };
    }
    return { year: nextYear, month: nextMonth, selectedDay: nextDay, weekIndex: weekIndexForDay(nextDay), zoomMode: 'dia' };
}