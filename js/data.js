const CIUDADES = [
  "Tokio","São Paulo","El Cairo","Río","Londres","Madrid","Berlín","Roma",
  "París","Ámsterdam","Lisboa","Buenos Aires","Bogotá","Lima","Santiago","Montevideo",
  "Nueva York","Toronto","Ciudad de México","Guadalajara","Seúl","Osaka","Shanghái","Bangkok",
  "Sídney","Auckland","Casablanca","Lagos","Nairobi","Estambul","Moscú","Dubái"
];
const NOMBRES = ["Luis","Marco","Diego","Iván","Andrés","Pablo","Hugo","Kenji","Omar","Youssef",
  "Bruno","Thiago","Nicolás","Kwame","Sergei","Mateo","Aldo","Ricardo","Farid","Leon",
  "Hassan","Juan","Emeka","Tomás","Rafa"];
const APELLIDOS = ["Fabri","Montes","Vega","Ríos","Salas","Duarte","Okafor","Tanaka","Rossi","Kane",
  "Bauer","Silva","Costa","Mensah","Ivanov","Cruz","Navarro","Blanco","Aziz","Park",
  "Herrera","Lima","Adeyemi","Sato","Mora"];
const NACIONALIDADES = ["Argentina","Brasil","México","España","Inglaterra","Italia","Alemania","Francia",
  "Portugal","Uruguay","Colombia","Japón","Corea del Sur","Nigeria","Marruecos","Turquía"];
const FORMACIONES = {
  "4-4-2": { DEF:4, MED:4, DEL:2 },
  "4-3-3": { DEF:4, MED:3, DEL:3 },
  "3-5-2": { DEF:3, MED:5, DEL:2 },
  "4-2-3-1": { DEF:4, MED:5, DEL:1 },
  "4-3-1-2": { DEF:4, MED:4, DEL:2 },
  "4-1-4-1": { DEF:4, MED:5, DEL:1 },
  "4-4-1-1": { DEF:4, MED:5, DEL:1 },
  "3-4-3": { DEF:3, MED:4, DEL:3 },
  "5-3-2": { DEF:5, MED:3, DEL:2 },
  "5-4-1": { DEF:5, MED:4, DEL:1 }
}; // siempre + 1 POR

// Posiciones tácticas: un jugador tiene una posición principal y puede tener alternativas.
// El grupo permite que el motor siga evaluando DEF/MED/DEL sin perder el detalle visual.
const GRUPO_POSICION = {
  POR:"POR", LI:"DEF", DFC:"DEF", LD:"DEF",
  MCD:"MED", MC:"MED", MCO:"MED", EI:"DEL", ED:"DEL", DC:"DEL",
  // Compatibilidad con partidas creadas antes de las posiciones específicas.
  DEF:"DEF", MED:"MED", DEL:"DEL"
};
function grupoPosicion(posicion){ return GRUPO_POSICION[posicion] || "MED"; }
function puedeJugarEn(jugador, posicion){
  const posiciones=jugador.posiciones && jugador.posiciones.length ? jugador.posiciones : [jugador.posicion];
  return posiciones.includes(posicion);
}

// Roles por posición. off/def son multiplicadores al aporte del jugador en el motor.
const ROLES = {
  POR: {
    clasico: { nombre:"Clásico", desc:"Portero clásico: se queda en su área y prioriza atajar.", off:1.00, def:1.05 },
    salida:  { nombre:"Salida limpia", desc:"Juega con los pies y ayuda a construir desde atrás.", off:1.05, def:0.99 }
  },
  LI: {
    defender: { nombre:"Lateral defensivo", desc:"Prioriza la marca y cierra su banda.", off:0.94, def:1.08 },
    carrilero: { nombre:"Carrilero", desc:"Se proyecta por fuera para apoyar el ataque.", off:1.12, def:0.93 }
  },
  LD: {
    defender: { nombre:"Lateral defensivo", desc:"Prioriza la marca y cierra su banda.", off:0.94, def:1.08 },
    carrilero: { nombre:"Carrilero", desc:"Se proyecta por fuera para apoyar el ataque.", off:1.12, def:0.93 }
  },
  DFC: { central: { nombre:"Central", desc:"Ordena la defensa y domina el área.", off:0.95, def:1.08 },
    salida: { nombre:"Salida limpia", desc:"Inicia el juego desde el fondo.", off:1.05, def:0.98 } },
  MCD: { ancla: { nombre:"Ancla", desc:"Protege a los centrales y recupera balones.", off:0.90, def:1.12 },
    organizador: { nombre:"Pivote creador", desc:"Recibe atrás y distribuye el juego.", off:1.06, def:0.96 } },
  MC: { completo: { nombre:"Completo", desc:"Box-to-box: equilibra defensa y ataque.", off:1.00, def:1.00 },
    volante: { nombre:"Volante", desc:"Llega al área y arriesga en ataque.", off:1.12, def:0.90 } },
  MCO: { enganche: { nombre:"Enganche", desc:"Crea entre líneas y alimenta a los delanteros.", off:1.12, def:0.88 },
    llegada: { nombre:"Llegador", desc:"Ataca el área desde segunda línea.", off:1.10, def:0.92 } },
  EI: { extremo: { nombre:"Extremo", desc:"Desborda abierto por la izquierda.", off:1.08, def:0.95 },
    interior: { nombre:"Interior", desc:"Se cierra para asociarse y rematar.", off:1.10, def:0.92 } },
  ED: { extremo: { nombre:"Extremo", desc:"Desborda abierto por la derecha.", off:1.08, def:0.95 },
    interior: { nombre:"Interior", desc:"Se cierra para asociarse y rematar.", off:1.10, def:0.92 } },
  DC: { cazagol: { nombre:"Cazagol", desc:"Finaliza las jugadas dentro del área.", off:1.12, def:1.00 },
    presion: { nombre:"Presionante", desc:"Molesta la salida rival desde el frente.", off:1.06, def:1.04 } },
  // Roles de compatibilidad para partidas anteriores.
  DEF: { defender:{nombre:"Defender",desc:"Prioriza la marca.",off:.94,def:1.08}, apoyar:{nombre:"Apoyar",desc:"Se suma al ataque.",off:1.12,def:.93} },
  MED: { contencion:{nombre:"Contención",desc:"Recupera balones.",off:.90,def:1.12}, completo:{nombre:"Completo",desc:"Equilibra el juego.",off:1,def:1}, volante:{nombre:"Volante",desc:"Tiene llegada.",off:1.12,def:.90} },
  DEL: { cazagol:{nombre:"Cazagol",desc:"Finaliza en el área.",off:1.12,def:1}, extremo:{nombre:"Extremo",desc:"Juega abierto.",off:1.08,def:.95} }
};
const ROL_DEFAULT = { POR:"clasico", LI:"defender", DFC:"central", LD:"defender", MCD:"ancla",
  MC:"completo", MCO:"enganche", EI:"extremo", ED:"extremo", DC:"cazagol",
  DEF:"defender", MED:"completo", DEL:"cazagol" };

// Posiciones en la cancha para cada formación (x,y en % ; y pequeña = ataque arriba, POR abajo).
// El orden de los slots define el orden del arreglo titulares (índice = slot).
const FORMACION_SLOTS = {
  "4-4-2": [
    {pos:"POR",x:50,y:90}, {pos:"LI",x:16,y:70},{pos:"DFC",x:39,y:70},{pos:"DFC",x:61,y:70},{pos:"LD",x:84,y:70},
    {pos:"EI",x:16,y:44},{pos:"MC",x:39,y:44},{pos:"MC",x:61,y:44},{pos:"ED",x:84,y:44}, {pos:"DC",x:36,y:18},{pos:"DC",x:64,y:18}
  ],
  "4-3-3": [
    {pos:"POR",x:50,y:90}, {pos:"LI",x:16,y:70},{pos:"DFC",x:39,y:70},{pos:"DFC",x:61,y:70},{pos:"LD",x:84,y:70},
    {pos:"MCD",x:27,y:46},{pos:"MC",x:50,y:46},{pos:"MCO",x:73,y:46}, {pos:"EI",x:22,y:18},{pos:"DC",x:50,y:15},{pos:"ED",x:78,y:18}
  ],
  "3-5-2": [
    {pos:"POR",x:50,y:90}, {pos:"DFC",x:26,y:72},{pos:"DFC",x:50,y:72},{pos:"DFC",x:74,y:72},
    {pos:"LI",x:12,y:46},{pos:"MC",x:31,y:46},{pos:"MCD",x:50,y:44},{pos:"MC",x:69,y:46},{pos:"LD",x:88,y:46}, {pos:"DC",x:36,y:18},{pos:"DC",x:64,y:18}
  ],
  "4-2-3-1": [
    {pos:"POR",x:50,y:90}, {pos:"LI",x:16,y:72},{pos:"DFC",x:39,y:72},{pos:"DFC",x:61,y:72},{pos:"LD",x:84,y:72},
    {pos:"MCD",x:38,y:56},{pos:"MC",x:62,y:56}, {pos:"EI",x:20,y:35},{pos:"MCO",x:50,y:31},{pos:"ED",x:80,y:35}, {pos:"DC",x:50,y:13}
  ],
  "4-3-1-2": [
    {pos:"POR",x:50,y:90}, {pos:"LI",x:16,y:72},{pos:"DFC",x:39,y:72},{pos:"DFC",x:61,y:72},{pos:"LD",x:84,y:72},
    {pos:"MCD",x:27,y:51},{pos:"MC",x:50,y:48},{pos:"MC",x:73,y:51}, {pos:"MCO",x:50,y:31}, {pos:"DC",x:36,y:14},{pos:"DC",x:64,y:14}
  ],
  "4-1-4-1": [
    {pos:"POR",x:50,y:90}, {pos:"LI",x:16,y:72},{pos:"DFC",x:39,y:72},{pos:"DFC",x:61,y:72},{pos:"LD",x:84,y:72},
    {pos:"MCD",x:50,y:57}, {pos:"EI",x:16,y:37},{pos:"MC",x:39,y:38},{pos:"MC",x:61,y:38},{pos:"ED",x:84,y:37}, {pos:"DC",x:50,y:13}
  ],
  "4-4-1-1": [
    {pos:"POR",x:50,y:90}, {pos:"LI",x:16,y:72},{pos:"DFC",x:39,y:72},{pos:"DFC",x:61,y:72},{pos:"LD",x:84,y:72},
    {pos:"EI",x:16,y:48},{pos:"MC",x:39,y:48},{pos:"MC",x:61,y:48},{pos:"ED",x:84,y:48}, {pos:"MCO",x:50,y:29}, {pos:"DC",x:50,y:12}
  ],
  "3-4-3": [
    {pos:"POR",x:50,y:90}, {pos:"DFC",x:26,y:72},{pos:"DFC",x:50,y:72},{pos:"DFC",x:74,y:72},
    {pos:"LI",x:16,y:48},{pos:"MC",x:39,y:48},{pos:"MC",x:61,y:48},{pos:"LD",x:84,y:48}, {pos:"EI",x:22,y:17},{pos:"DC",x:50,y:13},{pos:"ED",x:78,y:17}
  ],
  "5-3-2": [
    {pos:"POR",x:50,y:90}, {pos:"LI",x:10,y:71},{pos:"DFC",x:29,y:75},{pos:"DFC",x:50,y:76},{pos:"DFC",x:71,y:75},{pos:"LD",x:90,y:71},
    {pos:"MCD",x:27,y:48},{pos:"MC",x:50,y:46},{pos:"MC",x:73,y:48}, {pos:"DC",x:36,y:16},{pos:"DC",x:64,y:16}
  ],
  "5-4-1": [
    {pos:"POR",x:50,y:90}, {pos:"LI",x:10,y:71},{pos:"DFC",x:29,y:75},{pos:"DFC",x:50,y:76},{pos:"DFC",x:71,y:75},{pos:"LD",x:90,y:71},
    {pos:"EI",x:16,y:46},{pos:"MC",x:39,y:48},{pos:"MC",x:61,y:48},{pos:"ED",x:84,y:46}, {pos:"DC",x:50,y:14}
  ]
};
