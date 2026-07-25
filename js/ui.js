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
    card.style.setProperty("--i", i); // escalona la entrada de las tarjetas
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
  // `llegada` distingue entrar al dashboard de re-renderizarlo (marcar titular, cambiar
  // formación): las animaciones de cascada solo deben correr al llegar.
  const llegada=mostrarVista("vista-dashboard");
  const mi=_equipo(JUEGO.miEquipoId);
  if(estoyEliminado()){
    const vElim=document.getElementById("vista-dashboard");
    vElim.innerHTML=`<div class="panel">
      <h2>${mi.nombre}</h2>
      <p>Tu equipo quedó <b>eliminado</b> del torneo. Puedes simular el resto para ver quién se corona campeón.</p>
      <div style="margin-top:12px">
        <button class="btn" onclick="conCortina('Simulando el resto del torneo…', simularRestoTorneo)">▶ Simular resto del torneo</button>
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
  const slots = FORMACION_SLOTS[mi.formacion];
  const enCancha = new Set(mi.titulares);
  const banca = mi.jugadores.filter(j=>!enCancha.has(j.id));
  const tokens = slots.map((s,i)=>{
    const j = mi.jugadores.find(x=>x.id===mi.titulares[i]);
    return _ficha(j, mi.id, 'slot', i, `left:${s.x}%;top:${s.y}%;`, i);
  }).join("");
  const bancaFichas = banca.map((j,i)=> _ficha(j, mi.id, 'banca', j.id, '', i)).join("");
  const opciones=Object.keys(FORMACIONES).map(f=>
    `<option ${f===mi.formacion?'selected':''}>${f}</option>`).join("");
  const enGrupos = JUEGO.fase==="grupos";
  const txtCortina = enGrupos
    ? `Simulando jornada ${JUEGO.jornadaActual}…`
    : `Simulando ${JUEGO.bracket ? JUEGO.bracket.nombre : "la ronda"}…`;
  const accion = `conCortina('${txtCortina}', ${enGrupos?"jugarJornadaDeMiPartido":"jugarEliminatoria"})`;
  const faseTxt = enGrupos ? `Grupos · Jornada ${JUEGO.jornadaActual}/3`
    : (JUEGO.bracket?JUEGO.bracket.nombre:JUEGO.fase);
  v.innerHTML=`<div class="panel dt">
    <div class="dt-cab">
      <div><h2>${mi.nombre}</h2><p class="dt-sub">vs <b>${rival?rival.nombre:"—"}</b> · ${faseTxt}</p></div>
      <div class="dt-ctrl">
        <label class="dt-form">Formación
          <select onchange="cambiarFormacion(this.value)">${opciones}</select></label>
        <button class="btn" onclick="${accion}">▶ Jugar mi partido</button>
      </div>
    </div>
    <div class="dt-cuerpo">
      <div class="cancha ${llegada?'cascada':''}">${tokens}</div>
      <div class="banca">
        <h3>Suplentes</h3>
        <div class="banca-grid ${llegada?'cascada':''}">${bancaFichas}</div>
        <p class="dt-hint">Toca un jugador y luego otro para intercambiarlos.</p>
        <div class="dt-links">
          <button class="btn sec" onclick="renderGrupos()">Ver grupos</button>
          ${JUEGO.bracket?'<button class="btn sec" onclick="renderBracket()">Ver bracket</button>':''}
        </div>
      </div>
    </div></div>`;
}

// Selección transitoria para intercambiar jugadores: {tipo:'slot'|'banca', ref:índice|idJugador}
let _seleccion=null;

// Valoración promedio (OVR) y apellido (última palabra del nombre)
function _ovr(j){ return Math.round((j.ataque+j.defensa+j.velocidad)/3); }
function _apellido(nombre){ const p=String(nombre).trim().split(/\s+/); return p[p.length-1]; }

// Ficha de jugador: cara + OVR + apellido + barra de energía. Reutilizada en cancha y banca.
function _ficha(j, equipoId, tipo, ref, estilo, i){
  const sel = _seleccion && _seleccion.tipo===tipo && String(_seleccion.ref)===String(ref);
  const en = Math.max(0, 100 - j.cansancio); // energía = 100 - cansancio
  const col = en>=60 ? 'var(--acento)' : en>=30 ? 'var(--amarillo)' : 'var(--alerta)';
  const refArg = tipo==='slot' ? ref : `'${ref}'`;
  return `<button class="ficha pos-${j.posicion.toLowerCase()} ${sel?'sel':''}" `+
    `style="${estilo||''}${i!=null?`--i:${i};`:''}" onclick="seleccionar('${tipo}',${refArg})">`+
    `<span class="ficha-cara">${avatarHTML(j, equipoId, 46)}<b class="ficha-ovr">${_ovr(j)}</b></span>`+
    `<span class="ficha-nom">${_apellido(j.nombre)}</span>`+
    `<span class="ficha-stam"><i style="width:${en}%;background:${col}"></i></span>`+
    `</button>`;
}

// Un clic selecciona; el segundo intercambia (o deselecciona si es el mismo).
function seleccionar(tipo, ref){
  const mi=_equipo(JUEGO.miEquipoId);
  if(_seleccion && _seleccion.tipo===tipo && String(_seleccion.ref)===String(ref)){
    _seleccion=null; renderDashboard(); return;
  }
  if(!_seleccion){ _seleccion={tipo, ref}; renderDashboard(); return; }
  _intercambiar(mi, _seleccion, {tipo, ref});
  _seleccion=null;
  guardarJuego(JUEGO);
  renderDashboard();
}

function _intercambiar(mi, a, b){
  if(a.tipo==='slot' && b.tipo==='slot'){
    const t=mi.titulares[a.ref]; mi.titulares[a.ref]=mi.titulares[b.ref]; mi.titulares[b.ref]=t;
  } else if(a.tipo==='slot' && b.tipo==='banca'){
    mi.titulares[a.ref]=b.ref;               // el desplazado sale a la banca automáticamente
  } else if(a.tipo==='banca' && b.tipo==='slot'){
    mi.titulares[b.ref]=a.ref;
  }
  // banca + banca: sin efecto (ambos fuera de la cancha)
}

function cambiarFormacion(f){ const mi=_equipo(JUEGO.miEquipoId); mi.formacion=f; autoAlinear(mi); _seleccion=null; renderDashboard(); }
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
  const gol=p.goleadores.map((g,i)=>`<li style="--i:${i}">${g.minuto}' ${nombreJug(g.equipoId,g.jugadorId)} (${_equipo(g.equipoId).nombre})</li>`).join("");
  // otros resultados de la última jornada/ronda jugada (grupos y eliminatorias)
  const otros = (JUEGO.ultimaJornada||[])
    .filter(x=> !(x.localId===p.localId && x.visitanteId===p.visitanteId))
    .map((x,i)=>`<div class="mini-res" style="--i:${i}">${nombre(x.localId)} ${x.golesLocal}-${x.golesVisitante} ${nombre(x.visitanteId)}</div>`).join("");
  const continuar = JUEGO.fase==="campeon" ? "renderBracket()" :
    (proximoPartidoDe(JUEGO.miEquipoId) ? "irADashboard()" : "avanzarFase()");
  v.innerHTML=`<div class="panel">
    <h2 class="marcador">${nombre(p.localId)} <b><span id="m-local">0</span> - <span id="m-visita">0</span></b> ${nombre(p.visitanteId)}</h2>
    <ul class="goles">${gol||"<li>Sin goles</li>"}</ul>
    <h3>Otros resultados</h3><div class="otros">${otros||"—"}</div>
    <button class="btn" onclick="${continuar}">Continuar</button></div>`;
  // se retrasa el conteo para que no quede oculto tras la cortinilla que se desvanece
  const contar=()=>{
    contarHasta(v.querySelector("#m-local"),  p.golesLocal,     650);
    contarHasta(v.querySelector("#m-visita"), p.golesVisitante, 650);
  };
  if(animacionReducida()) contar(); else setTimeout(contar, 260);
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
