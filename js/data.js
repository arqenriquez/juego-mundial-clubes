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
const FORMACIONES = {
  "4-4-2": { DEF:4, MED:4, DEL:2 },
  "4-3-3": { DEF:4, MED:3, DEL:3 },
  "3-5-2": { DEF:3, MED:5, DEL:2 }
}; // siempre + 1 POR

// Posiciones en la cancha para cada formación (x,y en % ; y pequeña = ataque arriba, POR abajo).
// El orden de los slots define el orden del arreglo titulares (índice = slot).
const FORMACION_SLOTS = {
  "4-4-2": [
    {pos:"POR",x:50,y:90},
    {pos:"DEF",x:16,y:70},{pos:"DEF",x:39,y:70},{pos:"DEF",x:61,y:70},{pos:"DEF",x:84,y:70},
    {pos:"MED",x:16,y:44},{pos:"MED",x:39,y:44},{pos:"MED",x:61,y:44},{pos:"MED",x:84,y:44},
    {pos:"DEL",x:36,y:18},{pos:"DEL",x:64,y:18}
  ],
  "4-3-3": [
    {pos:"POR",x:50,y:90},
    {pos:"DEF",x:16,y:70},{pos:"DEF",x:39,y:70},{pos:"DEF",x:61,y:70},{pos:"DEF",x:84,y:70},
    {pos:"MED",x:27,y:46},{pos:"MED",x:50,y:46},{pos:"MED",x:73,y:46},
    {pos:"DEL",x:22,y:18},{pos:"DEL",x:50,y:15},{pos:"DEL",x:78,y:18}
  ],
  "3-5-2": [
    {pos:"POR",x:50,y:90},
    {pos:"DEF",x:26,y:72},{pos:"DEF",x:50,y:72},{pos:"DEF",x:74,y:72},
    {pos:"MED",x:12,y:46},{pos:"MED",x:31,y:46},{pos:"MED",x:50,y:44},{pos:"MED",x:69,y:46},{pos:"MED",x:88,y:46},
    {pos:"DEL",x:36,y:18},{pos:"DEL",x:64,y:18}
  ]
};
