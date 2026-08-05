// ============================================================================
// PAÍSES / CÓDIGOS TELEFÓNICOS — selector con banderita para el módulo
// público de autoregistro de clientes.
// Brasil, Argentina y Paraguay van primero (los tres países de donde viene
// la enorme mayoría de los clientes de TOKU); el resto queda ordenado
// alfabéticamente por nombre debajo, para buscar rápido si hace falta.
// ============================================================================

const PAISES_PRIORITARIOS = [
  { iso: "BR", nombre: "Brasil", bandera: "🇧🇷", indicativo: "+55" },
  { iso: "AR", nombre: "Argentina", bandera: "🇦🇷", indicativo: "+54" },
  { iso: "PY", nombre: "Paraguay", bandera: "🇵🇾", indicativo: "+595" },
];

const PAISES_RESTO = [
  { iso: "DE", nombre: "Alemania", bandera: "🇩🇪", indicativo: "+49" },
  { iso: "AU", nombre: "Australia", bandera: "🇦🇺", indicativo: "+61" },
  { iso: "AT", nombre: "Austria", bandera: "🇦🇹", indicativo: "+43" },
  { iso: "BE", nombre: "Bélgica", bandera: "🇧🇪", indicativo: "+32" },
  { iso: "BO", nombre: "Bolivia", bandera: "🇧🇴", indicativo: "+591" },
  { iso: "CA", nombre: "Canadá", bandera: "🇨🇦", indicativo: "+1" },
  { iso: "CL", nombre: "Chile", bandera: "🇨🇱", indicativo: "+56" },
  { iso: "CN", nombre: "China", bandera: "🇨🇳", indicativo: "+86" },
  { iso: "KR", nombre: "Corea del Sur", bandera: "🇰🇷", indicativo: "+82" },
  { iso: "CO", nombre: "Colombia", bandera: "🇨🇴", indicativo: "+57" },
  { iso: "KW", nombre: "Kuwait", bandera: "🇰🇼", indicativo: "+965" },
  { iso: "DK", nombre: "Dinamarca", bandera: "🇩🇰", indicativo: "+45" },
  { iso: "EC", nombre: "Ecuador", bandera: "🇪🇨", indicativo: "+593" },
  { iso: "ES", nombre: "España", bandera: "🇪🇸", indicativo: "+34" },
  { iso: "US", nombre: "Estados Unidos", bandera: "🇺🇸", indicativo: "+1" },
  { iso: "FR", nombre: "Francia", bandera: "🇫🇷", indicativo: "+33" },
  { iso: "GR", nombre: "Grecia", bandera: "🇬🇷", indicativo: "+30" },
  { iso: "NL", nombre: "Países Bajos", bandera: "🇳🇱", indicativo: "+31" },
  { iso: "IN", nombre: "India", bandera: "🇮🇳", indicativo: "+91" },
  { iso: "IE", nombre: "Irlanda", bandera: "🇮🇪", indicativo: "+353" },
  { iso: "IL", nombre: "Israel", bandera: "🇮🇱", indicativo: "+972" },
  { iso: "IT", nombre: "Italia", bandera: "🇮🇹", indicativo: "+39" },
  { iso: "JP", nombre: "Japón", bandera: "🇯🇵", indicativo: "+81" },
  { iso: "MX", nombre: "México", bandera: "🇲🇽", indicativo: "+52" },
  { iso: "NO", nombre: "Noruega", bandera: "🇳🇴", indicativo: "+47" },
  { iso: "PA", nombre: "Panamá", bandera: "🇵🇦", indicativo: "+507" },
  { iso: "PE", nombre: "Perú", bandera: "🇵🇪", indicativo: "+51" },
  { iso: "PT", nombre: "Portugal", bandera: "🇵🇹", indicativo: "+351" },
  { iso: "GB", nombre: "Reino Unido", bandera: "🇬🇧", indicativo: "+44" },
  { iso: "CH", nombre: "Suiza", bandera: "🇨🇭", indicativo: "+41" },
  { iso: "UY", nombre: "Uruguay", bandera: "🇺🇾", indicativo: "+598" },
  { iso: "VE", nombre: "Venezuela", bandera: "🇻🇪", indicativo: "+58" },
].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

const PAISES_TELEFONO = [...PAISES_PRIORITARIOS, ...PAISES_RESTO];
