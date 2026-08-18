// ============================================================================
// MÓDULO DE REPORTES — cálculo al vuelo (v1)
// ============================================================================
// Decisión (confirmada con Paolo): sin contadores mantenidos por ahora.
// Se leen `operaciones` e `incidencias` del rango de fechas elegido y todo
// se agrega en el navegador. A la escala actual de Paris Store (7-14 puestos) no
// debería notarse lentitud; si en el futuro hace falta, se migra este
// módulo puntual a contadores sin tocar el resto del sistema.
//
// "Reimpresiones" queda marcado como pendiente: todavía no existe
// reimpresión en el sistema (la impresión ESC/POS en sí no está
// implementada), así que no hay de dónde sacar ese dato todavía.
// ============================================================================

function inicioDelDia(fechaStr) {
  const d = new Date(fechaStr + "T00:00:00");
  return d;
}

function finDelDia(fechaStr) {
  const d = new Date(fechaStr + "T23:59:59.999");
  return d;
}

function hoyISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

function minutosEntre(inicioTs, finTs) {
  if (!inicioTs || !finTs || !inicioTs.seconds || !finTs.seconds) return null;
  return Math.round((finTs.seconds - inicioTs.seconds) / 60);
}

function formatearDuracion(minutos) {
  if (minutos === null) return "—";
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return `${horas}h ${resto}min`;
}

function contarPor(lista, obtenerClave) {
  const mapa = {};
  lista.forEach((item) => {
    const clave = obtenerClave(item) || "—";
    mapa[clave] = (mapa[clave] || 0) + 1;
  });
  return Object.entries(mapa).sort((a, b) => b[1] - a[1]);
}

function ReportesModule() {
  const [fechaDesde, setFechaDesde] = useState(hoyISO());
  const [fechaHasta, setFechaHasta] = useState(hoyISO());
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const [operaciones, setOperaciones] = useState(null);
  const [incidencias, setIncidencias] = useState(null);
  const [ocupacionActual, setOcupacionActual] = useState(null);
  const [detalle, setDetalle] = useState(null); // null | "guardas" | "volumenes" | "clientes" | "cerradas" | "abiertas"

  async function generarReporte() {
    setCargando(true);
    setMensaje(null);
    setDetalle(null);
    try {
      const desde = firebase.firestore.Timestamp.fromDate(inicioDelDia(fechaDesde));
      const hasta = firebase.firestore.Timestamp.fromDate(finDelDia(fechaHasta));

      const [snapOps, snapInc, snapOcupacion] = await Promise.all([
        window.guardaSysDb
          .collection("operaciones")
          .where("fechaIngreso", ">=", desde)
          .where("fechaIngreso", "<=", hasta)
          .get(),
        window.guardaSysDb
          .collection("incidencias")
          .where("fechaHora", ">=", desde)
          .where("fechaHora", "<=", hasta)
          .get(),
        window.guardaSysDb.collection("operaciones").where("estado", "==", "abierta").get(),
      ]);

      setOperaciones(snapOps.docs.map((d) => ({ id: d.id, ...d.data() })));
      setIncidencias(snapInc.docs.map((d) => ({ id: d.id, ...d.data() })));
      setOcupacionActual(snapOcupacion.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "No se pudo generar el reporte." });
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    generarReporte();
  }, []);

  // ---- Agregaciones (todo calculado acá, nada guardado aparte) ----
  const totalOperaciones = operaciones ? operaciones.length : 0;
  const totalVolumenes = operaciones ? operaciones.reduce((acc, op) => acc + op.volumenes.length, 0) : 0;
  const clientesUnicos = operaciones ? new Set(operaciones.map((op) => op.clienteId)).size : 0;
  const abiertas = operaciones ? operaciones.filter((op) => op.estado === "abierta").length : 0;
  const cerradas = operaciones ? operaciones.filter((op) => op.estado === "cerrada") : [];

  const duraciones = cerradas.map((op) => minutosEntre(op.fechaIngreso, op.fechaEgreso)).filter((m) => m !== null);
  const tiempoPromedio =
    duraciones.length > 0 ? Math.round(duraciones.reduce((a, b) => a + b, 0) / duraciones.length) : null;

  const porOperador = operaciones ? contarPor(operaciones, (op) => op.operadorNombre) : [];
  const porPuntoGuarda = operaciones ? contarPor(operaciones, (op) => op.puntoGuardaNombre) : [];
  const incidenciasPorTipo = incidencias ? contarPor(incidencias, (i) => etiquetaTipoIncidencia(i.tipo)) : [];
  const ocupacionPorPunto = ocupacionActual ? contarPor(ocupacionActual, (op) => op.puntoGuardaNombre) : [];

  // ---- Detalle por métrica (todo derivado de `operaciones`, ya en memoria) ----
  const porFechaIngresoDesc = (lista) => lista.slice().sort((a, b) => (b.fechaIngreso.seconds || 0) - (a.fechaIngreso.seconds || 0));

  const detalleGuardas = operaciones ? porFechaIngresoDesc(operaciones) : [];
  const detalleCerradas = operaciones ? porFechaIngresoDesc(cerradas) : [];
  const detalleAbiertas = operaciones ? porFechaIngresoDesc(operaciones.filter((op) => op.estado === "abierta")) : [];

  const detalleVolumenes = operaciones
    ? operaciones.flatMap((op) =>
        (op.volumenes || []).map((v, idx) => ({
          key: `${op.id}-${idx}`,
          ticket: op.codigoTicket,
          cliente: op.clienteSnapshot ? op.clienteSnapshot.nombreCompleto : "—",
          tipo: v.tipo ? v.tipo.charAt(0).toUpperCase() + v.tipo.slice(1) : "—",
          descripcion: v.descripcion || "—",
        }))
      )
    : [];

  const detalleClientes = operaciones
    ? Object.values(
        operaciones.reduce((acc, op) => {
          const clave = op.clienteId || (op.clienteSnapshot && op.clienteSnapshot.numeroDocumento) || op.id;
          if (!acc[clave]) {
            acc[clave] = {
              key: clave,
              nombre: op.clienteSnapshot ? op.clienteSnapshot.nombreCompleto : "—",
              documento: op.clienteSnapshot ? `${op.clienteSnapshot.tipoDocumento} ${op.clienteSnapshot.numeroDocumento}` : "—",
              cantidad: 0,
            };
          }
          acc[clave].cantidad += 1;
          return acc;
        }, {})
      ).sort((a, b) => b.cantidad - a.cantidad)
    : [];

  const TITULOS_DETALLE = {
    guardas: "Detalle — Guardas registradas",
    volumenes: "Detalle — Volúmenes",
    clientes: "Detalle — Clientes distintos",
    cerradas: "Detalle — Cerradas (entregadas)",
    abiertas: "Detalle — Abiertas al cierre del período",
  };

  function alternarDetalle(clave) {
    setDetalle((actual) => (actual === clave ? null : clave));
  }

  return (
    <div className="contenido">
      <div className="encabezado-pagina">
        <h1>Reportes</h1>
        <p>Cálculo al vuelo sobre las operaciones e incidencias del rango elegido.</p>
      </div>

      {mensaje && <div className="mensaje-error">{mensaje.texto}</div>}

      <div className="panel">
        <div className="fila-campos" style={{ alignItems: "flex-end" }}>
          <div className="campo">
            <label>Desde</label>
            <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
          </div>
          <div className="campo">
            <label>Hasta</label>
            <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
          </div>
          <div className="campo">
            <button className="boton boton-primario" onClick={generarReporte} disabled={cargando}>
              {cargando ? "Generando…" : "Generar reporte"}
            </button>
          </div>
        </div>
      </div>

      {operaciones && (
        <React.Fragment>
          {/* ---- Resumen del período ---- */}
          <div className="panel">
            <h2>Resumen del período</h2>
            <div className="grilla-metricas">
              <div className={`metrica metrica-clicable ${detalle === "guardas" ? "metrica-activa" : ""}`} onClick={() => alternarDetalle("guardas")}>
                <div className="metrica-valor">{totalOperaciones}</div>
                <div className="metrica-etiqueta">Guardas registradas</div>
              </div>
              <div className={`metrica metrica-clicable ${detalle === "volumenes" ? "metrica-activa" : ""}`} onClick={() => alternarDetalle("volumenes")}>
                <div className="metrica-valor">{totalVolumenes}</div>
                <div className="metrica-etiqueta">Volúmenes</div>
              </div>
              <div className={`metrica metrica-clicable ${detalle === "clientes" ? "metrica-activa" : ""}`} onClick={() => alternarDetalle("clientes")}>
                <div className="metrica-valor">{clientesUnicos}</div>
                <div className="metrica-etiqueta">Clientes distintos</div>
              </div>
              <div className={`metrica metrica-clicable ${detalle === "cerradas" ? "metrica-activa" : ""}`} onClick={() => alternarDetalle("cerradas")}>
                <div className="metrica-valor">{cerradas.length}</div>
                <div className="metrica-etiqueta">Cerradas (entregadas)</div>
              </div>
              <div className={`metrica metrica-clicable ${detalle === "abiertas" ? "metrica-activa" : ""}`} onClick={() => alternarDetalle("abiertas")}>
                <div className="metrica-valor">{abiertas}</div>
                <div className="metrica-etiqueta">Abiertas al cierre del período</div>
              </div>
              <div className="metrica">
                <div className="metrica-valor">{formatearDuracion(tiempoPromedio)}</div>
                <div className="metrica-etiqueta">Tiempo promedio de guarda</div>
              </div>
            </div>
          </div>

          {/* ---- Panel de detalle (se abre al hacer click en una métrica de arriba) ---- */}
          {detalle && (
            <div className="panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h2 style={{ margin: 0 }}>{TITULOS_DETALLE[detalle]}</h2>
                <button className="boton boton-secundario boton-chico" style={{ width: "auto", padding: "6px 14px" }} onClick={() => setDetalle(null)}>
                  Cerrar
                </button>
              </div>

              {detalle === "guardas" && (
                detalleGuardas.length === 0 ? (
                  <p className="texto-suave">Sin datos en este período.</p>
                ) : (
                  <table className="tabla-admin">
                    <thead>
                      <tr>
                        <th>Ticket</th>
                        <th>Cliente</th>
                        <th>Punto</th>
                        <th>Operador</th>
                        <th>Fecha ingreso</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalleGuardas.map((op) => (
                        <tr key={op.id}>
                          <td style={{ whiteSpace: "nowrap" }}>{op.codigoTicket}</td>
                          <td>{op.clienteSnapshot ? op.clienteSnapshot.nombreCompleto : "—"}</td>
                          <td>{op.puntoGuardaNombre}</td>
                          <td>{op.operadorNombre}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{formatearFechaHora(op.fechaIngreso)}</td>
                          <td>{op.estado === "abierta" ? "Abierta" : "Cerrada"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {detalle === "volumenes" && (
                detalleVolumenes.length === 0 ? (
                  <p className="texto-suave">Sin datos en este período.</p>
                ) : (
                  <table className="tabla-admin">
                    <thead>
                      <tr>
                        <th>Ticket</th>
                        <th>Cliente</th>
                        <th>Tipo</th>
                        <th>Descripción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalleVolumenes.map((v) => (
                        <tr key={v.key}>
                          <td style={{ whiteSpace: "nowrap" }}>{v.ticket}</td>
                          <td>{v.cliente}</td>
                          <td>{v.tipo}</td>
                          <td>{v.descripcion}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {detalle === "clientes" && (
                detalleClientes.length === 0 ? (
                  <p className="texto-suave">Sin datos en este período.</p>
                ) : (
                  <table className="tabla-admin">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Documento</th>
                        <th>Guardas en el período</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalleClientes.map((c) => (
                        <tr key={c.key}>
                          <td>{c.nombre}</td>
                          <td>{c.documento}</td>
                          <td>{c.cantidad}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {detalle === "cerradas" && (
                detalleCerradas.length === 0 ? (
                  <p className="texto-suave">Sin datos en este período.</p>
                ) : (
                  <table className="tabla-admin">
                    <thead>
                      <tr>
                        <th>Ticket</th>
                        <th>Cliente</th>
                        <th>Punto</th>
                        <th>Fecha ingreso</th>
                        <th>Fecha egreso</th>
                        <th>Duración</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalleCerradas.map((op) => (
                        <tr key={op.id}>
                          <td style={{ whiteSpace: "nowrap" }}>{op.codigoTicket}</td>
                          <td>{op.clienteSnapshot ? op.clienteSnapshot.nombreCompleto : "—"}</td>
                          <td>{op.puntoGuardaNombre}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{formatearFechaHora(op.fechaIngreso)}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{formatearFechaHora(op.fechaEgreso)}</td>
                          <td>{formatearDuracion(minutosEntre(op.fechaIngreso, op.fechaEgreso))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {detalle === "abiertas" && (
                detalleAbiertas.length === 0 ? (
                  <p className="texto-suave">Sin datos en este período.</p>
                ) : (
                  <table className="tabla-admin">
                    <thead>
                      <tr>
                        <th>Ticket</th>
                        <th>Cliente</th>
                        <th>Punto</th>
                        <th>Fecha ingreso</th>
                        <th>Días abierta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalleAbiertas.map((op) => (
                        <tr key={op.id}>
                          <td style={{ whiteSpace: "nowrap" }}>{op.codigoTicket}</td>
                          <td>{op.clienteSnapshot ? op.clienteSnapshot.nombreCompleto : "—"}</td>
                          <td>{op.puntoGuardaNombre}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{formatearFechaHora(op.fechaIngreso)}</td>
                          <td>{diasAbierta(op.fechaIngreso)} día(s)</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
            </div>
          )}
          {/* ---- Ocupación actual (en tiempo real, no depende del rango de fechas) ---- */}
          <div className="panel">
            <h2>Ocupación actual por punto de guarda</h2>
            <p className="texto-suave" style={{ marginTop: -8, marginBottom: 12 }}>
              Guardas abiertas ahora mismo (no depende del rango de fechas elegido arriba).
            </p>
            {ocupacionPorPunto.length === 0 ? (
              <p className="texto-suave">No hay guardas abiertas en este momento.</p>
            ) : (
              <TablaConteo filas={ocupacionPorPunto} etiquetaColumna="Punto de guarda" />
            )}
          </div>

          {/* ---- Actividad por operador ---- */}
          <div className="panel">
            <h2>Actividad por operador</h2>
            {porOperador.length === 0 ? (
              <p className="texto-suave">Sin datos en este período.</p>
            ) : (
              <TablaConteo filas={porOperador} etiquetaColumna="Operador" etiquetaValor="Guardas registradas" />
            )}
          </div>

          {/* ---- Por punto de guarda (dentro del período) ---- */}
          <div className="panel">
            <h2>Guardas registradas por punto</h2>
            {porPuntoGuarda.length === 0 ? (
              <p className="texto-suave">Sin datos en este período.</p>
            ) : (
              <TablaConteo filas={porPuntoGuarda} etiquetaColumna="Punto de guarda" />
            )}
          </div>

          {/* ---- Incidencias ---- */}
          <div className="panel">
            <h2>Incidencias del período</h2>
            {incidenciasPorTipo.length === 0 ? (
              <p className="texto-suave">No hubo incidencias en este período.</p>
            ) : (
              <TablaConteo filas={incidenciasPorTipo} etiquetaColumna="Tipo" />
            )}
          </div>

          {/* ---- Reimpresiones: pendiente ---- */}
          <div className="panel">
            <h2>Reimpresiones</h2>
            <p className="texto-suave">
              Todavía no hay datos: la impresión de tickets (y por lo tanto la reimpresión) no está
              implementada aún — es el próximo paso del Servidor de Impresión. Este reporte se completa solo
              cuando eso exista.
            </p>
          </div>
        </React.Fragment>
      )}
    </div>
  );
}

function TablaConteo({ filas, etiquetaColumna, etiquetaValor }) {
  return (
    <table className="tabla-admin">
      <thead>
        <tr>
          <th>{etiquetaColumna}</th>
          <th>{etiquetaValor || "Cantidad"}</th>
        </tr>
      </thead>
      <tbody>
        {filas.map(([clave, valor]) => (
          <tr key={clave}>
            <td>{clave}</td>
            <td>{valor}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
