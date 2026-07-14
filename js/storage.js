const _CLAVE="mundialClubes";
function guardarJuego(estado){ localStorage.setItem(_CLAVE, JSON.stringify(estado)); }
function cargarJuego(){ const s=localStorage.getItem(_CLAVE); return s?JSON.parse(s):null; }
function hayGuardado(){ return localStorage.getItem(_CLAVE)!==null; }
function borrarGuardado(){ localStorage.removeItem(_CLAVE); }
