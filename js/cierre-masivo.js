// ============================================================================
// MÓDULO DE CIERRE MASIVO — cerrar en bloque operaciones abiertas de días
// anteriores (v0.13.0)
// ============================================================================
// Pensado para "limpiar" guardas que quedaron abiertas por error o porque el
// cliente retiró sin pasar por Devoluciones (ej. carga mal hecha, prueba de
// un operador, etc.) — NO reemplaza el flujo normal de Devoluciones para una
// entrega real de hoy.
//
// Deliberadamente NO incluye las operaciones abiertas de HOY: esas todavía
// pueden estar guardadas de verdad, así que solo se listan (y se pueden
// cerrar) las que quedaron abiertas de días ya pasados.
//
// Cada cierre queda registrado en Auditoría igual que una entrega normal,
// con la acción "cierre_masivo_operacion" para poder distinguirlo después.
// ============================================================================

function diasAbierta(fechaIngreso) {
  if (!fechaIngreso || !fechaIngreso.seconds) return null;
  const inicioIngreso = new Date(fechaIngreso.seconds * 1000);
  inicioIngreso.setHours(0, 0, 0, 0);
  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);
  return Math.round((inicioHoy - inicioIngreso) / (1000 * 60 * 60 * 24));
}

function CierreMasivoModule({ usuario }) {
  const [cargando, setCargando] = useState(true);
  const [operaciones, setOperaciones] = useState([]);
  const [seleccionadas, setSeleccionadas] = useState(() => new Set());
  const [confirmando, setConfirmando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  async function cargar() {
    setCargando(true);
    setMensaje(null);
    try {
      const inicioHoy = new Date();
      inicioHoy.setHours(0, 0, 0, 0);

      // Un solo campo en el where (estado) — no hace falta índice compuesto.
      // El filtro por fecha se hace acá, en el navegador, igual que en
      // Reportes (a esta escala no hay problema de rendimiento).
      const snap = await window.guardaSysDb.collection("operaciones").where("estado", "==", "abierta").get();

      const vencidas = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((op) => op.fechaIngreso && op.fechaIngreso.seconds * 1000 < inicioHoy.getTime())
        .sort((a, b) => a.fechaIngreso.seconds - b.fechaIngreso.seconds);

      setOperaciones(vencidas);
      setSeleccionadas(new Set());
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "No se pudieron cargar las operaciones abiertas." });
    } finally {
      setCargando(false);
    }
  }

  useEffect(cargar, []);

  function toggleSeleccion(id) {
    setSeleccionadas((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  function toggleSeleccionarTodas() {
    setSeleccionadas((prev) => (prev.size === operaciones.length ? new Set() : new Set(operaciones.map((op) => op.id))));
  }

  async function ejecutarCierre() {
    setProcesando(true);
    setMensaje(null);
    try {
      const idsACerrar = operaciones.filter((op) => seleccionadas.has(op.id));
      const timestamp = firebase.firestore.FieldValue.serverTimestamp();

      // Firestore permite hasta 500 escrituras por batch; acá cada operación
      // implica 2 (el update de la operación + el registro de auditoría), así
      // que se agrupan de a 200 operaciones (400 escrituras) por las dudas.
      const TAMAÑO_LOTE = 200;
      for (let i = 0; i < idsACerrar.length; i += TAMAÑO_LOTE) {
        const lote = idsACerrar.slice(i, i + TAMAÑO_LOTE);
        const batch = window.guardaSysDb.batch();

        lote.forEach((op) => {
          const opRef = window.guardaSysDb.collection("operaciones").doc(op.id);
          const entregaSnapshot = {
            retiradoPor: op.clienteSnapshot ? op.clienteSnapshot.nombreCompleto : null,
            documentoVerificado: op.clienteSnapshot ? op.clienteSnapshot.numeroDocumento : null,
            notas: `Cierre administrativo masivo (${usuario.nombreCompleto || usuario.email}) — operación abierta desde ${new Date(
              op.fechaIngreso.seconds * 1000
            ).toLocaleDateString("es-PY")}, sin registro de retiro por Devoluciones.`,
          };

          batch.update(opRef, {
            estado: "cerrada",
            fechaEgreso: timestamp,
            entregadoPor: usuario.uid,
            entregaSnapshot,
            actualizadoEn: timestamp,
          });

          const auditoriaRef = window.guardaSysDb.collection("auditoria").doc();
          batch.set(auditoriaRef, {
            usuarioId: usuario.uid,
            usuarioNombre: usuario.nombreCompleto || usuario.email,
            fechaHora: timestamp,
            terminalId: usuario.terminalId || null,
            accion: "cierre_masivo_operacion",
            entidadTipo: "operacion",
            entidadId: op.id,
            datosAntes: { estado: "abierta" },
            datosDespues: { estado: "cerrada", entregaSnapshot },
          });
        });

        await batch.commit();
      }

      // Igual que en Devoluciones: si alguna tenía foto de referencia, se
      // borra del Servidor de Impresión. No bloquea ni condiciona el cierre.
      if (GUARDASYS_SERVIDOR_IMPRESION_URL && !GUARDASYS_SERVIDOR_IMPRESION_URL.includes("REEMPLAZAR")) {
        idsACerrar
          .filter((op) => op.tieneFoto)
          .forEach((op) => {
            fetch(`${GUARDASYS_SERVIDOR_IMPRESION_URL}/foto-cliente/${op.id}`, { method: "DELETE" }).catch(() => {});
          });
      }

      setMensaje({ tipo: "exito", texto: `${idsACerrar.length} operación(es) cerrada(s) correctamente.` });
      setConfirmando(false);
      await cargar();
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "Ocurrió un error cerrando las operaciones. Revisá cuáles quedaron pendientes y reintentá." });
      setConfirmando(false);
      await cargar();
    } finally {
      setProcesando(false);
    }
  }

  const totalVolumenes = (op) => (op.volumenes || []).reduce((acc, v) => acc + (v.cantidadItems && v.cantidadItems > 1 ? v.cantidadItems : 1), 0);

  return (
    <div>
      <p className="texto-suave" style={{ marginBottom: 16 }}>
        Operaciones que quedaron con estado <strong>abierta</strong> de días anteriores a hoy. Usalo para corregir guardas que
        se cargaron por error o que el cliente retiró sin pasar por Devoluciones — para una entrega real, usá siempre el
        módulo de Devoluciones.
      </p>

      {mensaje && <div className={mensaje.tipo === "error" ? "mensaje-error" : "mensaje-exito"}>{mensaje.texto}</div>}

      {cargando ? (
        <div className="cargando">Cargando…</div>
      ) : operaciones.length === 0 ? (
        <p className="texto-suave">No hay operaciones abiertas de días anteriores — todo al día. 👍</p>
      ) : (
        <React.Fragment>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={seleccionadas.size === operaciones.length}
                onChange={toggleSeleccionarTodas}
              />
              Seleccionar todas ({operaciones.length})
            </label>

            {!confirmando ? (
              <button
                className="boton boton-peligro boton-chico"
                style={{ width: "auto", padding: "8px 16px" }}
                disabled={seleccionadas.size === 0}
                onClick={() => setConfirmando(true)}
              >
                Cerrar seleccionadas ({seleccionadas.size})
              </button>
            ) : null}
          </div>

          {confirmando && (
            <div className="mensaje-error" style={{ marginBottom: 12 }}>
              <p style={{ margin: "0 0 10px" }}>
                Vas a cerrar <strong>{seleccionadas.size}</strong> operación(es) como si el cliente ya hubiera retirado sus
                volúmenes. Esta acción queda registrada en Auditoría pero <strong>no se puede deshacer</strong> desde acá.
                ¿Confirmás?
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="boton boton-peligro boton-chico" style={{ width: "auto", padding: "8px 16px" }} disabled={procesando} onClick={ejecutarCierre}>
                  {procesando ? "Cerrando…" : "Sí, cerrar"}
                </button>
                <button className="boton boton-secundario boton-chico" style={{ width: "auto", padding: "8px 16px" }} disabled={procesando} onClick={() => setConfirmando(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <table className="tabla-admin">
            <thead>
              <tr>
                <th></th>
                <th>Ticket</th>
                <th>Cliente</th>
                <th>Punto de guarda</th>
                <th>Fecha ingreso</th>
                <th>Volúmenes</th>
                <th>Días abierta</th>
              </tr>
            </thead>
            <tbody>
              {operaciones.map((op) => (
                <tr key={op.id}>
                  <td>
                    <input type="checkbox" checked={seleccionadas.has(op.id)} onChange={() => toggleSeleccion(op.id)} />
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{op.codigoTicket}</td>
                  <td>{op.clienteSnapshot ? op.clienteSnapshot.nombreCompleto : "—"}</td>
                  <td>{op.puntoGuardaNombre}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{formatearFechaHora(op.fechaIngreso)}</td>
                  <td>{totalVolumenes(op)}</td>
                  <td>
                    <span className="tipo-badge">{diasAbierta(op.fechaIngreso)} día(s)</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </React.Fragment>
      )}
    </div>
  );
}
