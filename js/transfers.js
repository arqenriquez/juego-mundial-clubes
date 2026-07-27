// Mercado de fichajes: funciones de dominio sin DOM.
function grlMercado(j){
  const pase=j.pase==null?j.ataque:j.pase, fis=j.fisico==null?60:j.fisico, por=j.portero==null?j.defensa:j.portero,
    reg=j.regate==null?j.ataque:j.regate, col=j.colocacion==null?j.ataque:j.colocacion;
  if(grupoPosicion(j.posicion)==="POR") return Math.round(por*.75+j.defensa*.25);
  if(grupoPosicion(j.posicion)==="DEF") return Math.round(j.defensa*.45+j.velocidad*.20+fis*.20+pase*.15);
  if(grupoPosicion(j.posicion)==="DEL") return Math.round(j.ataque*.35+j.velocidad*.20+pase*.15+reg*.18+col*.12);
  return Math.round(pase*.30+j.ataque*.20+j.defensa*.18+j.velocidad*.17+reg*.10+col*.05);
}
function valorMercado(j){
  const base=Math.max(4,(grlMercado(j)-48)*2.4);
  const factorEdad=j.edad<=21?1.25:j.edad<=28?1:j.edad<=32?.78:.58;
  return Math.round(base*factorEdad);
}
function jugadoresEnMercado(equipos, miEquipoId, filtros){
  const f=filtros||{}, nombre=(f.nombre||"").trim().toLowerCase();
  return equipos.filter(e=>e.id!==miEquipoId).flatMap(e=>e.jugadores.map(j=>({jugador:j,equipo:e,grl:grlMercado(j),valor:valorMercado(j)})))
    .filter(x=>!nombre||x.jugador.nombre.toLowerCase().includes(nombre))
    .filter(x=>!f.posicion||f.posicion==="TODAS"||x.jugador.posiciones.includes(f.posicion))
    .filter(x=>!f.edad||f.edad==="TODAS" || (f.edad==="JOVEN"&&x.jugador.edad<=21) ||
      (f.edad==="PRIME"&&x.jugador.edad>=22&&x.jugador.edad<=29) || (f.edad==="VETERANO"&&x.jugador.edad>=30))
    .filter(x=>!f.valor||f.valor==="TODOS" || (f.valor==="30"&&x.valor<=30) ||
      (f.valor==="60"&&x.valor<=60) || (f.valor==="100"&&x.valor<=100))
    .sort((a,b)=>b.grl-a.grl || a.valor-b.valor);
}
function ficharDelMercado(miEquipo, equipoOrigen, jugadorId){
  const i=equipoOrigen.jugadores.findIndex(j=>j.id===jugadorId);
  if(i<0) return {ok:false,motivo:"El jugador ya no está disponible."};
  const jugador=equipoOrigen.jugadores[i], valor=valorMercado(jugador);
  if((miEquipo.presupuesto||0)<valor) return {ok:false,motivo:"Presupuesto insuficiente."};
  equipoOrigen.jugadores.splice(i,1);
  equipoOrigen.titulares=equipoOrigen.titulares.filter(id=>id!==jugadorId);
  miEquipo.jugadores.push(jugador);
  miEquipo.presupuesto-=valor;
  miEquipo.fichajes=(miEquipo.fichajes||[]);
  miEquipo.fichajes.push({jugadorId:jugador.id,nombre:jugador.nombre,desde:equipoOrigen.nombre,valor,grl:grlMercado(jugador)});
  return {ok:true,jugador,valor};
}

function generarOfertasVenta(jugador, equipos, miEquipoId, rng){
  const valor=valorMercado(jugador), aleatorio=rng||Math.random;
  const candidatos=equipos.filter(e=>e.id!==miEquipoId && (e.presupuesto||0)>=valor*1.15).sort(()=>aleatorio()-.5).slice(0,3);
  const perfiles=[{factor:.88,exito:88},{factor:.99,exito:71},{factor:1.10,exito:54}];
  return candidatos.map((equipo,i)=>{ const p=perfiles[i];
    const monto=Math.max(1,Math.round(valor*(p.factor+(aleatorio()-.5)*.06)));
    return {equipoId:equipo.id,equipoNombre:equipo.nombre,monto,exito:p.exito};
  });
}
function resolverVenta(miEquipo, comprador, jugadorId, oferta, rng){
  const i=miEquipo.jugadores.findIndex(j=>j.id===jugadorId);
  if(i<0) return {ok:false,motivo:"El jugador ya no está en tu plantilla."};
  if(!comprador) return {ok:false,motivo:"El club ya no está disponible."};
  if((comprador.presupuesto||0)<oferta.monto) return {ok:false,motivo:"El club comprador retiró su oferta."};
  const jugador=miEquipo.jugadores.splice(i,1)[0];
  miEquipo.titulares=miEquipo.titulares.filter(id=>id!==jugadorId);
  comprador.jugadores.push(jugador);
  miEquipo.presupuesto+=oferta.monto;
  comprador.presupuesto-=oferta.monto;
  miEquipo.ventas=(miEquipo.ventas||[]);
  miEquipo.ventas.push({jugadorId,nombre:jugador.nombre,hacia:comprador.nombre,valor:oferta.monto});
  return {ok:true,jugador,monto:oferta.monto};
}

function actualizarOfertasVenta(miEquipo, equipos, rng){
  const aleatorio=rng||Math.random, transferibles=new Set(miEquipo.transferibles||[]), ofertas=[];
  miEquipo.jugadores.forEach(j=>{
    const probabilidad=transferibles.has(j.id)?.68:.13;
    if(aleatorio()>=probabilidad) return;
    const oferta=generarOfertasVenta(j,equipos,miEquipo.id,aleatorio)[0];
    if(oferta) ofertas.push({jugadorId:j.id,nombre:j.nombre,posicion:j.posicion,grl:grlMercado(j),...oferta});
  });
  miEquipo.ofertasVenta=ofertas;
  return ofertas;
}
