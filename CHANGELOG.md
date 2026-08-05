# Changelog — GuardaSys (TOKU Importados)

Todos los cambios notables de este proyecto se documentan en este archivo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/),
versionado según [SemVer](https://semver.org/lang/es/).

## [0.11.0] - 2026-08-05

### Cambiado
- Orden del tipo de documento (en Nueva Guarda y en el autoregistro
  público) ahora es **CPF, CI, DNI, Pasaporte, Otro** — CPF primero, ya
  que es el documento más común entre los clientes.
- Nueva Guarda: el formulario de cliente nuevo ya no pide **nacionalidad**
  ni **email** — solo nombre completo y teléfono.
- Nueva Guarda: el campo Teléfono ahora usa el mismo selector de país con
  bandera que el autoregistro público (Brasil, Argentina y Paraguay
  primero), en vez de un campo de texto libre.

### Interno
- El selector de país (`SelectorPais`) se movió a un archivo compartido
  (`js/selector-pais.js`) para no duplicar el componente entre Nueva
  Guarda y el módulo público — ambos ya lo usan igual.

## [0.10.1] - 2026-08-05

### Cambiado
- Autoregistro público: idioma por defecto ahora es **portugués**
  (antes español), con el orden de banderas 🇧🇷 → 🇪🇸 → 🇬🇧.
- Etiqueta de tipo de documento simplificada a solo "CI" en los tres
  idiomas (antes decía "Cédula (CI)").

### Agregado
- Cuando el documento es CPF, el nombre se busca automáticamente en la
  misma API que ya usa Nueva Guarda (vía el Servidor de Impresión), igual
  que en la pantalla interna — el cliente ve su nombre precargado y solo
  lo confirma o corrige.
- Nota: esa búsqueda solo funciona si el celular del cliente está
  conectado a la red/wifi del local (el Servidor de Impresión es interno,
  no accesible desde datos móviles). Si no hay conexión, el cliente
  completa el nombre a mano sin ningún error visible — no se nota como
  falla, solo no se autocompleta.

## [0.10.0] - 2026-08-05

### Agregado
- **Autoregistro público de clientes** (`registro-cliente.html`): página
  nueva, sin login, pensada para abrirse escaneando un QR fijo pegado en
  el local desde el celular del cliente. Carga tipo/número de documento,
  nombre y celular (con selector de país con banderita — Brasil, Argentina
  y Paraguay primero). Disponible en español, portugués e inglés.
- Si el documento ya existe, no se modifica nada: se muestran los datos
  ya cargados y se avisa que para corregir algo hay que hablar con el
  operador en el mostrador.
- Los clientes creados por esta vía quedan marcados con
  `origenRegistro: "autoregistro_qr"` para poder diferenciarlos de los
  cargados por un operador.

### Cambiado — reglas de Firestore
- `clientes` ahora permite lectura sin login (antes requería ser
  operador) y creación pública, pero **restringida por reglas a
  exactamente** `tipoDocumento`, `numeroDocumento`, `nombreCompleto`,
  `telefono`, `origenRegistro` y `creadoEn`, con validación de tipo,
  valores permitidos y longitud máxima por campo. No permite editar ni
  borrar un cliente existente por esta vía — eso sigue siendo solo para
  operadores.

### ⚠️ Riesgo de seguridad aceptado (decisión explícita del cliente)
- Para que la página pueda avisar "ya estás registrado" sin pedir login,
  la lectura de `clientes` quedó abierta a cualquiera con la URL, no solo
  a quien escaneó el QR del local. En teoría, alguien podría probar
  números de documento al azar contra esa URL y obtener nombre/teléfono
  de clientes registrados. Se evaluó una alternativa más segura (buscar
  por identificador exacto en vez de por consulta abierta, lo que cierra
  el hueco de raíz) pero se decidió no tocar la lógica de clientes ya
  probada en producción por ahora. Queda como mejora pendiente si el
  volumen de clientes o el riesgo percibido crece.

## [0.9.1] - 2026-08-01

### Corregido
- Nueva guarda fallaba siempre con "No se pudo registrar la guarda"
  (`ReferenceError: Cannot access 'codigo' before initialization`) — al
  sacar el contador secuencial en la v0.9.0, quedó la variable `codigo`
  declarada dos veces en el mismo bloque de código, y la segunda
  declaración tapaba a la primera desde el principio del bloque. No
  llegué a probar esta ruta con Node antes de entregarla (a diferencia
  del Servidor de Impresión, donde ya empecé a verificar con `node -c`) —
  a partir de ahora reviso esto también en los archivos de React aunque
  no se puedan ejecutar igual de directo.

## [0.9.0] - 2026-08-01

### Cambiado
- **Numeración de tickets ahora es aleatoria** en vez de secuencial por
  fecha. Antes: `PB-20260723-000125` (punto + fecha + correlativo,
  predecible). Ahora: `2A-12345678-901234` (punto + 8 dígitos al azar +
  6 dígitos al azar) — mismo largo total, pero ya no se puede adivinar
  el próximo ticket incrementando el número.
- Antes de generar cada código se verifica contra Firestore que no
  exista ya (con reintento, hasta 5 veces) — con 14 dígitos aleatorios
  la chance de choque es prácticamente nula, pero se verifica igual.
- La colección `contadores` (correlativo por punto+fecha) queda sin uso
  — no hace falta borrar los documentos viejos, simplemente no se
  escriben ni leen más.

### Nota
- El campo `fecha` sigue imprimiéndose en el ticket como antes (fecha y
  hora legibles) — lo único que cambió es que ya no forma parte del
  código del ticket en sí.

## [0.8.1] - 2026-07-31

### Corregido
- Devoluciones no cargaba en absoluto (pantalla en blanco,
  `ReferenceError: DevolucionesModule is not defined`) por una llave `}`
  de más que quedó del cambio de la foto de referencia, cortando el
  archivo a la mitad. Nueva guarda no se vio afectada porque el error
  estaba en `devoluciones.js`, un archivo aparte.

## [0.8.0] - 2026-07-31

### Agregado
- **Foto de referencia (opcional)** en Nueva guarda: con consentimiento
  explícito del cliente (checkbox), se puede activar la cámara web y
  sacar una foto que se muestra en Devoluciones al momento del retiro,
  para que el operador la compare visualmente con la persona que se
  presenta. **No es reconocimiento facial automático** — el sistema no
  decide nada, solo muestra la foto lado a lado con los datos del
  ticket.
- La foto se guarda en el **disco local del Servidor de Impresión**
  (nunca en Firestore ni en un servicio en la nube) y se **borra
  automáticamente** apenas se confirma la devolución — nunca queda
  guardada la foto de una guarda ya cerrada.
- Nuevo campo `tieneFoto` (boolean) en `operaciones`, para que
  Devoluciones sepa si hay que pedir la foto sin intentarlo a ciegas.

### Notas de diseño
- Se evaluó reconocimiento facial automático (identificación 1:N contra
  las guardas abiertas) y se decidió no implementarlo por ahora: mayor
  riesgo (falsos positivos entregarían pertenencias a la persona
  equivocada), mayor carga legal por el uso más intensivo de datos
  biométricos, y mayor complejidad. Queda como posible mejora futura,
  acotada al caso de "ticket perdido" en Incidencias, si hace falta.

## [0.7.3] - 2026-07-31

### Corregido
- El payload que se manda al Servidor de Impresión no incluía
  `cantidadItems` de cada volumen (solo `tipo` y `descripcion`) — por eso
  el fix del servidor para imprimir una etiqueta por bulto físico (v0.4.2
  del servidor) no tenía efecto: el dato nunca llegaba. Corregido en la
  función compartida `imprimirTicket()`, así queda arreglado tanto en
  Nueva guarda como en "Reimprimir ticket" de Devoluciones.

## [0.7.2] - 2026-07-28

### Agregado
- Botón **"Probar"** en Administración → Impresoras: manda un ticket de
  prueba corto a esa impresora (usa el nuevo endpoint `/imprimir-prueba`
  del Servidor de Impresión), sin tener que crear una guarda completa.
  Muestra el resultado (éxito/error) debajo del botón, y queda en
  auditoría.

## [0.7.1] - 2026-07-28

### Cambiado
- La terminal ya **no se elige en Nueva guarda**: ahora es un paso de
  sesión. Después del login, si esa PC/navegador todavía no tiene una
  terminal asignada, se muestra una pantalla **"¿Qué terminal es esta
  PC?"** (una sola vez — el navegador la recuerda). Nueva guarda pasa a
  derivar el punto de guarda automáticamente a partir de la terminal
  elegida, en vez de pedirlo por separado — como cada terminal pertenece
  a un solo punto de guarda, ya no hace falta elegir los dos.
- Sidebar: se agregó "Terminal: ... (cambiar)" en el pie, para poder
  reconfigurarla desde cualquier pantalla sin pasar por Nueva guarda.

## [0.7.0] - 2026-07-28

### Agregado
- **Impresión automática de tickets** (por fin conecta con el Servidor de
  Impresión de verdad, no solo CPF):
  - Nueva guarda ahora imprime el ticket automáticamente al registrar la
    operación. Si falla (impresora apagada, sin red, etc.), la guarda
    igual queda registrada — se muestra un aviso con botón **"Reintentar
    impresión"**, sin perder los datos.
  - Nuevo selector **"Terminal (esta PC)"** en Nueva guarda: cada PC elige
    una vez qué terminal es (el navegador lo recuerda con localStorage) —
    así el sistema sabe a qué impresora mandar cada ticket. Antes este
    dato nunca se completaba (`usuario.terminalId` no existía en ningún
    lado).
  - Botón **"Reimprimir ticket"** en Devoluciones, sobre el detalle de la
    guarda — útil para tickets dañados o que no salieron bien.
  - Toda impresión (éxito, error, reimpresión) queda en `auditoria`.
- Nuevo índice compuesto (`terminales`: `puntoGuardaId` + `activo`) para
  la carga de terminales por punto de guarda.

### Pendiente
- Confirmar el formato real impreso contra la Epson TM-T20III física
  (ancho de 48 caracteres y comandos ESC/POS asumidos, no probados
  todavía con hardware real).
- Los acentos se transliteran (á→a, ñ→n) para evitar depender de la tabla
  de caracteres de la impresora sin poder probarla — a revisar según lo
  que salga en la impresión real.

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
