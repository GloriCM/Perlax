import { useEffect, useMemo, useRef, useState } from 'react';
import { ActionIcon, Group } from '@mantine/core';
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { schedulingApi } from '../../../services/schedulingApi';
import {
    applyBlockDrag,
    buildDayHourWindow,
    buildMonthDays,
    buildWeekDays,
    buildWeeks,
    clipBlockSpan,
    columnFromClientX,
    dayFromViewColumn,
    formatCalendarDayLabel,
    getViewColumnCount,
    materializeBlockDayTimes,
    minutesFromDayColumn,
    utcDate,
    utcDateTime,
    weekColorClassForDay,
} from './planeacionGanttUtils';
import { formatBillingDelta, formatBillingMoney } from './planeacionBillingUtils';

const AUX_DRAG_TYPE = 'application/x-perlax-aux';

const blockClass = (blockType) => {
    if (blockType === 'Capacitacion') return 'planeacion-gantt__block--capacitacion';
    if (blockType === 'Limpieza') return 'planeacion-gantt__block--limpieza';
    return 'planeacion-gantt__block--op';
};

const blockLabel = (block, { compact = false } = {}) => {
    if (block.blockType === 'Op') {
        const raw = block.opNumber || 'OP';
        if (compact && raw.includes(' ')) {
            const [head, tail] = raw.split(' ');
            return tail ? `${head}-${tail}` : raw;
        }
        return raw.replace(' ', '\u00A0');
    }
    if (block.blockType === 'Capacitacion') return 'Capacitacion';
    if (block.blockType === 'Limpieza') return 'Limpieza';
    return block.blockType;
};

function processFromPoint(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    return el?.closest('[data-process-code]')?.getAttribute('data-process-code') || null;
}

export default function PlaneacionGanttView({
    year,
    month,
    monthName,
    zoomMode,
    weekIndex,
    selectedDay,
    processes,
    blocksByProcess,
    onSelectWeek,
    onSelectDay,
    onEditBlock,
    onMoveBlock,
    onDeleteBlock,
    onDropAux,
    processManageMode = false,
    onManageProcesses,
    onProcessChanged,
    billingSummary,
    onDefineMeta,
    dayHourWindow: dayHourWindowProp,
}) {
    const dayHourWindow = useMemo(
        () => dayHourWindowProp || buildDayHourWindow(),
        [dayHourWindowProp],
    );
    const weeks = useMemo(() => buildWeeks(year, month), [year, month]);
    const billingWeeks = billingSummary?.weeks || [];
    const billingByIndex = useMemo(() => {
        const map = {};
        billingWeeks.forEach((w) => { map[w.weekIndex] = w; });
        return map;
    }, [billingWeeks]);
    const monthDays = useMemo(() => buildMonthDays(year, month), [year, month]);
    const weekDays = useMemo(() => buildWeekDays(year, month, weekIndex), [year, month, weekIndex]);
    const columnCount = getViewColumnCount(zoomMode, year, month, dayHourWindow);
    const activeWeek = weeks[weekIndex] || weeks[0];
    const dayWeekColor = activeWeek?.colorClass || weekColorClassForDay(selectedDay);
    const gridStyle = { '--gantt-days': columnCount };
    const dragRef = useRef(null);
    const [dragPreview, setDragPreview] = useState(null);
    const [dropProcess, setDropProcess] = useState(null);
    const [menu, setMenu] = useState(null);

    const todayCol = useMemo(() => {
        if (zoomMode === 'mes') {
            const today = monthDays.find((d) => d.isToday);
            return today ? today.day : null;
        }
        if (zoomMode === 'semana') {
            const today = weekDays.find((d) => d.isToday && !d.empty);
            return today ? today.col : null;
        }
        if (zoomMode === 'dia') {
            const today = monthDays.find((d) => d.day === selectedDay && d.isToday);
            if (!today) return null;
            const now = new Date();
            const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
            const { startMinutes, endMinutes, slotMinutes } = dayHourWindow;
            if (minutes < startMinutes || minutes >= endMinutes) return null;
            return Math.floor((minutes - startMinutes) / slotMinutes) + 1;
        }
        return null;
    }, [zoomMode, monthDays, weekDays, selectedDay, dayHourWindow]);

    const dayContext = useMemo(() => (
        zoomMode === 'dia' ? { year, month, selectedDay } : null
    ), [zoomMode, year, month, selectedDay]);

    useEffect(() => {
        const onMove = (event) => {
            const drag = dragRef.current;
            if (!drag) return;
            const deltaSlots = Math.round((event.clientX - drag.startX) / drag.colWidth);
            const targetProcess = processFromPoint(event.clientX, event.clientY) || drag.block.processCode;
            const dates = applyBlockDrag(
                drag.block,
                drag.mode,
                deltaSlots,
                zoomMode === 'dia' ? dayHourWindow : null,
                dayContext,
            );
            const didMove = Math.abs(event.clientX - drag.startX) > 4
                || Math.abs(event.clientY - drag.startY) > 4
                || targetProcess !== drag.block.processCode;
            dragRef.current = { ...drag, deltaSlots, targetProcess, didMove };
            setDragPreview({
                blockId: drag.block.id,
                processCode: targetProcess,
                plannedStart: dates.plannedStart,
                plannedEnd: dates.plannedEnd,
            });
        };

        const onUp = () => {
            const drag = dragRef.current;
            dragRef.current = null;
            setDragPreview(null);
            if (!drag) return;
            if (!drag.didMove) {
                if (drag.mode === 'move') onEditBlock?.(drag.block);
                return;
            }
            const dates = applyBlockDrag(
                drag.block,
                drag.mode,
                drag.deltaSlots || 0,
                zoomMode === 'dia' ? dayHourWindow : null,
                dayContext,
            );
            const processCode = drag.targetProcess || drag.block.processCode;
            const sameDates = new Date(dates.plannedStart).getTime() === new Date(drag.block.plannedStart).getTime()
                && new Date(dates.plannedEnd).getTime() === new Date(drag.block.plannedEnd).getTime();
            if (sameDates && processCode === drag.block.processCode) return;
            onMoveBlock?.(drag.block, { ...dates, processCode });
        };

        const onCancel = () => {
            dragRef.current = null;
            setDragPreview(null);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onCancel);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onCancel);
        };
    }, [onEditBlock, onMoveBlock, zoomMode, dayHourWindow, dayContext]);

    useEffect(() => {
        if (!menu) return undefined;
        const close = () => setMenu(null);
        window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, [menu]);

    const startDrag = (event, block, mode, cellsEl) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        const grid = cellsEl || event.currentTarget.closest('.planeacion-gantt__day-cells');
        const colWidth = grid
            ? Math.max(1, grid.getBoundingClientRect().width / columnCount)
            : 28;
        dragRef.current = {
            block,
            mode,
            startX: event.clientX,
            startY: event.clientY,
            colWidth,
            deltaSlots: 0,
            targetProcess: block.processCode,
            didMove: false,
        };
        setMenu(null);
    };

    const handleContextMenu = (event, block) => {
        event.preventDefault();
        event.stopPropagation();
        setMenu({ x: event.clientX, y: event.clientY, block });
    };

    const handleAuxDragOver = (event, processCode) => {
        const types = Array.from(event.dataTransfer?.types || []);
        if (!types.includes(AUX_DRAG_TYPE) && !types.includes('text/plain')) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        setDropProcess(processCode);
    };

    const handleAuxDrop = (event, processCode, cellsEl) => {
        event.preventDefault();
        setDropProcess(null);
        const blockType = event.dataTransfer.getData(AUX_DRAG_TYPE) || event.dataTransfer.getData('text/plain');
        if (blockType !== 'Capacitacion' && blockType !== 'Limpieza') return;
        const col = columnFromClientX(cellsEl, event.clientX, columnCount);
        const day = dayFromViewColumn(zoomMode, year, month, weekIndex, selectedDay, col, dayHourWindow);
        if (!day) return;
        if (zoomMode === 'dia') {
            const minutes = minutesFromDayColumn(col, dayHourWindow);
            const start = utcDateTime(year, month, day, minutes);
            const end = utcDateTime(year, month, day, minutes + dayHourWindow.slotMinutes);
            onDropAux?.({ blockType, processCode, plannedStart: start, plannedEnd: end });
            return;
        }
        const date = utcDate(year, month, day);
        onDropAux?.({ blockType, processCode, plannedStart: date, plannedEnd: date });
    };

    const renderDayCells = (processCode) => {
        const cells = zoomMode === 'mes'
            ? monthDays
            : zoomMode === 'semana'
                ? weekDays
                : dayHourWindow.slots.map((slot) => ({
                    ...slot,
                    isToday: false,
                }));

        const visibleBlocks = (blocksByProcess[processCode] || []).map((block) => {
            if (dragPreview?.blockId === block.id && dragPreview.processCode !== processCode) {
                return null;
            }
            const preview = dragPreview?.blockId === block.id ? dragPreview : null;
            const effective = preview
                ? { ...block, plannedStart: preview.plannedStart, plannedEnd: preview.plannedEnd, processCode: preview.processCode }
                : block;
            if (effective.processCode !== processCode) return null;
            const spanSource = zoomMode === 'dia'
                ? { ...effective, ...materializeBlockDayTimes(effective, year, month, selectedDay, dayHourWindow) }
                : effective;
            const span = clipBlockSpan(spanSource, year, month, zoomMode, weekIndex, selectedDay, dayHourWindow);
            if (!span) return null;
            return { block, span, preview: !!preview };
        }).filter(Boolean);

        if (dragPreview && dragPreview.processCode === processCode) {
            const original = Object.values(blocksByProcess).flat().find((b) => b.id === dragPreview.blockId);
            if (original && original.processCode !== processCode) {
                const ghostBlock = { ...original, ...dragPreview };
                const spanSource = zoomMode === 'dia'
                    ? { ...ghostBlock, ...materializeBlockDayTimes(ghostBlock, year, month, selectedDay, dayHourWindow) }
                    : ghostBlock;
                const span = clipBlockSpan(spanSource, year, month, zoomMode, weekIndex, selectedDay, dayHourWindow);
                if (span) {
                    visibleBlocks.push({ block: { ...original, ...dragPreview }, span, preview: true, ghost: true });
                }
            }
        }

        return (
            <>
                <div className="planeacion-gantt__day-cells-bg" style={gridStyle} aria-hidden="true">
                    {cells.map((cell, idx) => {
                        if (cell.empty) {
                            return <div key={`empty-${idx}`} className="planeacion-gantt__day-cell planeacion-gantt__day-cell--empty" />;
                        }
                        const colIndex = zoomMode === 'mes' ? cell.day : cell.col;
                        const cellClass = zoomMode === 'dia'
                            ? `planeacion-gantt__day-cell${cell.isHalfHour ? ' planeacion-gantt__day-cell--half' : ''}`
                            : 'planeacion-gantt__day-cell';
                        return (
                            <div
                                key={`${processCode}-${colIndex}`}
                                className={cellClass}
                                style={{ gridColumn: colIndex, gridRow: 1 }}
                            />
                        );
                    })}
                </div>
                <div className="planeacion-gantt__day-cells-blocks" style={gridStyle}>
                    {visibleBlocks.map(({ block, span, preview, ghost }) => {
                        const compact = (zoomMode === 'mes' || zoomMode === 'semana') && span.span <= 2;
                        const label = blockLabel(block, { compact });
                        return (
                            <div
                                key={ghost ? `${block.id}-ghost` : block.id}
                                className={`planeacion-gantt__block ${blockClass(block.blockType)}${preview ? ' planeacion-gantt__block--preview' : ''}${dragPreview?.blockId === block.id && !ghost ? ' planeacion-gantt__block--dragging' : ''}${compact ? ' planeacion-gantt__block--compact' : ''}`}
                                style={{ gridColumn: `${span.startCol} / ${span.endCol}`, gridRow: 1 }}
                                title={`${blockLabel(block)}${block.clientName ? ` - ${block.clientName}` : ''} · Arrastre para mover`}
                                onPointerDown={(event) => startDrag(event, block, 'move', event.currentTarget.closest('.planeacion-gantt__day-cells'))}
                                onContextMenu={(event) => handleContextMenu(event, block)}
                                onKeyDown={(e) => { if (e.key === 'Enter') onEditBlock(block); }}
                                role="button"
                                tabIndex={0}
                            >
                                <span
                                    className="planeacion-gantt__block-handle planeacion-gantt__block-handle--start"
                                    onPointerDown={(event) => {
                                        event.stopPropagation();
                                        startDrag(event, block, 'resize-start', event.currentTarget.closest('.planeacion-gantt__day-cells'));
                                    }}
                                />
                                <span
                                    className="planeacion-gantt__block-handle planeacion-gantt__block-handle--end"
                                    onPointerDown={(event) => {
                                        event.stopPropagation();
                                        startDrag(event, block, 'resize-end', event.currentTarget.closest('.planeacion-gantt__day-cells'));
                                    }}
                                />
                                <span className="planeacion-gantt__block-label">{label}</span>
                            </div>
                        );
                    })}
                </div>
            </>
        );
    };

    const handleDeleteProcess = async (proc) => {
        if (!window.confirm(`Eliminar el proceso "${proc.label}"?`)) return;
        try {
            await schedulingApi.deleteProcess(proc.id);
            onProcessChanged?.();
            notifications.show({ title: 'Eliminado', message: 'Proceso eliminado.', color: 'green' });
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo eliminar.', color: 'red' });
        }
    };

    const renderFacturadoCell = (week, colSpanStyle) => {
        const data = billingByIndex[week.index];
        const generated = data?.generated ?? 0;
        const baseMeta = data?.baseMeta ?? 0;
        const totalMeta = data?.totalMeta ?? 0;
        const delta = data?.delta ?? 0;
        const hasMeta = (billingSummary?.monthlyGoal ?? 0) > 0;

        return (
            <div
                key={`fact-${week.label}`}
                className={`planeacion-gantt__facturado-cell ${week.colorClass}`}
                style={colSpanStyle}
            >
                <div className="planeacion-gantt__facturado-line">Gen. $ {formatBillingMoney(generated)}</div>
                <div className="planeacion-gantt__facturado-line">Meta base $ {formatBillingMoney(baseMeta)}</div>
                <div className="planeacion-gantt__facturado-total">Total meta $ {formatBillingMoney(totalMeta)}</div>
                <div className={`planeacion-gantt__facturado-delta${delta >= 0 ? ' planeacion-gantt__facturado-delta--pos' : ' planeacion-gantt__facturado-delta--neg'}`}>
                    {hasMeta ? formatBillingDelta(delta) : '+ $ 0'}
                </div>
            </div>
        );
    };

    return (
        <div className="planeacion-gantt__scroll">
            <div className={`planeacion-gantt__grid planeacion-gantt__grid--${zoomMode}`} style={gridStyle}>
                {zoomMode === 'mes' && (
                    <>
                        <div className="planeacion-gantt__week-row">
                            <div className="planeacion-gantt__corner">
                                <span className="planeacion-gantt__corner-title">{monthName}</span>
                                <Group gap={4} className="planeacion-gantt__corner-procesos">
                                    <span className="planeacion-gantt__corner-sub">Procesos</span>
                                    {processManageMode && (
                                        <ActionIcon variant="light" size="xs" onClick={onManageProcesses} aria-label="Agregar proceso">
                                            <IconPlus size={12} />
                                        </ActionIcon>
                                    )}
                                </Group>
                            </div>
                            {weeks.map((week) => (
                                <button
                                    key={week.label}
                                    type="button"
                                    className={`planeacion-gantt__week-cell ${week.colorClass}${weekIndex === week.index ? ' planeacion-gantt__week-cell--active' : ''}`}
                                    style={{ gridColumn: `${week.startDay + 1} / ${week.endDay + 2}` }}
                                    onClick={() => onSelectWeek(week.index)}
                                    title={`Ver semana ${week.label}: ${week.rangeLabel}`}
                                >
                                    <span className="planeacion-gantt__week-label">{week.label}</span>
                                    <span className="planeacion-gantt__week-range">{week.rangeLabel}</span>
                                </button>
                            ))}
                        </div>
                        <div className="planeacion-gantt__day-header-row">
                            <div className="planeacion-gantt__corner planeacion-gantt__corner--days">Dia</div>
                            {monthDays.map((cell) => (
                                <button
                                    key={cell.day}
                                    type="button"
                                    className={`planeacion-gantt__day-header ${cell.colorClass}${cell.isToday ? ' planeacion-gantt__day-header--today' : ''}`}
                                    onClick={() => onSelectDay(cell.day)}
                                    title={`Ver dia ${cell.day}`}
                                >
                                    <span className="planeacion-gantt__day-initial">{cell.initial}</span>
                                    <span className="planeacion-gantt__day-num">{cell.day}</span>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {zoomMode === 'semana' && activeWeek && (
                    <>
                        <div className="planeacion-gantt__week-row planeacion-gantt__week-row--single">
                            <div className="planeacion-gantt__corner">
                                <span className="planeacion-gantt__corner-title">{activeWeek.label}</span>
                                <span className="planeacion-gantt__corner-sub">{activeWeek.rangeLabel}</span>
                            </div>
                            <div className={`planeacion-gantt__week-banner ${activeWeek.colorClass}`} style={{ gridColumn: '2 / -1' }}>
                                Semana {activeWeek.label}: {activeWeek.rangeLabel}
                            </div>
                        </div>
                        <div className="planeacion-gantt__day-header-row">
                            <div className="planeacion-gantt__corner planeacion-gantt__corner--days">Dia</div>
                            {weekDays.map((cell, idx) => (
                                cell.empty ? (
                                    <div key={`w-empty-${idx}`} className={`planeacion-gantt__day-header planeacion-gantt__day-header--empty ${activeWeek.colorClass}`}>—</div>
                                ) : (
                                    <button
                                        key={cell.day}
                                        type="button"
                                        className={`planeacion-gantt__day-header ${activeWeek.colorClass}${cell.isToday ? ' planeacion-gantt__day-header--today' : ''}`}
                                        onClick={() => onSelectDay(cell.day)}
                                    >
                                        <span className="planeacion-gantt__day-initial">{cell.initial}</span>
                                        <span className="planeacion-gantt__day-num">{cell.day}</span>
                                    </button>
                                )
                            ))}
                        </div>
                    </>
                )}

                {zoomMode === 'dia' && (
                    <>
                        <div className="planeacion-gantt__week-row">
                            <div className="planeacion-gantt__corner">
                                <span className="planeacion-gantt__corner-title">Dia {selectedDay}</span>
                                <span className="planeacion-gantt__corner-sub">{monthName}</span>
                            </div>
                            <div
                                className={`planeacion-gantt__week-banner ${dayWeekColor}`}
                                style={{ gridColumn: `2 / ${columnCount + 2}` }}
                            >
                                {formatCalendarDayLabel(year, month, selectedDay)} · {dayHourWindow.rangeLabel}
                            </div>
                        </div>
                        <div className="planeacion-gantt__day-header-row planeacion-gantt__day-header-row--hours">
                            <div className="planeacion-gantt__corner planeacion-gantt__corner--days">Horas</div>
                            {dayHourWindow.slots.map((slot) => (
                                <div
                                    key={`hour-${slot.col}`}
                                    className={`planeacion-gantt__hour-header ${dayWeekColor}${slot.isHalfHour ? ' planeacion-gantt__hour-header--half' : ''}${slot.isHourStart ? ' planeacion-gantt__hour-header--hour' : ''}`}
                                    title={slot.hourLabel || undefined}
                                >
                                    {slot.hourLabel ? (
                                        <span className="planeacion-gantt__hour-label">{slot.hourLabel}</span>
                                    ) : null}
                                </div>
                            ))}
                            {dayHourWindow.endLabel && (
                                <div className="planeacion-gantt__hour-end-marker" aria-hidden="true">
                                    {dayHourWindow.endLabel}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {todayCol != null && (
                    <div
                        className="planeacion-gantt__today-line"
                        style={{ '--today-col': todayCol, '--gantt-days': columnCount }}
                        aria-hidden="true"
                    />
                )}

                {processes.map((process) => (
                    <div key={process.code} className="planeacion-gantt__process-row">
                        <div className="planeacion-gantt__process-label">
                            <span>{process.label}</span>
                            {processManageMode && process.id && (
                                <Group gap={2} className="planeacion-gantt__process-actions">
                                    <ActionIcon variant="light" color="blue" size="xs" onClick={onManageProcesses} aria-label="Editar proceso">
                                        <IconPencil size={12} />
                                    </ActionIcon>
                                    <ActionIcon variant="light" color="red" size="xs" onClick={() => handleDeleteProcess(process)} aria-label="Eliminar proceso">
                                        <IconTrash size={12} />
                                    </ActionIcon>
                                </Group>
                            )}
                        </div>
                        <div
                            className={`planeacion-gantt__day-cells${dropProcess === process.code ? ' planeacion-gantt__day-cells--drop-target' : ''}`}
                            style={gridStyle}
                            data-process-code={process.code}
                            onDragOver={(event) => handleAuxDragOver(event, process.code)}
                            onDragLeave={() => setDropProcess((current) => (current === process.code ? null : current))}
                            onDrop={(event) => handleAuxDrop(event, process.code, event.currentTarget)}
                        >
                            {renderDayCells(process.code)}
                        </div>
                    </div>
                ))}

                <div className="planeacion-gantt__facturado-row">
                    <div className="planeacion-gantt__facturado-label">
                        <span className="planeacion-gantt__facturado-title">FACTURADO</span>
                        <button type="button" className="planeacion-gantt__facturado-link" onClick={onDefineMeta}>
                            Definir meta
                        </button>
                    </div>
                    {zoomMode === 'mes' && weeks.map((week) => renderFacturadoCell(week, { gridColumn: `${week.startDay + 1} / ${week.endDay + 2}` }))}
                    {zoomMode === 'semana' && activeWeek && renderFacturadoCell(activeWeek, { gridColumn: '2 / -1' })}
                    {zoomMode === 'dia' && activeWeek && renderFacturadoCell(activeWeek, { gridColumn: `2 / ${columnCount + 2}` })}
                </div>
            </div>

            {menu && (
                <div
                    className="planeacion-gantt__context"
                    style={{ left: menu.x, top: menu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button type="button" onClick={() => { onEditBlock?.(menu.block); setMenu(null); }}>Editar actividad</button>
                    <button type="button" className="planeacion-gantt__context--danger" onClick={() => { onDeleteBlock?.(menu.block); setMenu(null); }}>Eliminar actividad</button>
                </div>
            )}
        </div>
    );
}
