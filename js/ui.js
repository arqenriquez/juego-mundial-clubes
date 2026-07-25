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
  if(mi && !mi.tactica) mi.tactica={enfoque:"equilibrado",linea:50}; // partidas viejas
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
        <div class="banca-tabs">
          <button class="tab ${_tabBanca==='suplentes'?'on':''}" onclick="mostrarTab('suplentes')">Suplentes</button>
          <button class="tab ${_tabBanca==='tacticas'?'on':''}" onclick="mostrarTab('tacticas')">Tácticas</button>
        </div>
        ${_tabBanca==='tacticas' ?
          _panelTacticas(mi) +
          `<p class="dt-hint">Toca un jugador de la cancha para asignarle un rol.</p>` +
          (function(){const s=_jugadorSel(mi);return s?_panelRol(s,mi.id):'';})()
          :
          `<div class="banca-grid ${llegada?'cascada':''}">${bancaFichas}</div>
           <p class="dt-hint">Toca un jugador para ver su ficha; toca otro para intercambiarlos.</p>
           ${(function(){const s=_jugadorSel(mi);return s?_panelJugador(s,mi.id):'';})()}`}
        <div class="dt-links">
          <button class="btn sec" onclick="renderGrupos()">Ver grupos</button>
          ${JUEGO.bracket?'<button class="btn sec" onclick="renderBracket()">Ver bracket</button>':''}
        </div>
      </div>
    </div></div>`;
}

// Selección transitoria para intercambiar jugadores: {tipo:'slot'|'banca', ref:índice|idJugador}
let _seleccion=null;
// Pestaña activa del panel derecho del dashboard: 'suplentes' | 'tacticas'
let _tabBanca='suplentes';

function mostrarTab(t){ _tabBanca=t; _seleccion=null; renderDashboard(); }

// Panel de tácticas: enfoque (segmentado) + línea defensiva (slider), con descripciones
function _panelTacticas(mi){
  const t=mi.tactica;
  const opE=[["defensivo","Defensivo"],["equilibrado","Equilibrado"],["ofensivo","Ofensivo"]];
  const seg=opE.map(([v,l])=>`<button class="seg-b ${t.enfoque===v?'on':''}" onclick="setEnfoque('${v}')">${l}</button>`).join("");
  return `<div class="tacticas">
    <div class="tac-campo"><label class="tac-lbl">Enfoque</label>
      <div class="seg">${seg}</div></div>
    <p class="tac-desc">${_descEnfoque(t.enfoque)}</p>
    <div class="tac-campo"><label class="tac-lbl">Línea defensiva</label>
      <div class="tac-slider">
        <input type="range" min="0" max="100" value="${t.linea}"
          oninput="setLinea(this.value)" onchange="guardarJuego(JUEGO)">
        <span id="tac-linea-val" class="tac-val">${t.linea}</span>
      </div></div>
    <p class="tac-desc" id="tac-linea-desc">${_descLinea(t.linea)}</p>
  </div>`;
}
function _descEnfoque(e){
  return e==="ofensivo" ? "Busca el gol arriesgando: más ataque, pero más expuesto atrás."
    : e==="defensivo" ? "Primero no encajar: más solidez atrás, menos peligro arriba."
    : "Reparte el esfuerzo entre atacar y defender.";
}
function _descLinea(l){
  l=+l;
  return l>=65 ? "Línea alta: presionas arriba y atacas más, pero te exponen a la espalda."
    : l<=35 ? "Línea baja: te repliegas, concedes menos pero generas menos."
    : "Línea media: equilibrio entre presión y repliegue.";
}
function setEnfoque(e){ const mi=_equipo(JUEGO.miEquipoId); mi.tactica.enfoque=e; guardarJuego(JUEGO); renderDashboard(); }
function setLinea(v){
  const mi=_equipo(JUEGO.miEquipoId); mi.tactica.linea=+v;
  const val=document.getElementById("tac-linea-val"); if(val) val.textContent=v;
  const d=document.getElementById("tac-linea-desc"); if(d) d.textContent=_descLinea(v);
}

// Valoración (OVR) ponderada por posición, y apellido (última palabra del nombre)
function _ovr(j){
  const pase=j.pase==null?j.ataque:j.pase, fis=j.fisico==null?60:j.fisico, por=j.portero==null?j.defensa:j.portero;
  if(j.posicion==="POR") return Math.round(por*0.75 + j.defensa*0.25);
  if(j.posicion==="DEF") return Math.round(j.defensa*0.45 + j.velocidad*0.20 + fis*0.20 + pase*0.15);
  if(j.posicion==="DEL") return Math.round(j.ataque*0.50 + j.velocidad*0.25 + pase*0.25);
  return Math.round(pase*0.35 + j.ataque*0.25 + j.defensa*0.20 + j.velocidad*0.20); // MED
}
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

// Un clic selecciona (y muestra su ficha); el segundo intercambia.
function seleccionar(tipo, ref){
  const mi=_equipo(JUEGO.miEquipoId);
  const mismo = _seleccion && _seleccion.tipo===tipo && String(_seleccion.ref)===String(ref);
  // En la pestaña Tácticas seleccionar SOLO muestra la ficha de rol (no intercambia)
  if(_tabBanca==='tacticas'){
    _seleccion = mismo ? null : {tipo, ref};
    renderDashboard(); return;
  }
  if(mismo){ _seleccion=null; renderDashboard(); return; }             // mismo -> deselecciona
  if(!_seleccion){ _seleccion={tipo, ref}; renderDashboard(); return; } // primero -> selecciona
  if(_seleccion.tipo==='banca' && tipo==='banca'){
    _seleccion={tipo, ref}; renderDashboard(); return;       // dos suplentes -> solo muestra la ficha del nuevo
  }
  _intercambiar(mi, _seleccion, {tipo, ref});                // titular<->suplente o entre titulares
  _seleccion=null;
  guardarJuego(JUEGO);
  renderDashboard();
}

// Panel de rol del jugador (pestaña Tácticas): rol actual + descripción + opciones por posición
function _panelRol(j, equipoId){
  const roles = ROLES[j.posicion] || {};
  const actual = (j.rol && roles[j.rol]) ? j.rol : ROL_DEFAULT[j.posicion];
  const r = roles[actual] || {nombre:"—", desc:""};
  const btns = Object.entries(roles).map(([k,v])=>
    `<button class="rol-b ${k===actual?'on':''}" onclick="setRol('${j.id}','${k}')">${v.nombre}</button>`).join("");
  return `<div class="jugador-info rol-card">
    <div class="ji-cab">
      <span class="ji-cara pos-${j.posicion.toLowerCase()}">${avatarHTML(j, equipoId, 44)}</span>
      <span class="ji-ovr">${_ovr(j)}</span>
      <div class="ji-id"><b class="ji-nom">${_apellido(j.nombre)}</b>
        <span class="ji-pos">${_posLarga(j.posicion)}</span></div>
    </div>
    <div class="rol-titulo">Rol</div>
    <div class="rol-nombre">${r.nombre}</div>
    <p class="tac-desc rol-desc">${r.desc}</p>
    <div class="rol-opts">${btns}</div>
  </div>`;
}
function setRol(idJugador, rol){
  const mi=_equipo(JUEGO.miEquipoId);
  const j=mi.jugadores.find(x=>x.id===idJugador);
  if(j) j.rol=rol;
  guardarJuego(JUEGO);
  renderDashboard();
}

// Jugador actualmente seleccionado (de la cancha o del banquillo), o null
function _jugadorSel(mi){
  if(!_seleccion) return null;
  const id = _seleccion.tipo==='slot' ? mi.titulares[_seleccion.ref] : _seleccion.ref;
  return mi.jugadores.find(j=>j.id===id) || null;
}

// Ficha de información detallada del jugador (estilo tarjeta de juego)
function _colorStat(v){ return v>=82?'var(--acento)':v>=68?'var(--texto)':v>=55?'var(--amarillo)':'var(--alerta)'; }
function _statFila(lbl,v){ return `<div class="ji-stat"><span>${lbl}</span><b style="color:${_colorStat(v)}">${v}</b></div>`; }
function _posLarga(p){ return {POR:"Portero",DEF:"Defensa",MED:"Mediocampista",DEL:"Delantero"}[p]||p; }
function _panelJugador(j, equipoId){
  const en=100-j.cansancio;
  return `<div class="jugador-info">
    <div class="ji-cab">
      <span class="ji-cara pos-${j.posicion.toLowerCase()}">${avatarHTML(j, equipoId, 52)}</span>
      <span class="ji-ovr">${_ovr(j)}</span>
      <div class="ji-id"><b class="ji-nom">${_apellido(j.nombre)}</b>
        <span class="ji-pos">${_posLarga(j.posicion)}</span></div>
    </div>
    <div class="ji-cols">
      <div class="ji-col">
        <div class="ji-dato"><span>Nombre</span><b>${j.nombre}</b></div>
        <div class="ji-dato"><span>Edad</span><b>${j.edad}</b></div>
        <div class="ji-dato"><span>Estatura</span><b>${j.estatura} cm</b></div>
        <div class="ji-dato"><span>Pie</span><b>${j.pieDominante}</b></div>
        <div class="ji-dato"><span>Energía</span><b>${en}%</b></div>
      </div>
      <div class="ji-col">
        ${_statFila("Velocidad", j.velocidad)}
        ${_statFila("Ataque", j.ataque)}
        ${_statFila("Pase", j.pase)}
        ${_statFila("Defensa", j.defensa)}
        ${_statFila("Físico", j.fisico)}
        ${_statFila("Portero", j.portero)}
      </div>
    </div>
  </div>`;
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
