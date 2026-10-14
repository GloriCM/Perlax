import { navSections } from '../config/navSections';

export function normPath(p) {
    if (!p || p === '') return '/';
    const s = p.endsWith('/') && p.length > 1 ? p.slice(0, -1) : p;
    return s;
}

export function getCurrentUser() {
    try {
        const raw = localStorage.getItem('user');
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function isAdmin(user) {
    if (!user) return false;
    const r = user.role ?? user.Role ?? '';
    const normalized = String(r).toLowerCase();
    return normalized === 'admin' || normalized === 'administrador';
}

export function isAdministrative(user) {
    if (!user) return false;
    const r = String(user.role ?? user.Role ?? '').toLowerCase();
    return r === 'administrativo' || r === 'user';
}

/** Chat interno: Admin, Administrativo, o Taller con al menos una vista asignada. */
export function isTaller(user) {
    if (!user) return false;
    return String(user.role ?? user.Role ?? '').toLowerCase() === 'taller';
}

export function canAccessInternalChat(user) {
    if (isAdmin(user) || isAdministrative(user)) return true;
    if (isTaller(user)) {
        const ar = getAllowedRoutes(user);
        return Array.isArray(ar) && ar.length > 0;
    }
    return false;
}

export function normalizePersonKey(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

export function getUserDisplayName(user) {
    const full = [user?.firstName || user?.FirstName, user?.lastName || user?.LastName]
        .filter(Boolean)
        .join(' ')
        .trim();
    return full || user?.username || user?.Username || user?.displayName || user?.DisplayName || '';
}

/** true si el registro (diseñador/responsable) está asignado a este usuario. */
export function isAssignedToCurrentUser(assignedName, user) {
    const designerKey = normalizePersonKey(assignedName);
    if (!designerKey) return false;

    const identityKeys = [
        getUserDisplayName(user),
        user?.username,
        user?.Username,
        user?.displayName,
        user?.DisplayName,
        user?.documentNumber,
        user?.DocumentNumber
    ]
        .map(normalizePersonKey)
        .filter((key) => key.length >= 2);
    const uniqueIdentities = [...new Set(identityKeys)];

    // Coincidencia exacta con nombre completo, usuario o documento.
    if (uniqueIdentities.some((key) => key === designerKey)) return true;

    const designerParts = [...new Set(designerKey.split(/\s+/).filter((p) => p.length >= 2))];
    const fullName = normalizePersonKey(getUserDisplayName(user));
    if (!fullName) return false;
    const userParts = [...new Set(fullName.split(/\s+/).filter((p) => p.length >= 2))];

    // Ambos con 2+ palabras distintas: solo si coinciden exactamente como conjunto.
    // Evita que "DISEÑO" de "DISEÑO PRUEBA" matchee "DISEÑO DISEÑO".
    if (designerParts.length >= 2 && userParts.length >= 2) {
        if (
            designerParts.length === userParts.length
            && designerParts.every((part) => userParts.includes(part))
        ) {
            return true;
        }
    }

    return false;
}

export const ACCESS_VIEW = 'ver';
export const ACCESS_EDIT = 'editar';

/** Administrativo y Taller eligen Ver o Editar por vista. El resto conserva su acceso. */
export function usesViewMatrix(user) {
    const role = String(user?.role ?? user?.Role ?? '').toLowerCase();
    return role === 'administrativo' || role === 'user' || role === 'taller';
}

/** Una X antigua (texto) queda como editar. */
export function normalizeRouteGrant(item) {
    if (typeof item === 'string') {
        const path = normPath(item);
        return path ? { path, access: ACCESS_EDIT } : null;
    }
    if (!item || typeof item !== 'object') return null;
    const path = normPath(item.path ?? item.Path ?? '');
    if (!path) return null;
    const raw = String(item.access ?? item.Access ?? item.mode ?? item.Mode ?? ACCESS_EDIT).toLowerCase();
    return { path, access: raw === ACCESS_VIEW ? ACCESS_VIEW : ACCESS_EDIT };
}

/**
 * null = sin restricción (administrador o lista ausente).
 * [] = solo inicio.
 * Cada elemento es { path, access }.
 */
export function getRouteGrants(user) {
    if (!user || isAdmin(user)) return null;
    const ar = user.allowedRoutes ?? user.AllowedRoutes;
    if (ar === undefined || ar === null) return null;
    if (!Array.isArray(ar)) return [];
    const seen = new Set();
    const grants = [];
    for (const item of ar) {
        const grant = normalizeRouteGrant(item);
        if (!grant || seen.has(grant.path)) continue;
        seen.add(grant.path);
        grants.push(grant);
    }
    return grants;
}

/** Rutas que puede abrir. null = acceso completo; [] = solo inicio `/`. */
export function getAllowedRoutes(user) {
    const grants = getRouteGrants(user);
    if (grants === null) return user ? null : undefined;
    return grants.map((grant) => grant.path);
}

function matchRouteGrant(pathname, grants) {
    const path = normPath(pathname);
    if (/^\/fichas\/imprimir(\/|$)/.test(path)) {
        return grants.find((grant) => grant.path === '/fichas/lista') || null;
    }

    let best = null;
    for (const grant of grants) {
        const base = grant.path;
        if (base === path || (base !== '/' && path.startsWith(`${base}/`))) {
            if (!best || base.length > best.path.length) best = grant;
        }
    }

    if (!best && path === '/diseno/planeador') {
        best = grants.find((grant) => grant.path === '/ordenes/planes-diseno') || null;
    }
    return best;
}

export function getDefaultPostLoginPath(sessionUser) {
    if (!sessionUser) return '/';
    if (isAdmin(sessionUser)) return '/';
    const ar = getAllowedRoutes(sessionUser);
    if (ar === undefined || ar === null) return '/';
    if (ar.length === 0) return '/';
    return normPath(ar[0]);
}

export function getFirstAllowedPath(user) {
    return getDefaultPostLoginPath(user);
}

/**
 * @param {string} pathname
 * @param {object|null} user objeto en localStorage tras login
 */
export function canAccessRoute(pathname, user) {
    if (!user) return false;
    const token = user.token ?? user.Token;
    if (!token) return false;

    const path = normPath(pathname);

    // Chat interno: solo Admin/Administrativo (icono superior), no depende de matriz.
    if (path === '/chat' || path.startsWith('/chat/')) {
        return canAccessInternalChat(user);
    }

    if (isAdmin(user)) return true;

    const routes = getAllowedRoutes(user);
    if (routes === undefined) return true;
    if (routes === null) return true;
    const normalizedList = routes.map(normPath);

    if (normalizedList.length === 0) {
        return path === '/' || path === '';
    }

    const set = new Set(normalizedList);
    if (set.has(path)) return true;

    for (const base of normalizedList) {
        if (base !== '/' && base && (path === base || path.startsWith(`${base}/`))) {
            return true;
        }
    }

    if (/^\/fichas\/imprimir(\/|$)/.test(path)) {
        return set.has('/fichas/lista') || normalizedList.some((r) => r === '/fichas/lista');
    }

    // Quien tiene Planes de Diseño puede abrir el Planeador (detalle de proceso asignado).
    if (path === '/diseno/planeador' && set.has('/ordenes/planes-diseno')) {
        return true;
    }

    return false;
}

/** Editar incluye ver. Ver deja la pantalla en solo consulta. El administrador siempre edita. */
export function canEditRoute(pathname, user) {
    if (!user) return false;
    if (isAdmin(user) || !usesViewMatrix(user)) return true;
    const grants = getRouteGrants(user);
    if (grants === null) return true;

    const path = normPath(pathname);
    if (path === '/chat' || path.startsWith('/chat/')) return canAccessInternalChat(user);

    const grant = matchRouteGrant(path, grants);
    if (!grant) return true;
    return grant.access === ACCESS_EDIT;
}

function filterNavItem(item, user) {
    const hasChildren = item.children?.length;
    if (hasChildren) {
        const children = item.children.map((c) => filterNavItem(c, user)).filter(Boolean);
        if (children.length === 0) return null;
        return { ...item, children };
    }
    if (item.path && canAccessRoute(item.path, user)) return { ...item };
    return null;
}

export function filterNavSections(user) {
    return navSections
        .map((section) => ({
            ...section,
            items: section.items.map((item) => filterNavItem(item, user)).filter(Boolean),
        }))
        .filter((section) => section.items.length > 0);
}

/**
 * Estructura para la matriz de permisos: sección → módulos (primer nivel del menú) → vistas (hojas).
 */
export function getNavPermissionMatrix() {
    const sections = [];

    function collectLeaves(node, acc) {
        if (node.children?.length) {
            for (const c of node.children) collectLeaves(c, acc);
        } else if (node.path) {
            acc.push({ path: normPath(node.path), label: node.label });
        }
    }

    for (const section of navSections) {
        const modules = [];
        for (const item of section.items || []) {
            const leaves = [];
            if (item.children?.length) {
                for (const c of item.children) collectLeaves(c, leaves);
            } else if (item.path) {
                leaves.push({ path: normPath(item.path), label: item.label });
            }
            const seen = new Set();
            const unique = leaves.filter((l) => {
                if (seen.has(l.path)) return false;
                seen.add(l.path);
                return true;
            });
            if (unique.length > 0) {
                modules.push({
                    key: item.path || item.label,
                    label: item.label,
                    leaves: unique,
                });
            }
        }
        if (modules.length > 0) {
            sections.push({ sectionTitle: section.title, modules });
        }
    }

    return sections;
}

/** Opciones hoja del menú para asignar permisos (path + etiqueta legible). */
export function getNavLeafRouteOptions() {
    const out = [];

    function walk(items, trail) {
        for (const item of items || []) {
            const nextTrail = [...trail, item.label];
            if (item.children?.length) {
                walk(item.children, nextTrail);
            } else if (item.path) {
                const parents = trail.filter(Boolean);
                const prefix = parents.length ? `${parents.join(' › ')} — ` : '';
                out.push({
                    value: item.path,
                    label: `${prefix}${item.label}`,
                });
            }
        }
    }

    for (const section of navSections) {
        walk(section.items, [section.title]);
    }

    const seen = new Set();
    return out.filter((o) => {
        if (seen.has(o.value)) return false;
        seen.add(o.value);
        return true;
    });
}
