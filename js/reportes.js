// ============================================================================
// MÓDULO DE REPORTES — cálculo al vuelo (v1)
// ============================================================================
// Decisión (confirmada con Paolo): sin contadores mantenidos por ahora.
// Se leen `operaciones` e `incidencias` del rango de fechas elegido y todo
// se agrega en el navegador. A la escala actual de TOKU (7-14 puestos) no
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

  async function generarReporte() {
    setCargando(true);
    setMensaje(null);
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
              <div className="metrica">
                <div className="metrica-valor">{totalOperaciones}</div>
                <div className="metrica-etiqueta">Guardas registradas</div>
              </div>
              <div className="metrica">
                <div className="metrica-valor">{totalVolumenes}</div>
                <div className="metrica-etiqueta">Volúmenes</div>
              </div>
              <div className="metrica">
                <div className="metrica-valor">{clientesUnicos}</div>
                <div className="metrica-etiqueta">Clientes distintos</div>
              </div>
              <div className="metrica">
                <div className="metrica-valor">{cerradas.length}</div>
                <div className="metrica-etiqueta">Cerradas (entregadas)</div>
              </div>
              <div className="metrica">
                <div className="metrica-valor">{abiertas}</div>
                <div className="metrica-etiqueta">Abiertas al cierre del período</div>
              </div>
              <div className="metrica">
                <div className="metrica-valor">{formatearDuracion(tiempoPromedio)}</div>
                <div className="metrica-etiqueta">Tiempo promedio de guarda</div>
              </div>
            </div>
          </div>

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
