import { Autocomplete, Group, ActionIcon, Text, Indicator, Box } from '@mantine/core';
import { IconSearch, IconBell } from '@tabler/icons-react';
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
            const moduleLabel = trail[trail.length - 1] || '';
            const prettyLabel = moduleLabel
                ? `${item.label} — ${moduleLabel}`
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

export default function TopBar() {
    const navigate = useNavigate();
    const [date, setDate] = useState('');
    const [query, setQuery] = useState('');

    useEffect(() => {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        setDate(new Date().toLocaleDateString('es-ES', options));
    }, []);

    const searchIndex = useMemo(() => {
        const user = getCurrentUser();
        return navSections
            .flatMap((section) => flattenNavItems(section.items))
            .filter((entry) => canAccessRoute(entry.path, user));
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

        return matches
            .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, 'es'))
            .slice(0, 8)
            .map((m) => m.label);
    }, [query, searchIndex]);

    const goToLabel = (label) => {
        const match = searchIndex.find((entry) => entry.label === label);
        if (!match?.path) return;
        navigate(match.path);
        setQuery('');
    };

    return (
        <Group justify="space-between" align="center" py="sm" px={4}>
            <Autocomplete
                placeholder="Buscar módulos, órdenes o reportes..."
                leftSection={<IconSearch size={18} stroke={1.5} />}
                size="md"
                w={420}
                value={query}
                onChange={setQuery}
                data={suggestions}
                limit={8}
                nothingFoundMessage={normalizeText(query).length < 2 ? 'Escribe al menos 2 letras' : 'Sin resultados'}
                onOptionSubmit={goToLabel}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && suggestions.length > 0) {
                        e.preventDefault();
                        goToLabel(suggestions[0]);
                    }
                }}
                styles={{
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
            <Group gap="lg">
                <Indicator color="red" size={10} offset={4} processing>
                    <ActionIcon
                        variant="subtle"
                        size="lg"
                        radius="md"
                        c="dimmed"
                    >
                        <IconBell size={22} stroke={1.5} />
                    </ActionIcon>
                </Indicator>
                <Box
                    px="md"
                    py={6}
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
            </Group>
        </Group>
    );
}
