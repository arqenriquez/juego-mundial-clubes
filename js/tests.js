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
