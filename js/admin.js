// ============================================================================
// MÓDULO DE ADMINISTRACIÓN — usuarios, puntos de guarda, terminales, impresoras
// Solo accesible para rol "administrador" (ya filtrado en el menú lateral).
// ============================================================================

function registrarAuditoria(usuario, accion, entidadTipo, entidadId, datosAntes, datosDespues) {
  return window.guardaSysDb.collection("auditoria").add({
    usuarioId: usuario.uid,
    usuarioNombre: usuario.nombreCompleto || usuario.email,
    fechaHora: firebase.firestore.FieldValue.serverTimestamp(),
    terminalId: usuario.terminalId || null,
    accion,
    entidadTipo,
    entidadId,
    datosAntes: datosAntes || null,
    datosDespues: datosDespues || null,
  });
}

const PESTAÑAS_ADMIN = [
  { id: "usuarios", etiqueta: "Usuarios" },
  { id: "puntosGuarda", etiqueta: "Puntos de guarda" },
  { id: "terminales", etiqueta: "Terminales" },
  { id: "impresoras", etiqueta: "Impresoras" },
];

function AdministracionModule({ usuario }) {
  const [pestaña, setPestaña] = useState("usuarios");

  return (
    <div className="contenido">
      <div className="encabezado-pagina">
        <h1>Administración</h1>
        <p>Usuarios, puntos de guarda, terminales e impresoras.</p>
      </div>

      <div className="tabs-admin">
        {PESTAÑAS_ADMIN.map((t) => (
          <div
            key={t.id}
            className={"tab-admin" + (pestaña === t.id ? " activo" : "")}
            onClick={() => setPestaña(t.id)}
          >
            {t.etiqueta}
          </div>
        ))}
      </div>

      {pestaña === "usuarios" && <AdminUsuarios usuario={usuario} />}
      {pestaña === "puntosGuarda" && <AdminPuntosGuarda usuario={usuario} />}
      {pestaña === "terminales" && <AdminTerminales usuario={usuario} />}
      {pestaña === "impresoras" && <AdminImpresoras usuario={usuario} />}
    </div>
  );
}

// ============================================================================
// USUARIOS
// ============================================================================

const ROLES = ["operador", "supervisor", "administrador"];

function AdminUsuarios({ usuario }) {
  const [lista, setLista] = useState([]);
  const [puntosGuarda, setPuntosGuarda] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const [form, setForm] = useState({
    nombreCompleto: "",
    email: "",
    password: "",
    rol: "operador",
    puntoGuardaId: "",
  });

  function cargarLista() {
    setCargando(true);
    window.guardaSysDb
      .collection("usuarios")
      .get()
      .then((snap) => setLista(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    cargarLista();
    window.guardaSysDb
      .collection("puntosGuarda")
      .get()
      .then((snap) => setPuntosGuarda(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, []);

  async function crearUsuario(e) {
    e.preventDefault();
    setMensaje(null);

    if (!form.nombreCompleto.trim() || !form.email.trim() || form.password.length < 6) {
      setMensaje({ tipo: "error", texto: "Completá nombre, email y una contraseña de al menos 6 caracteres." });
      return;
    }

    setGuardando(true);
    // App secundaria: crea el usuario de Authentication sin reemplazar la
    // sesión del administrador que está logueado ahora mismo.
    const nombreAppTemp = "Secundaria_" + Date.now();
    const appSecundaria = firebase.initializeApp(GUARDASYS_FIREBASE_CONFIG, nombreAppTemp);

    try {
      const credencial = await appSecundaria
        .auth()
        .createUserWithEmailAndPassword(form.email.trim(), form.password);
      const uid = credencial.user.uid;

      const datosUsuario = {
        nombreCompleto: form.nombreCompleto.trim(),
        email: form.email.trim(),
        rol: form.rol,
        puntoGuardaId: form.puntoGuardaId || null,
        activo: true,
        creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
      };
      await window.guardaSysDb.collection("usuarios").doc(uid).set(datosUsuario);
      await registrarAuditoria(usuario, "crear_usuario", "usuario", uid, null, datosUsuario);

      await appSecundaria.auth().signOut();
      setMensaje({ tipo: "exito", texto: `Usuario ${form.email} creado correctamente.` });
      setForm({ nombreCompleto: "", email: "", password: "", rol: "operador", puntoGuardaId: "" });
      cargarLista();
    } catch (err) {
      console.error(err);
      const texto =
        err.code === "auth/email-already-in-use"
          ? "Ya existe un usuario con ese email."
          : "No se pudo crear el usuario.";
      setMensaje({ tipo: "error", texto });
    } finally {
      await appSecundaria.delete();
      setGuardando(false);
    }
  }

  async function cambiarRol(u, nuevoRol) {
    await window.guardaSysDb.collection("usuarios").doc(u.id).update({ rol: nuevoRol });
    await registrarAuditoria(usuario, "editar_usuario", "usuario", u.id, { rol: u.rol }, { rol: nuevoRol });
    cargarLista();
  }

  async function alternarActivo(u) {
    const nuevoValor = !u.activo;
    await window.guardaSysDb.collection("usuarios").doc(u.id).update({ activo: nuevoValor });
    await registrarAuditoria(
      usuario,
      nuevoValor ? "activar_usuario" : "desactivar_usuario",
      "usuario",
      u.id,
      { activo: u.activo },
      { activo: nuevoValor }
    );
    cargarLista();
  }

  return (
    <React.Fragment>
      <div className="panel">
        <h2>Nuevo usuario</h2>
        {mensaje && <div className={mensaje.tipo === "exito" ? "mensaje-exito" : "mensaje-error"}>{mensaje.texto}</div>}
        <form onSubmit={crearUsuario}>
          <div className="fila-campos">
            <div className="campo">
              <label>Nombre completo</label>
              <input
                value={form.nombreCompleto}
                onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })}
              />
            </div>
            <div className="campo">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="campo">
              <label>Contraseña inicial</label>
              <input
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="mínimo 6 caracteres"
              />
            </div>
            <div className="campo">
              <label>Rol</label>
              <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label>Punto de guarda (opcional)</label>
              <select
                value={form.puntoGuardaId}
                onChange={(e) => setForm({ ...form, puntoGuardaId: e.target.value })}
              >
                <option value="">— sin asignar —</option>
                {puntosGuarda.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button className="boton boton-primario" style={{ width: "auto", padding: "10px 24px", marginTop: 8 }} disabled={guardando}>
            {guardando ? "Creando…" : "Crear usuario"}
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>Usuarios existentes</h2>
        {cargando ? (
          <div className="cargando">Cargando…</div>
        ) : (
          <table className="tabla-admin">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((u) => (
                <tr key={u.id}>
                  <td>{u.nombreCompleto}</td>
                  <td>{u.email}</td>
                  <td>
                    <select value={u.rol} onChange={(e) => cambiarRol(u, e.target.value)}>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className={"estado-badge " + (u.activo ? "estado-ok" : "estado-inactivo")}>
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>
                    <button className="boton boton-secundario boton-chico" onClick={() => alternarActivo(u)}>
                      {u.activo ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </React.Fragment>
  );
}

// ============================================================================
// PUNTOS DE GUARDA
// ============================================================================

function AdminPuntosGuarda({ usuario }) {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ codigo: "", nombre: "", capacidadEstimada: "" });

  function cargarLista() {
    setCargando(true);
    window.guardaSysDb
      .collection("puntosGuarda")
      .get()
      .then((snap) => setLista(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .finally(() => setCargando(false));
  }

  useEffect(cargarLista, []);

  async function crear(e) {
    e.preventDefault();
    setMensaje(null);
    const codigo = form.codigo.trim().toUpperCase();
    if (!codigo || !form.nombre.trim()) {
      setMensaje({ tipo: "error", texto: "Completá código y nombre." });
      return;
    }
    setGuardando(true);
    try {
      const ref = window.guardaSysDb.collection("puntosGuarda").doc(codigo);
      const existe = (await ref.get()).exists;
      if (existe) {
        setMensaje({ tipo: "error", texto: `Ya existe un punto de guarda con código "${codigo}".` });
        return;
      }
      const datos = {
        codigo,
        nombre: form.nombre.trim(),
        activo: true,
        capacidadEstimada: form.capacidadEstimada ? Number(form.capacidadEstimada) : null,
      };
      await ref.set(datos);
      await registrarAuditoria(usuario, "crear_punto_guarda", "puntoGuarda", codigo, null, datos);
      setForm({ codigo: "", nombre: "", capacidadEstimada: "" });
      cargarLista();
    } finally {
      setGuardando(false);
    }
  }

  async function alternarActivo(p) {
    const nuevoValor = !p.activo;
    await window.guardaSysDb.collection("puntosGuarda").doc(p.id).update({ activo: nuevoValor });
    await registrarAuditoria(usuario, nuevoValor ? "activar_punto_guarda" : "desactivar_punto_guarda", "puntoGuarda", p.id, { activo: p.activo }, { activo: nuevoValor });
    cargarLista();
  }

  return (
    <React.Fragment>
      <div className="panel">
        <h2>Nuevo punto de guarda</h2>
        {mensaje && <div className="mensaje-error">{mensaje.texto}</div>}
        <form onSubmit={crear}>
          <div className="fila-campos">
            <div className="campo">
              <label>Código (usado en el ticket)</label>
              <input
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                placeholder="ej. PB"
              />
            </div>
            <div className="campo">
              <label>Nombre</label>
              <input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="ej. Planta Baja"
              />
            </div>
            <div className="campo">
              <label>Capacidad estimada (opcional)</label>
              <input
                type="number"
                value={form.capacidadEstimada}
                onChange={(e) => setForm({ ...form, capacidadEstimada: e.target.value })}
              />
            </div>
          </div>
          <button className="boton boton-primario" style={{ width: "auto", padding: "10px 24px", marginTop: 8 }} disabled={guardando}>
            {guardando ? "Creando…" : "Crear punto de guarda"}
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>Puntos de guarda existentes</h2>
        {cargando ? (
          <div className="cargando">Cargando…</div>
        ) : (
          <table className="tabla-admin">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Capacidad</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id}>
                  <td><span className="ticket-codigo">{p.codigo}</span></td>
                  <td>{p.nombre}</td>
                  <td>{p.capacidadEstimada || "—"}</td>
                  <td>
                    <span className={"estado-badge " + (p.activo ? "estado-ok" : "estado-inactivo")}>
                      {p.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>
                    <button className="boton boton-secundario boton-chico" onClick={() => alternarActivo(p)}>
                      {p.activo ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </React.Fragment>
  );
}

// ============================================================================
// TERMINALES
// ============================================================================

function AdminTerminales({ usuario }) {
  const [lista, setLista] = useState([]);
  const [puntosGuarda, setPuntosGuarda] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ codigo: "", puntoGuardaId: "" });

  function cargarLista() {
    setCargando(true);
    window.guardaSysDb
      .collection("terminales")
      .get()
      .then((snap) => setLista(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    cargarLista();
    window.guardaSysDb
      .collection("puntosGuarda")
      .where("activo", "==", true)
      .get()
      .then((snap) => {
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPuntosGuarda(lista);
        if (lista.length > 0) setForm((f) => ({ ...f, puntoGuardaId: lista[0].id }));
      });
  }, []);

  async function crear(e) {
    e.preventDefault();
    setMensaje(null);
    const codigo = form.codigo.trim().toUpperCase();
    if (!codigo || !form.puntoGuardaId) {
      setMensaje({ tipo: "error", texto: "Completá código y punto de guarda." });
      return;
    }
    setGuardando(true);
    try {
      const ref = window.guardaSysDb.collection("terminales").doc(codigo);
      const existe = (await ref.get()).exists;
      if (existe) {
        setMensaje({ tipo: "error", texto: `Ya existe una terminal con código "${codigo}".` });
        return;
      }
      const datos = { codigo, puntoGuardaId: form.puntoGuardaId, impresoraId: null, activo: true };
      await ref.set(datos);
      await registrarAuditoria(usuario, "crear_terminal", "terminal", codigo, null, datos);
      setForm({ ...form, codigo: "" });
      cargarLista();
    } finally {
      setGuardando(false);
    }
  }

  async function alternarActivo(t) {
    const nuevoValor = !t.activo;
    await window.guardaSysDb.collection("terminales").doc(t.id).update({ activo: nuevoValor });
    await registrarAuditoria(usuario, nuevoValor ? "activar_terminal" : "desactivar_terminal", "terminal", t.id, { activo: t.activo }, { activo: nuevoValor });
    cargarLista();
  }

  function nombrePuntoGuarda(id) {
    const p = puntosGuarda.find((p) => p.id === id);
    return p ? p.nombre : id;
  }

  return (
    <React.Fragment>
      <div className="panel">
        <h2>Nueva terminal</h2>
        {mensaje && <div className="mensaje-error">{mensaje.texto}</div>}
        {puntosGuarda.length === 0 ? (
          <p className="texto-suave">Creá primero al menos un punto de guarda.</p>
        ) : (
          <form onSubmit={crear}>
            <div className="fila-campos">
              <div className="campo">
                <label>Código de terminal</label>
                <input
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  placeholder="ej. PB-PC-01"
                />
              </div>
              <div className="campo">
                <label>Punto de guarda</label>
                <select value={form.puntoGuardaId} onChange={(e) => setForm({ ...form, puntoGuardaId: e.target.value })}>
                  {puntosGuarda.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.codigo})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button className="boton boton-primario" style={{ width: "auto", padding: "10px 24px", marginTop: 8 }} disabled={guardando}>
              {guardando ? "Creando…" : "Crear terminal"}
            </button>
          </form>
        )}
      </div>

      <div className="panel">
        <h2>Terminales existentes</h2>
        {cargando ? (
          <div className="cargando">Cargando…</div>
        ) : (
          <table className="tabla-admin">
            <thead>
              <tr>
                <th>Código</th>
                <th>Punto de guarda</th>
                <th>Impresora asignada</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((t) => (
                <tr key={t.id}>
                  <td><span className="ticket-codigo">{t.codigo}</span></td>
                  <td>{nombrePuntoGuarda(t.puntoGuardaId)}</td>
                  <td>{t.impresoraId || "— sin asignar —"}</td>
                  <td>
                    <span className={"estado-badge " + (t.activo ? "estado-ok" : "estado-inactivo")}>
                      {t.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>
                    <button className="boton boton-secundario boton-chico" onClick={() => alternarActivo(t)}>
                      {t.activo ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </React.Fragment>
  );
}

// ============================================================================
// IMPRESORAS
// ============================================================================

function AdminImpresoras({ usuario }) {
  const [lista, setLista] = useState([]);
  const [terminales, setTerminales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ nombre: "", rutaRed: "", terminalId: "", modelo: "Epson TM-T20III" });

  function cargarLista() {
    setCargando(true);
    window.guardaSysDb
      .collection("impresoras")
      .get()
      .then((snap) => setLista(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    cargarLista();
    window.guardaSysDb
      .collection("terminales")
      .where("activo", "==", true)
      .get()
      .then((snap) => {
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTerminales(lista);
        if (lista.length > 0) setForm((f) => ({ ...f, terminalId: lista[0].id }));
      });
  }, []);

  async function crear(e) {
    e.preventDefault();
    setMensaje(null);
    if (!form.nombre.trim() || !form.rutaRed.trim() || !form.terminalId) {
      setMensaje({ tipo: "error", texto: "Completá nombre, ruta de red y terminal." });
      return;
    }
    setGuardando(true);
    try {
      const datos = {
        nombre: form.nombre.trim(),
        rutaRed: form.rutaRed.trim(),
        terminalId: form.terminalId,
        modelo: form.modelo.trim(),
        estado: "ok",
        ultimoPing: null,
      };
      const ref = await window.guardaSysDb.collection("impresoras").add(datos);
      // Vincular la terminal con esta impresora
      await window.guardaSysDb.collection("terminales").doc(form.terminalId).update({ impresoraId: ref.id });
      await registrarAuditoria(usuario, "crear_impresora", "impresora", ref.id, null, datos);
      setForm({ ...form, nombre: "", rutaRed: "" });
      cargarLista();
    } finally {
      setGuardando(false);
    }
  }

  function nombreTerminal(id) {
    const t = terminales.find((t) => t.id === id);
    return t ? t.codigo : id;
  }

  return (
    <React.Fragment>
      <div className="panel">
        <h2>Nueva impresora</h2>
        {mensaje && <div className="mensaje-error">{mensaje.texto}</div>}
        {terminales.length === 0 ? (
          <p className="texto-suave">Creá primero al menos una terminal.</p>
        ) : (
          <form onSubmit={crear}>
            <div className="fila-campos">
              <div className="campo">
                <label>Nombre</label>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="ej. Impresora Planta Baja 1"
                />
              </div>
              <div className="campo">
                <label>Ruta de red compartida</label>
                <input
                  value={form.rutaRed}
                  onChange={(e) => setForm({ ...form, rutaRed: e.target.value })}
                  placeholder="\\IP-PC\NombreImpresora"
                />
              </div>
              <div className="campo">
                <label>Terminal</label>
                <select value={form.terminalId} onChange={(e) => setForm({ ...form, terminalId: e.target.value })}>
                  {terminales.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.codigo}
                    </option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label>Modelo</label>
                <input
                  value={form.modelo}
                  onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                />
              </div>
            </div>
            <button className="boton boton-primario" style={{ width: "auto", padding: "10px 24px", marginTop: 8 }} disabled={guardando}>
              {guardando ? "Creando…" : "Crear impresora"}
            </button>
          </form>
        )}
      </div>

      <div className="panel">
        <h2>Impresoras existentes</h2>
        {cargando ? (
          <div className="cargando">Cargando…</div>
        ) : (
          <table className="tabla-admin">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Terminal</th>
                <th>Modelo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((i) => (
                <tr key={i.id}>
                  <td>{i.nombre}</td>
                  <td>{nombreTerminal(i.terminalId)}</td>
                  <td>{i.modelo}</td>
                  <td>
                    <span className={"estado-badge " + (i.estado === "ok" ? "estado-ok" : "estado-inactivo")}>
                      {i.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </React.Fragment>
  );
}
