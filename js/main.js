const JUEGO = { equipos:[], miEquipoId:null, grupos:[], partidosGrupo:[],
  bracket:null, fase:"inicio", jornadaActual:1, ultimaJornada:[], rng: Math.random };

function mostrarVista(id){
  document.querySelectorAll(".vista").forEach(v=>v.classList.remove("activa"));
  document.getElementById(id).classList.add("activa");
  _actualizarTopbar();
}

function _actualizarTopbar(){
  const el=document.getElementById("subtitulo");
  if(!el) return;
  const mi = JUEGO.miEquipoId ? _equipo(JUEGO.miEquipoId) : null;
  if(!mi){ el.textContent=""; return; }
  const faseTxt = JUEGO.fase==="grupos" ? `Grupos · J${JUEGO.jornadaActual}/3`
    : (JUEGO.fase==="eliminatorias" && JUEGO.bracket) ? JUEGO.bracket.nombre
    : JUEGO.fase==="campeon" ? "Campeón" : JUEGO.fase;
  el.textContent = `${mi.nombre} · ${faseTxt}`;
}

function nuevoJuego(miEquipoId){
  JUEGO.equipos = generarLiga(JUEGO.rng);
  JUEGO.miEquipoId = miEquipoId;
  const mi = JUEGO.equipos.find(e=>e.id===miEquipoId);
  mi.esHumano = true;
  autoAlinear(mi); // define titulares iniciales
  JUEGO.equipos.forEach(e=>{ if(!e.esHumano) autoAlinear(e); });
  JUEGO.grupos = sortearGrupos(JUEGO.equipos, JUEGO.rng);
  JUEGO.partidosGrupo = JUEGO.grupos.flatMap(g=>fixturesDeGrupo(g));
  JUEGO.jornadaActual = 1;
  JUEGO.ultimaJornada = [];
  JUEGO.fase="grupos";
  guardarJuego(JUEGO);
  irADashboard();
}

// Elige 11 titulares válidos según la formación del equipo (mejores por rating)
function autoAlinear(equipo){
  const comp={POR:1, ...FORMACIONES[equipo.formacion]};
  const titulares=[];
  Object.entries(comp).forEach(([pos,cant])=>{
    const cand=equipo.jugadores.filter(j=>j.posicion===pos)
      .sort((a,b)=> (b.ataque+b.defensa+b.velocidad) - (a.ataque+a.defensa+a.velocidad));
    for(let i=0;i<cant && i<cand.length;i++) titulares.push(cand[i].id);
  });
  equipo.titulares=titulares;
}

function arrancar(){
  if(hayGuardado()){
    if(confirm("Hay una partida guardada. ¿Continuar?")){
      Object.assign(JUEGO, cargarJuego());
      JUEGO.rng = Math.random; // no se serializa la función
      enrutarPorFase();
      return;
    } else { borrarGuardado(); }
  }
  renderInicio();
}

function enrutarPorFase(){
  if(JUEGO.fase==="campeon") renderBracket();
  else if(JUEGO.fase==="eliminatorias") renderBracket();
  else irADashboard();
}

window.addEventListener("DOMContentLoaded", arrancar);

// ---- Tarea 11: flujo de juego (dashboard, partido, eliminatorias) ----

function irADashboard(){ renderDashboard(); }

function partidosDeFase(){
  return JUEGO.fase==="grupos" ? JUEGO.partidosGrupo : _partidosRondaActual();
}

function proximoPartidoDe(equipoId){
  if(JUEGO.fase==="grupos"){
    // en grupos solo cuenta la jornada actual (se juega jornada por jornada)
    return JUEGO.partidosGrupo.find(p=>!p.jugado && p.jornada===JUEGO.jornadaActual &&
      (p.localId===equipoId || p.visitanteId===equipoId)) || null;
  }
  return _partidosRondaActual().find(p=>!p.jugado &&
    (p.localId===equipoId || p.visitanteId===equipoId)) || null;
}

function _equipo(id){ return JUEGO.equipos.find(e=>e.id===id); }

// Partido del usuario en la fase actual (grupo o ronda de eliminatoria), o null si no tiene
function miPartidoActual(){
  if(JUEGO.fase==="grupos") return proximoPartidoDe(JUEGO.miEquipoId);
  return _partidosRondaActual().find(x=>x.localId===JUEGO.miEquipoId||x.visitanteId===JUEGO.miEquipoId) || null;
}

// El usuario fue eliminado si estamos en eliminatorias y ya no tiene partido en la ronda actual
function estoyEliminado(){
  return JUEGO.fase==="eliminatorias" && !miPartidoActual();
}

// El usuario ya no juega: resuelve las rondas restantes hasta coronar campeón
function simularRestoTorneo(){
  let guardia=0;
  while(JUEGO.fase==="eliminatorias" && guardia++<10){ _resolverLlaveMia(); }
  guardarJuego(JUEGO);
  renderBracket();
}

function jugarJornadaDeMiPartido(){
  const mio=proximoPartidoDe(JUEGO.miEquipoId);
  if(!mio){ avanzarFase(); return; }
  // juega SOLO los partidos de la jornada actual (todos los grupos), no toda la fase
  const jornada = JUEGO.partidosGrupo.filter(p=>p.jornada===JUEGO.jornadaActual && !p.jugado);
  jornada.forEach(_simularPartidoObj);
  JUEGO.ultimaJornada = jornada.map(p=>({localId:p.localId, visitanteId:p.visitanteId,
    golesLocal:p.golesLocal, golesVisitante:p.golesVisitante}));
  JUEGO.jornadaActual++;
  guardarJuego(JUEGO);
  renderResultado(mio);
}

function _simularPartidoObj(p){
  const L=_equipo(p.localId), V=_equipo(p.visitanteId);
  const r=simularPartido(L,V,JUEGO.rng);
  p.golesLocal=r.golesLocal; p.golesVisitante=r.golesVisitante;
  p.goleadores=r.goleadores; p.jugado=true;
  aplicarPostPartido(p);
}

function aplicarPostPartido(p){
  [p.localId, p.visitanteId].forEach(eid=>{
    const eq=_equipo(eid);
    const gf = eid===p.localId ? p.golesLocal : p.golesVisitante;
    const gc = eid===p.localId ? p.golesVisitante : p.golesLocal;
    const res = gf>gc?"V": gf<gc?"D":"E";
    eq.jugadores.forEach(j=>{
      const jugo=eq.titulares.includes(j.id);
      aplicarCansancio(j, jugo);
      if(jugo){ actualizarForma(j,res); aplicarProgresion(j,true,JUEGO.rng); }
    });
  });
}

function avanzarFase(){
  if(JUEGO.fase==="grupos"){
    const clasificados=JUEGO.grupos.map(g=>{
      const [primero,segundo]=clasificadosDeGrupo(g, JUEGO.partidosGrupo);
      return {grupo:g.id, primero, segundo};
    });
    JUEGO.bracket=construirBracket(clasificados);
    JUEGO.fase="eliminatorias";
    guardarJuego(JUEGO);
    renderBracket();
  } else if(JUEGO.fase==="eliminatorias"){
    renderBracket(); // ya avanzó ronda dentro de resolverRonda
  }
}

// Partidos pendientes de la ronda actual del bracket (a partido único)
function _partidosRondaActual(){
  if(!JUEGO.bracket) return [];
  return JUEGO.bracket.llaves.filter(l=>!l.ganadorId).map(l=>({
    id:"k-"+l.localId+"-"+l.visitanteId, ronda:"eliminatoria", grupo:null,
    localId:l.localId, visitanteId:l.visitanteId, golesLocal:0, golesVisitante:0,
    jugado:false, goleadores:[], _llave:l }));
}

// sobre-escribe la simulación para eliminatorias (desempate por penales aleatorio)
function _resolverLlaveMia(){
  const pendientes=_partidosRondaActual();
  // NOTA (fix Tarea 11): "mio" se toma del propio arreglo `pendientes` que el
  // forEach muta, en vez de una segunda llamada a _partidosRondaActual()
  // (que crea objetos nuevos cada vez y nunca reflejaría el resultado jugado).
  let mio=null;
  pendientes.forEach(p=>{
    const L=_equipo(p.localId), V=_equipo(p.visitanteId);
    const r=simularPartido(L,V,JUEGO.rng);
    let gL=r.golesLocal, gV=r.golesVisitante;
    if(gL===gV){ (JUEGO.rng()<0.5)?gL++:gV++; } // "penales"
    p.golesLocal=gL; p.golesVisitante=gV; p.goleadores=r.goleadores; p.jugado=true;
    p._llave.ganadorId = gL>gV ? p.localId : p.visitanteId;
    aplicarPostPartido(p);
    if(p.localId===JUEGO.miEquipoId||p.visitanteId===JUEGO.miEquipoId) mio=p;
  });
  // guarda los resultados de esta ronda para mostrarlos como "otros resultados"
  JUEGO.ultimaJornada = pendientes.map(p=>({localId:p.localId, visitanteId:p.visitanteId, golesLocal:p.golesLocal, golesVisitante:p.golesVisitante}));
  // construir siguiente ronda
  const ganadores=JUEGO.bracket.llaves.map(l=>l.ganadorId);
  if(ganadores.length===1){ JUEGO.fase="campeon"; }
  else {
    const nuevas=[];
    for(let i=0;i<ganadores.length;i+=2)
      nuevas.push({localId:ganadores[i], visitanteId:ganadores[i+1], ganadorId:null});
    JUEGO.bracket={ nombre:nombreRonda(ganadores.length), llaves:nuevas, siguiente:null };
  }
  guardarJuego(JUEGO);
  return mio;
}
