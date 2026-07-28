# GuardaSys — TOKU Importados (Sistema Central)

Frontend del Sistema Central: React puro vía CDN (sin build), Firebase
Firestore + Authentication, hosteado en GitHub Pages.

> Este repo es independiente de cualquier otro sistema de Vive Telecom
> (sin Firebase compartido, sin código compartido).

## 1. Proyecto de Firebase

Ya está creado y configurado: **`guardasys-3a434`**. Las credenciales ya
están cargadas en `js/firebase-config.js` — no hace falta tocar ese
archivo salvo que se recree el proyecto.

Falta habilitar manualmente (si no lo hiciste todavía) dentro de ese
proyecto:

1. **Compilación → Firestore Database → Crear base de datos** (elegí una
   región cercana, ej. `southamerica-east1`).
2. **Compilación → Authentication → Comenzar → Correo electrónico/contraseña**
   → habilitar.

## 2. Crear los primeros usuarios y puntos de guarda

Con el proyecto recién creado, Firestore está vacío — hacen falta al menos:

- Un usuario en **Authentication** (email/contraseña) y su documento
  espejo en `usuarios/{uid}` con `rol: "administrador"` (por ahora esto se
  carga a mano desde la consola de Firebase; el módulo de Administración
  para hacerlo desde la interfaz es uno de los próximos pasos).
- Al menos un documento en `puntosGuarda` con `activo: true`, `codigo` y
  `nombre` (ej. `codigo: "PB"`, `nombre: "Planta Baja"`) — si no hay
  ninguno, el módulo "Nueva guarda" avisa que no hay puntos configurados.

## 3. Publicar las reglas de Firestore

Con [Firebase CLI](https://firebase.google.com/docs/cli) instalado:

```bash
firebase login
firebase use --add        # elegir el proyecto de GuardaSys
firebase deploy --only firestore:rules,firestore:indexes
```

## 4. Publicar en GitHub Pages

1. Crear un repositorio nuevo en GitHub llamado `guardasys` (privado o
   público según defina TOKU) y subir el contenido de esta carpeta a `main`.
2. **Settings → Pages → Source**: rama `main`, carpeta `/ (root)`.
3. GitHub va a publicar el sitio en
   `https://<usuario-o-org>.github.io/<repo>/`.

## 5. Estructura del proyecto

```
index.html              punto de entrada
css/styles.css          estilos
js/firebase-config.js   credenciales del proyecto de Firebase (completar)
js/firebase-init.js     inicialización de Firebase (no tocar salvo cambios de infraestructura)
js/components.js        componentes React (Login, Sidebar, módulos)
js/app.js               componente raíz, sesión y ruteo
firestore.rules          reglas de seguridad
firestore.indexes.json   índices compuestos
firebase.json            config de Firebase CLI
CHANGELOG.md
```

## Estado actual

Ver `CHANGELOG.md`. Versión actual: **0.1.0** — login + módulo "Nueva
guarda" funcional. El resto de los módulos se agregan de forma iterativa.
