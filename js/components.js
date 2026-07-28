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
  const [puntosGuarda, setPuntosGuarda] = useState([]);
  const [puntoGuardaId, setPuntoGuardaId] = useState("");

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
  const [mensaje, setMensaje] = useState(null); // {tipo: 'exito'|'error', texto, codigoTicket?}

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
      .catch(() => {
        setMensaje({ tipo: "error", texto: "No se pudieron cargar los puntos de guarda." });
      });
  }, []);

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
    if (!puntoGuardaId || volumenes.length === 0) return false;
    if (clienteEncontrado) return true;
    if (clienteEsNuevo) return formCliente.nombreCompleto.trim().length > 0;
    return false;
  }

  async function registrarGuarda() {
    setGuardando(true);
    setMensaje(null);

    const puntoGuarda = puntosGuarda.find((p) => p.id === puntoGuardaId);
    const fechaStr = fechaAAAAMMDD(new Date());
    const contadorId = `${puntoGuardaId}_${fechaStr}`;
    const contadorRef = window.guardaSysDb.collection("contadores").doc(contadorId);
    const operacionRef = window.guardaSysDb.collection("operaciones").doc();
    const clienteRef = clienteEncontrado
      ? window.guardaSysDb.collection("clientes").doc(clienteEncontrado.id)
      : window.guardaSysDb.collection("clientes").doc();
    const auditoriaRef = window.guardaSysDb.collection("auditoria").doc();

    try {
      const codigoTicket = await window.guardaSysDb.runTransaction(async (tx) => {
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
          puntoGuardaId,
          puntoGuardaNombre: puntoGuarda.nombre,
          terminalId: usuario.terminalId || null,
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
          terminalId: usuario.terminalId || null,
          accion: "crear_operacion",
          entidadTipo: "operacion",
          entidadId: operacionRef.id,
          datosAntes: null,
          datosDespues: { codigoTicket: codigo, clienteId: clienteRef.id, puntoGuardaId },
        });

        return codigo;
      });

      setMensaje({ tipo: "exito", texto: "Guarda registrada correctamente.", codigoTicket });
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
          {" — la impresión automática se conecta en la próxima etapa (Servidor de Impresión)."}
        </div>
      )}
      {mensaje && mensaje.tipo === "error" && <div className="mensaje-error">{mensaje.texto}</div>}

      {puntosGuarda.length === 0 ? (
        <div className="panel">
          <p className="texto-suave">
            Todavía no hay puntos de guarda configurados. Se cargan desde el
            módulo de Administración (próximo a construir).
          </p>
        </div>
      ) : (
        <React.Fragment>
          <div className="panel">
            <h2>1. Punto de guarda</h2>
            <div className="campo" style={{ maxWidth: 280 }}>
              <label>Punto de guarda</label>
              <select value={puntoGuardaId} onChange={(e) => setPuntoGuardaId(e.target.value)}>
                {puntosGuarda.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.codigo})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="panel">
            <h2>2. Cliente</h2>
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
                <div className="fila-campos">
                  <div className="campo">
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
                        >
                          {buscandoCpf ? "Buscando…" : "Buscar nombre"}
                        </button>
                      )}
                    </div>
                  </div>
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
            <h2>3. Volúmenes</h2>

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
