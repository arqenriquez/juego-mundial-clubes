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
