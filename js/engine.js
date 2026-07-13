const _PESOS = {
  POR:{off:0.0,def:1.0}, DEF:{off:0.2,def:1.0},
  MED:{off:0.6,def:0.6}, DEL:{off:1.0,def:0.2}
};

function _ratingJugador(j){
  const off=(j.ataque*0.6 + j.velocidad*0.4);
  const def=(j.defensa*0.6 + j.velocidad*0.4);
  const mult=1-(j.cansancio/100)*0.3;
  const bono=j.forma*1.5;
  return { off: off*mult+bono, def: def*mult+bono };
}

function evaluarAlineacion(equipo){
  const titulares = equipo.titulares
    .map(id=>equipo.jugadores.find(j=>j.id===id))
    .filter(Boolean);
  let ataque=0, defensa=0;
  titulares.forEach(j=>{
    const r=_ratingJugador(j), p=_PESOS[j.posicion];
    ataque += r.off*p.off;
    defensa += r.def*p.def;
  });
  return { ataque, defensa };
}

function golesEsperados(ataquePropio, defensaRival, ventajaLocal){
  // normaliza: relación ataque vs defensa alrededor de ~1.4 goles
  const base = 1.4 * (ataquePropio / (defensaRival + 1)) + ventajaLocal;
  return Math.max(0.2, base);
}

function _muestreaPoisson(lambda, rng){
  const L=Math.exp(-lambda); let k=0, p=1;
  do{ k++; p*=rng(); }while(p>L);
  return k-1;
}

function simularPartido(equipoLocal, equipoVisitante, rng){
  const L=evaluarAlineacion(equipoLocal);
  const V=evaluarAlineacion(equipoVisitante);
  const xgL=golesEsperados(L.ataque, V.defensa, 0.25); // ventaja de local
  const xgV=golesEsperados(V.ataque, L.defensa, 0.0);
  const gL=Math.min(7,_muestreaPoisson(xgL,rng));
  const gV=Math.min(7,_muestreaPoisson(xgV,rng));
  const goleadores=[];
  _repartirGoles(equipoLocal, gL, goleadores, rng);
  _repartirGoles(equipoVisitante, gV, goleadores, rng);
  goleadores.sort((a,b)=>a.minuto-b.minuto);
  return { golesLocal:gL, golesVisitante:gV, goleadores };
}

function _repartirGoles(equipo, goles, out, rng){
  const atacantes = equipo.titulares
    .map(id=>equipo.jugadores.find(j=>j.id===id)).filter(Boolean)
    .filter(j=>j.posicion==="DEL"||j.posicion==="MED");
  for(let g=0; g<goles; g++){
    const autor = atacantes.length
      ? atacantes[Math.floor(rng()*atacantes.length)]
      : equipo.jugadores[0];
    out.push({ equipoId:equipo.id, jugadorId:autor.id, minuto:1+Math.floor(rng()*90) });
  }
}
