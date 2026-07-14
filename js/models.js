function crearJugador(o){
  return { id:o.id, nombre:o.nombre, posicion:o.posicion, edad:o.edad,
    ataque:o.ataque, defensa:o.defensa, velocidad:o.velocidad, resistencia:o.resistencia,
    cansancio:0, forma:0, experiencia:0 };
}
function crearEquipo(o){
  return { id:o.id, nombre:"Club "+o.ciudad, ciudad:o.ciudad, nivel:o.nivel,
    esHumano:false, jugadores:[], formacion:"4-4-2", titulares:[] };
}
function crearPartido(o){
  return { id:o.id, ronda:o.ronda, grupo:o.grupo||null, jornada:o.jornada||null,
    localId:o.localId, visitanteId:o.visitanteId,
    golesLocal:0, golesVisitante:0, jugado:false, goleadores:[] };
}
