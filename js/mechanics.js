function aplicarCansancio(jugador, jugo){
  if(jugo){
    const aumento = 15 + Math.round((100 - jugador.fisico)*0.2); // más físico, menos cansancio
    jugador.cansancio = Math.min(100, jugador.cansancio + aumento);
  } else {
    jugador.cansancio = Math.max(0, jugador.cansancio - 25);
  }
}

function actualizarForma(jugador, resultado){
  const d = resultado==="V" ? 1 : resultado==="D" ? -1 : 0;
  jugador.forma = Math.max(-3, Math.min(3, jugador.forma + d));
}

function _ritmoCrecimiento(edad){
  if(edad<=23) return 30;
  if(edad<=29) return 15;
  return 5;
}

const _ATRIBUTOS = ["ataque","defensa","velocidad","pase","fisico","regate","colocacion"];

function aplicarProgresion(jugador, jugo, rng){
  const res={subio:null, bajo:null};
  if(jugo){
    jugador.experiencia += _ritmoCrecimiento(jugador.edad);
    if(jugador.experiencia >= 100){
      jugador.experiencia -= 100;
      const attr=_ATRIBUTOS[Math.floor(rng()*_ATRIBUTOS.length)];
      // Compatibilidad con jugadores creados antes de regate/colocación.
      if(jugador[attr]==null) jugador[attr]=jugador.ataque;
      if(jugador[attr]<95){ jugador[attr]+=1; res.subio=attr; }
    }
    // declive: veteranos 33+ con baja probabilidad pierden velocidad
    if(jugador.edad>=33 && rng()<0.15 && jugador.velocidad>40){
      jugador.velocidad-=1; res.bajo="velocidad";
    }
  }
  return res;
}
