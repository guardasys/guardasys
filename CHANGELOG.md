# Changelog — GuardaSys (TOKU Importados)

Todos los cambios notables de este proyecto se documentan en este archivo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/),
versionado según [SemVer](https://semver.org/lang/es/).

## [0.6.2] - 2026-07-28

### Agregado
- **Impresoras**: se puede editar la "Ruta de red" directamente desde la
  tabla (antes solo se podía cargar al crear la impresora, sin forma de
  corregirla). Queda registrado en auditoría.

## [0.6.1] - 2026-07-28

### Corregido
- Tabla de **Terminales**: la columna "Impresora asignada" mostraba el ID
  interno del documento en vez del nombre de la impresora. Ahora muestra
  el nombre.
- Tabla de **Impresoras existentes**: se agregó la columna "Ruta de red",
  que antes no se veía (solo se cargaba al crearla).

## [0.6.0] - 2026-07-28

### Agregado
- Módulo **Reportes** (cálculo al vuelo, decisión confirmada con Paolo —
  sin contadores mantenidos por ahora):
  - Selector de rango de fechas (por defecto, hoy).
  - Resumen del período: guardas registradas, volúmenes, clientes
    distintos, cerradas/abiertas, tiempo promedio de guarda.
  - Ocupación actual por punto de guarda (en tiempo real, no depende del
    rango de fechas).
  - Actividad por operador y guardas por punto, dentro del período.
  - Incidencias del período por tipo.
  - Reimpresiones: placeholder — no hay datos todavía porque la
    impresión de tickets en sí no está implementada.

Con esto quedan cubiertos los 13 puntos del alcance funcional original
(sección 5 del brief). Lo que sigue pendiente es transversal a todo el
sistema: impresión ESC/POS real, ubicaciones físicas, y dejar el
Servidor de Impresión corriendo de forma permanente.

## [0.5.3] - 2026-07-28

### Confirmado
- Probado de punta a punta desde GitHub Pages + Servidor de Impresión en
  la red de TOKU: funciona. Chrome pide permiso ("¿este sitio quiere
  acceder a otros dispositivos en tu red local?") la primera vez —
  hay que tocar "Allow" una vez por navegador/PC. No hizo falta HTTPS en
  el servidor para este caso.

### Corregido
- El campo "Nombre completo" quedaba muy angosto (dentro de la grilla de
  4 columnas) y no se veían nombres largos traídos por la consulta de
  CPF. Ahora tiene su propia fila a ancho completo.

## [0.5.2] - 2026-07-28

### Cambiado
- `js/servidor-impresion-config.js` completado con la IP interna real del
  Servidor de Impresión: `http://172.16.249.60:3000`.

## [0.5.1] - 2026-07-28

### Cambiado
- Tipo de documento en "Nueva guarda" ahora ofrece **CI, DNI, CPF,
  Pasaporte, Otro** (antes solo DNI/Pasaporte/Otro).
- Tipo de volumen se muestra con mayúscula inicial en toda la interfaz
  (el valor guardado en Firestore sigue en minúscula, sin cambios en
  datos ya existentes).

### Agregado
- Botón **"Buscar nombre"** cuando el tipo de documento es CPF: consulta
  al nuevo Servidor Central de Impresión (repo separado
  `guardasys-servidor-impresion`), que a su vez consulta
  `api.cpf-brasil.org` sin exponer la API key en el frontend, y
  autocompleta el nombre del cliente nuevo.
- `js/servidor-impresion-config.js`: URL del Servidor de Impresión
  (completar con la IP interna real una vez desplegado).

## [0.5.0] - 2026-07-28

### Agregado
- Módulo **Auditoría** (solo administrador): listado paginado (50 por
  página) de todos los registros de `auditoria`, con filtro por tipo de
  acción (usa índice compuesto `accion` + `fechaHora`) y búsqueda de texto
  por usuario/entidad sobre lo ya cargado. Cada fila se puede expandir
  para ver el detalle `datosAntes` / `datosDespues`.
- Nuevo índice compuesto en `firestore.indexes.json` (`auditoria`:
  `accion` + `fechaHora`).

## [0.4.0] - 2026-07-28

### Agregado
- Módulo **Incidencias**:
  - Cualquier operador puede reportar una incidencia (los 6 tipos de la
    spec), opcionalmente atada a una guarda (buscada por ticket o
    documento, igual que en Devoluciones).
  - Supervisor/administrador pueden marcarla resuelta.
  - Para `ticket_perdido` y `entrega_especial` con guarda asociada,
    supervisor/administrador tienen un botón **"Entregar sin ticket"** que
    cierra la operación (mismo efecto que una devolución normal) y deja
    registrado en la entrega que fue una autorización especial.
- Menú lateral: Incidencias ahora visible también para operador (antes
  solo supervisor/administrador) — reportar es de cualquiera, autorizar
  sigue siendo de supervisor+.

### Cambiado en el modelo de datos
- `incidencias` suma campos denormalizados no listados en la v0.1 del
  modelo (`codigoTicket`, `clienteNombre`, `reportadoPorNombre`) para
  poder listar sin hacer una consulta extra por cada fila.

### Pendiente
- Confirmar si "Entregar sin ticket" debería pedir una confirmación
  adicional o un motivo escrito aparte de la descripción de la incidencia.

## [0.3.0] - 2026-07-28

### Agregado
- Módulo **Devoluciones**: buscar una guarda abierta por código de ticket
  o por documento del cliente (si hay más de una guarda abierta para ese
  cliente, se muestra la lista para elegir), ver el detalle y los
  volúmenes, y confirmar la entrega.
- Soporte para entrega a un tercero autorizado (nombre + documento
  verificado + notas), quedando registrado en `entregaSnapshot`.
- Índice compuesto sugerido (`operaciones`: `clienteId` + `estado`) en
  `firestore.indexes.json` para la búsqueda por documento.

### Pendiente
- Devolución parcial (entregar solo algunos volúmenes de una operación).
- Definir si la entrega a terceros debe requerir autorización de un
  supervisor (tema "usuarios y permisos").

## [0.2.1] - 2026-07-28

### Agregado
- Número de versión visible en la interfaz (pie del menú lateral y pantalla
  de login), leído desde `js/version.js` — actualizar ese archivo en cada
  entrega.

## [0.2.0] - 2026-07-28

### Agregado
- Módulo **Administración** (solo rol administrador), con 4 pestañas:
  - **Usuarios**: alta con email/contraseña (vía app secundaria de Firebase
    para no reemplazar la sesión del admin logueado), cambio de rol y
    activar/desactivar, sin tocar la consola de Firebase manualmente.
  - **Puntos de guarda**: alta (código + nombre + capacidad), activar/desactivar.
  - **Terminales**: alta asociada a un punto de guarda, activar/desactivar.
  - **Impresoras**: alta asociada a una terminal (ruta de red, modelo).
- Toda acción de este módulo queda registrada en `auditoria`.

## [0.1.1] - 2026-07-28

### Cambiado
- Conectado al proyecto real de Firebase (`guardasys-3a434`): credenciales
  cargadas en `js/firebase-config.js`.
- SDK de Firebase (compat) actualizado de 10.12.2 a 12.16.0.
- Agregado Firebase Analytics (compat), inicializado de forma no bloqueante.

## [0.1.0] - 2026-07-27

### Agregado
- Estructura inicial del Sistema Central (React vía CDN + Babel Standalone,
  sin build; Firebase compat SDK).
- Login con Firebase Authentication (email/contraseña).
- Shell de navegación con menú lateral filtrado por rol
  (operador / supervisor / administrador).
- Módulo funcional **Nueva guarda**: búsqueda/alta de cliente, carga de
  volúmenes, generación de código de ticket (`PB-20260723-000125`) mediante
  transacción atómica de Firestore para evitar correlativos duplicados.
- Reglas de seguridad de Firestore (v0.1, por rol) y `firebase.json` /
  `firestore.indexes.json` para despliegue vía Firebase CLI.

### Pendiente (próximas versiones)
- Módulo de Devoluciones.
- Módulo de Incidencias.
- Módulo de Reportes.
- Módulo de Administración (usuarios, puntos de guarda, terminales,
  impresoras, ubicaciones físicas).
- Módulo de Auditoría (visualización).
- Integración con el Servidor Central de Impresión.
