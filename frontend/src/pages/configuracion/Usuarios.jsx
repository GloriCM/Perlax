import { useEffect, useState, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import {
    Card,
    Title,
    Text,
    Group,
    Stack,
    TextInput,
    Button,
    Table,
    Badge,
    ActionIcon,
    Tooltip,
    Modal,
    NumberInput,
    PasswordInput,
    Select,
    ScrollArea,
    Box,
    UnstyledButton,
} from '@mantine/core';
import { IconPlus, IconPencil, IconUserOff, IconUserCheck, IconRefresh, IconLayoutGrid } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../utils/api';
import {
    getCurrentUser,
    isAdmin,
    getNavLeafRouteOptions,
    getNavPermissionMatrix,
    normPath,
} from '../../utils/permissions';

const emptyForm = {
    firstName: '',
    lastName: '',
    area: '',
    documentNumber: '',
    salary: '',
    username: '',
    email: '',
    password: '',
    role: 'Administrativo',
    allowedRoutes: [],
    isActive: true,
};

const AREA_OPTIONS = [
    { value: 'calidad', label: 'Calidad' },
    { value: 'produccion', label: 'Producción' },
    { value: 'talleres', label: 'Talleres' },
    { value: 'planeaccion', label: 'Planeacción' },
    { value: 'diseño', label: 'Diseño' },
    { value: 'ti', label: 'TI' },
    { value: 'mantenimiento', label: 'Mantenimiento' },
    { value: 'sst', label: 'SST' },
    { value: 'gestion humana', label: 'Gestión humana' },
];

function PermissionCell({ path, selected, onToggle }) {
    const p = normPath(path);
    const isOn = selected.has(p);
    return (
        <UnstyledButton
            type="button"
            onClick={() => onToggle(p)}
            style={{
                minWidth: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                border: `2px solid ${isOn ? 'rgba(99, 102, 241, 0.85)' : 'rgba(148, 163, 184, 0.35)'}`,
                background: isOn ? 'rgba(99, 102, 241, 0.18)' : 'rgba(15, 23, 42, 0.5)',
                cursor: 'pointer',
                transition: 'background 0.12s, border-color 0.12s',
            }}
        >
            <Text fw={900} size="md" ff="monospace" c={isOn ? 'indigo.3' : 'dimmed'} style={{ lineHeight: 1 }}>
                {isOn ? 'X' : ''}
            </Text>
        </UnstyledButton>
    );
}

export default function UsuariosConfig() {
    const me = getCurrentUser();
    if (!isAdmin(me)) return <Navigate to="/" replace />;

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [matrixModalOpen, setMatrixModalOpen] = useState(false);
    const [matrixDraft, setMatrixDraft] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    const allLeafPaths = useMemo(() => getNavLeafRouteOptions().map((o) => o.value), []);
    const permissionMatrix = useMemo(() => getNavPermissionMatrix(), []);

    const selectedSet = useMemo(() => new Set(matrixDraft.map(normPath)), [matrixDraft]);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await api.get('/users');
            setUsers(Array.isArray(data) ? data : []);
        } catch (e) {
            notifications.show({
                title: 'Error',
                message: e.message || 'No se pudieron cargar los usuarios',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const openCreate = () => {
        setEditingId(null);
        setForm({ ...emptyForm });
        setModalOpen(true);
    };

    const openEdit = (u) => {
        const rawRole = (u.role || 'Administrativo').toLowerCase();
        let role = 'Administrativo';
        if (rawRole === 'admin' || rawRole === 'administrador') role = 'Administrador';
        else if (rawRole === 'operario') role = 'Operario';
        let routes = [];
        if (role === 'Administrativo') {
            if (Array.isArray(u.allowedRoutes)) routes = [...u.allowedRoutes];
            else if (u.allowedRoutes === null || u.allowedRoutes === undefined) routes = [...allLeafPaths];
        }
        setEditingId(u.id);
        setForm({
            firstName: u.firstName || '',
            lastName: u.lastName || '',
            area: u.area || '',
            documentNumber: u.documentNumber || '',
            salary: u.salary ?? '',
            username: u.username || '',
            email: u.email || '',
            password: '',
            role,
            allowedRoutes: routes,
            isActive: u.isActive !== false,
        });
        setModalOpen(true);
    };

    const openMatrixModal = () => {
        setMatrixDraft(form.allowedRoutes.map(normPath));
        setMatrixModalOpen(true);
    };

    const toggleMatrixPath = (path) => {
        const p = normPath(path);
        setMatrixDraft((prev) => {
            const set = new Set(prev.map(normPath));
            if (set.has(p)) set.delete(p);
            else set.add(p);
            return [...set];
        });
    };

    const applyMatrixSelection = () => {
        setForm((f) => ({ ...f, allowedRoutes: [...matrixDraft] }));
        setMatrixModalOpen(false);
    };

    const handleSubmit = async () => {
        const isAdminRole = form.role === 'Administrador';
        const isOperatorRole = form.role === 'Operario';
        const documentNumber = String(form.documentNumber || '').replace(/[^\d]/g, '');

        if (!documentNumber) {
            notifications.show({
                title: 'Cédula requerida',
                message: 'La cédula de ciudadanía es obligatoria. Será el usuario y la contraseña inicial.',
                color: 'yellow',
            });
            return;
        }
        if (form.salary === '' || form.salary === null || form.salary === undefined) {
            notifications.show({
                title: 'Salario requerido',
                message: 'Indique el salario del usuario.',
                color: 'yellow',
            });
            return;
        }
        if (!isAdminRole && !isOperatorRole && !form.area) {
            notifications.show({
                title: 'Área requerida',
                message: 'Seleccione el área para rol Administrativo.',
                color: 'yellow',
            });
            return;
        }
        try {
            setSaving(true);
            if (editingId) {
                const putPayload = {
                    firstName: form.firstName?.trim() || null,
                    lastName: form.lastName?.trim() || null,
                    area: isAdminRole ? null : (isOperatorRole ? 'produccion' : form.area),
                    documentNumber,
                    salary: Number(form.salary),
                    email: form.email?.trim() || null,
                    role: form.role,
                    allowedRoutes: isAdminRole ? null : (isOperatorRole ? [] : form.allowedRoutes),
                };
                if (form.password?.trim()) putPayload.password = form.password;
                await api.put(`/users/${editingId}`, putPayload);
            } else {
                await api.post('/users', {
                    firstName: form.firstName?.trim() || null,
                    lastName: form.lastName?.trim() || null,
                    area: isAdminRole ? null : (isOperatorRole ? 'produccion' : form.area),
                    documentNumber,
                    salary: Number(form.salary),
                    email: form.email?.trim() || null,
                    role: form.role,
                    allowedRoutes: isAdminRole ? null : (isOperatorRole ? [] : form.allowedRoutes),
                });
            }
            notifications.show({
                title: 'Listo',
                message: editingId
                    ? 'Usuario actualizado'
                    : `Usuario creado. Login y contraseña temporal: ${documentNumber}`,
                color: 'teal',
            });
            setModalOpen(false);
            load();
        } catch (e) {
            notifications.show({
                title: 'Error',
                message: e.message || 'No se pudo guardar',
                color: 'red',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleSetActive = async (u, isActive) => {
        if (u.isSystemUser && !isActive) return;
        const label = isActive ? 'reactivar' : 'desactivar';
        if (!window.confirm(`¿${isActive ? 'Reactivar' : 'Desactivar'} al usuario "${u.username}"?${isActive ? '' : ' No podrá iniciar sesión; el historial se conserva.'}`)) return;
        try {
            await api.post(`/users/${u.id}/set-active`, { isActive });
            notifications.show({
                title: isActive ? 'Reactivado' : 'Desactivado',
                message: isActive
                    ? 'El usuario puede volver a iniciar sesión.'
                    : 'Usuario desactivado. Puede reactivarlo cuando vuelva.',
                color: 'teal',
            });
            if (editingId === u.id) {
                setForm((f) => ({ ...f, isActive }));
            }
            load();
        } catch (e) {
            notifications.show({
                title: 'Error',
                message: e.message || `No se pudo ${label}`,
                color: 'red',
            });
        }
    };

    const permLabel = (u) => {
        if (u.isActive === false) return 'Desactivado';
        if ((u.role || '').toLowerCase() === 'operario') return 'Planta (/planta)';
        if ((u.role || '').toLowerCase() === 'admin' || (u.role || '').toLowerCase() === 'administrador') return 'Completo';
        if (u.allowedRoutes === null || u.allowedRoutes === undefined) return 'Completo (sin lista)';
        if (u.allowedRoutes.length === 0) return 'Solo inicio';
        return `${u.allowedRoutes.length} vista(s)`;
    };

    const selectedCount = form.role === 'Administrativo' ? form.allowedRoutes.length : 0;

    return (
        <Stack p="md" gap="md">
            <Group justify="space-between" align="flex-start">
                <div>
                    <Title order={2}>Usuarios</Title>
                    <Text size="sm" c="dimmed" maw={560}>
                        Alta y edición de usuarios. Si alguien deja de trabajar, desactívelo (no se borra): puede
                        reactivarlo cuando vuelva. El historial se conserva.
                    </Text>
                </div>
                <Group>
                    <Button
                        leftSection={<IconRefresh size={18} />}
                        variant="light"
                        onClick={load}
                        loading={loading}
                    >
                        Actualizar
                    </Button>
                    <Button leftSection={<IconPlus size={18} />} onClick={openCreate}>
                        Nuevo usuario
                    </Button>
                </Group>
            </Group>

            <Card padding="lg" radius="md" withBorder>
                <Table.ScrollContainer minWidth={720}>
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Nombre</Table.Th>
                                <Table.Th>Login</Table.Th>
                                <Table.Th>Correo</Table.Th>
                                <Table.Th>Rol</Table.Th>
                                <Table.Th>Estado</Table.Th>
                                <Table.Th>Área</Table.Th>
                                <Table.Th>Permisos</Table.Th>
                                <Table.Th w={120} />
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {users.map((u) => (
                                <Table.Tr key={u.id} opacity={u.isActive === false ? 0.55 : 1}>
                                    <Table.Td>
                                        <Text size="sm">
                                            {[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text fw={600} size="sm">
                                            {u.username}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="sm">{u.email}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Badge variant="light">{u.role}</Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        <Badge color={u.isActive === false ? 'gray' : 'teal'} variant="light">
                                            {u.isActive === false ? 'Inactivo' : 'Activo'}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="xs" c="dimmed">{u.area || '—'}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="xs" c="dimmed">
                                            {permLabel(u)}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap={4}>
                                            <Tooltip label="Editar">
                                                <ActionIcon variant="subtle" onClick={() => openEdit(u)}>
                                                    <IconPencil size={18} />
                                                </ActionIcon>
                                            </Tooltip>
                                            {!u.isSystemUser && (
                                                u.isActive === false ? (
                                                    <Tooltip label="Reactivar">
                                                        <ActionIcon variant="subtle" color="teal" onClick={() => handleSetActive(u, true)}>
                                                            <IconUserCheck size={18} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                ) : (
                                                    <Tooltip label="Desactivar">
                                                        <ActionIcon variant="subtle" color="orange" onClick={() => handleSetActive(u, false)}>
                                                            <IconUserOff size={18} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                )
                                            )}
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </Table.ScrollContainer>
            </Card>

            <Modal
                opened={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingId ? 'Editar usuario' : 'Nuevo usuario'}
                size="lg"
            >
                <Stack gap="md">
                    <Group grow>
                        <TextInput
                            label="Nombre"
                            value={form.firstName}
                            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                        />
                        <TextInput
                            label="Apellido"
                            value={form.lastName}
                            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                        />
                    </Group>
                    <Group grow>
                        <TextInput
                            label="Cédula de ciudadanía"
                            value={form.documentNumber}
                            onChange={(e) => setForm({ ...form, documentNumber: e.target.value.replace(/[^\d]/g, '') })}
                            placeholder="Sin puntos ni comas"
                            required
                        />
                        <NumberInput
                            label="Salario"
                            value={form.salary}
                            onChange={(v) => setForm({ ...form, salary: v ?? '' })}
                            min={0}
                            step={50000}
                            thousandSeparator="."
                            decimalSeparator=","
                            prefix="$ "
                            hideControls
                            required
                        />
                    </Group>
                    {!editingId && (
                        <Text size="xs" c="dimmed">
                            El usuario de inicio de sesión y la contraseña temporal serán la cédula.
                            En el primer ingreso el sistema pedirá cambiar la contraseña.
                        </Text>
                    )}
                    {editingId && (
                        <>
                            <TextInput
                                label="Usuario (login)"
                                value={form.documentNumber || form.username}
                                disabled
                                description="Coincide con la cédula"
                            />
                            <TextInput
                                label="Correo"
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                            />
                            <PasswordInput
                                label="Restablecer contraseña (vacío = no cambiar)"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                description="Si la restablece, el usuario deberá cambiarla al entrar"
                            />
                        </>
                    )}
                    <Select
                        label="Rol"
                        data={[
                            { value: 'Administrativo', label: 'Administrativo' },
                            { value: 'Administrador', label: 'Administrador' },
                            { value: 'Operario', label: 'Operario (planta)' },
                        ]}
                        value={form.role}
                        onChange={(v) =>
                            setForm({
                                ...form,
                                role: v || 'Administrativo',
                                area: v === 'Administrativo' ? form.area : '',
                                allowedRoutes: v === 'Administrativo' ? form.allowedRoutes : [],
                            })
                        }
                    />
                    {form.role === 'Operario' && (
                        <Text size="xs" c="dimmed">
                            Los usuarios con rol Operario aparecen automáticamente como operarios en la pantalla de
                            planta (/planta) y en el Reporte Diario. No tienen acceso a los módulos administrativos.
                        </Text>
                    )}
                    {form.role === 'Administrativo' && (
                        <Stack gap="xs">
                            <Select
                                label="Área"
                                data={AREA_OPTIONS}
                                value={form.area}
                                onChange={(v) => setForm({ ...form, area: v || '' })}
                                searchable
                                required
                            />
                            <Text size="sm" fw={500}>
                                Vistas permitidas
                            </Text>
                            <Text size="xs" c="dimmed">
                                Cada celda con X indica acceso a esa vista. Sin ninguna X, el usuario solo verá la pantalla de
                                inicio.
                            </Text>
                            <Group align="center" wrap="wrap">
                                <Button
                                    leftSection={<IconLayoutGrid size={18} />}
                                    variant="light"
                                    onClick={openMatrixModal}
                                >
                                    Selección de módulos y vistas
                                </Button>
                                <Text size="sm" c="dimmed">
                                    {selectedCount === 0
                                        ? 'Ninguna vista (solo inicio)'
                                        : `${selectedCount} vista${selectedCount === 1 ? '' : 's'} autorizada${selectedCount === 1 ? '' : 's'}`}
                                </Text>
                            </Group>
                        </Stack>
                    )}
                    <Group justify="space-between" wrap="wrap">
                        {editingId && !users.find((x) => x.id === editingId)?.isSystemUser ? (
                            form.isActive === false ? (
                                <Button
                                    variant="light"
                                    color="teal"
                                    leftSection={<IconUserCheck size={16} />}
                                    onClick={() => handleSetActive({ id: editingId, username: form.username || form.documentNumber, isSystemUser: false }, true)}
                                >
                                    Reactivar usuario
                                </Button>
                            ) : (
                                <Button
                                    variant="light"
                                    color="orange"
                                    leftSection={<IconUserOff size={16} />}
                                    onClick={() => handleSetActive({ id: editingId, username: form.username || form.documentNumber, isSystemUser: false }, false)}
                                >
                                    Desactivar usuario
                                </Button>
                            )
                        ) : (
                            <span />
                        )}
                        <Group>
                            <Button variant="default" onClick={() => setModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSubmit} loading={saving}>
                                Guardar
                            </Button>
                        </Group>
                    </Group>
                </Stack>
            </Modal>

            <Modal
                opened={matrixModalOpen}
                onClose={() => setMatrixModalOpen(false)}
                title="Selección de módulos y vistas"
                size="xl"
            >
                <Stack gap="lg">
                    <Text size="sm" c="dimmed">
                        Haga clic en una celda para marcar X (autorizado) o dejarla vacía (sin acceso). Cada bloque es un
                        módulo del menú; las columnas son sus vistas.
                    </Text>
                    <ScrollArea h={{ base: 360, sm: 480 }} type="auto" offsetScrollbars>
                        <Stack gap="xl" pr="xs">
                            {permissionMatrix.map((section) => (
                                <Box key={section.sectionTitle}>
                                    <Title order={5} c="orange.3" mb="sm" tt="uppercase" size={12} fw={700}>
                                        {section.sectionTitle}
                                    </Title>
                                    <Stack gap="md">
                                        {section.modules.map((mod) => (
                                            <Box
                                                key={mod.key}
                                                p="sm"
                                                style={{
                                                    borderRadius: 12,
                                                    border: '1px solid rgba(148, 163, 184, 0.2)',
                                                    background: 'rgba(15, 23, 42, 0.45)',
                                                }}
                                            >
                                                <Table.ScrollContainer
                                                    minWidth={Math.max(400, 160 + mod.leaves.length * 100)}
                                                    type="native"
                                                >
                                                <Table
                                                    withTableBorder
                                                    withColumnBorders
                                                    horizontalSpacing="xs"
                                                    verticalSpacing="xs"
                                                    layout="fixed"
                                                >
                                                    <Table.Thead>
                                                        <Table.Tr
                                                            style={{
                                                                background: 'rgba(251, 146, 60, 0.12)',
                                                            }}
                                                        >
                                                            <Table.Th
                                                                w={160}
                                                                style={{
                                                                    borderRight: '1px solid rgba(148, 163, 184, 0.25)',
                                                                }}
                                                            >
                                                                <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                                                                    Módulo / vista
                                                                </Text>
                                                            </Table.Th>
                                                            {mod.leaves.map((leaf) => (
                                                                <Table.Th key={leaf.path} style={{ textAlign: 'center' }}>
                                                                    <Text size="xs" fw={600} lineClamp={3}>
                                                                        {leaf.label}
                                                                    </Text>
                                                                </Table.Th>
                                                            ))}
                                                        </Table.Tr>
                                                    </Table.Thead>
                                                    <Table.Tbody>
                                                        <Table.Tr>
                                                            <Table.Td
                                                                style={{
                                                                    verticalAlign: 'middle',
                                                                    background: 'rgba(30, 41, 59, 0.5)',
                                                                }}
                                                            >
                                                                <Text size="sm" fw={600}>
                                                                    {mod.label}
                                                                </Text>
                                                            </Table.Td>
                                                            {mod.leaves.map((leaf) => (
                                                                <Table.Td key={leaf.path} style={{ textAlign: 'center' }}>
                                                                    <PermissionCell
                                                                        path={leaf.path}
                                                                        selected={selectedSet}
                                                                        onToggle={toggleMatrixPath}
                                                                    />
                                                                </Table.Td>
                                                            ))}
                                                        </Table.Tr>
                                                    </Table.Tbody>
                                                </Table>
                                                </Table.ScrollContainer>
                                            </Box>
                                        ))}
                                    </Stack>
                                </Box>
                            ))}
                        </Stack>
                    </ScrollArea>
                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setMatrixModalOpen(false)}>
                            Cerrar sin aplicar
                        </Button>
                        <Button onClick={applyMatrixSelection}>Aplicar selección</Button>
                    </Group>
                </Stack>
            </Modal>
        </Stack>
    );
}
