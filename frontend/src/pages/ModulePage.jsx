import { useParams } from 'react-router-dom';
import { Card, Title, Text, SimpleGrid, ThemeIcon, Group, Box } from '@mantine/core';
import {
    IconClipboardList,
    IconChartLine,
    IconSettings2,
} from '@tabler/icons-react';

const moduleInfo = {
    produccion: { title: 'Control de Producción', desc: 'Gestiona los procesos de manufactura, líneas de producción y eficiencias operativas.' },
    inventario: { title: 'Inventario PT', desc: 'Administra el inventario de producto terminado, entradas, salidas y niveles de stock.' },
    compras: { title: 'Compras & Almacén', desc: 'Gestiona las órdenes de compra, proveedores, recepción de materiales y almacenamiento.' },
    cotizaciones: { title: 'Cotizaciones', desc: 'Crea y administra cotizaciones para clientes y proyectos.' },
    ordenes: { title: 'Ordenes de Trabajo', desc: 'Programa, ejecuta y da seguimiento a las órdenes de trabajo de producción.' },
    fichas: { title: 'Fichas Técnicas', desc: 'Documentación técnica de productos, materiales y procesos.' },
    pedidos: { title: 'Pedidos', desc: 'Gestiona los pedidos de clientes, seguimiento y estado de entrega.' },
    remisiones: { title: 'Remisiones', desc: 'Genera y administra las remisiones de entrega y despacho.' },
    facturacion: { title: 'Facturación', desc: 'Genera facturas, notas crédito y gestiona la cartera de cobros.' },
    'cuadro-master': { title: 'Cuadro Master', desc: 'Información consolidada de gestión gerencial y KPIs clave.' },
    gastos: { title: 'Gastos de Producción', desc: 'Registro y análisis de costos, materias primas y gastos operacionales.' },
    'gestion-humana': { title: 'Gestión Humana', desc: 'Administra nómina, contratación, prestaciones y bienestar del personal.' },
    presupuestos: { title: 'Presupuestos', desc: 'Gestión global de presupuestos por área, proyecto y periodo fiscal.' },
    'presupuestos-sst': { title: 'Presupuestos SST', desc: 'Presupuestos de Seguridad y Salud en el Trabajo.' },
    mantenimiento: { title: 'Mantenimiento Equipos', desc: 'Control de mantenimiento preventivo y correctivo de maquinaria.' },
    calidad: { title: 'Calidad', desc: 'Inspecciones, control estadístico de procesos y gestión de no conformidades.' },
    planeacion: { title: 'Planeación', desc: 'Planeación estratégica, táctica y operativa de la producción.' },
    diseno: { title: 'Diseño', desc: 'Gestión del departamento de diseño gráfico e industrial.' },
    ajustes: { title: 'Ajustes del Sistema', desc: 'Configuración general, usuarios, roles y permisos del sistema.' },
};

export default function ModulePage() {
    const { moduleName } = useParams();
    const info = moduleInfo[moduleName] || {
        title: moduleName,
        desc: 'Módulo en construcción.',
    };

    return (
        <div className="fade-in">
            <Card
                className="glass-card"
                mb="lg"
                style={{
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.08))',
                }}
            >
                <Title order={3} c="white" mb={4}>{info.title}</Title>
                <Text size="sm" c="dimmed">{info.desc}</Text>
            </Card>

            <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="lg">
                <Card className="glass-card">
                    <Group gap="sm" mb="md">
                        <ThemeIcon variant="light" color="indigo" size={38} radius="md">
                            <IconClipboardList size={20} stroke={1.5} />
                        </ThemeIcon>
                        <Title order={5} c="white">Acciones Rápidas</Title>
                    </Group>
                    <Text size="sm" c="dimmed">
                        Aquí podrás ejecutar las acciones principales de este módulo.
                    </Text>
                </Card>

                <Card className="glass-card">
                    <Group gap="sm" mb="md">
                        <ThemeIcon variant="light" color="teal" size={38} radius="md">
                            <IconChartLine size={20} stroke={1.5} />
                        </ThemeIcon>
                        <Title order={5} c="white">Métricas</Title>
                    </Group>
                    <Text size="sm" c="dimmed">
                        Datos en tiempo real y estadísticas del módulo.
                    </Text>
                </Card>

                <Card className="glass-card">
                    <Group gap="sm" mb="md">
                        <ThemeIcon variant="light" color="orange" size={38} radius="md">
                            <IconSettings2 size={20} stroke={1.5} />
                        </ThemeIcon>
                        <Title order={5} c="white">Configuración</Title>
                    </Group>
                    <Text size="sm" c="dimmed">
                        Ajusta los parámetros específicos de este módulo.
                    </Text>
                </Card>
            </SimpleGrid>
        </div>
    );
}
