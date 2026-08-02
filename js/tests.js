// Las pruebas se agregan aquí conforme avanzan las tareas.

suite("data.js", ()=>{
  assertEq("hay 32 ciudades", CIUDADES.length, 32);
  assert("ciudades únicas", new Set(CIUDADES).size===32);
  assert("hay nombres", NOMBRES.length>=15);
  assert("hay apellidos", APELLIDOS.length>=15);
  assertEq("4-4-2 defensas", FORMACIONES["4-4-2"].DEF, 4);
  assertEq("4-3-3 delanteros", FORMACIONES["4-3-3"].DEL, 3);
  assertEq("3-5-2 medios", FORMACIONES["3-5-2"].MED, 5);
  assertEq("hay 10 formaciones", Object.keys(FORMACIONES).length, 10);
  assert("cada formación tiene 11 slots", Object.values(FORMACION_SLOTS).every(s=>s.length===11));
});

suite("models.js", ()=>{
  const j = crearJugador({id:"x", nombre:"A B", posicion:"DEL", edad:20,
    ataque:80, defensa:50, velocidad:75, regate:78, colocacion:74, pase:70, fisico:60, portero:45,
    estatura:180, pieDominante:"Derecho"});
  assertEq("jugador cansancio inicial", j.cansancio, 0);
  assertEq("jugador forma inicial", j.forma, 0);
  assertEq("jugador conserva pase", j.pase, 70);
  assertEq("jugador conserva regate", j.regate, 78);
  assertEq("jugador conserva colocación", j.colocacion, 74);
  assertEq("jugador conserva estatura", j.estatura, 180);
  const e = crearEquipo({id:"t1", ciudad:"Roma", nivel:3});
  assertEq("nombre equipo", e.nombre, "Club Roma");
  assertEq("formacion default", e.formacion, "4-4-2");
  const p = crearPartido({id:"m1", ronda:"grupo", grupo:"A", localId:"t1", visitanteId:"t2"});
  assertEq("partido no jugado", p.jugado, false);
});

suite("generator.js", ()=>{
  const rng = ()=>0.5; // determinista
  const liga = generarLiga(rng);
  assertEq("32 equipos", liga.length, 32);
  const e = liga[0];
  assert("18-20 jugadores", e.jugadores.length>=18 && e.jugadores.length<=20);
  const porteros = e.jugadores.filter(j=>j.posicion==="POR").length;
  assert("al menos 2 porteros", porteros>=2);
  assert("ids de jugador únicos", new Set(e.jugadores.map(j=>j.id)).size===e.jugadores.length);
  assert("nivel entre 1 y 5", e.nivel>=1 && e.nivel<=5);
  const at=e.jugadores[0].ataque;
  assert("atributos en rango", at>=40 && at<=95);
  // nuevos atributos presentes y coherentes
  const j0=e.jugadores[0];
  assert("tiene pase, físico, portero, regate y colocación", j0.pase>=40 && j0.fisico>=40 && j0.portero>=35 && j0.regate>=40 && j0.colocacion>=40);
  assert("estatura y pie definidos", j0.estatura>=163 && (j0.pieDominante==="Derecho"||j0.pieDominante==="Izquierdo"));
  const por=e.jugadores.find(j=>j.posicion==="POR"), campo=e.jugadores.find(j=>j.posicion==="DC");
  assert("portero del POR alto y del DC bajo", por.portero>campo.portero);
  assert("plantilla incluye laterales, medios y extremos", ["LI","LD","MCD","MCO","EI","ED"].every(p=>e.jugadores.some(j=>j.posicion===p)));
  assert("cada jugador define posiciones jugables", e.jugadores.every(j=>j.posiciones.includes(j.posicion)));
  assert("hay jugadores polivalentes", e.jugadores.some(j=>j.posiciones.length>1));
  // equipos de mayor nivel tienen mejor media
  const media = t=> t.jugadores.reduce((s,j)=>s+(j.ataque+j.defensa+j.velocidad)/3,0)/t.jugadores.length;
  const fuerte = liga.find(t=>t.nivel===5), debil = liga.find(t=>t.nivel===1);
  if(fuerte && debil) assert("nivel 5 >= nivel 1", media(fuerte)>=media(debil));
});

suite("mechanics.js", ()=>{
  const base=()=>crearJugador({id:"x",nombre:"A",posicion:"MED",edad:20,
    ataque:60,defensa:60,velocidad:60,pase:60,fisico:50});
  // cansancio sube al jugar
  let j=base(); aplicarCansancio(j,true);
  assert("cansancio sube al jugar", j.cansancio>0 && j.cansancio<=100);
  // más físico = se cansa menos
  let a=base(); a.fisico=90; let b=base(); b.fisico=40;
  aplicarCansancio(a,true); aplicarCansancio(b,true);
  assert("más físico se cansa menos", a.cansancio < b.cansancio);
  // descanso baja
  let c=base(); c.cansancio=50; aplicarCansancio(c,false);
  assert("descanso baja cansancio", c.cansancio<50);
  // clamps
  let d=base(); d.cansancio=95; aplicarCansancio(d,true);
  assert("cansancio no pasa de 100", d.cansancio<=100);
  // forma
  let f=base(); actualizarForma(f,"V"); assertEq("forma sube con victoria", f.forma,1);
  f.forma=3; actualizarForma(f,"V"); assertEq("forma tope +3", f.forma,3);
  f.forma=-3; actualizarForma(f,"D"); assertEq("forma piso -3", f.forma,-3);
  // progresión joven vs veterano
  const rng=()=>0.99;
  let joven=base(); joven.edad=19; joven.experiencia=95;
  let r1=aplicarProgresion(joven,true,rng);
  assert("joven sube atributo", r1.subio!==null);
  // acumulación de experiencia: el sobrante se conserva (no se resetea a 0)
  let jExp=base(); jExp.edad=19; jExp.experiencia=85;
  aplicarProgresion(jExp,true,()=>0.99); // ritmo 30 => 115, sube 1 y quedan 15
  assertEq("experiencia conserva sobrante", jExp.experiencia, 15);
  // tope de atributo en 95: no sube y subio es null
  let jTope=base(); jTope.edad=20; jTope.experiencia=95; jTope.fisico=95;
  let rTope=aplicarProgresion(jTope,true,()=>0.7); // rng elige índice 4 = "fisico"
  assertEq("atributo topado en 95 no sube", jTope.fisico, 95);
  assert("subio es null si el atributo ya esta topado", rTope.subio===null);
  // declive del veterano: 33+ puede perder velocidad (piso 40)
  let jVet=base(); jVet.edad=35; jVet.velocidad=80; jVet.experiencia=0;
  let rVet=aplicarProgresion(jVet,true,()=>0.1); // ritmo 5 => exp 5 (<100), gate 0.1<0.15 => declina
  assertEq("veterano pierde velocidad", jVet.velocidad, 79);
  assertEq("bajo reporta velocidad", rVet.bajo, "velocidad");
});

suite("engine.js", ()=>{
  // equipo helper con 11 titulares de rating fijo
  function equipoDe(rating, formacion){
    const jugadores=[]; let id=0;
    const comp={POR:1, ...FORMACIONES[formacion]};
    Object.entries(comp).forEach(([pos,cant])=>{
      for(let c=0;c<cant;c++){
        jugadores.push(crearJugador({id:"j"+(id++),nombre:"x",posicion:pos,edad:25,
          ataque:rating,defensa:rating,velocidad:rating,pase:rating,fisico:rating,portero:rating}));
      }
    });
    const e=crearEquipo({id:"e"+rating,ciudad:"Z",nivel:3});
    e.jugadores=jugadores; e.formacion=formacion; e.titulares=jugadores.map(j=>j.id);
    return e;
  }
  const fuerte=equipoDe(90,"4-3-3"), debil=equipoDe(50,"4-4-2");
  const ef=evaluarAlineacion(fuerte), ed=evaluarAlineacion(debil);
  assert("equipo fuerte ataca más", ef.ataque>ed.ataque);
  assert("goles esperados >=0.2", golesEsperados(10,10,0)>=0.2);
  assert("más ataque => más goles esperados", golesEsperados(80,40,0)>golesEsperados(40,80,0));
  // cansancio reduce el rating
  const cansado=equipoDe(90,"4-3-3"); cansado.jugadores.forEach(j=>j.cansancio=100);
  assert("cansancio baja ataque", evaluarAlineacion(cansado).ataque < ef.ataque);
  // simulación produce marcador entero y goleadores coherentes
  let seed=1; const rng=()=>{ seed=(seed*9301+49297)%233280; return seed/233280; };
  const r=simularPartido(fuerte,debil,rng);
  assert("goles locales enteros>=0", Number.isInteger(r.golesLocal)&&r.golesLocal>=0);
  assertEq("goleadores = suma de goles", r.goleadores.length, r.golesLocal+r.golesVisitante);
  // TÁCTICA — enfoque
  const ofe=equipoDe(70,"4-4-2"); ofe.tactica={enfoque:"ofensivo",linea:50};
  const neu=equipoDe(70,"4-4-2"); neu.tactica={enfoque:"equilibrado",linea:50};
  const def=equipoDe(70,"4-4-2"); def.tactica={enfoque:"defensivo",linea:50};
  assert("enfoque ofensivo sube ataque", evaluarAlineacion(ofe).ataque > evaluarAlineacion(neu).ataque);
  assert("enfoque ofensivo baja defensa", evaluarAlineacion(ofe).defensa < evaluarAlineacion(neu).defensa);
  assert("enfoque defensivo sube defensa", evaluarAlineacion(def).defensa > evaluarAlineacion(neu).defensa);
  // TÁCTICA — línea: el local con línea alta concede más (el visitante marca más)
  const locAlta=equipoDe(70,"4-4-2"); locAlta.tactica={enfoque:"equilibrado",linea:90};
  const locBaja=equipoDe(70,"4-4-2"); locBaja.tactica={enfoque:"equilibrado",linea:10};
  const vis=equipoDe(70,"4-4-2");
  assert("línea alta del local concede más al visitante", xgPartido(locAlta,vis).xgV > xgPartido(locBaja,vis).xgV);
  // táctica por defecto (sin definir) no rompe: equilibrado/50
  assert("sin táctica usa neutral", Number.isFinite(evaluarAlineacion(fuerte).ataque));
  // ROLES — un defensa "apoyar" ataca más; "defender" defiende más
  const dApoyar=equipoDe(70,"4-4-2"); dApoyar.jugadores.forEach(j=>{ if(j.posicion==="DEF") j.rol="apoyar"; });
  const dDefender=equipoDe(70,"4-4-2"); dDefender.jugadores.forEach(j=>{ if(j.posicion==="DEF") j.rol="defender"; });
  assert("rol apoyar sube ataque vs defender", evaluarAlineacion(dApoyar).ataque > evaluarAlineacion(dDefender).ataque);
  assert("rol defender sube defensa vs apoyar", evaluarAlineacion(dDefender).defensa > evaluarAlineacion(dApoyar).defensa);
  // sin rol => neutral (no cambia respecto a no tener rol)
  const sinRol=equipoDe(70,"4-4-2");
  assert("sin rol es neutral", evaluarAlineacion(sinRol).ataque === evaluarAlineacion(equipoDe(70,"4-4-2")).ataque);
});

suite("tournament.js", ()=>{
  const rng=()=>0.5;
  const liga=generarLiga(rng);
  const grupos=sortearGrupos(liga, rng);
  assertEq("8 grupos", grupos.length, 8);
  assert("4 por grupo", grupos.every(g=>g.equiposIds.length===4));
  const todos=grupos.flatMap(g=>g.equiposIds);
  assertEq("32 equipos repartidos", new Set(todos).size, 32);
  const fx=fixturesDeGrupo(grupos[0]);
  assertEq("6 partidos por grupo", fx.length, 6);
  // cada equipo juega 3
  const cuenta={};
  fx.forEach(p=>{ cuenta[p.localId]=(cuenta[p.localId]||0)+1; cuenta[p.visitanteId]=(cuenta[p.visitanteId]||0)+1; });
  assert("cada equipo juega 3", Object.values(cuenta).every(c=>c===3));
  // jornadas: 3 jornadas, 2 partidos cada una, 4 equipos distintos por jornada
  assert("jornadas en rango 1..3", fx.every(p=>p.jornada>=1 && p.jornada<=3));
  [1,2,3].forEach(jr=>{
    const enJr=fx.filter(p=>p.jornada===jr);
    assertEq("jornada "+jr+": 2 partidos", enJr.length, 2);
    const eqs=enJr.flatMap(p=>[p.localId,p.visitanteId]);
    assertEq("jornada "+jr+": 4 equipos distintos", new Set(eqs).size, 4);
  });
  // tabla: forzar un resultado
  fx[0].jugado=true; fx[0].golesLocal=3; fx[0].golesVisitante=0;
  const tabla=calcularTabla(grupos[0], fx);
  assertEq("líder tiene 3 pts", tabla[0].pts, 3);
  assertEq("nombre ronda 16", nombreRonda(16), "Octavos");
  assertEq("nombre ronda 2", nombreRonda(2), "Final");
  // construirBracket: empareja 1º vs 2º cruzados y cubre a los 16 clasificados sin repetir
  const clas=_LETRAS.map(l=>({grupo:l, primero:"1"+l, segundo:"2"+l}));
  const br=construirBracket(clas);
  assertEq("bracket nombre Octavos", br.nombre, "Octavos");
  assertEq("bracket 8 llaves", br.llaves.length, 8);
  const slots=br.llaves.flatMap(x=>[x.localId, x.visitanteId]);
  assertEq("bracket cubre 16 clasificados sin repetir", new Set(slots).size, 16);
});

suite("transfers.js", ()=>{
  const liga=generarLiga(()=>0.5), mi=liga[0], origen=liga[1];
  mi.presupuesto=999;
  const candidato=origen.jugadores.find(j=>j.posicion==="DC");
  const valor=valorMercado(candidato);
  assert("valor de mercado positivo", valor>0);
  const filtrados=jugadoresEnMercado(liga,mi.id,{posicion:"DC",edad:"TODAS",valor:"TODOS"});
  assert("filtro de posición solo devuelve DC compatibles", filtrados.every(x=>x.jugador.posiciones.includes("DC")));
  const antesMi=mi.jugadores.length, antesOrigen=origen.jugadores.length, antesPresupuesto=mi.presupuesto;
  const r=ficharDelMercado(mi,origen,candidato.id);
  assert("fichaje exitoso con presupuesto", r.ok);
  assertEq("jugador llega a mi plantilla", mi.jugadores.length, antesMi+1);
  assertEq("jugador sale del club origen", origen.jugadores.length, antesOrigen-1);
  assertEq("presupuesto se descuenta", mi.presupuesto, antesPresupuesto-valor);
  assertEq("llegada queda registrada", mi.fichajes.length, 1);
  const ligaVenta=generarLiga(()=>0.5), vendedor=ligaVenta[0], comprador=ligaVenta[1];
  ligaVenta.forEach(e=>e.presupuesto=999);
  const aVender=vendedor.jugadores.find(j=>j.posicion==="DC");
  vendedor.transferibles=[aVender.id];
  const renovadas=actualizarOfertasVenta(vendedor,ligaVenta,()=>0);
  assert("ofertas se actualizan tras un partido", renovadas.length>0);
  assert("las ofertas guardan club y monto", renovadas.every(o=>o.equipoId && o.monto>0));
  const ofertas=generarOfertasVenta(aVender,ligaVenta,vendedor.id,()=>0.4);
  assertEq("se generan tres ofertas de clubes distintos", new Set(ofertas.map(o=>o.equipoId)).size, 3);
  const antesVenta=vendedor.jugadores.length, antesFondos=vendedor.presupuesto;
  const venta=resolverVenta(vendedor,comprador,aVender.id,ofertas[0],()=>0);
  assert("venta exitosa con probabilidad favorable", venta.ok);
  assertEq("venta saca jugador de la plantilla", vendedor.jugadores.length, antesVenta-1);
  assertEq("venta suma al presupuesto", vendedor.presupuesto, antesFondos+ofertas[0].monto);
});

suite("avatar.js", ()=>{
  // determinismo: la cara depende solo de la semilla, no del momento en que se pide
  assertEq("misma semilla → misma cara", caraSVG("t19-p5"), caraSVG("t19-p5"));
  assert("semillas distintas → caras distintas", caraSVG("t19-p5") !== caraSVG("t19-p6"));
  const svg=caraSVG("t0-p0");
  assert("devuelve un SVG bien formado", svg.startsWith("<svg") && svg.endsWith("</svg>"));

  // variedad: con 32 equipos x 18 jugadores no debe verse siempre la misma cara
  const ids=[]; for(let e=0;e<6;e++) for(let p=0;p<18;p++) ids.push("t"+e+"-p"+p);
  const distintas=new Set(ids.map(caraSVG)).size;
  assert("108 ids producen ≥30 caras distintas → "+distintas, distintas>=30);

  // rutas: cubren las cuatro posiciones y los extremos de la plantilla
  assertEq("ruta de jugador", rutaCaraJugador("t19-p5"), "img/caras/t19-p5.png");
  assertEq("ranura p0 → por-1",  rutaCaraRanura("t19-p0"),  "img/caras/por-1.png");
  assertEq("ranura p5 → def-4",  rutaCaraRanura("t19-p5"),  "img/caras/def-4.png");
  assertEq("ranura p8 → med-1",  rutaCaraRanura("t19-p8"),  "img/caras/med-1.png");
  assertEq("ranura p17 → del-4", rutaCaraRanura("t19-p17"), "img/caras/del-4.png");
  assertEq("índice fuera de plantilla → null", rutaCaraRanura("t19-p99"), null);
  assertEq("id sin formato → null", rutaCaraRanura("basura"), null);

  // las ranuras coinciden con las posiciones que reparte generar Liga
  const eq=generarLiga(()=>0.5)[19];
  const coincide=eq.jugadores.every(j=>{
    const pos=rutaCaraRanura(j.id).split("/").pop().split("-")[0];
    return pos===grupoPosicion(j.posicion).toLowerCase();
  });
  assert("ranura coincide con la posición real de los 18 jugadores", coincide);
});

if(false) suite("partido2d.js legado", ()=>{
  function eq(id, formacion){
    const js=[]; let k=0; const comp={POR:1, ...FORMACIONES[formacion]};
    Object.entries(comp).forEach(([pos,c])=>{ for(let i=0;i<c;i++)
      js.push(crearJugador({id:id+"-p"+(k++),nombre:"Ape Llido",posicion:pos,edad:25,
        ataque:70,defensa:70,velocidad:70,pase:70,fisico:70,portero:70})); });
    const e=crearEquipo({id,ciudad:"Z",nivel:3}); e.jugadores=js; e.formacion=formacion;
    e.titulares=js.map(j=>j.id); return e;
  }
  const A=eq("a","4-4-2"), B=eq("b","4-4-2");
  const goles=[{minuto:20,equipoId:"a",jugadorId:"a-p9"},
               {minuto:35,equipoId:"a",jugadorId:"a-p10"},
               {minuto:70,equipoId:"b",jugadorId:"b-p9"}];
  const S=nuevaSim2D(A,B,goles,9000); // dur 9s => 90'
  for(let i=0;i<320;i++) S.paso(30);   // ~9.6s de simulación
  assert("el reloj llega a 90'", S.min>=88);
  assert("marcador refleja los goles (2-1)", S.gl===2 && S.gv===1);
  // los bloques se desplazaron (la línea sube/baja según posesión y balón)
  assert("los bloques se movieron", Math.abs(S.offL)>0.5 || Math.abs(S.offR)>0.5);
  // los jugadores de campo se movieron de su posición base
  const movidos=S.L.filter(p=>p.pos!=="POR" && (Math.abs(p.cx-p.bx)>0.5||Math.abs(p.cy-p.by)>0.5)).length;
  assert("los jugadores se movieron de su base", movidos>=5);
  // el balón terminó dentro de la cancha (no se fue a NaN)
  assert("balón en rango", S.ballX>=0 && S.ballX<=100 && S.ballY>=0 && S.ballY<=100);
  // determinismo de posición inicial (mapa de slots)
  const m=_p2dMapa({pos:"POR",x:50,y:90}, true);
  assert("portero izquierdo cerca de su arco", m.x<10);
});

suite("match-visual.ts", ()=>{
  const timeline=MatchVisual.createDemoTimeline(), roster=MatchVisual.createDemoRoster();
  const player=new MatchVisual.EventPlayer(timeline,roster);
  assertEq("demo dura 15 segundos", Math.round(timeline.duration), 15);
  assert("incluye los eventos principales", ["MATCH_START","KICK_OFF","PASS","BALL_RECEIVED","DRIBBLE","SHOT","GOAL","POSSESSION_CHANGE"].every(tipo=>timeline.events.some(evento=>evento.type===tipo)));
  const medioPase=player.sample(1.25);
  assert("el balón se interpola durante el pase", medioPase.ball.x<50 && medioPase.ball.x>42 && medioPase.ball.y>50 && medioPase.ball.y<58);
  const trasConduccion=player.sample(6.7).players.get("home-10");
  assert("la conducción mueve al actor", trasConduccion.x>68 && trasConduccion.y>41);
  const final=player.sample(11);
  assert("el gol termina dentro de la cancha", final.ball.x===98 && final.ball.y===50);
  assertEq("easeInOutCubic conserva los extremos", MatchVisual.easeInOutCubic(0)+MatchVisual.easeInOutCubic(1), 1);
});

suite("partido 2D real", ()=>{
  function equipoVisual(id, formacion, enfoque, linea){
    const posiciones=["POR","DEF","DEF","DEF","DEF","MED","MED","MED","MED","DEL","DEL"];
    const jugadores=posiciones.map((posicion,i)=>({id:id+"-"+i,nombre:"Jugador "+(i+1),posicion}));
    return {id,nombre:"Equipo "+id,formacion,tactica:{enfoque,linea},jugadores,titulares:jugadores.map(j=>j.id)};
  }
  const local=equipoVisual("l","4-3-3","ofensivo",70), visita=equipoVisual("v","5-4-1","defensivo",35);
  const real=MatchVisual.createMatchTimeline(local,visita,[
    {equipoId:"l",jugadorId:"l-9",minuto:18}, {equipoId:"v",jugadorId:"v-10",minuto:77}
  ]);
  assertEq("muestra 22 titulares", real.roster.length, 22);
  assertEq("cada gol genera una secuencia completa", real.timeline.events.filter(e=>e.type==="GOAL").length, 2);
  const golLocal=real.timeline.events.find(e=>e.id==="goal-0");
  assertEq("conserva el minuto real", golLocal.metadata.minuto, 18);
  assertEq("conserva el goleador real", golLocal.metadata.jugadorId, "l-9");
  assert("la duracion queda en rango de partido comprimido", real.timeline.duration>=45 && real.timeline.duration<=90);
  const fueras=real.timeline.events.filter(e=>e.type==="BALL_OUT");
  const reanudaciones=real.timeline.events.filter(e=>["THROW_IN","GOAL_KICK","CORNER_KICK"].includes(e.type));
  assert("incluye pausas por balon fuera", fueras.length>=1 && fueras.every(e=>e.metadata.setPiece===true));
  assert("incluye banda, meta y esquina", ["THROW_IN","GOAL_KICK","CORNER_KICK"].every(tipo=>reanudaciones.some(e=>e.type===tipo)));
  const movimientosCorner=real.timeline.events.filter(e=>e.type==="PLAYER_MOVE"&&e.metadata.type==="CORNER_KICK");
  const porteros=new Set(real.roster.filter(p=>p.role==="POR").map(p=>p.id));
  assert("el córner carga a los jugadores de campo al área", movimientosCorner.length>=19 && movimientosCorner.every(e=>!porteros.has(e.actorId)));
  assertEq("cada gol reinicia desde el centro", real.timeline.events.filter(e=>e.type==="KICK_OFF"&&e.metadata.restart===true).length, real.timeline.events.filter(e=>e.type==="GOAL").length);
  assert("los locales arrancan en su mitad", real.roster.filter(p=>p.team==="home").every(p=>p.position.x<50));
  assert("los visitantes arrancan en su mitad", real.roster.filter(p=>p.team==="away").every(p=>p.position.x>50));
  const visual=new MatchVisual.EventPlayer(real.timeline,real.roster);
  const inicio=visual.sample(0), enAtaque=visual.sample(12);
  const moviles=real.roster.filter(p=>p.role!=="POR" && Math.abs(inicio.players.get(p.id).x-enAtaque.players.get(p.id).x)>.1);
  assert("el bloque acompana la jugada", moviles.length>=10);
  const sinGoles=MatchVisual.createMatchTimeline(local,visita,[]), juegoContinuo=new MatchVisual.EventPlayer(sinGoles.timeline,sinGoles.roster);
  const parada=juegoContinuo.sample(.5), circulando=juegoContinuo.sample(3);
  assert("sin goles el balon sigue circulando", Math.abs(parada.ball.x-circulando.ball.x)>2 || Math.abs(parada.ball.y-circulando.ball.y)>2);
  const bloqueActivo=sinGoles.roster.filter(p=>p.role!=="POR" && Math.hypot(parada.players.get(p.id).x-circulando.players.get(p.id).x,parada.players.get(p.id).y-circulando.players.get(p.id).y)>.4);
  assert("sin goles ambos bloques se reacomodan", bloqueActivo.length>=12);
  const ataqueProfundo=juegoContinuo.sample(5);
  assert("los delanteros atacan el área rival con posesión", sinGoles.roster.filter(p=>p.team==="home"&&p.role==="DEL").some(p=>ataqueProfundo.players.get(p.id).x>78));
});

suite("simulation core", ()=>{
  const entradas=[
    {id:"h-por",team:"home",role:"POR",position:{x:6,y:34},speed:65,passing:60,stamina:1},
    {id:"h-med",team:"home",role:"MED",position:{x:35,y:34},speed:72,passing:78,stamina:1},
    {id:"h-del",team:"home",role:"DEL",position:{x:46,y:28},speed:80,passing:68,stamina:1},
    {id:"a-por",team:"away",role:"POR",position:{x:99,y:34},speed:65,passing:60,stamina:1},
    {id:"a-med",team:"away",role:"MED",position:{x:70,y:34},speed:72,passing:75,stamina:1},
    {id:"a-del",team:"away",role:"DEL",position:{x:60,y:40},speed:80,passing:65,stamina:1}
  ];
  const aleatorioA=new MatchVisual.SeededRandom(991), aleatorioB=new MatchVisual.SeededRandom(991);
  assert("misma semilla produce la misma secuencia", [aleatorioA.next(),aleatorioA.next(),aleatorioA.next()].join(",")===[aleatorioB.next(),aleatorioB.next(),aleatorioB.next()].join(","));
  const a=new MatchVisual.TacticalMatchSimulation(entradas,77), b=new MatchVisual.TacticalMatchSimulation(entradas,77);
  for(let i=0;i<40;i++){ a.step(100); b.step(100); }
  assertEq("paso fijo es determinista", JSON.stringify(a.snapshot()), JSON.stringify(b.snapshot()));
  const estado=a.snapshot();
  assert("jugadores y balón se mantienen dentro de la cancha", estado.ball.x>=0&&estado.ball.x<=105&&estado.ball.y>=0&&estado.ball.y<=68&&estado.players.every(p=>p.position.x>=0&&p.position.x<=105&&p.position.y>=0&&p.position.y<=68));
  assert("el motor registra decisiones de pase", a.eventLog().some(e=>e.type==="PASS_ATTEMPTED"));
  const replay=new MatchVisual.SimulationReplay(entradas,6,77), medio=replay.sample(2.55);
  assert("el replay interpola entre snapshots", medio.time>2.5&&medio.time<2.6&&medio.players.length===entradas.length);
  const conTresDelanteros=entradas.concat([
    {id:"h-del-2",team:"home",role:"DEL",position:{x:44,y:18},speed:78,passing:65,stamina:1},
    {id:"h-del-3",team:"home",role:"DEL",position:{x:44,y:50},speed:77,passing:64,stamina:1}
  ]);
  const forma=new MatchVisual.TacticalMatchSimulation(conTresDelanteros,77); for(let i=0;i<50;i++) forma.step(100);
  const ataque=forma.snapshot(), puntas=ataque.players.filter(p=>p.team==="home"&&p.id.indexOf("h-del")===0).map(p=>p.position.x);
  assert("los delanteros escalonan su profundidad", Math.max(...puntas)-Math.min(...puntas)>7);
  assert("los jugadores respetan un margen de cancha", ataque.players.every(p=>p.position.x>=2&&p.position.x<=103&&p.position.y>=2&&p.position.y<=66));
  const lineas=conTresDelanteros.concat([
    {id:"h-def-1",team:"home",role:"DEF",position:{x:20,y:12},speed:70,passing:66,stamina:1},
    {id:"h-def-2",team:"home",role:"DEF",position:{x:20,y:27},speed:69,passing:67,stamina:1},
    {id:"h-def-3",team:"home",role:"DEF",position:{x:20,y:42},speed:71,passing:66,stamina:1},
    {id:"h-def-4",team:"home",role:"DEF",position:{x:20,y:57},speed:70,passing:65,stamina:1},
    {id:"a-def-1",team:"away",role:"DEF",position:{x:85,y:12},speed:70,passing:66,stamina:1},
    {id:"a-def-2",team:"away",role:"DEF",position:{x:85,y:27},speed:69,passing:67,stamina:1},
    {id:"a-def-3",team:"away",role:"DEF",position:{x:85,y:42},speed:71,passing:66,stamina:1},
    {id:"a-def-4",team:"away",role:"DEF",position:{x:85,y:57},speed:70,passing:65,stamina:1}
  ]), movimientos=new MatchVisual.TacticalMatchSimulation(lineas,193), inicio=new Map(movimientos.snapshot().players.map(p=>[p.id,p.position]));
  for(let i=0;i<18;i++) movimientos.step(100);
  const finalMovimientos=movimientos.snapshot().players;
  ["home","away"].forEach(equipo=>{
    const firmas=finalMovimientos.filter(p=>p.team===equipo&&p.id.indexOf("def-")>0).map(p=>{
      const antes=inicio.get(p.id); return `${(p.position.x-antes.x).toFixed(1)},${(p.position.y-antes.y).toFixed(1)}`;
    });
    assert(`la defensa ${equipo} reacciona con movimientos individuales`,new Set(firmas).size>=3);
  });
});
