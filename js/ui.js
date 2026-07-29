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
  if(_modoPlantilla){ renderPlantilla(mi); return; }
  if(_modoFichajes){ renderFichajes(mi); return; }
  if(_modoGestion){ renderGestionEquipo(mi, llegada); return; }
  const rival=(function(){
    const p = JUEGO.fase==="grupos" ? proximoPartidoDe(mi.id)
      : _partidosRondaActual().find(x=>x.localId===mi.id||x.visitanteId===mi.id);
    if(!p) return null;
    const rid = p.localId===mi.id ? p.visitanteId : p.localId;
    return _equipo(rid);
  })();
  const v=document.getElementById("vista-dashboard");
  const enCancha = new Set(mi.titulares);
  const enGrupos = JUEGO.fase==="grupos";
  const faseTxt = enGrupos ? `Grupos · Jornada ${JUEGO.jornadaActual}/3`
    : (JUEGO.bracket?JUEGO.bracket.nombre:JUEGO.fase);
  const promedio=(atributo)=>rival ? Math.round(rival.jugadores.reduce((s,j)=>s+(j[atributo]||0),0)/rival.jugadores.length) : "—";
  const grlRival=rival ? _grlEquipo(rival) : null;
  const energia=Math.round(mi.jugadores.filter(j=>enCancha.has(j.id))
    .reduce((s,j)=>s+(100-j.cansancio),0)/mi.titulares.length);
  const promedioMi=(atributo)=>Math.round(mi.jugadores.reduce((s,j)=>s+(j[atributo]||0),0)/mi.jugadores.length);
  const grlMi=_grlEquipo(mi);
  v.innerHTML=`<div class="dt match-hub ${_animarSeccion?'screen-enter':''}">
    <div class="match-topbar">
      <div class="match-identidad"><span class="match-escudo">⚽</span><div><h2>${mi.nombre}</h2><p>${faseTxt}</p></div></div>
      <div class="match-actions"><button class="btn sec transfer-shortcut" onclick="renderGrupos()">Ver grupos</button>
        <button class="btn play-match" onclick="elegirModoPartido()">Jugar mi partido <span>▶</span></button></div>
    </div>
    <div class="match-grid">
      <div class="next-column"><section class="next-match-card">
        <div class="card-heading"><span>Próximo partido</span><span>››</span></div>
        <div class="next-match-body">
          <p class="next-phase">${faseTxt}</p>
          <p class="next-label">Rival</p>
          <h3>${rival?rival.nombre:"Por definir"}</h3>
          <div class="rival-stats">
            <span>DEF: <b>${promedio("defensa")}</b></span>
            <span>MED: <b>${promedio("pase")}</b></span>
            <span>ATA: <b>${promedio("ataque")}</b></span>
          </div>
          ${grlRival==null?"":_grlHTML(grlRival)}
          <p class="next-note">Prepara tu once y táctica antes del silbatazo inicial.</p>
        </div>
      </section>
      <button class="transfer-card squad-dashboard-card" onclick="abrirPlantilla()"><span class="card-heading"><b>Plantilla</b><i>››</i></span><strong>Jugadores <em>♟</em></strong><small>${mi.jugadores.length} jugadores disponibles</small></button></div>
      <div class="team-column">
        <button class="team-management team-management-card" onclick="irAGestionEquipo()" aria-label="Abrir gestión de equipo">
          <div class="card-heading"><span>Gestión de equipo</span><span>››</span></div>
          <div class="team-management-body">
            <i class="management-mark">⚽</i><div class="energy-bar"><span style="width:${energia}%"></span></div>
            <p><b>${mi.formacion}</b> · Energía: ${energia}%</p><div class="rival-stats"><span>DEF: <b>${promedioMi("defensa")}</b></span>
              <span>MED: <b>${promedioMi("pase")}</b></span><span>ATA: <b>${promedioMi("ataque")}</b></span></div>
            ${_grlHTML(grlMi)}<p class="team-card-hint">Toca para ajustar alineación y tácticas</p>
          </div>
        </button>
        <div class="transfer-cards"><button class="transfer-card incoming" onclick="abrirFichajes('fichar')"><span class="card-heading"><b>Fichar</b><i>››</i></span><strong>Llegadas <em>↙</em></strong><small>Presupuesto: $${mi.presupuesto}M</small></button>
          <button class="transfer-card outgoing" onclick="abrirFichajes('vender')"><span class="card-heading"><b>Vender</b><i>››</i></span><strong>Salidas <em>↗</em></strong><small>Gestiona las bajas de tu plantilla</small></button></div>
      </div>
    </div></div>`;
  _animarSeccion=false;
}

function irAGestionEquipo(){ _modoPlantilla=false; _modoFichajes=false; _modoGestion=true; _animarSeccion=true; _seleccion=null; _tabBanca='suplentes'; renderDashboard(); }
function volverAlMenuPartido(){ _modoGestion=false; _animarSeccion=true; _seleccion=null; renderDashboard(); }

function abrirFichajes(seccion){ _modoPlantilla=false; _seccionFichajes=seccion||"fichar"; _modoFichajes=true; _animarSeccion=true; _seleccion=null; renderDashboard(); }
function volverDeFichajes(){ _modoFichajes=false; _animarSeccion=true; _busquedaFichajes=false; renderDashboard(); }
function abrirPlantilla(){ _modoPlantilla=true; _animarSeccion=true; _seleccion=null; renderDashboard(); }
function volverDePlantilla(){ _modoPlantilla=false; _animarSeccion=true; renderDashboard(); }
function actualizarFiltrosFichajes(){
  _filtrosFichajes={nombre:document.getElementById("f-nombre").value, posicion:document.getElementById("f-pos").value,
    edad:document.getElementById("f-edad").value, valor:document.getElementById("f-valor").value};
}
function buscarFichajes(){ actualizarFiltrosFichajes(); _busquedaFichajes=true; renderFichajes(_equipo(JUEGO.miEquipoId)); return false; }
function restablecerFiltros(){ _filtrosFichajes={nombre:"",posicion:"TODAS",edad:"TODAS",valor:"TODOS"}; _busquedaFichajes=false; renderFichajes(_equipo(JUEGO.miEquipoId)); }
function confirmarFichaje(origenId,jugadorId){
  const mi=_equipo(JUEGO.miEquipoId), origen=_equipo(origenId);
  const jugador=origen && origen.jugadores.find(j=>j.id===jugadorId);
  if(!jugador) return;
  const valor=valorMercado(jugador);
  if(!confirm(`¿Fichar a ${jugador.nombre} por $${valor}M?`)) return;
  const r=ficharDelMercado(mi,origen,jugadorId);
  if(!r.ok){ alert(r.motivo); return; }
  autoAlinear(origen); guardarJuego(JUEGO); renderFichajes(mi);
}
function renderFichajes(mi){
  mostrarVista("vista-dashboard");
  const v=document.getElementById("vista-dashboard"), f=_filtrosFichajes, esVenta=_seccionFichajes==="vender";
  const opcionesPos=["TODAS","POR","LI","DFC","LD","MCD","MC","MCO","EI","ED","DC"]
    .map(p=>`<option value="${p}" ${f.posicion===p?'selected':''}>${p==="TODAS"?"Cualquier posición":p}</option>`).join("");
  const llegadas=(mi.fichajes||[]).slice().reverse().map(x=>`<li><b>${x.nombre}</b><span>${x.desde} · GRL ${x.grl} · $${x.valor}M</span></li>`).join("");
  let resultados="";
  if(!esVenta && _busquedaFichajes){
    const lista=jugadoresEnMercado(JUEGO.equipos,mi.id,f).slice(0,40);
    resultados=lista.length ? `<div class="mercado-lista">${lista.map(x=>`<article class="mercado-jugador">
      <span class="mercado-grl">${x.grl}</span><div><b>${x.jugador.nombre}</b><small>${x.equipo.nombre} · ${x.jugador.posiciones.join(" / ")} · ${x.jugador.edad} años</small></div>
      <strong>$${x.valor}M</strong><button class="btn" ${x.valor>mi.presupuesto?'disabled':''} onclick="confirmarFichaje('${x.equipo.id}','${x.jugador.id}')">Fichar</button>
    </article>`).join("")}</div>` : `<p class="mercado-vacio">No hay jugadores que coincidan con esos filtros.</p>`;
  }
  const ofertasVenta=(mi.ofertasVenta||[]).map((o,i)=>`<article class="oferta-recibida"><span class="mercado-grl">${o.grl}</span><div><b>${o.nombre}</b><small>${o.posicion} · Oferta de ${o.equipoNombre}</small></div><strong>$${o.monto}M</strong><div><button class="btn" onclick="aceptarOfertaRecibida(${i})">Aceptar</button><button class="oferta-rechazar" onclick="rechazarOfertaRecibida(${i})">Rechazar</button></div></article>`).join("");
  const transferibles=(mi.transferibles||[]).map(id=>mi.jugadores.find(j=>j.id===id)).filter(Boolean)
    .map(j=>`<li><b>${j.nombre}</b><span>${j.posicion} · GRL ${_ovr(j)} · Valor $${valorMercado(j)}M</span></li>`).join("");
  const contenido=esVenta ? `<section class="ventas-inbox"><h3>Ofertas recibidas (${(mi.ofertasVenta||[]).length})</h3>${ofertasVenta?`<div class="ofertas-recibidas">${ofertasVenta}</div>`:`<p class="mercado-vacio">Aún no llegan ofertas. Juega el próximo partido para renovar el mercado.</p>`}
      <section class="llegadas transferibles-list"><h3>Transferibles (${(mi.transferibles||[]).length})</h3><ul>${transferibles||"<li class='sin-llegadas'>Marca jugadores como transferibles desde su reporte en Plantilla.</li>"}</ul></section></section>` :
    `<section class="filtros-mercado"><h3>Buscar jugadores</h3><form onsubmit="return buscarFichajes()">
      <label>Nombre<input id="f-nombre" value="${f.nombre}" placeholder="Nombre del jugador"></label><label>Posición<select id="f-pos">${opcionesPos}</select></label>
      <label>Edad<select id="f-edad"><option value="TODAS">Cualquier edad</option><option value="JOVEN" ${f.edad==='JOVEN'?'selected':''}>21 o menos</option><option value="PRIME" ${f.edad==='PRIME'?'selected':''}>22 - 29</option><option value="VETERANO" ${f.edad==='VETERANO'?'selected':''}>30 o más</option></select></label>
      <label>Valor<select id="f-valor"><option value="TODOS">Cualquier valor</option><option value="30" ${f.valor==='30'?'selected':''}>Hasta $30M</option><option value="60" ${f.valor==='60'?'selected':''}>Hasta $60M</option><option value="100" ${f.valor==='100'?'selected':''}>Hasta $100M</option></select></label>
      <div class="filtros-acciones"><button type="button" class="btn sec" onclick="restablecerFiltros()">Restablecer</button><button class="btn" type="submit">Confirmar filtros</button></div></form></section>
    ${resultados}<section class="llegadas"><h3>Llegadas (${(mi.fichajes||[]).length})</h3><ul>${llegadas||"<li class='sin-llegadas'>Aún no hay fichajes confirmados.</li>"}</ul></section>`;
  v.innerHTML=`<div class="panel transfer-screen ${_animarSeccion?'screen-enter':''}"><div class="transfer-head"><div><button class="btn sec back-menu" onclick="volverDeFichajes()">← Volver al menú</button>
    <h2>${esVenta?"Ventas":"Fichajes"}</h2><p>Presupuesto disponible: <b>$${mi.presupuesto}M</b></p></div><button class="btn sec" onclick="irAGestionEquipo()">Gestionar equipo</button></div>
    <div class="transfer-tabs"><button class="transfer-tab ${!esVenta?'on':''}" onclick="abrirFichajes('fichar')"><b>Fichar jugadores</b><span>↙</span></button><button class="transfer-tab ${esVenta?'on':''}" onclick="abrirFichajes('vender')"><b>Ventas</b><span>↗</span></button></div>${contenido}</div>`;
  _animarSeccion=false;
}

function _potencialJugador(j){
  const ovr=_ovr(j), bono=j.edad<=19?14:j.edad<=21?11:j.edad<=23?8:j.edad<=26?4:1;
  return Math.min(95,ovr+bono);
}
function ordenarPlantilla(campo){
  _ordenPlantilla.desc=_ordenPlantilla.campo===campo ? !_ordenPlantilla.desc : campo!=="nombre" && campo!=="posicion";
  _ordenPlantilla.campo=campo;
  renderPlantilla(_equipo(JUEGO.miEquipoId));
}
function _etiquetaOrden(campo,texto){
  const activa=_ordenPlantilla.campo===campo;
  return `<button class="squad-sort ${activa?'on':''}" onclick="ordenarPlantilla('${campo}')">${texto}<i>${activa?(_ordenPlantilla.desc?'↓':'↑'):''}</i></button>`;
}
function seleccionarJugadorPlantilla(id){ if(_jugadorPlantillaId!==id) _ofertasVenta=null; _jugadorPlantillaId=id; renderPlantilla(_equipo(JUEGO.miEquipoId)); }
function alternarTransferible(jugadorId){
  const mi=_equipo(JUEGO.miEquipoId), i=mi.transferibles.indexOf(jugadorId);
  if(i>=0) mi.transferibles.splice(i,1); else mi.transferibles.push(jugadorId);
  guardarJuego(JUEGO); renderPlantilla(mi);
}
function aceptarOfertaRecibida(indice){
  const mi=_equipo(JUEGO.miEquipoId), oferta=mi.ofertasVenta[indice], comprador=oferta&&_equipo(oferta.equipoId);
  if(!oferta) return;
  const r=resolverVenta(mi,comprador,oferta.jugadorId,oferta,JUEGO.rng);
  if(!r.ok){ alert(r.motivo); return; }
  mi.transferibles=mi.transferibles.filter(id=>id!==oferta.jugadorId);
  mi.ofertasVenta=mi.ofertasVenta.filter(o=>o.jugadorId!==oferta.jugadorId);
  autoAlinear(mi); autoAlinear(comprador); guardarJuego(JUEGO); alert(`Venta confirmada: ${r.jugador.nombre} se une a ${comprador.nombre} por $${r.monto}M.`); renderFichajes(mi);
}
function rechazarOfertaRecibida(indice){ const mi=_equipo(JUEGO.miEquipoId); mi.ofertasVenta.splice(indice,1); guardarJuego(JUEGO); renderFichajes(mi); }
function _radarPlantilla(j){
  const datos=[['Ataque',j.ataque],['Pase',j.pase],['Regate',j.regate==null?j.ataque:j.regate],['Colocación',j.colocacion==null?j.ataque:j.colocacion],
    ['Velocidad',j.velocidad],['Defensa',j.defensa],['Físico',j.fisico==null?60:j.fisico],['Portero',j.portero==null?j.defensa:j.portero]];
  const punto=(radio,i)=>{const a=(-90+i*45)*Math.PI/180;return [110+Math.cos(a)*radio,110+Math.sin(a)*radio];};
  const poligono=radio=>datos.map((_,i)=>punto(radio,i).join(',')).join(' ');
  const area=datos.map((d,i)=>punto(22+Math.max(0,Math.min(100,d[1]))*.62,i).join(',')).join(' ');
  const ejes=datos.map((_,i)=>{const p=punto(84,i);return `<line x1="110" y1="110" x2="${p[0]}" y2="${p[1]}"/>`;}).join('');
  const etiquetas=datos.map((d,i)=>{const p=punto(101,i);return `<text x="${p[0]}" y="${p[1]}" text-anchor="middle" dominant-baseline="middle">${d[0]}</text>`;}).join('');
  return `<div class="radar-wrap"><svg class="radar-stats" viewBox="0 0 220 220" role="img" aria-label="Radar de atributos de ${j.nombre}">
    <polygon class="radar-ring" points="${poligono(84)}"/><polygon class="radar-ring inner" points="${poligono(53)}"/>${ejes}<polygon class="radar-area" points="${area}"/>${etiquetas}</svg></div>`;
}
function renderPlantilla(mi){
  mostrarVista("vista-dashboard");
  const v=document.getElementById("vista-dashboard");
  const campo=_ordenPlantilla.campo, factor=_ordenPlantilla.desc?-1:1;
  const valor=j=>campo==="nombre"?j.nombre:campo==="posicion"?j.posicion:campo==="edad"?j.edad:campo==="pot"?_potencialJugador(j):_ovr(j);
  const jugadores=mi.jugadores.slice().sort((a,b)=>typeof valor(a)==="string" ? factor*valor(a).localeCompare(valor(b),"es") : factor*(valor(a)-valor(b)));
  const filas=jugadores.map(j=>{const ovr=_ovr(j), pot=_potencialJugador(j);
    return `<button class="squad-row ${_jugadorPlantillaId===j.id?'squad-selected':''}" onclick="seleccionarJugadorPlantilla('${j.id}')"><span class="squad-pos">${j.posicion}</span>${avatarHTML(j,mi.id,34)}
      <b>${j.nombre}</b><span>${j.edad}</span><strong class="squad-ovr">${ovr}</strong><span class="squad-pot">${pot}</span></button>`;}).join("");
  const elegido=mi.jugadores.find(j=>j.id===_jugadorPlantillaId);
  const transferible=elegido && mi.transferibles.includes(elegido.id);
  const reporte=elegido ? `<article class="squad-report"><div class="report-title">Reporte de jugador <button onclick="seleccionarJugadorPlantilla(null)" aria-label="Cerrar reporte">×</button></div>
    <div class="report-body"><div class="report-avatar">${avatarHTML(elegido,mi.id,104)}</div><div class="report-main"><h3>${elegido.nombre}</h3><p>${mi.nombre} · ${elegido.nacionalidad||"Internacional"} · ${(elegido.posiciones||[elegido.posicion]).join(" / ")}</p>
      <div class="report-datos"><span><b>GRL</b>${_ovr(elegido)}</span><span><b>POS</b>${elegido.posicion}</span><span><b>EDAD</b>${elegido.edad}</span><span><b>VALOR</b>$${valorMercado(elegido)}M</span><span><b>POT</b>${_potencialJugador(elegido)}</span></div></div>
      ${_radarPlantilla(elegido)}</div><div class="report-actions"><button class="btn ${transferible?'sec':''}" onclick="alternarTransferible('${elegido.id}')">${transferible?'Quitar de transferibles':'Añadir a transferibles'}</button><span>${transferible?'Este jugador tendrá más opciones de recibir ofertas tras el próximo partido.':'Márcalo para aumentar las ofertas que recibe.'}</span></div></article>` : "";
  v.innerHTML=`<div class="panel squad-screen ${_animarSeccion?'screen-enter':''}"><div class="transfer-head"><div><button class="btn sec back-menu" onclick="volverDePlantilla()">← Volver al menú</button>
    <h2>Plantilla</h2><p>${mi.nombre} · ${mi.jugadores.length} jugadores</p></div><button class="btn sec" onclick="irAGestionEquipo()">Gestionar equipo</button></div>
    <div class="squad-table"><div class="squad-row squad-head">${_etiquetaOrden("posicion","Pos")}<span></span>${_etiquetaOrden("nombre","Nombre")}${_etiquetaOrden("edad","Edad")}${_etiquetaOrden("grl","GRL")}${_etiquetaOrden("pot","POT")}</div>${filas}</div>${reporte}
    <p class="squad-note">GRL: valoración actual · POT: potencial estimado según edad y nivel actual.</p></div>`;
  _animarSeccion=false;
}

function renderGestionEquipo(mi, llegada){
  const v=document.getElementById("vista-dashboard"), slots=FORMACION_SLOTS[mi.formacion];
  const enCancha=new Set(mi.titulares), banca=mi.jugadores.filter(j=>!enCancha.has(j.id));
  const tokens=slots.map((s,i)=>{ const j=mi.jugadores.find(x=>x.id===mi.titulares[i]);
    return _ficha(j,mi.id,'slot',i,`left:${s.x}%;top:${s.y}%;`,i,s.pos); }).join("");
  const bancaFichas=banca.map((j,i)=>_ficha(j,mi.id,'banca',j.id,'',i)).join("");
  const opciones=Object.keys(FORMACIONES).map(f=>`<option ${f===mi.formacion?'selected':''}>${f}</option>`).join("");
  v.innerHTML=`<div class="panel dt gestion-equipo ${_animarSeccion?'screen-enter':''}">
    <div class="dt-cab"><div><button class="btn sec back-menu" onclick="volverAlMenuPartido()">← Volver al menú</button>
      <h2>Gestión de equipo</h2><p class="dt-sub">Alineación, suplentes y tácticas de ${mi.nombre}</p></div>
      <div class="dt-ctrl"><label class="dt-form">Formación <select onchange="cambiarFormacion(this.value)">${opciones}</select></label>
        <div class="dt-auto"><button class="btn sec" onclick="alinearMejorEquipo()">Mejor equipo</button>
          <button class="btn sec" onclick="alinearMasEnergia()">Más energía</button></div>
        <button class="btn" onclick="elegirModoPartido()">▶ Jugar mi partido</button></div></div>
    <div class="dt-cuerpo"><div class="cancha ${llegada?'cascada':''}">${tokens}</div><div class="banca">
      <div class="banca-tabs"><button class="tab ${_tabBanca==='suplentes'?'on':''}" onclick="mostrarTab('suplentes')">Suplentes</button>
        <button class="tab ${_tabBanca==='tacticas'?'on':''}" onclick="mostrarTab('tacticas')">Tácticas</button></div>
      <div class="banca-content ${_animarPanel?'tab-enter':''}">${_tabBanca==='tacticas' ? _panelTacticas(mi)+`<p class="dt-hint">Toca un jugador de la cancha para asignarle un rol.</p>`+
        (function(){const s=_jugadorSel(mi);return s?_panelRol(s,mi.id):'';})() :
        `<div class="banca-grid ${llegada?'cascada':''}">${bancaFichas}</div><p class="dt-hint">Toca un jugador para ver su ficha; toca otro para intercambiarlos.</p>`+
        (function(){const s=_jugadorSel(mi);return s?_panelJugador(s,mi.id):'';})()}</div>
      <div class="dt-links">${JUEGO.bracket?'<button class="btn sec" onclick="renderBracket()">Ver bracket</button>':''}</div>
    </div></div></div>`;
  _reproducirMovimientoXI();
  _animarSeccion=false; _animarPanel=false;
}

// Selección transitoria para intercambiar jugadores: {tipo:'slot'|'banca', ref:índice|idJugador}
let _seleccion=null;
// Pestaña activa del panel derecho del dashboard: 'suplentes' | 'tacticas'
let _tabBanca='suplentes';
let _modoGestion=false;
let _modoFichajes=false;
let _modoPlantilla=false;
let _busquedaFichajes=false;
let _filtrosFichajes={nombre:"",posicion:"TODAS",edad:"TODAS",valor:"TODOS"};
let _seccionFichajes="fichar";
let _ordenPlantilla={campo:"grl",desc:true};
let _jugadorPlantillaId=null;
let _ofertasVenta=null;
let _movimientosXI=null;
let _animarSeccion=false;
let _animarPanel=false;

function _capturarMovimientoXI(){
  if(!_modoGestion) return;
  _movimientosXI={};
  document.querySelectorAll("#vista-dashboard .cancha .ficha[data-jugador-id]").forEach(el=>{
    const r=el.getBoundingClientRect(); _movimientosXI[el.dataset.jugadorId]={left:r.left,top:r.top};
  });
}
function _reproducirMovimientoXI(){
  const antes=_movimientosXI; _movimientosXI=null;
  if(!antes || !Object.keys(antes).length) return;
  requestAnimationFrame(()=>document.querySelectorAll("#vista-dashboard .cancha .ficha[data-jugador-id]").forEach(el=>{
    const previo=antes[el.dataset.jugadorId];
    if(!previo){ el.classList.add("xi-entra"); return; }
    const r=el.getBoundingClientRect(), dx=previo.left-r.left, dy=previo.top-r.top;
    if(Math.abs(dx)<2 && Math.abs(dy)<2) return;
    el.style.transition="none";
    el.style.transform=`translate(-50%,-50%) translate(${dx}px,${dy}px)`;
    void el.offsetWidth;
    el.classList.add("xi-mueve");
    requestAnimationFrame(()=>{ el.style.transition=""; el.style.transform=""; });
  }));
}

function mostrarTab(t){ _tabBanca=t; _animarPanel=true; _seleccion=null; renderDashboard(); }

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
  const pase=j.pase==null?j.ataque:j.pase, fis=j.fisico==null?60:j.fisico, por=j.portero==null?j.defensa:j.portero,
    reg=j.regate==null?j.ataque:j.regate, col=j.colocacion==null?j.ataque:j.colocacion;
  if(grupoPosicion(j.posicion)==="POR") return Math.round(por*0.75 + j.defensa*0.25);
  if(grupoPosicion(j.posicion)==="DEF") return Math.round(j.defensa*0.45 + j.velocidad*0.20 + fis*0.20 + pase*0.15);
  if(grupoPosicion(j.posicion)==="DEL") return Math.round(j.ataque*.35 + j.velocidad*.20 + pase*.15 + reg*.18 + col*.12);
  return Math.round(pase*.30 + j.ataque*.20 + j.defensa*.18 + j.velocidad*.17 + reg*.10 + col*.05); // MED
}
function _grlEquipo(equipo){
  const once=(equipo.titulares||[]).map(id=>equipo.jugadores.find(j=>j.id===id)).filter(Boolean);
  if(!once.length) return 0;
  return Math.round(once.reduce((s,j)=>s+_ovr(j),0)/once.length);
}
function _estrellasGRL(grl){
  if(grl>=85) return 5;
  if(grl>=78) return 4;
  if(grl>=70) return 3;
  if(grl>=62) return 2;
  return 1;
}
function _grlHTML(grl){
  const n=_estrellasGRL(grl);
  return `<div class="grl-equipo"><b>GRL ${grl}</b><span aria-label="${n} de 5 estrellas">${"★".repeat(n)}<i>${"★".repeat(5-n)}</i></span></div>`;
}
function _apellido(nombre){ const p=String(nombre).trim().split(/\s+/); return p[p.length-1]; }

// Ficha de jugador: cara + OVR + apellido + barra de energía. Reutilizada en cancha y banca.
function _ficha(j, equipoId, tipo, ref, estilo, i, posicionCancha){
  const sel = _seleccion && _seleccion.tipo===tipo && String(_seleccion.ref)===String(ref);
  const en = Math.max(0, 100 - j.cansancio); // energía = 100 - cansancio
  const col = en>=60 ? 'var(--acento)' : en>=30 ? 'var(--amarillo)' : 'var(--alerta)';
  const refArg = tipo==='slot' ? ref : `'${ref}'`;
  const fueraDePosicion = posicionCancha && !puedeJugarEn(j,posicionCancha);
  return `<button class="ficha pos-${grupoPosicion(j.posicion).toLowerCase()} ${sel?'sel':''}" data-jugador-id="${j.id}" `+
    `style="${estilo||''}${i!=null?`--i:${i};`:''}" onclick="seleccionar('${tipo}',${refArg})">`+
    `${posicionCancha?`<span class="ficha-posicion">${posicionCancha}</span>`:''}`+
    `${fueraDePosicion?`<span class="ficha-fuera-posicion" title="Fuera de posición" aria-label="Fuera de posición">!</span>`:''}`+
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
  _capturarMovimientoXI();
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
      <span class="ji-cara pos-${grupoPosicion(j.posicion).toLowerCase()}">${avatarHTML(j, equipoId, 44)}</span>
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
function _posLarga(p){ return {POR:"Portero",LI:"Lateral izquierdo",DFC:"Defensa central",LD:"Lateral derecho",
  MCD:"Medio defensivo",MC:"Mediocampista",MCO:"Medio ofensivo",EI:"Extremo izquierdo",ED:"Extremo derecho",DC:"Delantero centro",
  DEF:"Defensa",MED:"Mediocampista",DEL:"Delantero"}[p]||p; }
function _panelJugador(j, equipoId){
  const en=100-j.cansancio;
  return `<div class="jugador-info">
    <div class="ji-cab">
      <span class="ji-cara pos-${grupoPosicion(j.posicion).toLowerCase()}">${avatarHTML(j, equipoId, 52)}</span>
      <span class="ji-ovr">${_ovr(j)}</span>
      <div class="ji-id"><b class="ji-nom">${_apellido(j.nombre)}</b>
        <span class="ji-pos">${_posLarga(j.posicion)}</span></div>
    </div>
    <div class="ji-cols">
      <div class="ji-col">
        <div class="ji-dato"><span>Nombre</span><b>${j.nombre}</b></div>
        <div class="ji-dato"><span>Nacionalidad</span><b>${j.nacionalidad||"Internacional"}</b></div>
        <div class="ji-dato"><span>Posiciones</span><b>${(j.posiciones||[j.posicion]).join(" · ")}</b></div>
        <div class="ji-dato"><span>Edad</span><b>${j.edad}</b></div>
        <div class="ji-dato"><span>Estatura</span><b>${j.estatura} cm</b></div>
        <div class="ji-dato"><span>Pie</span><b>${j.pieDominante}</b></div>
        <div class="ji-dato"><span>Energía</span><b>${en}%</b></div>
      </div>
      <div class="ji-col">
        ${_statFila("Velocidad", j.velocidad)}
        ${_statFila("Ataque", j.ataque)}
        ${_statFila("Regate", j.regate==null?j.ataque:j.regate)}
        ${_statFila("Colocación", j.colocacion==null?j.ataque:j.colocacion)}
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

function cambiarFormacion(f){ const mi=_equipo(JUEGO.miEquipoId); _capturarMovimientoXI(); mi.formacion=f; autoAlinear(mi); _seleccion=null; renderDashboard(); }
function _alinearPorCriterio(mi, criterio){
  const slots=FORMACION_SLOTS[mi.formacion];
  const puntaje=j=>criterio==="energia" ? 100-j.cansancio : _ovr(j);
  const opciones=slots.map((slot,indice)=>({indice,candidatos:mi.jugadores
    .filter(j=>puedeJugarEn(j,slot.pos))
    .sort((a,b)=>puntaje(b)-puntaje(a)||_ovr(b)-_ovr(a))}))
    .sort((a,b)=>a.candidatos.length-b.candidatos.length);
  const resultado=Array(slots.length), usados=new Set();
  const asignar=paso=>{
    if(paso===opciones.length) return true;
    const opcion=opciones[paso];
    for(const jugador of opcion.candidatos){
      if(usados.has(jugador.id)) continue;
      usados.add(jugador.id); resultado[opcion.indice]=jugador.id;
      if(asignar(paso+1)) return true;
      usados.delete(jugador.id);
    }
    return false;
  };
  if(!asignar(0)){
    alert("No hay suficientes jugadores compatibles para cubrir todas las posiciones de esta formación.");
    return;
  }
  _capturarMovimientoXI();
  mi.titulares=resultado; _seleccion=null; guardarJuego(JUEGO); renderDashboard();
}
function alinearMejorEquipo(){ _alinearPorCriterio(_equipo(JUEGO.miEquipoId),"grl"); }
function alinearMasEnergia(){ _alinearPorCriterio(_equipo(JUEGO.miEquipoId),"energia"); }
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
