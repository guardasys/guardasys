const { useState, useEffect } = React;

// ============================================================================
// LOGIN
// ============================================================================

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function manejarSubmit(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      await window.guardaSysAuth.signInWithEmailAndPassword(email, password);
    } catch (err) {
      setError("Usuario o contraseña incorrectos.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="pantalla-login">
      <div className="tarjeta-login">
        <div className="marca">
          <span className="marca-principal">GuardaSys</span>
          <span className="marca-sub">TOKU Importados</span>
        </div>
        <h1>Sistema de Guarda de Volúmenes</h1>

        {error && <div className="error-login">{error}</div>}

        <form onSubmit={manejarSubmit}>
          <div className="campo">
            <label>Usuario</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="campo">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="boton boton-primario" disabled={cargando}>
            {cargando ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
        <div className="version-sistema version-sistema-login">GuardaSys v{GUARDASYS_VERSION}</div>
      </div>
    </div>
  );
}

// ============================================================================
// CONFIGURAR TERMINAL — paso de sesión, no de pantalla
// ============================================================================
// Se muestra una sola vez por PC/navegador, inmediatamente después del
// login, si esa PC todavía no tiene una terminal asignada (o si el
// usuario eligió "Cambiar terminal"). Una vez elegida, se guarda en
// localStorage y el resto del sistema (Nueva guarda, impresión) la usa
// sin volver a preguntar.
// ============================================================================

function ConfigurarTerminal({ onListo }) {
  const [puntosGuarda, setPuntosGuarda] = useState([]);
  const [puntoGuardaId, setPuntoGuardaId] = useState("");
  const [terminales, setTerminales] = useState([]);
  const [terminalId, setTerminalId] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    window.guardaSysDb
      .collection("puntosGuarda")
      .where("activo", "==", true)
      .get()
      .then((snap) => {
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPuntosGuarda(lista);
        if (lista.length > 0) setPuntoGuardaId(lista[0].id);
      })
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    if (!puntoGuardaId) return;
    setTerminalId("");
    window.guardaSysDb
      .collection("terminales")
      .where("puntoGuardaId", "==", puntoGuardaId)
      .where("activo", "==", true)
      .get()
      .then((snap) => {
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTerminales(lista);
        if (lista.length > 0) setTerminalId(lista[0].id);
      });
  }, [puntoGuardaId]);

  function confirmar() {
    if (!terminalId) return;
    setGuardando(true);
    guardarTerminalSeleccionada(terminalId);
    onListo(terminalId);
  }

  return (
    <div className="pantalla-login">
      <div className="tarjeta-login" style={{ width: 400 }}>
        <div className="marca">
          <span className="marca-principal">GuardaSys</span>
          <span className="marca-sub">TOKU Importados</span>
        </div>
        <h1>¿Qué terminal es esta PC?</h1>
        <p className="texto-suave" style={{ marginTop: -16, marginBottom: 20, fontSize: 13 }}>
          Se elige una sola vez — el navegador la recuerda para que los tickets se impriman en la impresora correcta.
        </p>

        {cargando ? (
          <div className="cargando">Cargando…</div>
        ) : puntosGuarda.length === 0 ? (
          <p className="texto-suave">Todavía no hay puntos de guarda configurados en Administración.</p>
        ) : (
          <React.Fragment>
            <div className="campo">
              <label>Punto de guarda</label>
              <select value={puntoGuardaId} onChange={(e) => setPuntoGuardaId(e.target.value)}>
                {puntosGuarda.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.codigo})
                  </option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label>Terminal</label>
              {terminales.length === 0 ? (
                <p className="texto-suave" style={{ marginTop: 8 }}>
                  Este punto no tiene terminales configuradas — creá una en Administración.
                </p>
              ) : (
                <select value={terminalId} onChange={(e) => setTerminalId(e.target.value)}>
                  {terminales.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.codigo}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <button
              className="boton boton-primario"
              style={{ width: "100%", marginTop: 8 }}
              disabled={!terminalId || guardando}
              onClick={confirmar}
            >
              Confirmar
            </button>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SIDEBAR / NAVEGACIÓN
// ============================================================================

const ITEMS_NAV = [
  { id: "inicio", etiqueta: "Inicio", roles: ["operador", "supervisor", "administrador"] },
  { id: "nueva-guarda", etiqueta: "Nueva guarda", roles: ["operador", "supervisor", "administrador"] },
  { id: "devoluciones", etiqueta: "Devoluciones", roles: ["operador", "supervisor", "administrador"] },
  { id: "incidencias", etiqueta: "Incidencias", roles: ["operador", "supervisor", "administrador"] },
  { id: "reportes", etiqueta: "Reportes", roles: ["supervisor", "administrador"] },
  { id: "administracion", etiqueta: "Administración", roles: ["administrador"] },
  { id: "auditoria", etiqueta: "Auditoría", roles: ["administrador"] },
];

function Sidebar({ usuario, paginaActiva, onNavegar, onCerrarSesion }) {
  const items = ITEMS_NAV.filter((item) => item.roles.includes(usuario.rol));

  return (
    <div className="sidebar">
      <div className="marca">
        <div className="marca-principal">GuardaSys</div>
        <div className="marca-sub">TOKU Importados</div>
      </div>

      {items.map((item) => (
        <div
          key={item.id}
          className={"nav-item" + (paginaActiva === item.id ? " activo" : "")}
          onClick={() => onNavegar(item.id)}
        >
          {item.etiqueta}
        </div>
      ))}

      <div className="sidebar-footer">
        <div className="usuario-actual">{usuario.nombreCompleto || usuario.email}</div>
        <div className="usuario-rol">{usuario.rol}</div>
        <div className="texto-suave" style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 10 }}>
          Terminal: {obtenerTerminalGuardada() || "sin configurar"}{" "}
          <span
            style={{ textDecoration: "underline", cursor: "pointer" }}
            onClick={() => {
              localStorage.removeItem(LLAVE_TERMINAL_LOCAL);
              window.location.reload();
            }}
          >
            cambiar
          </span>
        </div>
        <button className="boton boton-secundario" onClick={onCerrarSesion} style={{ width: "100%" }}>
          Cerrar sesión
        </button>
        <div className="version-sistema">GuardaSys v{GUARDASYS_VERSION}</div>
      </div>
    </div>
  );
}

// ============================================================================
// PANEL DE INICIO (placeholder — se completa con métricas reales más adelante)
// ============================================================================

function PanelInicio({ usuario }) {
  return (
    <div className="contenido">
      <div className="encabezado-pagina">
        <h1>Hola, {usuario.nombreCompleto || usuario.email}</h1>
        <p>GuardaSys — Sistema de Guarda de Volúmenes de TOKU Importados</p>
      </div>
      <div className="panel">
        <h2>Próximos módulos</h2>
        <p className="texto-suave">
          Este es el primer recorte funcional. Los módulos de Devoluciones,
          Incidencias, Reportes, Administración y Auditoría se suman de
          forma iterativa, como en el proyecto de Inventario.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// NUEVA GUARDA — módulo funcional: registrar cliente + volúmenes + ticket
// ============================================================================

const TIPOS_VOLUMEN = ["valija", "bolsa", "compra", "otro"];
const TIPOS_DOCUMENTO = ["CI", "DNI", "CPF", "Pasaporte", "Otro"];

// ============================================================================
// IMPRESIÓN — helpers compartidos por Nueva guarda, Devoluciones e Incidencias
// ============================================================================
// Cada PC "recuerda" en localStorage qué terminal es (se elige una vez,
// desde Nueva guarda) — así sabemos qué impresora usar sin tener que
// preguntarlo en cada operación. localStorage es apropiado acá porque es
// el sitio real desplegado (no un artifact de Claude), y el dato
// (terminalId) no es sensible.
// ============================================================================

const LLAVE_TERMINAL_LOCAL = "guardasys_terminal_id";

function obtenerTerminalGuardada() {
  return localStorage.getItem(LLAVE_TERMINAL_LOCAL) || "";
}

function guardarTerminalSeleccionada(terminalId) {
  localStorage.setItem(LLAVE_TERMINAL_LOCAL, terminalId);
}

async function resolverImpresora(terminalId) {
  if (!terminalId) return null;
  const terminalDoc = await window.guardaSysDb.collection("terminales").doc(terminalId).get();
  if (!terminalDoc.exists || !terminalDoc.data().impresoraId) return null;
  const impresoraDoc = await window.guardaSysDb.collection("impresoras").doc(terminalDoc.data().impresoraId).get();
  if (!impresoraDoc.exists) return null;
  return { id: impresoraDoc.id, ...impresoraDoc.data() };
}

function fechaHoraLegible(date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${d}/${m}/${y} ${hh}:${mm}`;
}

/**
 * Intenta imprimir un ticket. Devuelve { success, error? }.
 * No lanza excepciones — cualquier falla queda encapsulada en el resultado,
 * porque una guarda ya registrada en Firestore no debe "deshacerse" solo
 * porque la impresión falló (la impresora puede estar apagada, sin red,
 * etc. — el operador puede reintentar aparte).
 */
async function imprimirTicket(operacion) {
  const terminalId = obtenerTerminalGuardada();
  if (!terminalId) {
    return { success: false, error: "Esta PC todavía no tiene una terminal configurada (elegila en Nueva guarda)." };
  }
  if (!GUARDASYS_SERVIDOR_IMPRESION_URL || GUARDASYS_SERVIDOR_IMPRESION_URL.includes("REEMPLAZAR")) {
    return { success: false, error: "Falta configurar la URL del Servidor de Impresión." };
  }

  let impresora;
  try {
    impresora = await resolverImpresora(terminalId);
  } catch (err) {
    return { success: false, error: "No se pudo consultar la impresora configurada." };
  }
  if (!impresora) {
    return { success: false, error: "Esta terminal no tiene una impresora asignada (revisar en Administración)." };
  }

  try {
    const resp = await fetch(`${GUARDASYS_SERVIDOR_IMPRESION_URL}/imprimir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rutaRed: impresora.rutaRed,
        ticket: {
          codigoTicket: operacion.codigoTicket,
          fecha: fechaHoraLegible(new Date()),
          puntoGuardaNombre: operacion.puntoGuardaNombre,
          clienteNombre: operacion.clienteSnapshot.nombreCompleto,
          clienteTipoDocumento: operacion.clienteSnapshot.tipoDocumento,
          clienteNumeroDocumento: operacion.clienteSnapshot.numeroDocumento,
          volumenes: operacion.volumenes.map((v) => ({ tipo: v.tipo, descripcion: v.descripcion, cantidadItems: v.cantidadItems })),
        },
      }),
    });
    return await resp.json();
  } catch (err) {
    return { success: false, error: "No se pudo conectar con el Servidor de Impresión." };
  }
}

function etiquetaTipoVolumen(tipo) {
  return tipo.charAt(0).toUpperCase() + tipo.slice(1);
}

function generarIdVolumen() {
  return "v_" + Math.random().toString(36).slice(2, 10);
}

function fechaAAAAMMDD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function NuevaGuarda({ usuario }) {
  const terminalId = obtenerTerminalGuardada();
  const [puntoGuarda, setPuntoGuarda] = useState(null); // {id, codigo, nombre} — derivado de la terminal
  const [cargandoContexto, setCargandoContexto] = useState(true);
  const [errorContexto, setErrorContexto] = useState(null);

  const [tipoDocumento, setTipoDocumento] = useState("DNI");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [buscandoCpf, setBuscandoCpf] = useState(false);
  const [clienteEncontrado, setClienteEncontrado] = useState(null); // {id, ...datos} | null
  const [clienteEsNuevo, setClienteEsNuevo] = useState(false);
  const [formCliente, setFormCliente] = useState({
    nombreCompleto: "",
    nacionalidad: "",
    telefono: "",
    email: "",
  });

  const [volumenes, setVolumenes] = useState([]);
  const [nuevoVolumen, setNuevoVolumen] = useState({ tipo: "valija", descripcion: "", cantidadItems: "" });

  const [guardando, setGuardando] = useState(false);
  const [reintentandoImpresion, setReintentandoImpresion] = useState(false);
  const [mensaje, setMensaje] = useState(null); // {tipo: 'exito'|'advertencia'|'error', texto, codigoTicket?, reintentarImpresion?}

  useEffect(() => {
    if (!terminalId) {
      setCargandoContexto(false);
      return;
    }
    window.guardaSysDb
      .collection("terminales")
      .doc(terminalId)
      .get()
      .then((terminalDoc) => {
        if (!terminalDoc.exists || !terminalDoc.data().puntoGuardaId) {
          setErrorContexto("La terminal configurada en esta PC ya no existe. Volvé a configurarla.");
          return null;
        }
        return window.guardaSysDb.collection("puntosGuarda").doc(terminalDoc.data().puntoGuardaId).get();
      })
      .then((puntoDoc) => {
        if (!puntoDoc) return;
        if (!puntoDoc.exists) {
          setErrorContexto("El punto de guarda de esta terminal ya no existe. Volvé a configurarla.");
          return;
        }
        setPuntoGuarda({ id: puntoDoc.id, ...puntoDoc.data() });
      })
      .catch(() => setErrorContexto("No se pudo cargar la configuración de esta terminal."))
      .finally(() => setCargandoContexto(false));
  }, [terminalId]);

  function cambiarTerminal() {
    localStorage.removeItem(LLAVE_TERMINAL_LOCAL);
    window.location.reload();
  }

  async function reintentarImpresion() {
    if (!mensaje || !mensaje.reintentarImpresion) return;
    setReintentandoImpresion(true);
    const resultadoImpresion = await imprimirTicket(mensaje.reintentarImpresion);
    if (resultadoImpresion.success) {
      await registrarAuditoria(usuario, "imprimir_ticket", "operacion", null, null, { codigoTicket: mensaje.codigoTicket, reintento: true });
      setMensaje({ tipo: "exito", texto: "Ticket impreso correctamente.", codigoTicket: mensaje.codigoTicket });
    } else {
      setMensaje({ ...mensaje, texto: `Sigue sin poder imprimir: ${resultadoImpresion.error}` });
    }
    setReintentandoImpresion(false);
  }

  async function buscarCliente() {
    if (!numeroDocumento.trim()) return;
    setBuscando(true);
    setMensaje(null);
    setClienteEncontrado(null);
    setClienteEsNuevo(false);
    try {
      const snap = await window.guardaSysDb
        .collection("clientes")
        .where("tipoDocumento", "==", tipoDocumento)
        .where("numeroDocumento", "==", numeroDocumento.trim())
        .limit(1)
        .get();

      if (!snap.empty) {
        const doc = snap.docs[0];
        setClienteEncontrado({ id: doc.id, ...doc.data() });
      } else {
        setClienteEsNuevo(true);
      }
    } catch (err) {
      setMensaje({ tipo: "error", texto: "Error al buscar el cliente." });
    } finally {
      setBuscando(false);
    }
  }

  async function buscarNombrePorCpf() {
    if (!numeroDocumento.trim()) return;
    if (!GUARDASYS_SERVIDOR_IMPRESION_URL || GUARDASYS_SERVIDOR_IMPRESION_URL.includes("REEMPLAZAR")) {
      setMensaje({ tipo: "error", texto: "Falta configurar la URL del Servidor de Impresión (js/servidor-impresion-config.js)." });
      return;
    }
    setBuscandoCpf(true);
    setMensaje(null);
    try {
      const resp = await fetch(`${GUARDASYS_SERVIDOR_IMPRESION_URL}/consultar-cpf/${numeroDocumento.trim()}`);
      const data = await resp.json();
      if (data.success && data.nombre) {
        setFormCliente((f) => ({ ...f, nombreCompleto: data.nombre }));
      } else {
        setMensaje({ tipo: "error", texto: "No se encontró un nombre para ese CPF." });
      }
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "No se pudo conectar con el Servidor de Impresión (¿estás en la VPN?)." });
    } finally {
      setBuscandoCpf(false);
    }
  }

  function agregarVolumen() {
    if (!nuevoVolumen.descripcion.trim()) return;
    setVolumenes((prev) => [
      ...prev,
      {
        volumenId: generarIdVolumen(),
        tipo: nuevoVolumen.tipo,
        descripcion: nuevoVolumen.descripcion.trim(),
        cantidadItems: nuevoVolumen.cantidadItems ? Number(nuevoVolumen.cantidadItems) : null,
        ubicacionFisica: null,
        fotoUrl: null,
      },
    ]);
    setNuevoVolumen({ tipo: "valija", descripcion: "", cantidadItems: "" });
  }

  function quitarVolumen(volumenId) {
    setVolumenes((prev) => prev.filter((v) => v.volumenId !== volumenId));
  }

  function puedeRegistrar() {
    if (!puntoGuarda || volumenes.length === 0) return false;
    if (clienteEncontrado) return true;
    if (clienteEsNuevo) return formCliente.nombreCompleto.trim().length > 0;
    return false;
  }

  async function registrarGuarda() {
    setGuardando(true);
    setMensaje(null);

    const fechaStr = fechaAAAAMMDD(new Date());
    const contadorId = `${puntoGuarda.id}_${fechaStr}`;
    const contadorRef = window.guardaSysDb.collection("contadores").doc(contadorId);
    const operacionRef = window.guardaSysDb.collection("operaciones").doc();
    const clienteRef = clienteEncontrado
      ? window.guardaSysDb.collection("clientes").doc(clienteEncontrado.id)
      : window.guardaSysDb.collection("clientes").doc();
    const auditoriaRef = window.guardaSysDb.collection("auditoria").doc();

    try {
      const resultado = await window.guardaSysDb.runTransaction(async (tx) => {
        const contadorSnap = await tx.get(contadorRef);
        const ultimoNumero = contadorSnap.exists ? contadorSnap.data().ultimoNumero : 0;
        const nuevoNumero = ultimoNumero + 1;
        const correlativo = String(nuevoNumero).padStart(6, "0");
        const codigo = `${puntoGuarda.codigo}-${fechaStr}-${correlativo}`;

        const timestamp = firebase.firestore.FieldValue.serverTimestamp();

        let clienteSnapshot;
        if (clienteEncontrado) {
          clienteSnapshot = {
            nombreCompleto: clienteEncontrado.nombreCompleto,
            tipoDocumento: clienteEncontrado.tipoDocumento,
            numeroDocumento: clienteEncontrado.numeroDocumento,
          };
        } else {
          const datosCliente = {
            nombreCompleto: formCliente.nombreCompleto.trim(),
            tipoDocumento,
            numeroDocumento: numeroDocumento.trim(),
            nacionalidad: formCliente.nacionalidad.trim() || null,
            telefono: formCliente.telefono.trim() || null,
            email: formCliente.email.trim() || null,
            notas: null,
            creadoEn: timestamp,
            actualizadoEn: timestamp,
          };
          tx.set(clienteRef, datosCliente);
          clienteSnapshot = {
            nombreCompleto: datosCliente.nombreCompleto,
            tipoDocumento: datosCliente.tipoDocumento,
            numeroDocumento: datosCliente.numeroDocumento,
          };
        }

        tx.set(operacionRef, {
          codigoTicket: codigo,
          clienteId: clienteRef.id,
          clienteSnapshot,
          puntoGuardaId: puntoGuarda.id,
          puntoGuardaNombre: puntoGuarda.nombre,
          terminalId: terminalId || null,
          operadorId: usuario.uid,
          operadorNombre: usuario.nombreCompleto || usuario.email,
          estado: "abierta",
          volumenes,
          fechaIngreso: timestamp,
          fechaEgreso: null,
          entregadoPor: null,
          entregaSnapshot: null,
          creadoEn: timestamp,
          actualizadoEn: timestamp,
        });

        tx.set(contadorRef, { ultimoNumero: nuevoNumero });

        tx.set(auditoriaRef, {
          usuarioId: usuario.uid,
          usuarioNombre: usuario.nombreCompleto || usuario.email,
          fechaHora: timestamp,
          terminalId: terminalId || null,
          accion: "crear_operacion",
          entidadTipo: "operacion",
          entidadId: operacionRef.id,
          datosAntes: null,
          datosDespues: { codigoTicket: codigo, clienteId: clienteRef.id, puntoGuardaId: puntoGuarda.id },
        });

        return { codigo, operacionParaImprimir: { codigoTicket: codigo, puntoGuardaNombre: puntoGuarda.nombre, clienteSnapshot, volumenes } };
      });

      const { codigo, operacionParaImprimir } = resultado;

      // La guarda ya quedó registrada en Firestore en este punto — lo que
      // sigue (imprimir) es un paso aparte que puede fallar sin que haya
      // que deshacer nada. Si falla, el operador puede reintentar.
      const resultadoImpresion = await imprimirTicket(operacionParaImprimir);
      if (resultadoImpresion.success) {
        await registrarAuditoria(usuario, "imprimir_ticket", "operacion", null, null, { codigoTicket: codigo });
        setMensaje({ tipo: "exito", texto: "Guarda registrada e impresa correctamente.", codigoTicket: codigo });
      } else {
        await registrarAuditoria(usuario, "error_impresion", "operacion", null, null, { codigoTicket: codigo, error: resultadoImpresion.error });
        setMensaje({
          tipo: "advertencia",
          texto: `Guarda registrada, pero no se pudo imprimir: ${resultadoImpresion.error}`,
          codigoTicket: codigo,
          reintentarImpresion: operacionParaImprimir,
        });
      }

      // Reset para la próxima operación
      setNumeroDocumento("");
      setClienteEncontrado(null);
      setClienteEsNuevo(false);
      setFormCliente({ nombreCompleto: "", nacionalidad: "", telefono: "", email: "" });
      setVolumenes([]);
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "No se pudo registrar la guarda. Intentá de nuevo." });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="contenido">
      <div className="encabezado-pagina">
        <h1>Nueva guarda</h1>
        <p>Registrar cliente, volúmenes y generar el ticket de guarda.</p>
      </div>

      {mensaje && mensaje.tipo === "exito" && (
        <div className="mensaje-exito">
          {mensaje.texto}{" "}
          {mensaje.codigoTicket && <span className="ticket-codigo">{mensaje.codigoTicket}</span>}
        </div>
      )}
      {mensaje && mensaje.tipo === "advertencia" && (
        <div className="mensaje-error">
          {mensaje.texto}{" "}
          {mensaje.codigoTicket && <span className="ticket-codigo">{mensaje.codigoTicket}</span>}
          {mensaje.reintentarImpresion && (
            <div style={{ marginTop: 8 }}>
              <button className="boton boton-secundario boton-chico" onClick={reintentarImpresion} disabled={reintentandoImpresion}>
                {reintentandoImpresion ? "Reintentando…" : "Reintentar impresión"}
              </button>
            </div>
          )}
        </div>
      )}
      {mensaje && mensaje.tipo === "error" && <div className="mensaje-error">{mensaje.texto}</div>}

      {cargandoContexto ? (
        <div className="cargando">Cargando…</div>
      ) : errorContexto || !puntoGuarda ? (
        <div className="panel">
          <p className="texto-suave">
            {errorContexto || "Esta PC todavía no tiene una terminal configurada."}
          </p>
          <button className="boton boton-secundario" style={{ marginTop: 8 }} onClick={cambiarTerminal}>
            Configurar terminal
          </button>
        </div>
      ) : (
        <React.Fragment>
          <div className="panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span className="texto-suave" style={{ fontSize: 12 }}>Punto de guarda / Terminal</span>
              <div style={{ fontWeight: 600 }}>
                {puntoGuarda.nombre} ({puntoGuarda.codigo}) · {terminalId}
              </div>
            </div>
            <button className="boton boton-secundario boton-chico" onClick={cambiarTerminal}>
              Cambiar terminal
            </button>
          </div>

          <div className="panel">
            <h2>1. Cliente</h2>
            <div className="fila-campos">
              <div className="campo">
                <label>Tipo de documento</label>
                <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)}>
                  {TIPOS_DOCUMENTO.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label>Número de documento</label>
                <input
                  value={numeroDocumento}
                  onChange={(e) => setNumeroDocumento(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && buscarCliente()}
                />
              </div>
              <div className="campo" style={{ display: "flex", alignItems: "flex-end" }}>
                <button className="boton boton-secundario" onClick={buscarCliente} disabled={buscando}>
                  {buscando ? "Buscando…" : "Buscar cliente"}
                </button>
              </div>
            </div>

            {clienteEncontrado && (
              <div className="mensaje-exito" style={{ marginTop: 8 }}>
                Cliente encontrado: <strong>{clienteEncontrado.nombreCompleto}</strong>
              </div>
            )}

            {clienteEsNuevo && (
              <div style={{ marginTop: 12 }}>
                <p className="texto-suave" style={{ marginBottom: 12 }}>
                  No se encontró un cliente con ese documento. Completá los datos para registrarlo:
                </p>
                <div className="campo" style={{ marginBottom: 14 }}>
                  <label>Nombre completo</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={formCliente.nombreCompleto}
                      onChange={(e) => setFormCliente({ ...formCliente, nombreCompleto: e.target.value })}
                      style={{ flex: 1 }}
                    />
                    {tipoDocumento === "CPF" && (
                      <button
                        type="button"
                        className="boton boton-secundario"
                        onClick={buscarNombrePorCpf}
                        disabled={buscandoCpf}
                        style={{ flexShrink: 0 }}
                      >
                        {buscandoCpf ? "Buscando…" : "Buscar nombre"}
                      </button>
                    )}
                  </div>
                </div>
                <div className="fila-campos">
                  <div className="campo">
                    <label>Nacionalidad</label>
                    <input
                      value={formCliente.nacionalidad}
                      onChange={(e) => setFormCliente({ ...formCliente, nacionalidad: e.target.value })}
                    />
                  </div>
                  <div className="campo">
                    <label>Teléfono</label>
                    <input
                      value={formCliente.telefono}
                      onChange={(e) => setFormCliente({ ...formCliente, telefono: e.target.value })}
                    />
                  </div>
                  <div className="campo">
                    <label>Email</label>
                    <input
                      value={formCliente.email}
                      onChange={(e) => setFormCliente({ ...formCliente, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="panel">
            <h2>2. Volúmenes</h2>

            {volumenes.map((v) => (
              <div className="volumen-item" key={v.volumenId}>
                <span className="tipo-badge">{etiquetaTipoVolumen(v.tipo)}</span>
                <span>{v.descripcion}</span>
                {v.cantidadItems && <span className="texto-suave">({v.cantidadItems} items)</span>}
                <button className="quitar" onClick={() => quitarVolumen(v.volumenId)}>
                  Quitar
                </button>
              </div>
            ))}

            <div className="fila-campos" style={{ marginTop: 12 }}>
              <div className="campo">
                <label>Tipo</label>
                <select
                  value={nuevoVolumen.tipo}
                  onChange={(e) => setNuevoVolumen({ ...nuevoVolumen, tipo: e.target.value })}
                >
                  {TIPOS_VOLUMEN.map((t) => (
                    <option key={t} value={t}>
                      {etiquetaTipoVolumen(t)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label>Descripción</label>
                <input
                  value={nuevoVolumen.descripcion}
                  onChange={(e) => setNuevoVolumen({ ...nuevoVolumen, descripcion: e.target.value })}
                  placeholder="ej. valija roja mediana"
                />
              </div>
              <div className="campo">
                <label>Cant. items (opcional)</label>
                <input
                  type="number"
                  value={nuevoVolumen.cantidadItems}
                  onChange={(e) => setNuevoVolumen({ ...nuevoVolumen, cantidadItems: e.target.value })}
                />
              </div>
              <div className="campo" style={{ display: "flex", alignItems: "flex-end" }}>
                <button className="boton boton-secundario" onClick={agregarVolumen}>
                  Agregar volumen
                </button>
              </div>
            </div>
          </div>

          <button
            className="boton boton-primario"
            style={{ width: "auto", padding: "12px 28px" }}
            disabled={!puedeRegistrar() || guardando}
            onClick={registrarGuarda}
          >
            {guardando ? "Registrando…" : "Registrar y generar ticket"}
          </button>
        </React.Fragment>
      )}
    </div>
  );
}
