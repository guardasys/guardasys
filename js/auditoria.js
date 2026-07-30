// ============================================================================
// MÓDULO DE AUDITORÍA — solo administrador
// ============================================================================
// Todo el sistema ya viene grabando en `auditoria` desde el primer módulo
// (registrarAuditoria, definida en admin.js). Esta pantalla es solo la
// vista de lectura sobre esos registros.
// ============================================================================

const ACCIONES_AUDITORIA = [
  "crear_operacion",
  "cerrar_operacion",
  "entrega_sin_ticket",
  "imprimir_ticket",
  "reimprimir_ticket",
  "error_impresion",
  "crear_usuario",
  "editar_usuario",
  "activar_usuario",
  "desactivar_usuario",
  "crear_punto_guarda",
  "activar_punto_guarda",
  "desactivar_punto_guarda",
  "crear_terminal",
  "activar_terminal",
  "desactivar_terminal",
  "crear_impresora",
  "editar_impresora",
  "crear_incidencia",
  "resolver_incidencia",
];

function formatearFechaHora(timestamp) {
  if (!timestamp || !timestamp.seconds) return "—";
  return new Date(timestamp.seconds * 1000).toLocaleString("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AuditoriaModule() {
  const [filtroAccion, setFiltroAccion] = useState("");
  const [filtroTexto, setFiltroTexto] = useState("");
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [ultimoDoc, setUltimoDoc] = useState(null);
  const [hayMas, setHayMas] = useState(true);
  const [filaExpandida, setFilaExpandida] = useState(null);

  function construirQuery() {
    let q = window.guardaSysDb.collection("auditoria").orderBy("fechaHora", "desc");
    if (filtroAccion) q = q.where("accion", "==", filtroAccion);
    return q;
  }

  function cargarPrimeraPagina() {
    setCargando(true);
    setLista([]);
    construirQuery()
      .limit(50)
      .get()
      .then((snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setLista(docs);
        setUltimoDoc(snap.docs[snap.docs.length - 1] || null);
        setHayMas(snap.docs.length === 50);
      })
      .finally(() => setCargando(false));
  }

  function cargarMas() {
    if (!ultimoDoc) return;
    setCargando(true);
    construirQuery()
      .startAfter(ultimoDoc)
      .limit(50)
      .get()
      .then((snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setLista((prev) => [...prev, ...docs]);
        setUltimoDoc(snap.docs[snap.docs.length - 1] || null);
        setHayMas(snap.docs.length === 50);
      })
      .finally(() => setCargando(false));
  }

  useEffect(cargarPrimeraPagina, [filtroAccion]);

  const listaFiltrada = filtroTexto.trim()
    ? lista.filter((r) => {
        const texto = filtroTexto.trim().toLowerCase();
        return (
          (r.usuarioNombre || "").toLowerCase().includes(texto) ||
          (r.entidadId || "").toLowerCase().includes(texto) ||
          (r.entidadTipo || "").toLowerCase().includes(texto)
        );
      })
    : lista;

  return (
    <div className="contenido">
      <div className="encabezado-pagina">
        <h1>Auditoría</h1>
        <p>Registro de toda acción del sistema: usuario, fecha, hora, acción y datos modificados.</p>
      </div>

      <div className="panel">
        <div className="fila-campos" style={{ marginBottom: 8 }}>
          <div className="campo">
            <label>Acción</label>
            <select value={filtroAccion} onChange={(e) => setFiltroAccion(e.target.value)}>
              <option value="">— todas —</option>
              {ACCIONES_AUDITORIA.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label>Buscar por usuario / entidad</label>
            <input value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} placeholder="nombre de usuario, id…" />
          </div>
        </div>

        {cargando && lista.length === 0 ? (
          <div className="cargando">Cargando…</div>
        ) : listaFiltrada.length === 0 ? (
          <p className="texto-suave">No hay registros con ese filtro.</p>
        ) : (
          <React.Fragment>
            <table className="tabla-admin">
              <thead>
                <tr>
                  <th>Fecha / hora</th>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th>Entidad</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {listaFiltrada.map((r) => (
                  <React.Fragment key={r.id}>
                    <tr>
                      <td style={{ whiteSpace: "nowrap" }}>{formatearFechaHora(r.fechaHora)}</td>
                      <td>{r.usuarioNombre || r.usuarioId}</td>
                      <td><span className="tipo-badge">{r.accion}</span></td>
                      <td className="texto-suave" style={{ fontSize: 12 }}>
                        {r.entidadTipo}/{r.entidadId}
                      </td>
                      <td>
                        <button
                          className="boton boton-secundario boton-chico"
                          onClick={() => setFilaExpandida(filaExpandida === r.id ? null : r.id)}
                        >
                          {filaExpandida === r.id ? "Ocultar" : "Detalle"}
                        </button>
                      </td>
                    </tr>
                    {filaExpandida === r.id && (
                      <tr>
                        <td colSpan={5}>
                          <div className="fila-campos">
                            <div>
                              <div className="texto-suave" style={{ fontSize: 12, marginBottom: 4 }}>Antes</div>
                              <pre className="bloque-json">{JSON.stringify(r.datosAntes, null, 2) || "null"}</pre>
                            </div>
                            <div>
                              <div className="texto-suave" style={{ fontSize: 12, marginBottom: 4 }}>Después</div>
                              <pre className="bloque-json">{JSON.stringify(r.datosDespues, null, 2) || "null"}</pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            {hayMas && !filtroTexto && (
              <button className="boton boton-secundario" style={{ marginTop: 16 }} onClick={cargarMas} disabled={cargando}>
                {cargando ? "Cargando…" : "Cargar más"}
              </button>
            )}
          </React.Fragment>
        )}
      </div>
    </div>
  );
}
