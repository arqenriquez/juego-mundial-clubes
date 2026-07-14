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
