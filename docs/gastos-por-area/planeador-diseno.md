# Planeador de Diseño

**Estado:** En produccion **Menu:** Administracion -> Diseño -> Planeador **URL:** `/diseno/planeador`

## Para que sirve?

Gestiona la **cola de trabajos de diseño**: alta comercial, asignacion al diseñador, registro del proceso (planchas, troquel, muestra, etc.), avance y fecha de aprobacion. Cada trabajo recibe un codigo automatico (`PJ-AAAA-NNN`).

Relacionado (pero distinto):

| Pantalla                | URL                                                 | Uso                                                                                        |
| ----------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Planeador de Diseño** | `/diseno/planeador`                                 | Cola y proceso del trabajo de diseño                                                       |
| **Planes de Diseño**    | Operaciones → Órdenes de trabajo → Planes de Diseño | Seguimiento de la orden, el arte y la ficha. [Manual](../flujo-principal/planes-diseno.md) |

Si un trabajo del planeador se abre desde Planes de Diseño, el sistema lleva al detalle del planeador (`?job=PJ-…`).

## Quien lo usa?

| Perfil                               | Que puede hacer                                                                           |
| ------------------------------------ | ----------------------------------------------------------------------------------------- |
| **Administrador**                    | Ver todos los trabajos, crear, filtrar, eliminar (herramienta oculta), consultar procesos |
| **Diseñador asignado** (area Diseño) | Ver solo sus trabajos, actualizar proceso y fechas                                        |
| **Comercial / otros**                | Alta tipica: crear y asignar responsable (si tienen la vista)                             |

* **Admin:** ve el tablero completo (Dashboard + Trabajos asignados).
* **No admin:** solo ve trabajos cuyo **Diseñador / responsable** coincide con su usuario (nombre completo o login). El match es estricto: no basta compartir un nombre corto (p. ej. “DISEÑO” no iguala “DISEÑO DISEÑO” y “DISEÑO PRUEBA”).

## Como llegar

1. Menu **Administracion -> Diseño -> Planeador**, o
2. Desde **Planes de Diseño**, al abrir un trabajo vinculado al planeador.

## KPIs del tablero

| Indicador              | Significado                                                                 |
| ---------------------- | --------------------------------------------------------------------------- |
| **En espera**          | Estado _Nuevo Trabajo Pendiente_                                            |
| **En diseño**          | Estado _En Desarrollo_                                                      |
| **Total**              | Trabajos visibles segun su perfil                                           |
| **Critico (+15 dias)** | Sin fecha de aprobacion y con **15 dias o mas** desde la fecha de recepcion |

## Semaforo

El punto de color en la tabla no es solo el estado textual:

| Color        | Significado                                                      |
| ------------ | ---------------------------------------------------------------- |
| **Rojo**     | Critico: ≥ 15 dias desde recepcion y aun sin fecha de aprobacion |
| **Naranja**  | Sin novedades en el proceso                                      |
| **Amarillo** | Ya hay novedades (pasos marcados, fechas o pendientes)           |
| **Verde**    | Tiene **fecha de aprobacion**                                    |

Prioridad: verde → rojo → amarillo → naranja.

## Crear un trabajo

Pulse **Nuevo trabajo** (o equivalente). Campos:

| Campo                 | Obligatorio | Notas                                                                             |
| --------------------- | ----------- | --------------------------------------------------------------------------------- |
| Cliente               | Si          | Lista = clientes de trabajos ya creados + clientes de OP abiertas (`open-orders`) |
| Vendedor              | Si          | Catalogo local + valores ya usados                                                |
| Trabajo               | Si          | Nombre / descripcion del trabajo                                                  |
| Accion                | Si          | Que se pide a diseño (p. ej. muestreo, ajuste)                                    |
| Encargado responsable | Si          | Usuarios del area Diseño (`/users/designers`); se guarda el login                 |
| Fecha de recepcion    | Recomendada | Base del critico (+15 dias)                                                       |

Al guardar:

* Se genera el codigo `PJ-AAAA-NNN`
* Estado inicial: **Nuevo Trabajo Pendiente**
* Se registra **Montado por** (quien creo el trabajo) y **fecha/hora de montaje**
* Queda visible para el diseñador asignado

## Listado

Columnas tipicas: Cliente, Vendedor, Trabajo (con codigo PJ), Accion, Diseñador, **Montado por**, **Fecha montaje**, Recepcion, Aprobacion, Semaforo, Estado.

**Filtros:** estado, cliente, vendedor, trabajo; el admin tambien puede filtrar por diseñador.

## Detalle del trabajo

Al hacer clic en una fila se abre el modal de detalle.

### Datos de cabecera

* Cliente, vendedor, encargado, fecha de recepcion
* Montado por, fecha y hora de montaje
* Estado, avance (%), accion solicitada

### Proceso de diseño

Marque **Aplica** en cada bloque que corresponda y registre fechas:

| Paso         | Que registrar                                            |
| ------------ | -------------------------------------------------------- |
| Planchas     | Fecha envio, fecha recibido, repeticion                  |
| Troquel      | Fecha envio, fecha recibido                              |
| Muestra      | Fechas de impresion digital / entrega                    |
| Presentacion | Fecha de entrega                                         |
| Arte y Ficha | Fecha de entrega                                         |
| Plataforma   | Marque si el trabajo ya está registrado y anote la fecha |

Ademas:

* **Fecha de aprobacion** → pone el semaforo en **verde**
* **Pendientes** → texto libre

Pulse **Guardar proceso**:

* Se confirma con aviso visual (toast)
* Se cierra el modal
* Si el estado era _Nuevo…_, pasa a **En Desarrollo**
* Solo el **diseñador asignado** (o quien tenga permiso de edicion del proceso) puede guardar cambios de fechas

### Avance (%)

Depende solo de los pasos con **Aplica** marcado + la fecha de aprobacion:

* Total = (pasos que aplican) + 1 (aprobacion)
* Completados = pasos con datos suficientes + 1 si hay fecha de aprobacion
* `% = completados / total`

Un paso cuenta como completo cuando tiene las fechas o las marcas mínimas (en Plataforma: el trabajo ya registrado o la fecha).

## Estados del trabajo

| Estado                  | Significado                          |
| ----------------------- | ------------------------------------ |
| Nuevo Trabajo Pendiente | Recien creado; sin avance de proceso |
| En Desarrollo           | Se guardo proceso o hay actividad    |
| Aprobacion              | Flujo de aprobacion / ficha          |
| Finalizado              | Cerrado                              |

## Eliminar un trabajo (solo Administrador)

Herramienta discreta para corregir altas erradas:

1. Abrir el detalle del trabajo.
2. Abajo a la izquierda, hacer clic en los puntos casi invisibles (`···`).
3. Pulsar **Eliminar trabajo**.
4. Confirmar y escribir el codigo (`PJ-2026-00X`).

La eliminacion es permanente y queda auditada.

## Buenas practicas

1. Poner **fecha de recepcion** real: alimenta el KPI critico y el semaforo rojo.
2. Asignar el responsable con el usuario de Diseño correcto (login), para que vea el trabajo en su cola.
3. Ir marcando **Aplica** y fechas: el semaforo pasa de naranja a amarillo y el avance sube.
4. Cerrar visualmente con **fecha de aprobacion** (verde).
5. Si el trabajo debe verse tambien junto a una OT, incluya el numero OT en el nombre del trabajo o use **Planes de Diseño** para el seguimiento de la orden.

## Siguiente lectura

* [Diseño — cuadro de gastos](diseno.md)
* [Ordenes de trabajo y fichas](../flujo-principal/ordenes-trabajo.md)
* [Roles del sistema](../introduccion/roles-del-sistema.md)
* [Usuarios y permisos](../configuracion/usuarios.md)
