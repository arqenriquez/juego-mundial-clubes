// Las pruebas se agregan aquí conforme avanzan las tareas.

suite("data.js", ()=>{
  assertEq("hay 32 ciudades", CIUDADES.length, 32);
  assert("ciudades únicas", new Set(CIUDADES).size===32);
  assert("hay nombres", NOMBRES.length>=15);
  assert("hay apellidos", APELLIDOS.length>=15);
  assertEq("4-4-2 defensas", FORMACIONES["4-4-2"].DEF, 4);
  assertEq("4-3-3 delanteros", FORMACIONES["4-3-3"].DEL, 3);
  assertEq("3-5-2 medios", FORMACIONES["3-5-2"].MED, 5);
});

suite("models.js", ()=>{
  const j = crearJugador({id:"x", nombre:"A B", posicion:"DEL", edad:20,
    ataque:80, defensa:50, velocidad:75, resistencia:60});
  assertEq("jugador cansancio inicial", j.cansancio, 0);
  assertEq("jugador forma inicial", j.forma, 0);
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
  // equipos de mayor nivel tienen mejor media
  const media = t=> t.jugadores.reduce((s,j)=>s+(j.ataque+j.defensa+j.velocidad)/3,0)/t.jugadores.length;
  const fuerte = liga.find(t=>t.nivel===5), debil = liga.find(t=>t.nivel===1);
  if(fuerte && debil) assert("nivel 5 >= nivel 1", media(fuerte)>=media(debil));
});

suite("mechanics.js", ()=>{
  const base=()=>crearJugador({id:"x",nombre:"A",posicion:"MED",edad:20,
    ataque:60,defensa:60,velocidad:60,resistencia:50});
  // cansancio sube al jugar
  let j=base(); aplicarCansancio(j,true);
  assert("cansancio sube al jugar", j.cansancio>0 && j.cansancio<=100);
  // más resistencia = se cansa menos
  let a=base(); a.resistencia=90; let b=base(); b.resistencia=40;
  aplicarCansancio(a,true); aplicarCansancio(b,true);
  assert("más resistencia se cansa menos", a.cansancio < b.cansancio);
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
  let jTope=base(); jTope.edad=20; jTope.experiencia=95; jTope.resistencia=95;
  let rTope=aplicarProgresion(jTope,true,()=>0.99); // rng elige indice 3 = "resistencia"
  assertEq("atributo topado en 95 no sube", jTope.resistencia, 95);
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
          ataque:rating,defensa:rating,velocidad:rating,resistencia:80}));
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
