function App() {
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [usuario, setUsuario] = useState(null); // doc de usuarios/{uid} + uid + email
  const [paginaActiva, setPaginaActiva] = useState("inicio");

  useEffect(() => {
    const unsub = window.guardaSysAuth.onAuthStateChanged(async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const doc = await window.guardaSysDb.collection("usuarios").doc(fbUser.uid).get();
          if (doc.exists) {
            setUsuario({ uid: fbUser.uid, email: fbUser.email, ...doc.data() });
          } else {
            // Usuario autenticado en Firebase Auth pero sin documento en
            // `usuarios` (falta que un administrador lo dé de alta con rol).
            setUsuario({ uid: fbUser.uid, email: fbUser.email, rol: null, sinPerfil: true });
          }
        } catch (err) {
          console.error(err);
        }
      } else {
        setUsuario(null);
      }
      setCargandoSesion(false);
    });
    return () => unsub();
  }, []);

  function cerrarSesion() {
    window.guardaSysAuth.signOut();
    setPaginaActiva("inicio");
  }

  if (cargandoSesion) {
    return <div className="cargando">Cargando…</div>;
  }

  if (!firebaseUser || !usuario) {
    return <Login />;
  }

  if (usuario.sinPerfil) {
    return (
      <div className="pantalla-login">
        <div className="tarjeta-login">
          <h1>Tu usuario todavía no tiene un rol asignado en el sistema.</h1>
          <p className="texto-suave">Pedile a un administrador que te dé de alta en el módulo de Usuarios.</p>
          <button className="boton boton-secundario" style={{ width: "100%", marginTop: 16 }} onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  function renderPagina() {
    switch (paginaActiva) {
      case "nueva-guarda":
        return <NuevaGuarda usuario={usuario} />;
      case "administracion":
        return <AdministracionModule usuario={usuario} />;
      case "devoluciones":
        return <DevolucionesModule usuario={usuario} />;
      case "incidencias":
        return <IncidenciasModule usuario={usuario} />;
      case "auditoria":
        return <AuditoriaModule />;
      case "inicio":
      default:
        return <PanelInicio usuario={usuario} />;
      // "devoluciones", "incidencias", "reportes", "administracion" y
      // "auditoria" se suman como próximos módulos.
    }
  }

  return (
    <div className="shell">
      <Sidebar
        usuario={usuario}
        paginaActiva={paginaActiva}
        onNavegar={setPaginaActiva}
        onCerrarSesion={cerrarSesion}
      />
      {renderPagina()}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
