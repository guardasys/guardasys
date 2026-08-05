// ============================================================================
// SELECTOR DE PAÍS (bandera + indicativo) — compartido entre Nueva Guarda
// (js/components.js) y el módulo público de autoregistro
// (js/registro-cliente.js). Depende de PAISES_TELEFONO / PAISES_PRIORITARIOS
// definidos en js/paises-telefono.js, que debe cargarse antes que este
// archivo.
// ============================================================================

function SelectorPais({ pais, setPais, placeholder }) {
  const [abierto, setAbierto] = React.useState(false);
  const [busqueda, setBusqueda] = React.useState("");

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
            placeholder={placeholder || "Buscar país…"}
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
