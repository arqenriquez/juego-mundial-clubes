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
