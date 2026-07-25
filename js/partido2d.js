// Vista 2D del partido (Fase 3, esencial): REPRODUCE el resultado ya calculado por el motor
// con bolitas numeradas + balón + reloj. No decide nada; anima los goles en su minuto y al
// terminar (o al saltar) llama onDone(), que aplica/avanza el resto de la fase.

// Mapea un slot de formación (cancha vertical: y=90 portería .. 15 ataque; x=0-100 ancho)
// a una cancha horizontal. El equipo izquierdo ataca a la derecha; el derecho, a la izquierda.
function _p2dMapa(slot, ladoIzq){
  const t=(90 - slot.y)/(90-15);          // 0 (portería propia) .. 1 (mediocampo)
  const x = ladoIzq ? 4 + t*44 : 96 - t*44;
  const y = 8 + (slot.x/100)*84;
  return { x, y };
}

function animarPartido2D(local, visitante, partido, onDone){
  // Respeta "reduce motion": salta directo al resultado
  if(typeof animacionReducida==="function" && animacionReducida()){ onDone(); return; }

  const localEsMio = local.id===JUEGO.miEquipoId;
  const DUR = 30000; // ms que dura el partido completo (90')
  const colMio="var(--acento2)", colRival="var(--amarillo)";

  const ov=document.createElement("div"); ov.id="p2d";
  ov.innerHTML=`
    <div class="p2d-top">
      <span class="p2d-min" id="p2d-min">0'</span>
      <span class="p2d-marc"><b>${local.nombre}</b>
        <span id="p2d-gl">0</span><em>-</em><span id="p2d-gv">0</span>
        <b>${visitante.nombre}</b></span>
      <button class="btn sec p2d-skip" id="p2d-skip">Saltar ⏭</button>
    </div>
    <div class="p2d-campo" id="p2d-campo">
      <div class="p2d-media"></div><div class="p2d-circulo"></div>
      <div class="p2d-arco iz"></div><div class="p2d-arco de"></div>
      <span class="p2d-lado iz">${local.nombre}</span>
      <span class="p2d-lado de">${visitante.nombre}</span>
    </div>
    <div class="p2d-eventos" id="p2d-eventos"><b>Eventos</b></div>`;
  document.body.appendChild(ov);
  const campo=ov.querySelector("#p2d-campo");

  function crearDots(equipo, ladoIzq, color){
    const slots=FORMACION_SLOTS[equipo.formacion];
    return equipo.titulares.map((id,i)=>{
      const base=_p2dMapa(slots[i], ladoIzq);
      const el=document.createElement("div");
      el.className="p2d-dot"; el.style.background=color; el.textContent=(i+1);
      el.style.left=base.x+"%"; el.style.top=base.y+"%";
      campo.appendChild(el);
      return { el, bx:base.x, by:base.y, ph:Math.random()*6.28, sp:0.5+Math.random()*0.6 };
    });
  }
  const dots = crearDots(local, true, localEsMio?colMio:colRival)
    .concat(crearDots(visitante, false, localEsMio?colRival:colMio));

  const ball=document.createElement("div"); ball.className="p2d-ball"; campo.appendChild(ball);
  let ballX=50, ballY=50, tgX=50, tgY=50, resetEn=-1;

  const goles=(partido.goleadores||[]).slice().sort((a,b)=>a.minuto-b.minuto);
  let iGol=0, gl=0, gv=0;
  const elMin=ov.querySelector("#p2d-min"), elGL=ov.querySelector("#p2d-gl"),
        elGV=ov.querySelector("#p2d-gv"), elEv=ov.querySelector("#p2d-eventos");

  function nombreJug(eid,jid){ const e=_equipo(eid); const j=e.jugadores.find(x=>x.id===jid); return j?_apellido(j.nombre):"?"; }

  let rafId=null, ini=null, terminado=false;

  function frame(ts){
    if(ini==null) ini=ts;
    let el=ts-ini; if(el>DUR) el=DUR;
    const min=Math.floor(el/DUR*90);
    elMin.textContent=min+"'";

    // dispara los goles cuyo minuto ya pasó
    while(iGol<goles.length && goles[iGol].minuto<=min){
      const g=goles[iGol++];
      const anotaLocal = g.equipoId===local.id;
      if(anotaLocal) gl++; else gv++;
      elGL.textContent=gl; elGV.textContent=gv;
      tgX = anotaLocal ? 97 : 3; tgY=50; resetEn=min;     // balón al arco anotado
      const li=document.createElement("div"); li.className="p2d-ev";
      li.textContent=`${g.minuto}' ⚽ ${nombreJug(g.equipoId,g.jugadorId)} · ${_equipo(g.equipoId).nombre}`;
      elEv.appendChild(li);
      campo.classList.add("gol"); setTimeout(()=>campo.classList.remove("gol"),550);
    }

    // objetivo del balón: tras gol vuelve al centro; si no, deriva por el campo
    if(resetEn>=0 && min>resetEn){ tgX=50; tgY=50; resetEn=-1; }
    if(resetEn<0 && Math.random()<0.02){ tgX=22+Math.random()*56; tgY=22+Math.random()*56; }
    ballX+=(tgX-ballX)*0.06; ballY+=(tgY-ballY)*0.06;
    ball.style.left=ballX+"%"; ball.style.top=ballY+"%";

    // mueve las bolitas: base + oscilación + leve tendencia hacia el balón
    const tt=el/1000;
    dots.forEach(d=>{
      const ox=Math.sin(tt*d.sp+d.ph)*2.4, oy=Math.cos(tt*d.sp*0.8+d.ph)*2.4;
      const ax=(ballX-d.bx)*0.05, ay=(ballY-d.by)*0.05;
      d.el.style.left=(d.bx+ox+ax)+"%"; d.el.style.top=(d.by+oy+ay)+"%";
    });

    if(el>=DUR){ finalizar(); return; }
    rafId=requestAnimationFrame(frame);
  }

  function finalizar(){
    if(terminado) return; terminado=true;
    if(rafId) cancelAnimationFrame(rafId);
    elGL.textContent=partido.golesLocal; elGV.textContent=partido.golesVisitante; elMin.textContent="90'";
    const skip=ov.querySelector("#p2d-skip"); if(skip) skip.textContent="Continuar ▶";
    ov.querySelector("#p2d-skip").onclick=cerrar;
    setTimeout(()=>{ if(!ov._cerrado) cerrar(); }, 1600);
  }
  function cerrar(){ if(ov._cerrado) return; ov._cerrado=true; if(rafId) cancelAnimationFrame(rafId); ov.remove(); onDone(); }
  function saltar(){ if(rafId) cancelAnimationFrame(rafId); terminado=true; cerrar(); }

  ov.querySelector("#p2d-skip").onclick=saltar;
  rafId=requestAnimationFrame(frame);
}
