// ============================================================================
// MÓDULO DE INCIDENCIAS
// ============================================================================
// Cualquier operador puede reportar una incidencia sobre una guarda.
// Autorizar/resolver, y sobre todo "entregar sin ticket", queda reservado
// a supervisor/administrador (spec: "Supervisor autoriza incidencias,
// reimpresiones especiales, entregas sin ticket").
// ============================================================================

const TIPOS_INCIDENCIA = [
  { id: "ticket_perdido", etiqueta: "Ticket perdido" },
  { id: "error_impresion", etiqueta: "Error de impresión" },
  { id: "volumen_danado", etiqueta: "Volumen dañado" },
  { id: "diferencia", etiqueta: "Diferencia" },
  { id: "entrega_especial", etiqueta: "Entrega especial" },
  { id: "no_retirado", etiqueta: "Objeto no retirado" },
];

function etiquetaTipoIncidencia(tipo) {
  const t = TIPOS_INCIDENCIA.find((t) => t.id === tipo);
  return t ? t.etiqueta : tipo;
}

function IncidenciasModule({ usuario }) {
  const [vista, setVista] = useState("lista"); // "lista" | "nueva"
  const esSupervisorOAdmin = usuario.rol === "supervisor" || usuario.rol === "administrador";

  return (
    <div className="contenido">
      <div className="encabezado-pagina">
        <h1>Incidencias</h1>
        <p>Ticket perdido, error de impresión, volumen dañado, diferencias, entregas especiales, objetos no retirados.</p>
      </div>

      <div className="tabs-admin">
        <div className={"tab-admin" + (vista === "lista" ? " activo" : "")} onClick={() => setVista("lista")}>
          Listado
        </div>
        <div className={"tab-admin" + (vista === "nueva" ? " activo" : "")} onClick={() => setVista("nueva")}>
          Reportar nueva
        </div>
      </div>

      {vista === "lista" ? (
        <ListadoIncidencias usuario={usuario} esSupervisorOAdmin={esSupervisorOAdmin} />
      ) : (
        <NuevaIncidencia usuario={usuario} onCreada={() => setVista("lista")} />
      )}
    </div>
  );
}

// ============================================================================
// LISTADO + RESOLUCIÓN
// ============================================================================

function ListadoIncidencias({ usuario, esSupervisorOAdmin }) {
  const [mostrarResueltas, setMostrarResueltas] = useState(false);
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);

  function cargar() {
    setCargando(true);
    window.guardaSysDb
      .collection("incidencias")
      .where("estado", "==", mostrarResueltas ? "resuelta" : "abierta")
      .get()
      .then((snap) => {
        const l = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        l.sort((a, b) => (b.fechaHora?.seconds || 0) - (a.fechaHora?.seconds || 0));
        setLista(l);
      })
      .finally(() => setCargando(false));
  }

  useEffect(cargar, [mostrarResueltas]);

  async function resolver(inc, entregarSinTicket) {
    setMensaje(null);
    try {
      const timestamp = firebase.firestore.FieldValue.serverTimestamp();

      if (entregarSinTicket) {
        const opRef = window.guardaSysDb.collection("operaciones").doc(inc.operacionId);
        const opSnap = await opRef.get();
        if (!opSnap.exists || opSnap.data().estado !== "abierta") {
          setMensaje({ tipo: "error", texto: "Esa guarda ya no está abierta — no se puede entregar." });
          return;
        }
        await opRef.update({
          estado: "cerrada",
          fechaEgreso: timestamp,
          entregadoPor: usuario.uid,
          entregaSnapshot: {
            retiradoPor: opSnap.data().clienteSnapshot.nombreCompleto,
            documentoVerificado: opSnap.data().clienteSnapshot.numeroDocumento,
            notas: `Entrega sin ticket, autorizada por ${usuario.nombreCompleto || usuario.email} (incidencia ${inc.id}).`,
          },
          actualizadoEn: timestamp,
        });
        await registrarAuditoria(usuario, "entrega_sin_ticket", "operacion", inc.operacionId, { estado: "abierta" }, { estado: "cerrada" });
      }

      await window.guardaSysDb.collection("incidencias").doc(inc.id).update({
        estado: "resuelta",
        autorizadoPor: usuario.uid,
      });
      await registrarAuditoria(usuario, "resolver_incidencia", "incidencia", inc.id, { estado: "abierta" }, { estado: "resuelta" });

      cargar();
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "No se pudo resolver la incidencia." });
    }
  }

  return (
    <React.Fragment>
      {mensaje && <div className="mensaje-error">{mensaje.texto}</div>}

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>{mostrarResueltas ? "Incidencias resueltas" : "Incidencias abiertas"}</h2>
          <button className="boton boton-secundario boton-chico" onClick={() => setMostrarResueltas(!mostrarResueltas)}>
            Ver {mostrarResueltas ? "abiertas" : "resueltas"}
          </button>
        </div>

        {cargando ? (
          <div className="cargando">Cargando…</div>
        ) : lista.length === 0 ? (
          <p className="texto-suave">No hay incidencias {mostrarResueltas ? "resueltas" : "abiertas"}.</p>
        ) : (
          lista.map((inc) => (
            <div key={inc.id} className="panel" style={{ background: "var(--fondo)", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span className="tipo-badge">{etiquetaTipoIncidencia(inc.tipo)}</span>{" "}
                  {inc.codigoTicket && <span className="ticket-codigo">{inc.codigoTicket}</span>}
                  <p style={{ margin: "8px 0 4px 0" }}>{inc.descripcion}</p>
                  <p className="texto-suave" style={{ fontSize: 12, margin: 0 }}>
                    Reportado por {inc.reportadoPorNombre || inc.reportadoPor}
                    {inc.clienteNombre && ` — cliente: ${inc.clienteNombre}`}
                  </p>
                </div>

                {!mostrarResueltas && esSupervisorOAdmin && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <button className="boton boton-secundario boton-chico" onClick={() => resolver(inc, false)}>
                      Marcar resuelta
                    </button>
                    {(inc.tipo === "ticket_perdido" || inc.tipo === "entrega_especial") && inc.operacionId && (
                      <button className="boton boton-primario boton-chico" onClick={() => resolver(inc, true)}>
                        Entregar sin ticket
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </React.Fragment>
  );
}

// ============================================================================
// NUEVA INCIDENCIA
// ============================================================================

function NuevaIncidencia({ usuario, onCreada }) {
  const [modoBusqueda, setModoBusqueda] = useState("ticket");
  const [inputBusqueda, setInputBusqueda] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [operacion, setOperacion] = useState(null);
  const [tipo, setTipo] = useState("ticket_perdido");
  const [descripcion, setDescripcion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  async function buscar() {
    setMensaje(null);
    setOperacion(null);
    const valor = inputBusqueda.trim();
    if (!valor) return;
    setBuscando(true);
    try {
      if (modoBusqueda === "ticket") {
        const snap = await window.guardaSysDb
          .collection("operaciones")
          .where("codigoTicket", "==", valor.toUpperCase())
          .limit(1)
          .get();
        if (snap.empty) {
          setMensaje({ tipo: "error", texto: "No se encontró ningún ticket con ese código." });
          return;
        }
        setOperacion({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        const snapClientes = await window.guardaSysDb
          .collection("clientes")
          .where("numeroDocumento", "==", valor)
          .limit(1)
          .get();
        if (snapClientes.empty) {
          setMensaje({ tipo: "error", texto: "No se encontró ningún cliente con ese documento." });
          return;
        }
        const snapOps = await window.guardaSysDb
          .collection("operaciones")
          .where("clienteId", "==", snapClientes.docs[0].id)
          .where("estado", "==", "abierta")
          .limit(1)
          .get();
        if (snapOps.empty) {
          setMensaje({ tipo: "error", texto: "Ese cliente no tiene guardas abiertas." });
          return;
        }
        setOperacion({ id: snapOps.docs[0].id, ...snapOps.docs[0].data() });
      }
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "Error al buscar la guarda." });
    } finally {
      setBuscando(false);
    }
  }

  async function crearIncidencia() {
    if (!descripcion.trim()) {
      setMensaje({ tipo: "error", texto: "Agregá una descripción." });
      return;
    }
    setGuardando(true);
    setMensaje(null);
    try {
      const datos = {
        operacionId: operacion ? operacion.id : null,
        codigoTicket: operacion ? operacion.codigoTicket : null,
        clienteNombre: operacion ? operacion.clienteSnapshot.nombreCompleto : null,
        tipo,
        descripcion: descripcion.trim(),
        reportadoPor: usuario.uid,
        reportadoPorNombre: usuario.nombreCompleto || usuario.email,
        autorizadoPor: null,
        estado: "abierta",
        fechaHora: firebase.firestore.FieldValue.serverTimestamp(),
      };
      const ref = await window.guardaSysDb.collection("incidencias").add(datos);
      await registrarAuditoria(usuario, "crear_incidencia", "incidencia", ref.id, null, datos);

      setMensaje({ tipo: "exito", texto: "Incidencia registrada." });
      setDescripcion("");
      setOperacion(null);
      setInputBusqueda("");
      onCreada();
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "No se pudo registrar la incidencia." });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <React.Fragment>
      {mensaje && <div className={mensaje.tipo === "exito" ? "mensaje-exito" : "mensaje-error"}>{mensaje.texto}</div>}

      <div className="panel">
        <h2>1. Guarda relacionada (opcional)</h2>
        <p className="texto-suave" style={{ marginTop: -8, marginBottom: 12 }}>
          Si la incidencia no está atada a una guarda puntual (ej. una impresora rota en general), dejá esto sin buscar.
        </p>
        <div className="fila-campos">
          <div className="campo">
            <label>Buscar por</label>
            <select value={modoBusqueda} onChange={(e) => setModoBusqueda(e.target.value)}>
              <option value="ticket">Código de ticket</option>
              <option value="documento">Documento del cliente</option>
            </select>
          </div>
          <div className="campo">
            <label>{modoBusqueda === "ticket" ? "Código de ticket" : "Número de documento"}</label>
            <input
              value={inputBusqueda}
              onChange={(e) => setInputBusqueda(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscar()}
            />
          </div>
          <div className="campo" style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="boton boton-secundario" onClick={buscar} disabled={buscando}>
              {buscando ? "Buscando…" : "Buscar"}
            </button>
          </div>
        </div>

        {operacion && (
          <div className="mensaje-exito" style={{ marginTop: 8 }}>
            Guarda encontrada: <span className="ticket-codigo">{operacion.codigoTicket}</span>{" "}
            — {operacion.clienteSnapshot.nombreCompleto}
          </div>
        )}
      </div>

      <div className="panel">
        <h2>2. Detalle de la incidencia</h2>
        <div className="fila-campos">
          <div className="campo">
            <label>Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS_INCIDENCIA.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.etiqueta}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="campo" style={{ marginTop: 12 }}>
          <label>Descripción</label>
          <textarea rows={4} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </div>
      </div>

      <button
        className="boton boton-primario"
        style={{ width: "auto", padding: "12px 28px" }}
        disabled={guardando}
        onClick={crearIncidencia}
      >
        {guardando ? "Registrando…" : "Registrar incidencia"}
      </button>
    </React.Fragment>
  );
}
