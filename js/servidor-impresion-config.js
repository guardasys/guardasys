// ============================================================================
// CONFIGURACIÓN DEL SERVIDOR CENTRAL DE IMPRESIÓN — GuardaSys
// ============================================================================
// URL interna (VPN de TOKU) del Servidor de Impresión (Node.js on-premise).
// Los puestos están conectados a esa VPN, así que el navegador puede
// llamar a la IP interna del servidor aunque este sitio se sirva desde
// GitHub Pages (internet público) — ver §3.3 del brief de arquitectura.
//
// Completar cuando el servidor esté desplegado en el equipo dedicado de
// TOKU. Mientras tanto, las funciones que dependen de él (ej. autocompletar
// nombre desde CPF) muestran un aviso en vez de fallar en silencio.
// ============================================================================

const GUARDASYS_SERVIDOR_IMPRESION_URL = "http://REEMPLAZAR-IP-INTERNA:3000";
