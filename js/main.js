const JUEGO = { equipos:[], miEquipoId:null, grupos:[], partidosGrupo:[],
  bracket:null, fase:"inicio", rng: Math.random };

function mostrarVista(id){
  document.querySelectorAll(".vista").forEach(v=>v.classList.remove("activa"));
  document.getElementById(id).classList.add("activa");
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
  return partidosDeFase().find(p=>!p.jugado &&
    (p.localId===equipoId || p.visitanteId===equipoId)) || null;
}

function _equipo(id){ return JUEGO.equipos.find(e=>e.id===id); }

function jugarJornadaDeMiPartido(){
  const mio=proximoPartidoDe(JUEGO.miEquipoId);
  if(!mio){ avanzarFase(); return; }
  _simularPartidoObj(mio);
  // simular el resto de partidos pendientes de la fase para no dejar rezagados
  partidosDeFase().filter(p=>!p.jugado).forEach(_simularPartidoObj);
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
