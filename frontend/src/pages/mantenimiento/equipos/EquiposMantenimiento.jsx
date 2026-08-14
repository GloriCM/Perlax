import { useState } from 'react';
import { Title, Text, Group, TextInput, Select, Modal, Button, ActionIcon, Avatar, SimpleGrid, Card, Divider } from '@mantine/core';
import {
    IconArrowLeft,
    IconSearch,
    IconPlus,
    IconMapPin,
    IconNetwork,
    IconUsers,
    IconCamera,
    IconX,
    IconDeviceDesktop,
    IconMouse,
    IconKeyboard,
    IconPrinter,
    IconVideo,
    IconDeviceUnknown,
    IconLock,
    IconCalendar,
    IconNotebook,
    IconFileText,
    IconSettings,
    IconTools,
    IconTool,
    IconMessage2,
    IconUser,
    IconCoin,
    IconPencil,
    IconTrash,
    IconCertificate,
    IconNotes,
    IconClipboardList
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import './EquiposMantenimiento.css';

const MOCK_EQUIPOS = [
    {
        id: 1,
        name: "Almacen",
        model: "DELL OPTIPLEX",
        location: "Primer Piso - Planta 2",
        ip: "192.168.100.133",
        dept: "Almacen",
        status: "Asignado",
        inspeccion: "02 de ene de 2026",
        mantenimiento: "21 de ene de 2026",
        imageUrl: "https://images.unsplash.com/photo-1547082299-de196ea013d6?w=400&q=80"
    },
    {
        id: 2,
        name: "Calidad",
        model: "DELL OPTIPLEX",
        location: "Primer Piso - Planta 1",
        ip: "192.168.100.47",
        dept: "Calidad",
        status: "Asignado",
        inspeccion: "02 de ene de 2026",
        mantenimiento: "15 de ene de 2026",
        imageUrl: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=400&q=80"
    },
    {
        id: 3,
        name: "Contabilidad1",
        model: "HP 800",
        location: "Segundo piso - Planta2",
        ip: "192.168.100.205",
        dept: "Contabilidad",
        status: "En Mantenimiento",
        inspeccion: "N/A",
        mantenimiento: "N/A",
        imageUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80"
    }
];

const FILTERS = ["Todos", "Disponible", "Asignado", "En Mantenimiento", "Fuera de Servicio"];

const EQUIPMENT_TYPES = [
    { id: 'pc', title: 'Equipo de Cómputo', desc: 'PC + Monitor + Teclado + Mouse (obligatorio)', icon: IconDeviceDesktop },
    { id: 'monitor', title: 'Monitor', desc: 'Solo pantalla/monitor', icon: IconDeviceDesktop },
    { id: 'mouse', title: 'Mouse', desc: 'Solo mouse', icon: IconMouse },
    { id: 'teclado', title: 'Teclado', desc: 'Solo teclado', icon: IconKeyboard },
    { id: 'impresora', title: 'Impresora', desc: 'Impresora o multifuncional', icon: IconPrinter },
    { id: 'camara', title: 'Cámara de Video', desc: 'Cámara IP, NVR, DVR', icon: IconVideo },
    { id: 'otro', title: 'Otro Dispositivo', desc: 'Especificar cuál es', icon: IconDeviceUnknown }
];

export default function EquiposMantenimiento() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('Todos');
    const [selectionModalOpened, setSelectionModalOpened] = useState(false);
    const [formModalOpened, setFormModalOpened] = useState(false);
    const [selectedType, setSelectedType] = useState(null);
    const [equipmentStatus, setEquipmentStatus] = useState('Disponible');
    const [hojaDeVidaOpened, setHojaDeVidaOpened] = useState(false);
    const [historialModalOpened, setHistorialModalOpened] = useState(false);
    const [licenciasModalOpened, setLicenciasModalOpened] = useState(false);
    const [selectedEquipo, setSelectedEquipo] = useState(null);

    const handleOpenForm = (typeId) => {
        if (typeId === 'pc') {
            setSelectionModalOpened(false);
            setFormModalOpened(true);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'decimal',
            minimumFractionDigits: 0
        }).format(value || 0);
    };

    const getStatusClass = (status) => {
        if (status === "Asignado") return "status-asignado";
        if (status === "En Mantenimiento") return "status-mantenimiento";
        return "status-disponible";
    };

    return (
        <div className="equipos-mantenimiento-container fade-in">
            {/* Header */}
            <div className="mantenimiento-header">
                <button className="back-button" onClick={() => navigate('/')}>
                    <IconArrowLeft size={18} />
                    Volver al Panel
                </button>
                <Title order={3} c="white">Mantenimiento de Equipos</Title>
                <img src="/Nuevo-perla-Sinfondo.png" alt="Perla" style={{ height: 32 }} />
            </div>

            {/* Search & Add */}
            <div className="search-controls">
                <div className="search-input-wrapper">
                    <input
                        className="search-input"
                        placeholder="Buscar por nombre, marca, modelo..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button className="add-button" onClick={() => setSelectionModalOpened(true)}>
                    <IconPlus size={20} />
                    Agregar Equipo
                </button>
            </div>

            {/* Filters */}
            <div className="filter-chips">
                {FILTERS.map(filter => (
                    <div
                        key={filter}
                        className={`chip ${activeFilter === filter ? 'active' : ''}`}
                        onClick={() => setActiveFilter(filter)}
                    >
                        {filter}
                    </div>
                ))}
            </div>

            {/* Grid */}
            {/* Equipment Grid */}
            <div className="equipos-grid">
                {MOCK_EQUIPOS.filter(equipo => {
                    const matchesSearch =
                        equipo.name.toLowerCase().includes(search.toLowerCase()) ||
                        equipo.model.toLowerCase().includes(search.toLowerCase()) ||
                        equipo.dept.toLowerCase().includes(search.toLowerCase());

                    const matchesFilter = activeFilter === 'Todos' || equipo.status === activeFilter;

                    return matchesSearch && matchesFilter;
                }).map(equipo => (
                    <div className="equipo-card" key={equipo.id}>
                        <div className="card-header">
                            <div className="equipo-title">
                                {equipo.name}
                                <IconCamera size={16} color="#3b82f6" />
                            </div>
                            <div className={`status-badge ${getStatusClass(equipo.status)}`}>
                                {equipo.status} ▾
                            </div>
                        </div>

                        <img src={equipo.imageUrl} alt={equipo.name} className="equipo-image" />

                        <div className="card-content">
                            <div className="equipo-model">{equipo.model}</div>

                            <div className="detail-row">
                                <IconMapPin size={16} />
                                {equipo.location}
                            </div>
                            <div className="detail-row">
                                <IconNetwork size={16} />
                                {equipo.ip}
                            </div>
                            <div className="detail-row">
                                <IconUsers size={16} />
                                {equipo.dept}
                            </div>

                            <div className="mantenimiento-dates">
                                <div className="date-item">Inspección: {equipo.inspeccion}</div>
                                <div className="date-item">Mantenimiento: {equipo.mantenimiento}</div>
                            </div>
                        </div>

                        <div className="card-actions">
                            <div className="action-btn" onClick={() => { setSelectedEquipo(equipo); setHojaDeVidaOpened(true); }}>
                                Hoja de Vida
                            </div>
                            <div className="action-btn" onClick={() => { setSelectedEquipo(equipo); setHistorialModalOpened(true); }}>
                                Historial
                            </div>
                            <button className="maint-btn">
                                <IconPlus size={16} />
                                Mantenimiento
                            </button>
                            <button className="licenses-btn" onClick={() => { setSelectedEquipo(equipo); setLicenciasModalOpened(true); }}>
                                <IconCertificate size={16} />
                                Licencias
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Selection Modal */}
            <Modal
                opened={selectionModalOpened}
                onClose={() => setSelectionModalOpened(false)}
                title={<span style={{ fontWeight: 700, fontSize: 20 }}>Seleccionar Tipo de Equipo</span>}
                size="700px"
                centered
                padding="xl"
                overlayProps={{
                    backgroundOpacity: 0.55,
                    blur: 3,
                }}
                styles={{
                    root: { '--modal-radius': '16px' },
                    header: { paddingBottom: 0 },
                    content: { borderRadius: '16px' }
                }}
            >
                <Text size="sm" c="dimmed" mb="xl">¿Qué tipo de equipo deseas agregar?</Text>

                <SimpleGrid cols={2} spacing="md">
                    {EQUIPMENT_TYPES.map((type) => (
                        <Card
                            key={type.id}
                            padding="lg"
                            radius="md"
                            withBorder
                            className="type-selection-card"
                            onClick={() => handleOpenForm(type.id)}
                        >
                            <Group justify="center" mb="sm" className="type-card-icon">
                                <type.icon size={48} stroke={1.5} />
                            </Group>
                            <Text fw={700} ta="center" size="md" className="type-card-title">{type.title}</Text>
                            <Text size="xs" ta="center" c="dimmed" className="type-card-desc">{type.desc}</Text>
                        </Card>
                    ))}
                </SimpleGrid>

                <Group justify="center" mt="xl">
                    <Button variant="light" color="gray" onClick={() => setSelectionModalOpened(false)}>
                        Cancelar
                    </Button>
                </Group>
            </Modal>

            {/* Detailed Form Modal (PC) */}
            <Modal
                opened={formModalOpened}
                onClose={() => setFormModalOpened(false)}
                title={
                    <Group gap="xs">
                        <ActionIcon variant="subtle" color="dark" onClick={() => { setFormModalOpened(false); setSelectionModalOpened(true); }}>
                            <IconArrowLeft size={18} />
                        </ActionIcon>
                        <span style={{ fontWeight: 700, fontSize: 20 }}>Nuevo Equipo</span>
                    </Group>
                }
                size="900px"
                centered
                padding="xl"
                overlayProps={{
                    backgroundOpacity: 0.55,
                    blur: 3,
                }}
                styles={{
                    root: { '--modal-radius': '16px' },
                    content: { borderRadius: '16px' }
                }}
            >
                <div className="form-modal-content">
                    {/* Photos Gallery */}
                    <Text size="xs" fw={700} c="dimmed" mb="sm" tt="uppercase">GalerÍA de Fotos</Text>
                    <div className="photo-gallery-container">
                        <div className="add-photo-square">
                            <IconPlus size={24} color="#3b82f6" />
                            <Text size="xs" c="blue" fw={600}>Agregar</Text>
                        </div>
                    </div>

                    <Divider my="xl" />

                    {/* General Information */}
                    <Group gap="xs" mb="lg">
                        <IconNotebook size={18} color="#64748b" />
                        <Title order={5}>Información General</Title>
                    </Group>

                    <SimpleGrid cols={2} spacing="md">
                        <TextInput
                            label="NOMBRE DEL EQUIPO *"
                            placeholder="Ej: PC-Gerencia-01 o seleccione existente"
                            required
                            styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                        />
                        <TextInput
                            label="FECHA INSPECCIÓN"
                            placeholder="dd/mm/aaaa"
                            styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                        />
                        <TextInput
                            label="DEPARTAMENTO / ÁREA"
                            placeholder="Ej: Contabilidad"
                            styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                        />
                        <TextInput
                            label="UBICACIÓN FÍSICA"
                            placeholder="Ej: Piso 2, Oficina 204"
                            styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                        />
                    </SimpleGrid>

                    <SimpleGrid cols={2} spacing="md" mt="md">
                        <TextInput
                            label="DIRECCIÓN IP"
                            placeholder="Ej: 192.168.1.100"
                            styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                        />
                        <TextInput
                            label="USUARIO ASIGNADO"
                            placeholder="Nombre del responsable"
                            styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                        />
                    </SimpleGrid>

                    <SimpleGrid cols={2} spacing="md" mt="md">
                        <TextInput
                            label="CORREO ELECTRÓNICO"
                            placeholder="usuario@empresa.com"
                            styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                        />
                        <TextInput
                            label="CONTRASEÑA EQUIPO"
                            placeholder="Contraseña de inicio de sesión"
                            styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                        />
                    </SimpleGrid>

                    {/* Priority */}
                    <Text size="xs" fw={700} c="dimmed" mt="xl" mb="sm" tt="uppercase">Prioridad</Text>
                    <SimpleGrid cols={3} spacing="md">
                        <div className="priority-option-card">Alta</div>
                        <div className="priority-option-card active">Media</div>
                        <div className="priority-option-card">Baja</div>
                    </SimpleGrid>

                    <Divider my="xl" />

                    {/* PC Specific Details */}
                    <Group gap="xs" mb="lg">
                        <IconDeviceDesktop size={18} color="#64748b" />
                        <Title order={5}>PC</Title>
                    </Group>

                    <SimpleGrid cols={3} spacing="md">
                        <TextInput
                            label="MARCA"
                            placeholder="Ej: Dell, HP, Lenovo"
                            styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                        />
                        <TextInput
                            label="MODELO"
                            placeholder="Modelo del equipo"
                            styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                        />
                        <TextInput
                            label="SERIE"
                            placeholder="Número de serie"
                            styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                        />
                    </SimpleGrid>

                    <SimpleGrid cols={2} spacing="md" mt="md">
                        <TextInput
                            label="INVENTARIO"
                            placeholder="Código de inventario"
                            styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                        />
                        <TextInput
                            label="CONDICIONES FÍSICAS"
                            placeholder="Estado físico del equipo"
                            styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                        />
                    </SimpleGrid>

                    <SimpleGrid cols={3} spacing="md" mt="md">
                        <TextInput
                            label="PROCESADOR"
                            placeholder="Ej: i7 12th Gen"
                            styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                        />
                        <TextInput
                            label="MEMORIA RAM"
                            placeholder="Ej: 16GB"
                            styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                        />
                        <TextInput
                            label="DISCO DURO"
                            placeholder="Ej: 512GB SSD"
                            styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                        />
                    </SimpleGrid>

                    <Group gap="xl" mt="lg" mb="xl">
                        <div className="custom-checkbox">
                            <input type="checkbox" id="pc-enciende" defaultChecked />
                            <label htmlFor="pc-enciende">Enciende</label>
                        </div>
                        <div className="custom-checkbox">
                            <input type="checkbox" id="pc-botones" defaultChecked />
                            <label htmlFor="pc-botones">Botones Completos</label>
                        </div>
                        <div className="custom-checkbox">
                            <input type="checkbox" id="pc-disco" />
                            <label htmlFor="pc-disco">Disco Flexible</label>
                        </div>
                        <div className="custom-checkbox">
                            <input type="checkbox" id="pc-cd" />
                            <label htmlFor="pc-cd">CD/DVD</label>
                        </div>
                    </Group>

                    <Divider my="xl" />

                    {/* Monitor Details */}
                    <Group gap="xs" mb="lg">
                        <IconDeviceDesktop size={18} color="#64748b" />
                        <Title order={5}>Monitor</Title>
                    </Group>

                    <SimpleGrid cols={3} spacing="md">
                        <TextInput
                            label="MARCA"
                            placeholder="Ej: LG, Samsung"
                            styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                        />
                        <TextInput
                            label="MODELO"
                            placeholder="Modelo del monitor"
                            styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                        />
                        <TextInput
                            label="SERIE"
                            placeholder="Número de serie"
                            styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                        />
                    </SimpleGrid>

                    <TextInput
                        label="CONDICIONES FÍSICAS"
                        placeholder="Estado físico del monitor"
                        mt="md"
                        styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                    />

                    <Group gap="xl" mt="lg" mb="xl">
                        <div className="custom-checkbox">
                            <input type="checkbox" id="mon-enciende" defaultChecked />
                            <label htmlFor="mon-enciende">Enciende</label>
                        </div>
                        <div className="custom-checkbox">
                            <input type="checkbox" id="mon-colores" defaultChecked />
                            <label htmlFor="mon-colores">Colores Correctos</label>
                        </div>
                        <div className="custom-checkbox">
                            <input type="checkbox" id="mon-botones" defaultChecked />
                            <label htmlFor="mon-botones">Botones Completos</label>
                        </div>
                    </Group>

                    <Divider my="xl" />

                    {/* Keyboard Details */}
                    <Group gap="xs" mb="lg">
                        <IconKeyboard size={18} color="#64748b" />
                        <Title order={5}>Teclado</Title>
                    </Group>

                    <SimpleGrid cols={3} spacing="md">
                        <TextInput
                            label="MARCA"
                            placeholder="Ej: Logitech, Dell"
                            styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                        />
                        <TextInput
                            label="MODELO"
                            placeholder="Modelo del teclado"
                            styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                        />
                        <TextInput
                            label="SERIE"
                            placeholder="Número de serie"
                            styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                        />
                    </SimpleGrid>

                    <TextInput
                        label="CONDICIONES FÍSICAS"
                        placeholder="Estado físico del teclado"
                        mt="md"
                        styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                    />

                    <Group gap="xl" mt="lg" mb="xl">
                        <div className="custom-checkbox">
                            <input type="checkbox" id="kb-funciona" defaultChecked />
                            <label htmlFor="kb-funciona">Funciona Correctamente</label>
                        </div>
                        <div className="custom-checkbox">
                            <input type="checkbox" id="kb-botones" defaultChecked />
                            <label htmlFor="kb-botones">Botones Completos</label>
                        </div>
                        <div className="custom-checkbox">
                            <input type="checkbox" id="kb-reemplazo" />
                            <label htmlFor="kb-reemplazo">Se Reemplazó</label>
                        </div>
                    </Group>

                    <Divider my="xl" />

                    {/* Mouse Details */}
                    <Group gap="xs" mb="lg">
                        <IconMouse size={18} color="#64748b" />
                        <Title order={5}>Mouse</Title>
                    </Group>

                    <SimpleGrid cols={3} spacing="md">
                        <TextInput
                            label="MARCA"
                            placeholder="Ej: Logitech, Microsoft"
                            styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                        />
                        <TextInput
                            label="MODELO"
                            placeholder="Modelo del mouse"
                            styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                        />
                        <TextInput
                            label="SERIE"
                            placeholder="Número de serie"
                            styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                        />
                    </SimpleGrid>

                    <TextInput
                        label="CONDICIONES FÍSICAS"
                        placeholder="Estado físico del mouse"
                        mt="md"
                        styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                    />

                    <Group gap="xl" mt="lg" mb="xl">
                        <div className="custom-checkbox">
                            <input type="checkbox" id="mouse-funciona" defaultChecked />
                            <label htmlFor="mouse-funciona">Funciona Correctamente</label>
                        </div>
                        <div className="custom-checkbox">
                            <input type="checkbox" id="mouse-botones" defaultChecked />
                            <label htmlFor="mouse-botones">Botones Completos</label>
                        </div>
                    </Group>

                    <Divider my="xl" />

                    {/* Software Section */}
                    <Group gap="xs" mb="lg">
                        <IconSettings size={18} color="#64748b" />
                        <Title order={5}>Software</Title>
                    </Group>

                    <SimpleGrid cols={2} spacing="md">
                        <TextInput
                            label="SISTEMA OPERATIVO"
                            placeholder="Ej: Windows 11"
                            styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                        />
                        <TextInput
                            label="OFFICE"
                            placeholder="Ej: Office 2021"
                            styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                        />
                    </SimpleGrid>
                    <TextInput
                        label="OTRO SOFTWARE INSTALADO"
                        placeholder="Mencione software adicional"
                        mt="md"
                        styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                    />

                    <Divider my="xl" />

                    {/* Maintenance Section */}
                    <Group gap="xs" mb="lg">
                        <IconTools size={18} color="#64748b" />
                        <Title order={5}>Mantenimiento Requerido</Title>
                    </Group>

                    <TextInput
                        label="F. PRÓX. MANTENIMIENTO"
                        placeholder="dd/mm/aaaa"
                        styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                    />
                    <TextInput
                        label="DESCRIPCIÓN DEL MANTENIMIENTO"
                        placeholder="Trabajo que se debe realizar"
                        mt="md"
                        styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                    />
                    <TextInput
                        label="OBSERVACIONES GENERALES"
                        placeholder="Notas adicionales sobre el equipo"
                        mt="md"
                        styles={{ label: { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 } }}
                    />

                    {/* Equipment Status Selector */}
                    <Text size="xs" fw={700} c="dimmed" mt="xl" mb="sm" tt="uppercase">Estado del Equipo</Text>
                    <SimpleGrid cols={4} spacing="xs">
                        <div
                            className={`status-option ${equipmentStatus === 'Disponible' ? 'active-disponible' : ''}`}
                            onClick={() => setEquipmentStatus('Disponible')}
                        >
                            Disponible
                        </div>
                        <div
                            className={`status-option ${equipmentStatus === 'Asignado' ? 'active-asignado' : ''}`}
                            onClick={() => setEquipmentStatus('Asignado')}
                        >
                            Asignado
                        </div>
                        <div
                            className={`status-option ${equipmentStatus === 'En Mantenimiento' ? 'active-mantenimiento' : ''}`}
                            onClick={() => setEquipmentStatus('En Mantenimiento')}
                        >
                            En Mantenimiento
                        </div>
                        <div
                            className={`status-option ${equipmentStatus === 'Fuera de Servicio' ? 'active-servicio' : ''}`}
                            onClick={() => setEquipmentStatus('Fuera de Servicio')}
                        >
                            Fuera de Servicio
                        </div>
                    </SimpleGrid>

                    <Group justify="flex-end" mt={50} mb="md">
                        <Button variant="light" color="gray" onClick={() => setFormModalOpened(false)}>
                            Cancelar
                        </Button>
                        <Button color="blue">
                            Guardar Equipo
                        </Button>
                    </Group>
                </div>
            </Modal>

            {/* Hoja de Vida Modal */}
            <Modal
                opened={hojaDeVidaOpened}
                onClose={() => setHojaDeVidaOpened(false)}
                title={
                    <Group gap="xs">
                        <IconFileText size={24} color="white" />
                        <div>
                            <span style={{ fontWeight: 800, fontSize: 22, display: 'block', color: 'white' }}>Hoja de Vida del Equipo</span>
                            <Text size="sm" c="gray.4">Información completa del equipo {selectedEquipo?.name}</Text>
                        </div>
                    </Group>
                }
                size="1000px"
                centered
                padding="xl"
                overlayProps={{
                    backgroundOpacity: 0.55,
                    blur: 3,
                }}
                styles={{
                    root: { '--modal-radius': '16px' },
                    content: { borderRadius: '16px' }
                }}
            >
                <div className="hoja-vida-container">
                    {/* Basic Info Section */}
                    <div className="hoja-vida-section">
                        <Group gap="xs" mb="lg">
                            <IconNotebook size={20} color="white" />
                            <Title order={5} c="white">Información Básica</Title>
                        </Group>

                        <SimpleGrid cols={3} spacing="xl">
                            <div className="info-block">
                                <Text size="xs" fw={700} c="gray.5" tt="uppercase">Nombre del Equipo</Text>
                                <Text fw={600} c="white">{selectedEquipo?.name}</Text>
                            </div>
                            <div className="info-block">
                                <Text size="xs" fw={700} c="gray.5" tt="uppercase">Ubicación</Text>
                                <Text fw={600} c="white">{selectedEquipo?.location}</Text>
                            </div>
                            <div className="info-block">
                                <Text size="xs" fw={700} c="gray.5" tt="uppercase">Dirección IP</Text>
                                <Text fw={600} c="white">{selectedEquipo?.ip}</Text>
                            </div>
                            <div className="info-block">
                                <Text size="xs" fw={700} c="gray.5" tt="uppercase">Departamento</Text>
                                <Text fw={600} c="white">{selectedEquipo?.dept}</Text>
                            </div>
                            <div className="info-block">
                                <Text size="xs" fw={700} c="gray.5" tt="uppercase">Estado Actual</Text>
                                <div className={`status-pill ${getStatusClass(selectedEquipo?.status)}`}>
                                    {selectedEquipo?.status}
                                </div>
                            </div>
                        </SimpleGrid>

                        <SimpleGrid cols={2} spacing="xl" mt="xl">
                            <div className="info-block">
                                <Text size="xs" fw={700} c="gray.5" tt="uppercase">Usuario Asignado</Text>
                                <Text fw={600} c="white">N/A</Text>
                            </div>
                            <div className="info-block">
                                <Text size="xs" fw={700} c="gray.5" tt="uppercase">Correo Usuario</Text>
                                <Text fw={600} c="white">almacen@grupoelliot.com</Text>
                            </div>
                            <div className="info-block">
                                <Text size="xs" fw={700} c="gray.5" tt="uppercase">Contraseña Equipo</Text>
                                <Text fw={600} c="white">Aleph2026A</Text>
                            </div>
                            <div className="info-block">
                                <Text size="xs" fw={700} c="gray.5" tt="uppercase">Fecha Inspección</Text>
                                <Text fw={600} c="white">{selectedEquipo?.inspeccion}</Text>
                            </div>
                        </SimpleGrid>
                    </div>

                    <Divider my="xl" color="rgba(255, 255, 255, 0.1)" />

                    {/* Photos Gallery Section */}
                    <div className="hoja-vida-section">
                        <Group gap="xs" mb="lg">
                            <IconCamera size={20} color="white" />
                            <Title order={5} c="white">Galería de Fotos</Title>
                        </Group>

                        <div className="hoja-vida-photos">
                            <img
                                src={selectedEquipo?.imageUrl}
                                alt="Equipo"
                                style={{ width: 150, height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }}
                            />
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Historial de Mantenimiento Modal */}
            <Modal
                opened={historialModalOpened}
                onClose={() => setHistorialModalOpened(false)}
                title={
                    <Group gap="xs">
                        <IconTool size={24} color="white" />
                        <div>
                            <span style={{ fontWeight: 800, fontSize: 22, display: 'block', color: 'white' }}>Historial de Mantenimiento</span>
                            <Text size="sm" c="gray.4">{selectedEquipo?.name} • 1 registros</Text>
                        </div>
                    </Group>
                }
                size="1000px"
                centered
                padding="xl"
                overlayProps={{
                    backgroundOpacity: 0.55,
                    blur: 3,
                }}
                styles={{
                    root: { '--modal-radius': '16px' },
                    content: { borderRadius: '16px' }
                }}
            >
                <div className="historial-container">
                    <div className="historial-record-card">
                        <div className="record-header-badges">
                            <div className="badge-type preventive">Preventivo</div>
                            <div className="badge-tag recent">Más reciente</div>

                            <Group gap="xs" ml="auto">
                                <Group gap={4}>
                                    <IconCalendar size={14} color="#94a3b8" />
                                    <Text size="xs" fw={600} c="gray.5">02 de ene de 2026</Text>
                                </Group>
                                <Text size="xs" c="gray.7">|</Text>
                                <Group gap={4}>
                                    <IconCalendar size={14} color="#94a3b8" />
                                    <Text size="xs" fw={600} c="gray.5">15 de ene de 2026</Text>
                                </Group>
                                <Text size="xs" c="gray.7">|</Text>
                                <Group gap={4}>
                                    <IconCalendar size={14} color="#3b82f6" />
                                    <Text size="xs" fw={600} c="blue.4">15 de ene de 2026</Text>
                                </Group>
                            </Group>
                        </div>

                        <div className="record-content-text">
                            <Text fw={700} size="sm" mb={4} c="white">* Mantenimiento de hardware:</Text>
                            <Text size="sm" c="gray.4" lh={1.6}>
                                Apertura controlada de los equipos de cómputo.<br />
                                Limpieza interna mediante la remoción de polvo y partículas contaminantes acumuladas en componentes críticos como ventiladores, fuente de poder, tarjeta madre y demás elementos internos.<br />
                                Inspección visual general del estado de los componentes.
                            </Text>

                            <Text fw={700} size="sm" mt="md" mb={4} c="white">* Mantenimiento de software:</Text>
                            <Text size="sm" c="gray.4" lh={1.6}>
                                Eliminación de archivos inesperados, temporales y residuales almacenados en el sistema operativo.<br />
                                Liberación de espacio en disco para mejorar el desempeño del equipo.<br />
                                Verificación del correcto funcionamiento del sistema posterior a la limpieza
                            </Text>
                        </div>

                        <div className="record-footer-actions">
                            <Group gap="xl">
                                <Group gap={6}>
                                    <IconMessage2 size={16} color="#94a3b8" />
                                    <Text size="xs" fw={700} c="gray.5" tt="uppercase">OPTIMO</Text>
                                </Group>
                                <Group gap={6}>
                                    <IconUser size={16} color="#94a3b8" />
                                    <Text size="xs" fw={700} c="gray.5">N/A</Text>
                                </Group>
                            </Group>

                            <Group gap="md" ml="auto">
                                <Group gap={4}>
                                    <IconCoin size={18} color="#34d399" />
                                    <Text fw={700} c="green.4">$0.00</Text>
                                </Group>
                                <ActionIcon variant="subtle" color="yellow" size="sm">
                                    <IconPencil size={18} />
                                </ActionIcon>
                                <ActionIcon variant="subtle" color="red.5" size="sm">
                                    <IconTrash size={18} />
                                </ActionIcon>
                            </Group>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Licencias Modal */}
            <Modal
                opened={licenciasModalOpened}
                onClose={() => setLicenciasModalOpened(false)}
                title={
                    <Group gap="xs">
                        <IconCertificate size={24} color="white" />
                        <div>
                            <span style={{ fontWeight: 800, fontSize: 22, display: 'block', color: 'white' }}>Agregar Licencia</span>
                            <Text size="sm" c="gray.4">{selectedEquipo?.name}</Text>
                        </div>
                    </Group>
                }
                size="800px"
                centered
                padding="xl"
                overlayProps={{
                    backgroundOpacity: 0.55,
                    blur: 3,
                }}
                styles={{
                    root: { '--modal-radius': '16px' },
                    content: { borderRadius: '16px' }
                }}
            >
                <div className="license-modal-content">
                    <SimpleGrid cols={1} spacing="md">
                        <TextInput
                            label="Nombre de la licencia"
                            placeholder="Ej: Windows 11 Pro, Office 365"
                            required
                            styles={{ label: { color: 'white' }, input: { backgroundColor: 'white', color: 'black' } }}
                        />
                        <TextInput
                            label="Clave/Serial (opcional)"
                            placeholder="Ej: XXXXX-XXXXX-XXXXX-XXXXX"
                            styles={{ label: { color: 'white' }, input: { backgroundColor: 'white', color: 'black' } }}
                        />

                        <SimpleGrid cols={2}>
                            <TextInput
                                label="Fecha de Inicio"
                                placeholder="dd/mm/aaaa"
                                rightSection={<IconCalendar size={18} color="#64748b" />}
                                styles={{ label: { color: 'white' }, input: { backgroundColor: 'white', color: 'black' } }}
                            />
                            <TextInput
                                label="Fecha de Expiración"
                                placeholder="dd/mm/aaaa"
                                rightSection={<IconCalendar size={18} color="#64748b" />}
                                styles={{ label: { color: 'white' }, input: { backgroundColor: 'white', color: 'black' } }}
                            />
                        </SimpleGrid>

                        <TextInput
                            label="Observaciones (opcional)"
                            placeholder="Notas adicionales..."
                            styles={{ label: { color: 'white' }, input: { backgroundColor: 'white', color: 'black' } }}
                        />

                        <Group justify="flex-end" mt="md">
                            <Button variant="outline" color="gray" onClick={() => setLicenciasModalOpened(false)}>Cancelar</Button>
                            <Button color="green">Agregar</Button>
                        </Group>
                    </SimpleGrid>

                    <Divider my="xl" color="rgba(255, 255, 255, 0.1)" />

                    <div className="registered-licenses-section">
                        <Group gap="xs" mb="md">
                            <IconClipboardList size={20} color="white" />
                            <Title order={5} c="white">Licencias Registradas (1)</Title>
                        </Group>

                        <div className="license-record-card">
                            <div className="license-info">
                                <Text fw={700} c="white">Office 365 Online</Text>
                                <Group gap="md" mt={4}>
                                    <Group gap={4}>
                                        <IconCalendar size={14} color="#10b981" />
                                        <Text size="xs" c="gray.4">Inicio: <span style={{ color: '#10b981' }}>18 de oct de 2025</span></Text>
                                    </Group>
                                    <Group gap={4}>
                                        <IconCalendar size={14} color="#fbbf24" />
                                        <Text size="xs" c="gray.4">Expira: <span style={{ color: '#fbbf24' }}>17 de oct de 2026</span></Text>
                                    </Group>
                                </Group>
                            </div>
                            <Group gap="xs">
                                <ActionIcon variant="subtle" color="yellow">
                                    <IconPencil size={18} />
                                </ActionIcon>
                                <ActionIcon variant="subtle" color="red">
                                    <IconTrash size={18} />
                                </ActionIcon>
                            </Group>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
