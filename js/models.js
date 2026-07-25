function crearJugador(o){
  return { id:o.id, nombre:o.nombre, posicion:o.posicion, edad:o.edad,
    // atributos de juego (40-95); fisico influye en el cansancio; portero solo pesa en el POR
    ataque:o.ataque, defensa:o.defensa, velocidad:o.velocidad,
    pase:o.pase, fisico:o.fisico, portero:o.portero,
    // datos de ficha
    estatura:o.estatura, pieDominante:o.pieDominante,
    cansancio:0, forma:0, experiencia:0 };
}
function crearEquipo(o){
  return { id:o.id, nombre:"Club "+o.ciudad, ciudad:o.ciudad, nivel:o.nivel,
    esHumano:false, jugadores:[], formacion:"4-4-2", titulares:[],
    // táctica: enfoque desplaza ataque/defensa; linea (0-100) es la altura defensiva
    tactica:{ enfoque:"equilibrado", linea:50 } };
}
function crearPartido(o){
  return { id:o.id, ronda:o.ronda, grupo:o.grupo||null, jornada:o.jornada||null,
    localId:o.localId, visitanteId:o.visitanteId,
    golesLocal:0, golesVisitante:0, jugado:false, goleadores:[] };
}
