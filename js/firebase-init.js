// ============================================================================
// INICIALIZACIÓN DE FIREBASE — Paris Store, Guarda de Volúmenes
// ============================================================================
// Como no usamos bundler/ES modules, exponemos las instancias como globals
// (window.guardaSysDb, window.guardaSysAuth) para que los componentes React
// (transpilados en el navegador con Babel Standalone) los usen directamente.
// ============================================================================

firebase.initializeApp(GUARDASYS_FIREBASE_CONFIG);

window.guardaSysDb = firebase.firestore();
window.guardaSysAuth = firebase.auth();

// Analytics es opcional para el funcionamiento del sistema; si el navegador
// bloquea el script (ej. algún adblock) no debe romper el resto de la app.
try {
  firebase.analytics();
} catch (err) {
  console.warn("Firebase Analytics no se pudo inicializar:", err);
}

// Persistencia de sesión entre recargas de página (recomendado para
// puestos fijos: el operador no tiene que loguearse de nuevo si se
// refresca la página, solo si cierra sesión explícitamente).
window.guardaSysAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
