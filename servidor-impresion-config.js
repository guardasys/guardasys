// ============================================================================
// CONFIGURACIÓN DEL SERVIDOR CENTRAL DE IMPRESIÓN — Paris Store
// ============================================================================
// URL interna (VPN de Paris Store) del Servidor de Impresión (Node.js on-premise).
// Los puestos están conectados a esa VPN, así que el navegador puede
// llamar a la IP interna del servidor aunque este sitio se sirva desde
// GitHub Pages (internet público) — ver §3.3 del brief de arquitectura.
//
// IP interna confirmada: 172.16.249.60 (equipo "vive-telecom" dentro de la
// red/VPN de Paris Store). Si el servidor se muda a otro equipo o cambia de IP,
// actualizar acá.
// ============================================================================

const GUARDASYS_SERVIDOR_IMPRESION_URL = "http://172.16.249.60:3000";
