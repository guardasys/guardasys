// ============================================================================
// MÓDULO PÚBLICO — Autoregistro de clientes (registro-cliente.html)
// ============================================================================
// Página SIN login, pensada para que el cliente la abra escaneando un QR
// fijo pegado en el local, desde su propio celular. Carga documento, nombre
// y celular, y si el documento ya existe en la base NO lo modifica — solo
// muestra los datos existentes y pide que hable con el operador.
//
// ⚠️ VER NOTA DE SEGURIDAD en firestore.rules / CHANGELOG: la búsqueda de
// "¿ya existe este documento?" todavía usa el mismo patrón de consulta
// (where + limit) que usa Nueva Guarda puertas adentro. Eso funciona bien
// para un operador ya logueado, pero para un cliente anónimo real requiere
// abrir lectura pública de la colección "clientes" — lo cual expuesto así
// (una consulta libre) dejaría a cualquiera en internet buscar nombre y
// teléfono de un cliente si adivina su número de documento. Este archivo
// ya está listo en su UI/flujo; falta cerrar esa decisión antes de pegar
// el QR en el local. Ver mensaje al usuario.
// ============================================================================

const TIPOS_DOCUMENTO_PUBLICO = ["CI", "DNI", "CPF", "Pasaporte", "Otro"];

function SelectorPais({ pais, setPais, idioma }) {
  const [abierto, setAbierto] = React.useState(false);
  const [busqueda, setBusqueda] = React.useState("");
  const t = REGISTRO_CLIENTE_TEXTOS[idioma];

  const filtrados = PAISES_TELEFONO.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="selector-pais">
      <button
        type="button"
        className="selector-pais-boton"
        onClick={() => setAbierto((v) => !v)}
      >
        <span className="selector-pais-bandera">{pais.bandera}</span>
        <span>{pais.indicativo}</span>
        <span className="selector-pais-flecha">▾</span>
      </button>
      {abierto && (
        <div className="selector-pais-lista">
          <input
            type="text"
            className="selector-pais-buscar"
            placeholder={t.buscarPaisPlaceholder}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            autoFocus
          />
          <div className="selector-pais-opciones">
            {filtrados.map((p) => (
              <button
                type="button"
                key={p.iso}
                className="selector-pais-opcion"
                onClick={() => {
                  setPais(p);
                  setAbierto(false);
                  setBusqueda("");
                }}
              >
                <span className="selector-pais-bandera">{p.bandera}</span>
                <span className="selector-pais-opcion-nombre">{p.nombre}</span>
                <span className="selector-pais-opcion-indicativo">{p.indicativo}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RegistroCliente() {
  const [idioma, setIdioma] = React.useState("pt");
  const t = REGISTRO_CLIENTE_TEXTOS[idioma];

  const [paso, setPaso] = React.useState("buscar"); // buscar | ya-registrado | nuevo | exito
  const [tipoDocumento, setTipoDocumento] = React.useState("DNI");
  const [numeroDocumento, setNumeroDocumento] = React.useState("");
  const [buscando, setBuscando] = React.useState(false);
  const [clienteEncontrado, setClienteEncontrado] = React.useState(null);
  const [nombreCompleto, setNombreCompleto] = React.useState("");
  const [numeroCelular, setNumeroCelular] = React.useState("");
  const [pais, setPais] = React.useState(PAISES_PRIORITARIOS[0]);
  const [registrando, setRegistrando] = React.useState(false);
  const [buscandoNombreCpf, setBuscandoNombreCpf] = React.useState(false);
  const [error, setError] = React.useState(null);

  async function buscarNombrePorCpf(numero) {
    if (typeof GUARDASYS_SERVIDOR_IMPRESION_URL === "undefined") return;
    setBuscandoNombreCpf(true);
    try {
      const resp = await fetch(`${GUARDASYS_SERVIDOR_IMPRESION_URL}/consultar-cpf/${numero}`);
      const data = await resp.json();
      if (data.success && data.nombre) {
        setNombreCompleto(data.nombre);
      }
    } catch (err) {
      // Sin drama: si no se puede llegar al servidor (ej. el cliente no
      // está conectado al wifi del local), el cliente completa el nombre
      // a mano y listo.
      console.warn("No se pudo autocompletar el nombre por CPF:", err);
    } finally {
      setBuscandoNombreCpf(false);
    }
  }

  async function continuar() {
    if (!numeroDocumento.trim()) return;
    setBuscando(true);
    setError(null);
    try {
      const snap = await window.guardaSysDb
        .collection("clientes")
        .where("tipoDocumento", "==", tipoDocumento)
        .where("numeroDocumento", "==", numeroDocumento.trim())
        .limit(1)
        .get();

      if (!snap.empty) {
        setClienteEncontrado({ id: snap.docs[0].id, ...snap.docs[0].data() });
        setPaso("ya-registrado");
      } else {
        setPaso("nuevo");
        if (tipoDocumento === "CPF") {
          buscarNombrePorCpf(numeroDocumento.trim());
        }
      }
    } catch (err) {
      console.error(err);
      setError(t.errorBuscar);
    } finally {
      setBuscando(false);
    }
  }

  async function registrar() {
    if (!nombreCompleto.trim() || !numeroCelular.trim()) {
      setError(t.errorCampos);
      return;
    }
    setRegistrando(true);
    setError(null);
    try {
      await window.guardaSysDb.collection("clientes").add({
        tipoDocumento,
        numeroDocumento: numeroDocumento.trim(),
        nombreCompleto: nombreCompleto.trim(),
        telefono: `${pais.indicativo} ${numeroCelular.trim()}`,
        origenRegistro: "autoregistro_qr",
        creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
      });
      setPaso("exito");
    } catch (err) {
      console.error(err);
      setError(t.errorRegistrar);
    } finally {
      setRegistrando(false);
    }
  }

  function reiniciar() {
    setPaso("buscar");
    setNumeroDocumento("");
    setClienteEncontrado(null);
    setNombreCompleto("");
    setNumeroCelular("");
    setError(null);
  }

  return (
    <div className="pantalla-registro-cliente">
      <div className="tarjeta-registro-cliente">
        <div className="registro-cliente-header">
          <div className="marca">
            <span className="marca-principal">{t.marca}</span>
            <span className="marca-sub">{t.marcaSub}</span>
          </div>
          <div className="selector-idioma">
            <button
              className={idioma === "pt" ? "activo" : ""}
              onClick={() => setIdioma("pt")}
              aria-label="Português"
            >
              🇧🇷
            </button>
            <button
              className={idioma === "es" ? "activo" : ""}
              onClick={() => setIdioma("es")}
              aria-label="Español"
            >
              🇪🇸
            </button>
            <button
              className={idioma === "en" ? "activo" : ""}
              onClick={() => setIdioma("en")}
              aria-label="English"
            >
              🇬🇧
            </button>
          </div>
        </div>

        <h1>{t.titulo}</h1>
        <p className="registro-cliente-subtitulo">{t.subtitulo}</p>

        {error && <div className="mensaje-error">{error}</div>}

        {paso === "buscar" && (
          <React.Fragment>
            <div className="campo">
              <label>{t.tipoDocumentoLabel}</label>
              <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)}>
                {TIPOS_DOCUMENTO_PUBLICO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {t.tipoDocumentoOpciones[tipo]}
                  </option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label>{t.numeroDocumentoLabel}</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder={t.numeroDocumentoPlaceholder}
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value)}
              />
            </div>
            <button
              className="boton boton-primario"
              disabled={!numeroDocumento.trim() || buscando}
              onClick={continuar}
            >
              {buscando ? t.buscando : t.botonContinuar}
            </button>
          </React.Fragment>
        )}

        {paso === "ya-registrado" && clienteEncontrado && (
          <React.Fragment>
            <div className="mensaje-info-registro">
              <strong>{t.yaRegistradoTitulo}</strong>
              <p>{t.yaRegistradoTexto}</p>
              <div className="dato-existente">
                <span className="dato-existente-label">{t.yaRegistradoNombre}</span>
                <span>{clienteEncontrado.nombreCompleto}</span>
              </div>
              {clienteEncontrado.telefono && (
                <div className="dato-existente">
                  <span className="dato-existente-label">{t.yaRegistradoTelefono}</span>
                  <span>{clienteEncontrado.telefono}</span>
                </div>
              )}
              <p className="registro-cliente-aviso">{t.yaRegistradoAviso}</p>
            </div>
            <button className="boton boton-secundario" onClick={reiniciar}>
              {t.botonVolver}
            </button>
          </React.Fragment>
        )}

        {paso === "nuevo" && (
          <React.Fragment>
            <div className="campo">
              <label>{t.nombreLabel}</label>
              <input
                type="text"
                placeholder={t.nombrePlaceholder}
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
              />
              {buscandoNombreCpf && <p className="registro-cliente-aviso">{t.buscandoNombreCpf}</p>}
            </div>
            <div className="campo">
              <label>{t.telefonoLabel}</label>
              <div className="campo-telefono">
                <SelectorPais pais={pais} setPais={setPais} idioma={idioma} />
                <input
                  type="tel"
                  inputMode="tel"
                  value={numeroCelular}
                  onChange={(e) => setNumeroCelular(e.target.value)}
                />
              </div>
            </div>
            <button
              className="boton boton-primario"
              disabled={registrando}
              onClick={registrar}
            >
              {registrando ? t.registrando : t.botonRegistrar}
            </button>
            <button className="boton boton-secundario" onClick={reiniciar}>
              {t.botonVolver}
            </button>
          </React.Fragment>
        )}

        {paso === "exito" && (
          <div className="mensaje-exito-registro">
            <strong>{t.exitoTitulo}</strong>
            <p>{t.exitoTexto}</p>
            <button className="boton boton-secundario" onClick={reiniciar}>
              {t.botonNuevoRegistro}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<RegistroCliente />);
