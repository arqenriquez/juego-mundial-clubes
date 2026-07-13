function _rint(rng, min, max){ return Math.floor(rng()*(max-min+1))+min; }

function _atributoBase(nivel, rng){
  // media sube ~8 por nivel; base nivel1≈52, nivel5≈84; ruido ±8
  const media = 44 + nivel*8;
  let v = media + _rint(rng,-8,8);
  return Math.max(40, Math.min(95, v));
}

function _nombreAleatorio(rng){
  return NOMBRES[_rint(rng,0,NOMBRES.length-1)] + " " +
         APELLIDOS[_rint(rng,0,APELLIDOS.length-1)];
}

function _edadAleatoria(rng){ return _rint(rng,17,36); }

// Sesga un atributo según la posición para que tenga sentido
function _generarJugador(id, posicion, nivel, rng){
  let at=_atributoBase(nivel,rng), df=_atributoBase(nivel,rng),
      ve=_atributoBase(nivel,rng), re=_atributoBase(nivel,rng);
  if(posicion==="DEL") at=Math.min(95,at+8);
  if(posicion==="DEF") df=Math.min(95,df+8);
  if(posicion==="POR") df=Math.min(95,df+10);
  if(posicion==="MED") ve=Math.min(95,ve+4);
  return crearJugador({id, nombre:_nombreAleatorio(rng), posicion,
    edad:_edadAleatoria(rng), ataque:at, defensa:df, velocidad:ve, resistencia:re});
}

function generarLiga(rng){
  const equipos=[];
  // Asignar niveles: 32 equipos, niveles distribuidos (más de nivel medio)
  const niveles=[]; const patron=[5,5,4,4,4,3,3,3,3,2,2,2,1,1,1,1]; // 16, se repite x2
  for(let k=0;k<2;k++) patron.forEach(n=>niveles.push(n));
  for(let i=0;i<32;i++){
    const eq = crearEquipo({id:"t"+i, ciudad:CIUDADES[i], nivel:niveles[i]});
    const plan=[["POR",2],["DEF",6],["MED",6],["DEL",4]];
    let p=0;
    plan.forEach(([pos,cant])=>{
      for(let c=0;c<cant;c++){
        eq.jugadores.push(_generarJugador(eq.id+"-p"+p, pos, eq.nivel, rng));
        p++;
      }
    });
    equipos.push(eq);
  }
  return equipos;
}
