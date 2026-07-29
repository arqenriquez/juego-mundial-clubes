// Vista 2D del partido. El resultado sigue viniendo de engine.js; este modelo sólo
// representa una posesión creíble: decisiones, movimientos y balón en tránsito.

function _p2dMapa(slot, ladoIzq){
  const t=(90-slot.y)/75;
  return {x:ladoIzq?4+t*44:96-t*44,y:8+(slot.x/100)*84};
}
function _p2dNearest(from, arr){
  let best=null, bd=Infinity;
  arr.forEach(o=>{const d=(o.cx-from.cx)**2+(o.cy-from.cy)**2;if(d<bd){bd=d;best=o;}});
  return best;
}
function _p2dClamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function _p2dDist(a,b){ return Math.hypot(a.cx-b.cx,a.cy-b.cy); }

// opts.rng existe para pruebas reproducibles; en juego se usa Math.random.
function nuevaSim2D(local, visitante, goleadores, dur, opts){
  opts=opts||{}; const rnd=opts.rng||Math.random;
  function mk(equipo,ladoIzq){
    const slots=FORMACION_SLOTS[equipo.formacion]||FORMACION_SLOTS["4-4-2"];
    return equipo.titulares.map((id,i)=>{
      const base=_p2dMapa(slots[i],ladoIzq), j=equipo.jugadores.find(x=>x.id===id)||{};
      return {bx:base.x,by:base.y,cx:base.x,cy:base.y,pos:j.posicion||"MED",n:i+1,
        jugador:j, facing:ladoIzq?1:-1, intent:"ajustar", intentUntil:0,
        afterPass:0, reception:"", supportBias:rnd()*2-1};
    });
  }
  const S={L:mk(local,true),R:mk(visitante,false),ballX:50,ballY:50,offL:0,offR:0,
    pose:rnd()<.5?"L":"R",carrier:null,ball:null,t:0,min:0,gl:0,gv:0,iGol:0,
    resetEn:-1,tgGolX:-1,saqueDe:null,localId:local.id,dur:dur,nuevos:[],
    goles:(goleadores||[]).slice().sort((a,b)=>a.minuto-b.minuto), ultimaDecision:""};
  S.carrier=S[S.pose][5]||S[S.pose][2]||S[S.pose][0];
  const eq=t=>S[t], rival=t=>t==="L"?S.R:S.L, dir=t=>t==="L"?1:-1;
  const group=p=>grupoPosicion(p.pos);
  const attr=(p,k,fall=60)=>p.jugador[k]==null?fall:p.jugador[k];
  const speed=p=>1.45+attr(p,"velocidad")/95*1.55;
  const role=p=>p.jugador.rol||"equilibrado";
  const attackX=t=>t==="L"?98:2;
  const forward=t=>t==="L"?(S.ballX-2)/96:(98-S.ballX)/96;

  function pressureOn(p,t){
    return rival(t).filter(x=>group(x)!=="POR").reduce((n,x)=>n+(_p2dDist(p,x)<10?1:0),0);
  }
  function openSpace(p,t){
    const enemy=_p2dNearest(p,rival(t)); return enemy?_p2dDist(p,enemy):20;
  }
  function chooseIntent(p,t,hasBall,now){
    if(group(p)==="POR") return "porteria";
    if(hasBall) return "conducir";
    if(p.intentUntil>now) return p.intent;
    const own=S.pose===t, g=group(p), s=dir(t), progress=forward(t);
    let next="ajustar", life=.7+rnd()*1.1;
    if(own){
      const ahead=(p.cx-S.ballX)*s;
      if(p.afterPass>now) next=g==="DEF"?"cubrir":(g==="DEL"?"ruptura":"apoyo");
      else if(g==="DEL") next=progress>.45&&rnd()<.58?"ruptura":rnd()<.5?"fijar":"apoyo";
      else if(g==="DEF") next=progress>.58&&rnd()<.55?"cubrir":(p.pos==="LI"||p.pos==="LD")&&rnd()<.45?"doblar":"apoyo";
      else if(Math.abs(ahead)<20) next=rnd()<.44?"apoyo":rnd()<.38?"diagonal":"ancho";
      else next=rnd()<.5?"diagonal":"apoyo";
    } else if(g==="DEF") next="linea";
    else if(_p2dDist(p,{cx:S.ballX,cy:S.ballY})<18 && rnd()<.32) next="presionar";
    else next=rnd()<.46?"interceptar":"cubrir";
    p.intent=next;p.intentUntil=now+life;return next;
  }
  function targetFor(p,t,now){
    const s=dir(t), own=S.pose===t, g=group(p), it=chooseIntent(p,t,p===S.carrier,now);
    let x=p.bx+s*(own?(4+forward(t)*13):(-12+forward(t)*9)), y=p.by;
    // La forma nunca desaparece: el destino empieza siempre en la posición estructural.
    if(it==="conducir"){ x=p.cx+s*(4+openSpace(p,t)*.32); y=p.cy+(rnd()-.5)*3; }
    if(it==="apoyo"){ x=S.ballX-s*(5+rnd()*5); y=S.ballY+(p.by>S.ballY?6:-6)+p.supportBias*3; }
    if(it==="ruptura"){ x=Math.max(6,Math.min(94,S.ballX+s*(15+rnd()*11))); y=p.by+(p.by<50?-6:6); }
    if(it==="diagonal"){ x=S.ballX+s*(8+rnd()*8); y=50+(p.by<50?-1:1)*(18+rnd()*18); }
    if(it==="ancho"||it==="doblar"){ x+=s*(it==="doblar"?11:4); y=p.by<50?12:88; }
    if(it==="fijar"){ x=S.ballX+s*14;y=p.by; }
    if(it==="linea"){ x=p.bx+s*(-8+forward(t)*12); y=p.by+(S.ballY-p.by)*.2; }
    if(it==="presionar"){ x=S.ballX-s*1;y=S.ballY; }
    if(it==="interceptar"){ x=S.ballX-s*6;y=S.ballY+(p.by<S.ballY?-5:5); }
    if(it==="cubrir"){ x=p.bx+s*(-4+forward(t)*8); y=p.by+(S.ballY-p.by)*.26; }
    return {cx:_p2dClamp(x,3,97),cy:_p2dClamp(y,6,94)};
  }
  function movePlayers(seg,now){
    [["L",S.L],["R",S.R]].forEach(([t,team])=>team.forEach(p=>{
      if(group(p)==="POR"){
        const gx=t==="L"?4:96;p.cx+=(gx-p.cx)*.09;p.cy+=(_p2dClamp(S.ballY,35,65)-p.cy)*.04;return;
      }
      const target=targetFor(p,t,now), d=_p2dDist(p,target), step=Math.min(d,speed(p)*seg*5.4);
      if(d>.01){p.cx+=(target.cx-p.cx)/d*step;p.cy+=(target.cy-p.cy)/d*step;p.facing=Math.sign(target.cx-p.cx)||p.facing;}
    }));
  }
  function selectPass(t,carrier){
    const s=dir(t), options=eq(t).filter(p=>p!==carrier&&group(p)!=="POR"); let best=null, score=-Infinity;
    options.forEach(p=>{
      const d=_p2dDist(carrier,p), ahead=(p.cx-carrier.cx)*s, pressure=pressureOn(p,t);
      const lane=rival(t).filter(e=>{const dx=p.cx-carrier.cx,dy=p.cy-carrier.cy;const u=((e.cx-carrier.cx)*dx+(e.cy-carrier.cy)*dy)/(dx*dx+dy*dy);return u>.12&&u<.9&&Math.hypot(e.cx-(carrier.cx+u*dx),e.cy-(carrier.cy+u*dy))<4;}).length;
      const positionBonus=group(p)==="DEL"?ahead*.25:group(p)==="MED"?2:0;
      const value=ahead*1.05+openSpace(p,t)*.7-d*.38-pressure*5-lane*7+positionBonus+rnd()*9;
      if(value>score){score=value;best=p;}
    }); return best;
  }
  function kickTo(target,t,kind){
    const from=S.carrier, d=_p2dDist(from,target), quality=attr(from,"pase",attr(from,"ataque"));
    const error=(100-quality)/100*(.5+rnd()*2.4);
    const tx=_p2dClamp(target.cx+(rnd()-.5)*error,2,98),ty=_p2dClamp(target.cy+(rnd()-.5)*error,3,97);
    // La salida queda congelada: el pasador puede seguir su carrera sin arrastrar el balón.
    S.ball={fx:from.cx,fy:from.cy,target,tx,ty,elapsed:0,duration:_p2dClamp(.38+d*.035,.48,1.35),team:t,kind};
    S.carrier=null; S.ultimaDecision=kind; from.afterPass=S.t/1000+.9+rnd()*1.3;
  }
  function loseBall(t,near){
    const other=t==="L"?"R":"L";S.pose=other;
    S.carrier=_p2dNearest(near||{cx:S.ballX,cy:S.ballY},eq(other).filter(p=>group(p)!=="POR"))||eq(other)[0];
    if(S.carrier){S.ballX=S.carrier.cx;S.ballY=S.carrier.cy;S.carrier.reception="recuperacion";}
  }
  function updateBall(seg){
    if(S.ball){
      const b=S.ball;b.elapsed+=seg;const u=Math.min(1,b.elapsed/b.duration), ease=u*u*(3-2*u);
      S.ballX=b.fx+(b.tx-b.fx)*ease;S.ballY=b.fy+(b.ty-b.fy)*ease;
      if(u>=1){
        const receiver=_p2dNearest({cx:b.tx,cy:b.ty},eq(b.team).filter(p=>group(p)!=="POR"));
        const enemy=_p2dNearest({cx:b.tx,cy:b.ty},rival(b.team));
        S.ball=null;
        if(!receiver||enemy&&_p2dDist(enemy,{cx:b.tx,cy:b.ty})+1.1<_p2dDist(receiver,{cx:b.tx,cy:b.ty})) loseBall(b.team,{cx:b.tx,cy:b.ty});
        else {S.pose=b.team;S.carrier=receiver;S.carrier.reception=pressureOn(receiver,b.team)>0?"espaldas":(receiver.intent==="ruptura"?"carrera":"orientado");}
      } return;
    }
    if(!S.carrier)return;
    const p=S.carrier,t=S.pose,press=pressureOn(p,t), space=openSpace(p,t), technical=(attr(p,"regate",attr(p,"ataque"))+attr(p,"velocidad"))/2;
    // Conducir tiene una ventana tangible. Sólo se pasa bajo presión, por mejor opción o tras atraer rival.
    p.facing=dir(t);S.ballX=p.cx+dir(t)*1.1;S.ballY=p.cy;
    if(press>=2 && rnd()<.07*press) {loseBall(t,p);return;}
    const elapsed=(S.t/1000)-(p.possessionSince||0); const pass=selectPass(t,p);
    const wantsDrive=space>7&&technical>52&&elapsed<1.8+rnd()*1.9;
    const waitForRun=pass&&pass.intent==="ruptura"&&elapsed<1.1;
    if(!wantsDrive&&!waitForRun&&pass&&elapsed>.55+rnd()*1.1) kickTo(pass,t,"pase");
    else if(elapsed>3.8&&pass) kickTo(pass,t,"pase seguro");
  }
  function setCarrier(t,p){S.pose=t;S.carrier=p;p.possessionSince=S.t/1000;}
  // Correcciones de cambio de poseedor: se inicia una nueva ventana de decisión.
  Object.defineProperty(S,"carrier",{get(){return S._carrier;},set(p){S._carrier=p;if(p)p.possessionSince=S.t/1000;},configurable:true});
  S.carrier=S[S.pose][5]||S[S.pose][2]||S[S.pose][0];
  S.paso=function(dtMs){
    S.nuevos.length=0;S.t=Math.min(S.dur,S.t+dtMs);S.min=Math.floor(S.t/S.dur*90);const seg=dtMs/1000,now=S.t/1000;
    while(S.iGol<S.goles.length&&S.goles[S.iGol].minuto<=S.min){const g=S.goles[S.iGol++],left=g.equipoId===S.localId;
      if(left)S.gl++;else S.gv++;S.tgGolX=left?98:2;S.resetEn=S.min;S.saqueDe=left?"R":"L";S.ball=null;S.nuevos.push(g);}
    if(S.resetEn>=0){S.ballX+=(S.tgGolX-S.ballX)*.11;S.ballY+=(50-S.ballY)*.11;if(S.min>S.resetEn){S.resetEn=-1;setCarrier(S.saqueDe,eq(S.saqueDe)[5]||eq(S.saqueDe)[2]);S.ballX=50;S.ballY=50;}}
    else updateBall(seg);
    const avL=S.pose==="L"?5+forward("L")*13:-13+forward("L")*11, avR=S.pose==="R"?5+forward("R")*13:-13+forward("R")*11;
    S.offL+=(avL-S.offL)*.045;S.offR+=(avR-S.offR)*.045;movePlayers(seg,now);return S.nuevos;
  };return S;
}

function animarPartido2D(local,visitante,partido,onDone){
  if(typeof animacionReducida==="function"&&animacionReducida()){onDone();return;}
  const localEsMio=local.id===JUEGO.miEquipoId,DUR=30000,colMio="var(--acento2)",colRival="var(--amarillo)";
  const ov=document.createElement("div");ov.id="p2d";ov.innerHTML=`<div class="p2d-top"><span class="p2d-min" id="p2d-min">0'</span><span class="p2d-marc"><b>${local.nombre}</b><span id="p2d-gl">0</span><em>-</em><span id="p2d-gv">0</span><b>${visitante.nombre}</b></span><button class="btn sec p2d-skip" id="p2d-skip">Saltar ⏭</button></div><div class="p2d-campo" id="p2d-campo"><div class="p2d-media"></div><div class="p2d-circulo"></div><div class="p2d-arco iz"></div><div class="p2d-arco de"></div><span class="p2d-lado iz">${local.nombre}</span><span class="p2d-lado de">${visitante.nombre}</span></div><div class="p2d-eventos" id="p2d-eventos"><b>Eventos</b></div>`;document.body.appendChild(ov);
  const campo=ov.querySelector("#p2d-campo"),sim=nuevaSim2D(local,visitante,partido.goleadores,DUR);
  function dots(arr,color){return arr.map(d=>{const el=document.createElement("div");el.className="p2d-dot";el.style.background=color;el.textContent=d.n;campo.appendChild(el);return el;});}
  const elsL=dots(sim.L,localEsMio?colMio:colRival),elsR=dots(sim.R,localEsMio?colRival:colMio),ball=document.createElement("div");ball.className="p2d-ball";campo.appendChild(ball);
  const elMin=ov.querySelector("#p2d-min"),elGL=ov.querySelector("#p2d-gl"),elGV=ov.querySelector("#p2d-gv"),elEv=ov.querySelector("#p2d-eventos");let rafId,last,done=false;
  function frame(ts){if(last==null)last=ts;const nuevos=sim.paso(Math.min(80,ts-last));last=ts;elMin.textContent=sim.min+"'";elGL.textContent=sim.gl;elGV.textContent=sim.gv;sim.L.forEach((d,i)=>{elsL[i].style.left=d.cx+"%";elsL[i].style.top=d.cy+"%";});sim.R.forEach((d,i)=>{elsR[i].style.left=d.cx+"%";elsR[i].style.top=d.cy+"%";});ball.style.left=sim.ballX+"%";ball.style.top=sim.ballY+"%";nuevos.forEach(g=>{const li=document.createElement("div");li.className="p2d-ev";li.textContent=`${g.minuto}' ⚽ ${_apellido((_equipo(g.equipoId).jugadores.find(x=>x.id===g.jugadorId)||{}).nombre||"?")} · ${_equipo(g.equipoId).nombre}`;elEv.appendChild(li);campo.classList.add("gol");setTimeout(()=>campo.classList.remove("gol"),550);});if(sim.t>=sim.dur){finish();return;}rafId=requestAnimationFrame(frame);}
  function close(){if(ov._cerrado)return;ov._cerrado=true;if(rafId)cancelAnimationFrame(rafId);ov.remove();onDone();}function finish(){if(done)return;done=true;if(rafId)cancelAnimationFrame(rafId);elGL.textContent=partido.golesLocal;elGV.textContent=partido.golesVisitante;elMin.textContent="90'";const skip=ov.querySelector("#p2d-skip");skip.textContent="Continuar ▶";skip.onclick=close;setTimeout(()=>{if(!ov._cerrado)close();},1600);}ov.querySelector("#p2d-skip").onclick=close;rafId=requestAnimationFrame(frame);
}
