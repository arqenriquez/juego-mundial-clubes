function renderInicio(){
  mostrarVista("vista-inicio");
  const v=document.getElementById("vista-inicio");
  v.innerHTML=`<div class="panel"><h2>Elige tu club</h2>
    <p style="color:var(--tenue)">Dirigirás este club durante todo el Mundial de Clubes.</p>
    <div id="grid-clubes" class="grid-clubes"></div></div>`;
  const grid=v.querySelector("#grid-clubes");
  // usa una liga temporal solo para mostrar ciudades (los atributos se generan al iniciar)
  CIUDADES.forEach((ciudad,i)=>{
    const card=document.createElement("button");
    card.className="club-card"; card.textContent="Club "+ciudad;
    card.onclick=()=>elegirClub("t"+i, ciudad);
    grid.appendChild(card);
  });
}

function elegirClub(id, ciudad){
  const nombre = prompt("Nombre de tu club:", "Club "+ciudad) || ("Club "+ciudad);
  // se guarda el nombre elegido para aplicarlo tras generar la liga
  nuevoJuego(id);
  const mi=JUEGO.equipos.find(e=>e.id===id); mi.nombre=nombre;
  guardarJuego(JUEGO);
  irADashboard();
}

function renderGrupos(){
  mostrarVista("vista-grupos");
  const v=document.getElementById("vista-grupos");
  const nombre=id=>JUEGO.equipos.find(e=>e.id===id).nombre;
  let html=`<div class="panel"><h2>Fase de grupos</h2><div class="grupos-grid">`;
  JUEGO.grupos.forEach(g=>{
    const tabla=calcularTabla(g, JUEGO.partidosGrupo);
    html+=`<div class="grupo"><h3>Grupo ${g.id}</h3>
      <table><tr><th>Equipo</th><th>PJ</th><th>Pts</th><th>DG</th></tr>`;
    tabla.forEach((f,idx)=>{
      const clases=[];
      if(f.equipoId===JUEGO.miEquipoId) clases.push("mio");
      if(idx<2) clases.push("clasif");
      const attr = clases.length ? ` class="${clases.join(" ")}"` : "";
      html+=`<tr${attr}><td>${nombre(f.equipoId)}</td>
        <td>${f.pj}</td><td>${f.pts}</td><td>${f.dg}</td></tr>`;
    });
    html+=`</table></div>`;
  });
  html+=`</div><button class="btn" onclick="irADashboard()">Volver a mi equipo</button></div>`;
  v.innerHTML=html;
}

// ---- Tarea 11: dashboard, partido y bracket ----

function renderDashboard(){
  mostrarVista("vista-dashboard");
  const mi=_equipo(JUEGO.miEquipoId);
  if(estoyEliminado()){
    const vElim=document.getElementById("vista-dashboard");
    vElim.innerHTML=`<div class="panel">
      <h2>${mi.nombre}</h2>
      <p>Tu equipo quedó <b>eliminado</b> del torneo. Puedes simular el resto para ver quién se corona campeón.</p>
      <div style="margin-top:12px">
        <button class="btn" onclick="simularRestoTorneo()">▶ Simular resto del torneo</button>
        <button class="btn sec" onclick="renderBracket()">Ver bracket</button>
      </div></div>`;
    return;
  }
  const rival=(function(){
    const p = JUEGO.fase==="grupos" ? proximoPartidoDe(mi.id)
      : _partidosRondaActual().find(x=>x.localId===mi.id||x.visitanteId===mi.id);
    if(!p) return null;
    const rid = p.localId===mi.id ? p.visitanteId : p.localId;
    return _equipo(rid);
  })();
  const v=document.getElementById("vista-dashboard");
  const barra=(val,color)=>`<div class="barra"><span style="width:${val}%;background:${color}"></span></div>`;
  const formaTxt=f=> (f>0?"+":"")+f;
  let filas="";
  ["POR","DEF","MED","DEL"].forEach(pos=>{
    mi.jugadores.filter(j=>j.posicion===pos).forEach(j=>{
      const tit=mi.titulares.includes(j.id);
      filas+=`<tr class="${tit?'titular':''}">
        <td><input type="checkbox" ${tit?'checked':''} onchange="toggleTitular('${j.id}')"></td>
        <td>${j.posicion}</td><td>${j.nombre}</td><td>${j.edad}</td>
        <td>${j.ataque}</td><td>${j.defensa}</td><td>${j.velocidad}</td>
        <td>${barra(j.cansancio,'var(--alerta)')}</td>
        <td>${formaTxt(j.forma)}</td></tr>`;
    });
  });
  const opciones=Object.keys(FORMACIONES).map(f=>
    `<option ${f===mi.formacion?'selected':''}>${f}</option>`).join("");
  const nTit=mi.titulares.length;
  const accion = JUEGO.fase==="grupos" ? "jugarJornadaDeMiPartido()" : "jugarEliminatoria()";
  v.innerHTML=`<div class="panel">
    <h2>${mi.nombre}</h2>
    <p>Próximo rival: <b>${rival?rival.nombre:"—"}</b> · ${JUEGO.fase==="grupos"?`Grupos · Jornada ${JUEGO.jornadaActual}/3`:(JUEGO.bracket?JUEGO.bracket.nombre:JUEGO.fase)}</p>
    <label>Formación:
      <select onchange="cambiarFormacion(this.value)">${opciones}</select></label>
    <span id="conteo-tit" style="margin-left:12px;color:${nTit===11?'var(--acento)':'var(--alerta)'}">
      Titulares: ${nTit}/11</span>
    <table class="plantilla"><tr><th>XI</th><th>Pos</th><th>Nombre</th><th>Edad</th>
      <th>ATA</th><th>DEF</th><th>VEL</th><th>Cansancio</th><th>Forma</th></tr>${filas}</table>
    <div style="margin-top:12px">
      <button class="btn" ${nTit!==11?'disabled':''} onclick="${accion}">▶ Jugar mi partido</button>
      <button class="btn sec" onclick="renderGrupos()">Ver grupos</button>
      ${JUEGO.bracket?'<button class="btn sec" onclick="renderBracket()">Ver bracket</button>':''}
    </div></div>`;
}

function toggleTitular(id){
  const mi=_equipo(JUEGO.miEquipoId);
  const i=mi.titulares.indexOf(id);
  if(i>=0) mi.titulares.splice(i,1);
  else if(mi.titulares.length<11) mi.titulares.push(id);
  renderDashboard();
}
function cambiarFormacion(f){ const mi=_equipo(JUEGO.miEquipoId); mi.formacion=f; autoAlinear(mi); renderDashboard(); }
function jugarEliminatoria(){
  const mio=_resolverLlaveMia();
  if(mio) renderResultado(mio);
  else simularRestoTorneo(); // el usuario ya no está en la ronda: termina el torneo
}

function renderResultado(p){
  mostrarVista("vista-partido");
  const nombre=id=>_equipo(id).nombre;
  const nombreJug=(eid,jid)=>{ const e=_equipo(eid); const j=e.jugadores.find(x=>x.id===jid); return j?j.nombre:"?"; };
  const v=document.getElementById("vista-partido");
  const gol=p.goleadores.map(g=>`<li>${g.minuto}' ${nombreJug(g.equipoId,g.jugadorId)} (${_equipo(g.equipoId).nombre})</li>`).join("");
  // otros resultados de la última jornada/ronda jugada (grupos y eliminatorias)
  const otros = (JUEGO.ultimaJornada||[])
    .filter(x=> !(x.localId===p.localId && x.visitanteId===p.visitanteId))
    .map(x=>`<div class="mini-res">${nombre(x.localId)} ${x.golesLocal}-${x.golesVisitante} ${nombre(x.visitanteId)}</div>`).join("");
  const continuar = JUEGO.fase==="campeon" ? "renderBracket()" :
    (proximoPartidoDe(JUEGO.miEquipoId) ? "irADashboard()" : "avanzarFase()");
  v.innerHTML=`<div class="panel">
    <h2 class="marcador">${nombre(p.localId)} <b>${p.golesLocal} - ${p.golesVisitante}</b> ${nombre(p.visitanteId)}</h2>
    <ul class="goles">${gol||"<li>Sin goles</li>"}</ul>
    <h3>Otros resultados</h3><div class="otros">${otros||"—"}</div>
    <button class="btn" onclick="${continuar}">Continuar</button></div>`;
}

function renderBracket(){
  mostrarVista("vista-bracket");
  const v=document.getElementById("vista-bracket");
  const nombre=id=>_equipo(id).nombre;
  if(JUEGO.fase==="campeon"){
    const campeonId=JUEGO.bracket.llaves[0]
      ? JUEGO.bracket.llaves[0].ganadorId
      : JUEGO.miEquipoId;
    const campeon = campeonId ? nombre(campeonId) : "—";
    const gane = campeonId===JUEGO.miEquipoId;
    v.innerHTML=`<div class="panel campeon">
      <h1>🏆 ${campeon} campeón</h1>
      <p>${gane?"¡Felicidades, ganaste el Mundial de Clubes!":"Fin del torneo."}</p>
      <button class="btn" onclick="borrarGuardado();renderInicio()">Nuevo torneo</button></div>`;
    return;
  }
  let html=`<div class="panel"><h2>${JUEGO.bracket.nombre}</h2>`;
  JUEGO.bracket.llaves.forEach(l=>{
    const res=l.ganadorId?`(ganó ${nombre(l.ganadorId)})`:"por jugar";
    const mio=(l.localId===JUEGO.miEquipoId||l.visitanteId===JUEGO.miEquipoId)?' class="mio"':'';
    html+=`<div${mio}>${nombre(l.localId)} vs ${nombre(l.visitanteId)} <span style="color:var(--tenue)">${res}</span></div>`;
  });
  html+=`<button class="btn" onclick="irADashboard()">Ir a mi partido</button></div>`;
  v.innerHTML=html;
}
