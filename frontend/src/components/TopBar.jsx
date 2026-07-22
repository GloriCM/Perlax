import { Autocomplete, Burger, Group, ActionIcon, Text, Indicator, Box } from '@mantine/core';
import { IconSearch, IconBell, IconMessageCircle } from '@tabler/icons-react';
import './TopBar.css';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { navSections } from '../config/navSections';
import { getCurrentUser, canAccessRoute } from '../utils/permissions';

function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function flattenNavItems(items, trail = []) {
    const out = [];
    for (const item of items) {
        const nextTrail = [...trail, item.label];
        if (item.path && !item.children?.length) {
            const prettyLabel = trail.length
                ? `${item.label} — ${trail.join(' › ')}`
                : item.label;
            out.push({
                label: prettyLabel,
                path: item.path,
                keywords: [item.label, ...trail, nextTrail.join(' ')].join(' ')
            });
        }
        if (item.children?.length) {
            out.push(...flattenNavItems(item.children, nextTrail));
        }
    }
    return out;
}

function dedupeSearchIndex(entries) {
    const seen = new Set();
    return entries.filter((entry) => {
        if (seen.has(entry.path)) return false;
        seen.add(entry.path);
        return true;
    });
}

export default function TopBar({ showMenuButton = false, menuOpened = false, onMenuClick }) {
    const navigate = useNavigate();
    const [date, setDate] = useState('');
    const [query, setQuery] = useState('');

    useEffect(() => {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        setDate(new Date().toLocaleDateString('es-ES', options));
    }, []);

    const searchIndex = useMemo(() => {
        const user = getCurrentUser();
        return dedupeSearchIndex(
            navSections
                .flatMap((section) => flattenNavItems(section.items))
                .filter((entry) => canAccessRoute(entry.path, user))
        );
    }, []);

    const suggestions = useMemo(() => {
        if (normalizeText(query).length < 2) return [];
        const terms = normalizeText(query).split(/\s+/).filter(Boolean);
        const matches = searchIndex.map((entry) => {
            if (terms.length === 0) return true;
            const haystack = normalizeText(`${entry.label} ${entry.keywords}`);
            const allTerms = terms.every((term) => haystack.includes(term));
            if (!allTerms) return null;

            const normalizedLabel = normalizeText(entry.label);
            const startsWith = normalizedLabel.startsWith(terms[0]) ? 1 : 0;
            return { ...entry, score: startsWith };
        }).filter(Boolean);

        const unique = [];
        const seenPaths = new Set();
        for (const match of matches.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, 'es'))) {
            if (seenPaths.has(match.path)) continue;
            seenPaths.add(match.path);
            unique.push({ value: match.path, label: match.label });
            if (unique.length >= 8) break;
        }
        return unique;
    }, [query, searchIndex]);

    const goToPath = (path) => {
        if (!path) return;
        navigate(path);
        setQuery('');
    };

    return (
        <div className="topbar-root">
            <div className="topbar-grid">
                <Group gap="sm" wrap="nowrap" className="topbar-search-group">
                    <Burger
                        className={`topbar-burger ${showMenuButton ? 'topbar-burger--visible' : ''}`}
                        opened={menuOpened}
                        onClick={onMenuClick}
                        size="sm"
                        color="#e2e8f0"
                        aria-label={menuOpened ? 'Cerrar menú' : 'Mostrar menú'}
                    />
                    <Autocomplete
                        className="topbar-search"
                        placeholder="Buscar módulos..."
                        leftSection={<IconSearch size={18} stroke={1.5} />}
                        size="md"
                        value={query}
                        onChange={setQuery}
                        data={suggestions}
                        limit={8}
                        onOptionSubmit={goToPath}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && suggestions.length > 0) {
                                e.preventDefault();
                                goToPath(suggestions[0].value);
                            }
                        }}
                        styles={{
                            root: { flex: 1, minWidth: 0 },
                            input: {
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                color: 'white',
                                borderRadius: 12,
                                '&::placeholder': { color: '#64748b' },
                            },
                            dropdown: {
                                background: 'rgba(15, 23, 42, 0.98)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 12,
                                boxShadow: '0 12px 32px rgba(2, 6, 23, 0.55)',
                            },
                            option: {
                                color: '#e2e8f0',
                                borderRadius: 8,
                                margin: '2px 6px',
                                fontSize: 13,
                            }
                        }}
                    />
                </Group>

                <Box
                    px="md"
                    py={6}
                    className="topbar-date"
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 10,
                    }}
                >
                    <Text size="sm" c="dimmed" style={{ textTransform: 'capitalize' }}>
                        {date}
                    </Text>
                </Box>

                <Group gap="sm" wrap="nowrap" className="topbar-actions" justify="flex-end">
                    <ActionIcon
                        variant="subtle"
                        size="lg"
                        radius="md"
                        c="dimmed"
                        aria-label="Abrir chat"
                        title="Chat interno"
                        onClick={() => navigate('/chat')}
                    >
                        <IconMessageCircle size={22} stroke={1.5} />
                    </ActionIcon>
                    <Indicator color="red" size={10} offset={4} processing>
                        <ActionIcon
                            variant="subtle"
                            size="lg"
                            radius="md"
                            c="dimmed"
                            aria-label="Notificaciones"
                        >
                            <IconBell size={22} stroke={1.5} />
                        </ActionIcon>
                    </Indicator>
                </Group>
            </div>
        </div>
    );
}
