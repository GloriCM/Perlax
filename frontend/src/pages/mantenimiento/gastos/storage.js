const STORAGE_KEYS = {
  productos: 'mantenimiento_gastos_productos',
  cotizaciones: 'mantenimiento_gastos_cotizaciones',
};

const DEFAULT_PRODUCTOS = [
  {
    id: 1,
    rubro: 'Ferreteria',
    nombre: 'Tornillo hexagonal',
    referencia: 'TH-01',
    descripcion: 'Tornillo para sujecion general',
    medida: 'Uni',
    puntoReorden: 50,
  },
];

const DEFAULT_COTIZACIONES = [
  {
    id: 1,
    rubro: 'Ferreteria',
    productoId: 1,
    proveedorId: 2,
    cantidad: 10,
    valorUnitario: 2500,
    precioTotal: 25000,
    descripcion: 'Cotizacion inicial',
    fecha: new Date().toISOString().split('T')[0],
  },
];

const MEDIDAS = ['Cc', 'Grs', 'Gal', 'Uni', 'Kg', 'Mts', 'ml'];

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getProductos() {
  return readJSON(STORAGE_KEYS.productos, DEFAULT_PRODUCTOS);
}

export function saveProductos(productos) {
  writeJSON(STORAGE_KEYS.productos, productos);
}

export function getCotizaciones() {
  return readJSON(STORAGE_KEYS.cotizaciones, DEFAULT_COTIZACIONES);
}

export function saveCotizaciones(cotizaciones) {
  writeJSON(STORAGE_KEYS.cotizaciones, cotizaciones);
}

export function getMedidas() {
  return MEDIDAS;
}
