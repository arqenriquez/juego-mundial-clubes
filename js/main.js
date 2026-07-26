const JUEGO = { equipos:[], miEquipoId:null, grupos:[], partidosGrupo:[],
  bracket:null, fase:"inicio", jornadaActual:1, ultimaJornada:[], rng: Math.random };

let _vistaActual = null;

// Devuelve true si esto es una LLEGADA a la vista y false si es un re-render de la misma.
// La distinción evita que el dashboard parpadee al marcar titulares o cambiar formación.
function mostrarVista(id){
  const cambio = (id !== _vistaActual);
  document.querySelectorAll(".vista").forEach(v=>v.classList.remove("activa"));
  const el = document.getElementById(id);
  el.classList.add("activa");
  if(cambio) reiniciarAnimacion(el, "entra");
  _vistaActual = id;
  _actualizarTopbar();
  return cambio;
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

// Arma titulares ordenados por SLOT de la formación (índice = slot en la cancha).
// Para cada slot toma al mejor disponible de esa posición; si no queda, cualquiera.
function autoAlinear(equipo){
  const slots = FORMACION_SLOTS[equipo.formacion];
  const usados = new Set();
  const rating = j => j.ataque + j.defensa + j.velocidad;
  equipo.titulares = slots.map(s=>{
    let cand = equipo.jugadores.filter(j=>!usados.has(j.id) && j.posicion===s.pos)
      .sort((a,b)=>rating(b)-rating(a));
    if(!cand.length) cand = equipo.jugadores.filter(j=>!usados.has(j.id))
      .sort((a,b)=>rating(b)-rating(a));
    usados.add(cand[0].id);
    return cand[0].id;
  });
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

function irADashboard(){ _modoGestion=false; _seleccion=null; _tabBanca='suplentes'; renderDashboard(); }

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

// Resuelve UNA llave de eliminatoria (con desempate por "penales") y marca al ganador
function _resolverUnaLlave(p){
  const L=_equipo(p.localId), V=_equipo(p.visitanteId);
  const r=simularPartido(L,V,JUEGO.rng);
  let gL=r.golesLocal, gV=r.golesVisitante;
  if(gL===gV){ (JUEGO.rng()<0.5)?gL++:gV++; } // "penales"
  p.golesLocal=gL; p.golesVisitante=gV; p.goleadores=r.goleadores; p.jugado=true;
  p._llave.ganadorId = gL>gV ? p.localId : p.visitanteId;
  aplicarPostPartido(p);
  return p;
}

// Construye la siguiente ronda con los ganadores (o corona campeón)
function _avanzarBracket(){
  const ganadores=JUEGO.bracket.llaves.map(l=>l.ganadorId);
  if(ganadores.length===1){ JUEGO.fase="campeon"; return; }
  const nuevas=[];
  for(let i=0;i<ganadores.length;i+=2)
    nuevas.push({localId:ganadores[i], visitanteId:ganadores[i+1], ganadorId:null});
  JUEGO.bracket={ nombre:nombreRonda(ganadores.length), llaves:nuevas, siguiente:null };
}

// INSTANT: resuelve toda la ronda actual y avanza. Devuelve mi partido (o null).
function _resolverLlaveMia(){
  const pendientes=_partidosRondaActual();
  let mio=null;
  pendientes.forEach(p=>{ _resolverUnaLlave(p);
    if(p.localId===JUEGO.miEquipoId||p.visitanteId===JUEGO.miEquipoId) mio=p; });
  JUEGO.ultimaJornada = pendientes.map(p=>({localId:p.localId, visitanteId:p.visitanteId, golesLocal:p.golesLocal, golesVisitante:p.golesVisitante}));
  _avanzarBracket();
  guardarJuego(JUEGO);
  return mio;
}

// ---- Modo 2D: anima MI partido; al terminar resuelve el resto y muestra el resultado ----
function verMiPartido2D(){
  if(JUEGO.fase==="grupos"){
    const mio=proximoPartidoDe(JUEGO.miEquipoId);
    if(!mio){ avanzarFase(); return; }
    _simularPartidoObj(mio); // el motor decide MI partido (goles + goleadores + post)
    animarPartido2D(_equipo(mio.localId), _equipo(mio.visitanteId), mio, ()=>{
      JUEGO.partidosGrupo.filter(p=>p.jornada===JUEGO.jornadaActual && !p.jugado).forEach(_simularPartidoObj);
      JUEGO.ultimaJornada = JUEGO.partidosGrupo.filter(p=>p.jornada===JUEGO.jornadaActual)
        .map(p=>({localId:p.localId, visitanteId:p.visitanteId, golesLocal:p.golesLocal, golesVisitante:p.golesVisitante}));
      JUEGO.jornadaActual++;
      guardarJuego(JUEGO);
      renderResultado(mio);
    });
  } else {
    const pend=_partidosRondaActual();
    const mio=pend.find(p=>p.localId===JUEGO.miEquipoId||p.visitanteId===JUEGO.miEquipoId);
    if(!mio){ simularRestoTorneo(); return; }
    _resolverUnaLlave(mio);
    animarPartido2D(_equipo(mio.localId), _equipo(mio.visitanteId), mio, ()=>{
      pend.forEach(p=>{ if(p!==mio && !p.jugado) _resolverUnaLlave(p); });
      JUEGO.ultimaJornada = pend.map(p=>({localId:p.localId, visitanteId:p.visitanteId, golesLocal:p.golesLocal, golesVisitante:p.golesVisitante}));
      _avanzarBracket();
      guardarJuego(JUEGO);
      renderResultado(mio);
    });
  }
}

// Selector al jugar: resultado instantáneo (con cortinilla) o vista 2D
function elegirModoPartido(){
  const enGrupos = JUEGO.fase==="grupos";
  const txt = enGrupos ? `Simulando jornada ${JUEGO.jornadaActual}…`
    : `Simulando ${JUEGO.bracket?JUEGO.bracket.nombre:"la ronda"}…`;
  const instant = ()=> enGrupos ? jugarJornadaDeMiPartido() : jugarEliminatoria();
  const ov=document.createElement("div"); ov.className="modo-ov";
  ov.innerHTML=`<div class="modo-caja">
    <h3>¿Cómo quieres jugar el partido?</h3>
    <div class="modo-opts">
      <button class="btn" id="modo-2d">🎬 Ver partido 2D</button>
      <button class="btn sec" id="modo-inst">⚡ Resultado instantáneo</button>
    </div>
    <button class="modo-cancel" id="modo-cancel">Cancelar</button>
  </div>`;
  document.body.appendChild(ov);
  const cerrar=()=>ov.remove();
  ov.querySelector("#modo-2d").onclick=()=>{ cerrar(); verMiPartido2D(); };
  ov.querySelector("#modo-inst").onclick=()=>{ cerrar(); conCortina(txt, instant); };
  ov.querySelector("#modo-cancel").onclick=cerrar;
  ov.addEventListener("click",(e)=>{ if(e.target===ov) cerrar(); });
}
