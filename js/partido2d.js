// Vista 2D del partido (Fase 3, esencial): REPRODUCE el resultado ya calculado por el motor.
// Dos capas:
//   nuevaSim2D(...)      -> modelo de movimiento PURO (sin DOM): posesión, pases, línea que
//                           sube/baja, marcas y desmarques; avanza con paso(dtMs). Testeable.
//   animarPartido2D(...) -> envoltorio con DOM + requestAnimationFrame que dibuja la sim y,
//                           al terminar/saltar, llama onDone().
// El marcador y los goleadores los decide el motor; aquí solo se anima cuándo caen.

// Mapea un slot de formación (cancha vertical: y=90 portería .. 15 ataque; x=0-100 ancho)
// a una cancha horizontal. El equipo izquierdo ataca a la derecha; el derecho, a la izquierda.
function _p2dMapa(slot, ladoIzq){
  const t=(90 - slot.y)/(90-15);          // 0 (portería propia) .. 1 (mediocampo)
  const x = ladoIzq ? 4 + t*44 : 96 - t*44;
  const y = 8 + (slot.x/100)*84;
  return { x, y };
}

function _p2dNearest(from, arr){
  let best=null, bd=1e9;
  arr.forEach(o=>{ const dx=o.cx-from.cx, dy=o.cy-from.cy, d=dx*dx+dy*dy; if(d<bd){ bd=d; best=o; } });
  return best;
}

// ----- Modelo puro de movimiento -----
function nuevaSim2D(local, visitante, goleadores, dur){
  function mk(equipo, ladoIzq){
    const slots=FORMACION_SLOTS[equipo.formacion];
    return equipo.titulares.map((id,i)=>{
      const b=_p2dMapa(slots[i], ladoIzq);
      const j=equipo.jugadores.find(x=>x.id===id);
      return { bx:b.x, by:b.y, cx:b.x, cy:b.y, pos:(j?j.posicion:"MED"), n:i+1 };
    });
  }
  const S={
    L:mk(local,true), R:mk(visitante,false),
    ballX:50, ballY:50, offL:0, offR:0,
    pose: Math.random()<0.5?"L":"R", carrier:null,
    tPase:0, t:0, min:0, gl:0, gv:0, iGol:0,
    resetEn:-1, tgGolX:-1, saqueDe:null,
    localId:local.id, dur:dur, nuevos:[],
    goles:(goleadores||[]).slice().sort((a,b)=>a.minuto-b.minuto)
  };
  S.carrier = S[S.pose][5] || S[S.pose][2];

  const eqDe=t=>S[t], rivalDe=t=>t==="L"?S.R:S.L, sDe=t=>t==="L"?1:-1, golX=t=>t==="L"?98:2;
  const ballFwd=t=> t==="L" ? (S.ballX-2)/96 : (98-S.ballX)/96;

  function hacerPase(){
    const eq=eqDe(S.pose), s=sDe(S.pose);
    if(Math.random()<0.14){ // pérdida
      S.pose = S.pose==="L"?"R":"L";
      const eq2=eqDe(S.pose).filter(p=>p.pos!=="POR");
      S.carrier = _p2dNearest({cx:S.ballX,cy:S.ballY}, eq2) || eqDe(S.pose)[5];
      return;
    }
    const comp=eq.filter(p=>p!==S.carrier && p.pos!=="POR");
    let mejor=null, punt=-1e9;
    comp.forEach(p=>{
      const adelante=(p.cx-S.carrier.cx)*s, dist=Math.hypot(p.cx-S.carrier.cx,p.cy-S.carrier.cy);
      const v=adelante*1.2 - dist*0.5 + Math.random()*8;
      if(v>punt){ punt=v; mejor=p; }
    });
    if(mejor) S.carrier=mejor;
  }

  S.paso=function(dtMs){
    S.nuevos.length=0;
    S.t=Math.min(S.dur, S.t+dtMs);
    S.min=Math.floor(S.t/S.dur*90);
    const seg=dtMs/1000;

    // goles en su minuto
    while(S.iGol<S.goles.length && S.goles[S.iGol].minuto<=S.min){
      const g=S.goles[S.iGol++];
      const anotaLocal=g.equipoId===S.localId;
      if(anotaLocal) S.gl++; else S.gv++;
      const lado=anotaLocal?"L":"R";
      S.tgGolX=golX(lado); S.resetEn=S.min; S.saqueDe=anotaLocal?"R":"L";
      S.nuevos.push(g);
    }

    // posesión (pausa en festejo)
    S.tPase+=seg;
    if(S.resetEn<0 && S.tPase>0.55){ S.tPase=0; hacerPase(); }

    // avance de bloques (línea que sube/baja siguiendo el balón)
    const avL = S.pose==="L" ? 5+ballFwd("L")*13 : -13+ballFwd("L")*11;
    const avR = S.pose==="R" ? 5+ballFwd("R")*13 : -13+ballFwd("R")*11;
    S.offL += (avL-S.offL)*0.05; S.offR += (avR-S.offR)*0.05;

    // balón
    if(S.resetEn>=0 && S.min>S.resetEn){ S.resetEn=-1; S.pose=S.saqueDe; S.carrier=eqDe(S.pose)[5]||eqDe(S.pose)[2]; S.ballX=50; S.ballY=50; }
    let bTgX, bTgY;
    if(S.resetEn>=0){ bTgX=S.tgGolX; bTgY=50; }
    else { bTgX=S.carrier.cx + sDe(S.pose)*2; bTgY=S.carrier.cy; }
    const k=S.resetEn>=0?0.09:0.16;
    S.ballX+=(bTgX-S.ballX)*k; S.ballY+=(bTgY-S.ballY)*k;

    // jugadores
    const tt=S.t/1000;
    [["L",S.L,S.offL],["R",S.R,S.offR]].forEach(([t,eq,off])=>{
      const s=sDe(t), enPosesion=(S.pose===t);
      const atacRival=rivalDe(t).filter(p=>p.pos==="DEL"||p.pos==="MED");
      const defRival =rivalDe(t).filter(p=>p.pos!=="POR");
      eq.forEach(d=>{
        if(d.pos==="POR"){
          const gx=t==="L"?4:96;
          d.cx += (gx-d.cx)*0.06;
          d.cy += (Math.max(34,Math.min(66,S.ballY))-d.cy)*0.05;
          return;
        }
        let tx=d.bx + s*off, ty=d.by;
        tx += Math.sin(tt*0.8+d.n)*1.2; ty += Math.cos(tt*0.7+d.n)*1.6;
        if(d===S.carrier){ tx += s*6; ty += (S.ballY-d.cy)*0.3; }
        else if(enPosesion && (d.pos==="DEL"||d.pos==="MED")){
          const m=_p2dNearest(d, defRival); if(m) ty += (d.cy>m.cy?4:-4); tx += s*3;
        } else if(!enPosesion && (d.pos==="DEF"||d.pos==="MED")){
          const a=_p2dNearest(d, atacRival); if(a){ tx += (a.cx-tx)*0.25; ty += (a.cy-ty)*0.25; }
        }
        tx=Math.max(3,Math.min(97,tx)); ty=Math.max(6,Math.min(94,ty));
        d.cx += (tx-d.cx)*0.07; d.cy += (ty-d.cy)*0.07;
      });
    });
    return S.nuevos;
  };
  return S;
}

// ----- Envoltorio con DOM + requestAnimationFrame -----
function animarPartido2D(local, visitante, partido, onDone){
  if(typeof animacionReducida==="function" && animacionReducida()){ onDone(); return; }
  const localEsMio=local.id===JUEGO.miEquipoId;
  const DUR=30000;
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

  const sim=nuevaSim2D(local, visitante, partido.goleadores, DUR);
  function dibujarEquipo(arr, color){
    return arr.map(d=>{ const el=document.createElement("div");
      el.className="p2d-dot"; el.style.background=color; el.textContent=d.n;
      el.style.left=d.cx+"%"; el.style.top=d.cy+"%"; campo.appendChild(el); return el; });
  }
  const elsL=dibujarEquipo(sim.L, localEsMio?colMio:colRival);
  const elsR=dibujarEquipo(sim.R, localEsMio?colRival:colMio);
  const ball=document.createElement("div"); ball.className="p2d-ball"; campo.appendChild(ball);

  const elMin=ov.querySelector("#p2d-min"), elGL=ov.querySelector("#p2d-gl"),
        elGV=ov.querySelector("#p2d-gv"), elEv=ov.querySelector("#p2d-eventos");
  function nombreJug(eid,jid){ const e=_equipo(eid); const j=e.jugadores.find(x=>x.id===jid); return j?_apellido(j.nombre):"?"; }

  let rafId=null, last=null, terminado=false;
  function frame(ts){
    if(last==null) last=ts;
    const dt=Math.min(80, ts-last); last=ts;
    const nuevos=sim.paso(dt);
    // render
    elMin.textContent=sim.min+"'"; elGL.textContent=sim.gl; elGV.textContent=sim.gv;
    sim.L.forEach((d,i)=>{ elsL[i].style.left=d.cx+"%"; elsL[i].style.top=d.cy+"%"; });
    sim.R.forEach((d,i)=>{ elsR[i].style.left=d.cx+"%"; elsR[i].style.top=d.cy+"%"; });
    ball.style.left=sim.ballX+"%"; ball.style.top=sim.ballY+"%";
    nuevos.forEach(g=>{
      const li=document.createElement("div"); li.className="p2d-ev";
      li.textContent=`${g.minuto}' ⚽ ${nombreJug(g.equipoId,g.jugadorId)} · ${_equipo(g.equipoId).nombre}`;
      elEv.appendChild(li);
      campo.classList.add("gol"); setTimeout(()=>campo.classList.remove("gol"),550);
    });
    if(sim.t>=sim.dur){ finalizar(); return; }
    rafId=requestAnimationFrame(frame);
  }
  function finalizar(){
    if(terminado) return; terminado=true;
    if(rafId) cancelAnimationFrame(rafId);
    elGL.textContent=partido.golesLocal; elGV.textContent=partido.golesVisitante; elMin.textContent="90'";
    const skip=ov.querySelector("#p2d-skip"); if(skip){ skip.textContent="Continuar ▶"; skip.onclick=cerrar; }
    setTimeout(()=>{ if(!ov._cerrado) cerrar(); }, 1600);
  }
  function cerrar(){ if(ov._cerrado) return; ov._cerrado=true; if(rafId) cancelAnimationFrame(rafId); ov.remove(); onDone(); }
  function saltar(){ if(rafId) cancelAnimationFrame(rafId); terminado=true; cerrar(); }

  ov.querySelector("#p2d-skip").onclick=saltar;
  rafId=requestAnimationFrame(frame);
}
