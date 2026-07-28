# Changelog — GuardaSys (TOKU Importados)

Todos los cambios notables de este proyecto se documentan en este archivo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/),
versionado según [SemVer](https://semver.org/lang/es/).

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
