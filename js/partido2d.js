// Adaptador de UI: presenta el partido que ya resolvio engine.js, sin cambiar su resultado.
function _texto2D(valor){ return String(valor||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]); }
function _alineacion2D(equipo, lado){
  const titulares=(equipo.titulares||[]).map(id=>equipo.jugadores.find(j=>j.id===id)).filter(Boolean);
  const filas=titulares.map((j,i)=>{
    const energia=Math.max(0,Math.round(100-(j.cansancio||0)));
    return `<li data-p2d-player="${_texto2D(j.id)}"><span class="p2d-jersey">${i+1}</span><span class="p2d-player-name">${_texto2D(j.nombre)}<em class="p2d-player-goals" aria-label="Goles"></em></span><span class="p2d-energy"><i style="width:${energia}%"></i></span></li>`;
  }).join("");
  return `<aside class="p2d-squad p2d-squad-${lado}"><div class="p2d-squad-head"><small>${lado==="home"?"LOCAL":"VISITANTE"}</small><b>${_texto2D(equipo.nombre)}</b><span>${equipo.formacion||"4-4-2"} · XI titular</span><button class="p2d-squad-toggle" aria-expanded="false">Ver XI</button></div><ul>${filas}</ul><footer><span>Energía del equipo</span><b>${titulares.length?Math.round(titulares.reduce((total,j)=>total+Math.max(0,100-(j.cansancio||0)),0)/titulares.length):0}%</b></footer></aside>`;
}

function animarPartido2D(local, visitante, partido, onDone){
  if(typeof animacionReducida==="function" && animacionReducida()){ onDone(); return; }
  const ov=document.createElement("div");
  ov.id="p2d";
  ov.innerHTML=`<div class="p2d-top"><span class="p2d-min">0'</span><span class="p2d-marc"><b>${_texto2D(local.nombre)}</b><span class="p2d-gl">0</span><em>-</em><span class="p2d-gv">0</span><b>${_texto2D(visitante.nombre)}</b></span><button class="btn sec p2d-skip">Saltar</button></div><div class="p2d-main">${_alineacion2D(local,"home")}<div class="p2d-pixi-host" aria-label="Partido 2D en directo"></div>${_alineacion2D(visitante,"away")}</div><div class="p2d-eventos"><b>Relato del partido</b><div class="p2d-ev">Inicio del partido. Las formaciones y tacticas definen la colocacion.</div></div>`;
  document.body.appendChild(ov);
  const host=ov.querySelector(".p2d-pixi-host"); let player=null, closed=false;
  const reloj=ov.querySelector(".p2d-min"), gl=ov.querySelector(".p2d-gl"), gv=ov.querySelector(".p2d-gv"), relato=ov.querySelector(".p2d-eventos");
  let golesLocal=0, golesVisitante=0;
  const golesPorJugador={};
  function cerrar(){ if(closed) return; closed=true; if(player) player.destroy(); ov.remove(); onDone(); }
  function anotar(texto){ const linea=document.createElement("div"); linea.className="p2d-ev"; linea.textContent=texto; relato.appendChild(linea); relato.scrollTop=relato.scrollHeight; }
  if(!window.MatchVisual){
    host.textContent="No se pudo cargar el renderizador PixiJS.";
  } else {
    player=MatchVisual.playRealMatch(host, local, visitante, partido.goleadores||[], {
      onProgress:minuto=>{ reloj.textContent=Math.max(1,minuto)+"'"; },
      onGoal:evento=>{
        const d=evento.metadata;
        if(d.team==="home"){ golesLocal++; gl.textContent=golesLocal; } else { golesVisitante++; gv.textContent=golesVisitante; }
        golesPorJugador[d.jugadorId]=(golesPorJugador[d.jugadorId]||0)+1;
        const fila=ov.querySelector(`[data-p2d-player="${d.jugadorId}"]`), marca=fila&&fila.querySelector(".p2d-player-goals");
        if(marca){ fila.classList.add("p2d-scorer"); marca.textContent=golesPorJugador[d.jugadorId]===1 ? "⚽" : `⚽ ×${golesPorJugador[d.jugadorId]}`; }
        anotar(`${d.minuto}' GOL - ${d.jugador} (${d.team==="home" ? local.nombre : visitante.nombre})`);
      },
      onOut:evento=>anotar(`Balón fuera. ${evento.metadata.label||"El juego se detiene."}`),
      onSetPiece:evento=>anotar(`${evento.metadata.label} · El equipo se acomoda para reanudar.`),
      onRestart:()=>anotar("Reinicio desde el centro."),
      onFinished:()=>{ reloj.textContent="90'"; setTimeout(cerrar,900); }
    });
  }
  ov.querySelectorAll(".p2d-squad-toggle").forEach(boton=>boton.onclick=()=>{
    const panel=boton.closest(".p2d-squad"), abierto=panel.classList.toggle("p2d-squad-open");
    boton.textContent=abierto?"Ocultar XI":"Ver XI"; boton.setAttribute("aria-expanded",String(abierto));
  });
  ov.querySelector(".p2d-skip").onclick=cerrar;
}
