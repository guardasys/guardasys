// ============================================================================
// MÓDULO DE DEVOLUCIONES — cerrar una operación y entregar los volúmenes
// ============================================================================
// Nota de alcance (v0.3.0): devolución completa de la operación (todos los
// volúmenes juntos). Devolución parcial (algunos volúmenes sí, otros no)
// queda pendiente para una revisión posterior si hace falta en la práctica.
//
// Nota de permisos (a confirmar en el tema "usuarios y permisos"): por ahora
// cualquier operador puede confirmar una entrega a un tercero autorizado
// (con documento verificado). Si esto debería requerir autorización de un
// supervisor, lo ajustamos ahí.
// ============================================================================

function DevolucionesModule({ usuario }) {
  const [modoBusqueda, setModoBusqueda] = useState("ticket"); // "ticket" | "documento"
  const [inputBusqueda, setInputBusqueda] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState([]); // varias operaciones abiertas (búsqueda por documento)
  const [operacion, setOperacion] = useState(null); // operación elegida para entregar
  const [retiroTercero, setRetiroTercero] = useState(false);
  const [datosTercero, setDatosTercero] = useState({ nombre: "", documento: "", notas: "" });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [reimprimiendo, setReimprimiendo] = useState(false);
  const [fotoUrl, setFotoUrl] = useState(null);
  const [cargandoFoto, setCargandoFoto] = useState(false);

  function reiniciarBusqueda() {
    setResultados([]);
    setOperacion(null);
    setRetiroTercero(false);
    setDatosTercero({ nombre: "", documento: "", notas: "" });
    if (fotoUrl) URL.revokeObjectURL(fotoUrl);
    setFotoUrl(null);
  }

  useEffect(() => {
    if (!operacion || !operacion.tieneFoto) return;
    if (!GUARDASYS_SERVIDOR_IMPRESION_URL || GUARDASYS_SERVIDOR_IMPRESION_URL.includes("REEMPLAZAR")) return;

    setCargandoFoto(true);
    fetch(`${GUARDASYS_SERVIDOR_IMPRESION_URL}/foto-cliente/${operacion.id}`)
      .then((resp) => (resp.ok ? resp.blob() : null))
      .then((blob) => {
        if (blob) setFotoUrl(URL.createObjectURL(blob));
      })
      .catch(() => {})
      .finally(() => setCargandoFoto(false));
  }, [operacion]);

  async function buscarPorTicket() {
    setMensaje(null);
    reiniciarBusqueda();
    const codigo = inputBusqueda.trim().toUpperCase();
    if (!codigo) return;
    setBuscando(true);
    try {
      const snap = await window.guardaSysDb
        .collection("operaciones")
        .where("codigoTicket", "==", codigo)
        .limit(1)
        .get();

      if (snap.empty) {
        setMensaje({ tipo: "error", texto: "No se encontró ningún ticket con ese código." });
        return;
      }
      const doc = snap.docs[0];
      const op = { id: doc.id, ...doc.data() };
      if (op.estado !== "abierta") {
        setMensaje({
          tipo: "error",
          texto:
            op.estado === "cerrada"
              ? "Este ticket ya fue entregado anteriormente."
              : "Este ticket tiene una incidencia registrada — revisá el módulo de Incidencias.",
        });
        return;
      }
      setOperacion(op);
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "Error al buscar el ticket." });
    } finally {
      setBuscando(false);
    }
  }

  async function buscarPorDocumento() {
    setMensaje(null);
    reiniciarBusqueda();
    const documento = inputBusqueda.trim();
    if (!documento) return;
    setBuscando(true);
    try {
      const snapClientes = await window.guardaSysDb
        .collection("clientes")
        .where("numeroDocumento", "==", documento)
        .get();

      if (snapClientes.empty) {
        setMensaje({ tipo: "error", texto: "No se encontró ningún cliente con ese documento." });
        return;
      }

      const idsClientes = snapClientes.docs.map((d) => d.id).slice(0, 10); // límite de "in" en Firestore
      const snapOps = await window.guardaSysDb
        .collection("operaciones")
        .where("clienteId", "in", idsClientes)
        .where("estado", "==", "abierta")
        .get();

      if (snapOps.empty) {
        setMensaje({ tipo: "error", texto: "Ese cliente no tiene guardas abiertas actualmente." });
        return;
      }

      const lista = snapOps.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (lista.length === 1) {
        setOperacion(lista[0]);
      } else {
        setResultados(lista);
      }
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "Error al buscar por documento." });
    } finally {
      setBuscando(false);
    }
  }

  function buscar() {
    if (modoBusqueda === "ticket") buscarPorTicket();
    else buscarPorDocumento();
  }

  async function reimprimirTicket() {
    setReimprimiendo(true);
    const resultadoImpresion = await imprimirTicket(operacion);
    if (resultadoImpresion.success) {
      await registrarAuditoria(usuario, "reimprimir_ticket", "operacion", operacion.id, null, { codigoTicket: operacion.codigoTicket });
      setMensaje({ tipo: "exito", texto: "Ticket reimpreso correctamente." });
    } else {
      setMensaje({ tipo: "error", texto: `No se pudo reimprimir: ${resultadoImpresion.error}` });
    }
    setReimprimiendo(false);
  }

  async function confirmarEntrega() {
    if (retiroTercero && (!datosTercero.nombre.trim() || !datosTercero.documento.trim())) {
      setMensaje({ tipo: "error", texto: "Completá nombre y documento de quien retira." });
      return;
    }
    setGuardando(true);
    setMensaje(null);
    try {
      const timestamp = firebase.firestore.FieldValue.serverTimestamp();
      const entregaSnapshot = retiroTercero
        ? {
            retiradoPor: datosTercero.nombre.trim(),
            documentoVerificado: datosTercero.documento.trim(),
            notas: datosTercero.notas.trim() || null,
          }
        : null;

      await window.guardaSysDb.collection("operaciones").doc(operacion.id).update({
        estado: "cerrada",
        fechaEgreso: timestamp,
        entregadoPor: usuario.uid,
        entregaSnapshot,
        actualizadoEn: timestamp,
      });

      await registrarAuditoria(
        usuario,
        "cerrar_operacion",
        "operacion",
        operacion.id,
        { estado: "abierta" },
        { estado: "cerrada", entregaSnapshot }
      );

      // La foto de referencia (si existía) se borra apenas se cierra la
      // guarda — no hay motivo para conservarla más allá de eso.
      if (operacion.tieneFoto && GUARDASYS_SERVIDOR_IMPRESION_URL && !GUARDASYS_SERVIDOR_IMPRESION_URL.includes("REEMPLAZAR")) {
        fetch(`${GUARDASYS_SERVIDOR_IMPRESION_URL}/foto-cliente/${operacion.id}`, { method: "DELETE" }).catch(() => {});
      }

      setMensaje({ tipo: "exito", texto: `Guarda ${operacion.codigoTicket} entregada correctamente.` });
      setInputBusqueda("");
      reiniciarBusqueda();
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "No se pudo confirmar la entrega. Intentá de nuevo." });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="contenido">
      <div className="encabezado-pagina">
        <h1>Devoluciones</h1>
        <p>Buscar una guarda abierta y confirmar la entrega de los volúmenes.</p>
      </div>

      {mensaje && (
        <div className={mensaje.tipo === "exito" ? "mensaje-exito" : "mensaje-error"}>{mensaje.texto}</div>
      )}

      {!operacion && (
        <div className="panel">
          <h2>Buscar guarda</h2>
          <div className="fila-campos" style={{ marginBottom: 12 }}>
            <div className="campo">
              <label>Buscar por</label>
              <select value={modoBusqueda} onChange={(e) => { setModoBusqueda(e.target.value); setInputBusqueda(""); reiniciarBusqueda(); setMensaje(null); }}>
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
                placeholder={modoBusqueda === "ticket" ? "PB-20260723-000125" : "número de documento"}
                autoFocus
              />
            </div>
            <div className="campo" style={{ display: "flex", alignItems: "flex-end" }}>
              <button className="boton boton-secundario" onClick={buscar} disabled={buscando}>
                {buscando ? "Buscando…" : "Buscar"}
              </button>
            </div>
          </div>

          {resultados.length > 0 && (
            <div>
              <p className="texto-suave">Este cliente tiene {resultados.length} guardas abiertas — elegí una:</p>
              {resultados.map((op) => (
                <div className="volumen-item" key={op.id} style={{ cursor: "pointer" }} onClick={() => setOperacion(op)}>
                  <span className="ticket-codigo">{op.codigoTicket}</span>
                  <span>{op.puntoGuardaNombre}</span>
                  <span className="texto-suave">{op.volumenes.length} volumen(es)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {operacion && (
        <React.Fragment>
          <div className="panel">
            <h2>Detalle de la guarda</h2>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <p>
                <span className="ticket-codigo">{operacion.codigoTicket}</span>
              </p>
              <button className="boton boton-secundario boton-chico" onClick={reimprimirTicket} disabled={reimprimiendo}>
                {reimprimiendo ? "Imprimiendo…" : "Reimprimir ticket"}
              </button>
            </div>
            <div className="fila-campos" style={{ marginTop: 14 }}>
              <div>
                <div className="texto-suave" style={{ fontSize: 12 }}>Cliente</div>
                <div>{operacion.clienteSnapshot.nombreCompleto}</div>
              </div>
              <div>
                <div className="texto-suave" style={{ fontSize: 12 }}>Documento</div>
                <div>{operacion.clienteSnapshot.numeroDocumento}</div>
              </div>
              <div>
                <div className="texto-suave" style={{ fontSize: 12 }}>Punto de guarda</div>
                <div>{operacion.puntoGuardaNombre}</div>
              </div>
              <div>
                <div className="texto-suave" style={{ fontSize: 12 }}>Operador que recibió</div>
                <div>{operacion.operadorNombre}</div>
              </div>
            </div>

            {operacion.tieneFoto && (
              <div style={{ marginTop: 16 }}>
                <div className="texto-suave" style={{ fontSize: 12, marginBottom: 6 }}>
                  Foto de referencia — comparar con la persona que retira
                </div>
                {cargandoFoto ? (
                  <div className="texto-suave">Cargando foto…</div>
                ) : fotoUrl ? (
                  <img src={fotoUrl} alt="Foto de referencia del cliente" style={{ width: 160, borderRadius: 8 }} />
                ) : (
                  <div className="texto-suave">No se pudo cargar la foto.</div>
                )}
              </div>
            )}

            <h2 style={{ marginTop: 20 }}>Volúmenes a entregar</h2>
            {operacion.volumenes.map((v) => (
              <div className="volumen-item" key={v.volumenId}>
                <span className="tipo-badge">{etiquetaTipoVolumen(v.tipo)}</span>
                <span>{v.descripcion}</span>
                {v.cantidadItems && <span className="texto-suave">({v.cantidadItems} items)</span>}
              </div>
            ))}
          </div>

          <div className="panel">
            <h2>Quién retira</h2>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, marginBottom: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={retiroTercero} onChange={(e) => setRetiroTercero(e.target.checked)} />
              Retira una persona distinta del titular (verificar documento)
            </label>

            {retiroTercero && (
              <div className="fila-campos">
                <div className="campo">
                  <label>Nombre de quien retira</label>
                  <input
                    value={datosTercero.nombre}
                    onChange={(e) => setDatosTercero({ ...datosTercero, nombre: e.target.value })}
                  />
                </div>
                <div className="campo">
                  <label>Documento verificado</label>
                  <input
                    value={datosTercero.documento}
                    onChange={(e) => setDatosTercero({ ...datosTercero, documento: e.target.value })}
                  />
                </div>
                <div className="campo">
                  <label>Notas (opcional)</label>
                  <input
                    value={datosTercero.notas}
                    onChange={(e) => setDatosTercero({ ...datosTercero, notas: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="boton boton-primario"
              style={{ width: "auto", padding: "12px 28px" }}
              disabled={guardando}
              onClick={confirmarEntrega}
            >
              {guardando ? "Confirmando…" : "Confirmar entrega"}
            </button>
            <button className="boton boton-secundario" onClick={() => { setOperacion(null); setMensaje(null); }}>
              Cancelar
            </button>
          </div>
        </React.Fragment>
      )}
    </div>
  );
}
