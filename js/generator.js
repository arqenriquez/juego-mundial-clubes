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

function _sube(v, n){ return Math.min(95, v+n); }

// Sesga los atributos según la posición para que tengan sentido
function _generarJugador(id, posicion, nivel, rng){
  let at=_atributoBase(nivel,rng), df=_atributoBase(nivel,rng),
      ve=_atributoBase(nivel,rng), fi=_atributoBase(nivel,rng), pa=_atributoBase(nivel,rng);
  // portero: alto solo en POR; bajo en el resto (no son porteros)
  let po = posicion==="POR" ? _sube(_atributoBase(nivel,rng),6) : _rint(rng,35,55);
  if(posicion==="DEL"){ at=_sube(at,8); }
  if(posicion==="DEF"){ df=_sube(df,8); fi=_sube(fi,4); }
  if(posicion==="POR"){ df=_sube(df,8); pa=Math.max(40,pa-10); at=Math.max(40,at-12); }
  if(posicion==="MED"){ pa=_sube(pa,8); ve=_sube(ve,4); }
  // estatura: porteros y defensas más altos
  let est = 170 + _rint(rng,-6,16);
  if(posicion==="POR"||posicion==="DEF") est += 5;
  est = Math.max(163, Math.min(200, est));
  const pie = _rint(rng,0,3)===0 ? "Izquierdo" : "Derecho"; // ~25% zurdos
  return crearJugador({id, nombre:_nombreAleatorio(rng), posicion,
    edad:_edadAleatoria(rng), ataque:at, defensa:df, velocidad:ve,
    pase:pa, fisico:fi, portero:po, estatura:est, pieDominante:pie});
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
