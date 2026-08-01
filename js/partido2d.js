// Adaptador de UI: presenta el partido que ya resolvio engine.js, sin cambiar su resultado.
function animarPartido2D(local, visitante, partido, onDone){
  if(typeof animacionReducida==="function" && animacionReducida()){ onDone(); return; }
  const ov=document.createElement("div");
  ov.id="p2d";
  ov.innerHTML=`<div class="p2d-top"><span class="p2d-min">0'</span><span class="p2d-marc"><b>${local.nombre}</b><span class="p2d-gl">0</span><em>-</em><span class="p2d-gv">0</span><b>${visitante.nombre}</b></span><button class="btn sec p2d-skip">Saltar</button></div><div class="p2d-pixi-host" aria-label="Partido 2D en directo"></div><div class="p2d-eventos"><b>Relato del partido</b><div class="p2d-ev">Inicio del partido. Las formaciones y tacticas definen la colocacion.</div></div>`;
  document.body.appendChild(ov);
  const host=ov.querySelector(".p2d-pixi-host"); let player=null, closed=false;
  const reloj=ov.querySelector(".p2d-min"), gl=ov.querySelector(".p2d-gl"), gv=ov.querySelector(".p2d-gv"), relato=ov.querySelector(".p2d-eventos");
  let golesLocal=0, golesVisitante=0;
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
        anotar(`${d.minuto}' GOL - ${d.jugador} (${d.team==="home" ? local.nombre : visitante.nombre})`);
      },
      onOut:()=>anotar("Balon fuera. El juego se detiene."),
      onRestart:()=>anotar("Reinicio desde el centro."),
      onFinished:()=>{ reloj.textContent="90'"; setTimeout(cerrar,900); }
    });
  }
  ov.querySelector(".p2d-skip").onclick=cerrar;
}
