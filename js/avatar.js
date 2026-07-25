// Rostros de jugador. Dos capas:
//   caraSVG(semilla) -> cadena SVG pura y determinista (sin DOM, testeable)
//   avatarHTML(...)  -> <img> con respaldo a imagen de ranura y luego a caraSVG

// Clubes que tienen fotos propias en img/caras/. Añade ids ("t7") al subir más.
// Los que no están en la lista van directos al rostro procedural, sin peticiones fallidas.
const EQUIPOS_CON_CARAS = ["t19"];

const RUTA_CARAS = "img/caras/";

// Reparto fijo de plantilla que genera generator.js: 2 POR, 6 DEF, 6 MED, 4 DEL
const _RANURAS = ["por","por","def","def","def","def","def","def",
                  "med","med","med","med","med","med","del","del","del","del"];

const _PIELES = ["#f0cdb0","#e0b28f","#c78d63","#9b6238","#6d4527"];
const _PELOS  = ["#2e2219","#5a3a22","#1b1a1e","#8b6a3e"];

// Fondo del avatar. Deliberadamente más claro que el panel: sobre el fondo oscuro de la app
// los pelos casi negros desaparecían y todos los jugadores parecían calvos.
const _FONDO   = "#5a6678";
const _HOMBROS = "#39424f";

// FNV-1a de 32 bits: barato, determinista y con buena dispersión de bits
function _hashCara(txt){
  let h = 0x811c9dc5;
  const s = String(txt);
  for(let i=0; i<s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

function _rasgos(semilla){
  const h = _hashCara(semilla);
  return {
    piel:    _PIELES[h % _PIELES.length],
    pelo:    _PELOS[(h >>> 3) % _PELOS.length],
    peinado: (h >>> 7) % 6,
    ancho:   (h >>> 13) % 2,
    ceja:    (h >>> 17) % 3
  };
}

// Geometría de la cara. Va deliberadamente baja y corta: si la elipse de piel sube hasta la
// coronilla, la frente se come toda la cabeza y cualquier peinado queda en un aro fino que
// se lee como entradas, no como pelo. Con la cara arrancando en y=9.8 el pelo ocupa el
// tercio superior, que es como se dibuja un peinado plano.
const _CARA_CY = 19.4, _CARA_RY = 9.6;   // piel: de y=9.8 a y=29

// [centroY, radioY, sobresaleX] de la masa de pelo por peinado
const _GORRAS = [[15.2,12.6,2.10],[15.0,12.8,2.20],[14.8,13.0,2.40],
                 [18.0,10.2,0.60],[15.4,12.5,2.00],[15.2,12.6,2.10]];

function _adornoPelo(peinado, rx, pelo, cimaPelo){
  const L = 20 - rx;
  if(peinado === 1){ // raya: mechón barrido sobre la frente
    return `<path d="M${(L-1.4).toFixed(1)} 16.5 Q${(L-0.6).toFixed(1)} ${(cimaPelo+1.5).toFixed(1)} `+
           `20 ${(cimaPelo+1).toFixed(1)} Q${(L+4).toFixed(1)} 12.4 ${(L+0.6).toFixed(1)} 17.6 Z" `+
           `fill="${pelo}"/>`;
  }
  if(peinado === 2){ // rizado: bucles sobre la masa de pelo
    return [0.72, 0.26, -0.26, -0.72]
      .map(f=>`<circle cx="${(20 - rx*f).toFixed(1)}" cy="${(cimaPelo+2.6).toFixed(1)}" `+
              `r="2.7" fill="${pelo}"/>`)
      .join("");
  }
  if(peinado === 5){ // banda sobre la frente
    return `<rect x="${(L-1.2).toFixed(1)}" y="11.4" width="${(2*rx+2.4).toFixed(1)}" `+
           `height="2.9" rx="1.45" fill="#3fb950"/>`;
  }
  return "";
}

function _barba(rx, pelo){
  const L = (20 - rx + 0.3).toFixed(1), R = (20 + rx - 0.3).toFixed(1);
  const Li = (20 - rx + 2.2).toFixed(1), Ri = (20 + rx - 2.2).toFixed(1);
  return `<path d="M${L} 19.5 Q${L} 27.8 20 29.2 Q${R} 27.8 ${R} 19.5 `+
         `Q${Ri} 25.4 20 25.8 Q${Li} 25.4 ${L} 19.5 Z" fill="${pelo}" opacity=".92"/>`+
         `<ellipse cx="20" cy="23.4" rx="2.8" ry="1.05" fill="${pelo}" opacity=".92"/>`;
}

// Cadena SVG determinista para una semilla (normalmente el id del jugador)
function caraSVG(semilla){
  const r  = _rasgos(semilla);
  const rx = r.ancho ? 9.4 : 8.6;
  const [pcy, pry, pdx] = _GORRAS[r.peinado];
  const cejaY = [16.4, 16.8, 17.2][r.ceja];
  const orejaD = (20 + rx + 1.1).toFixed(1);
  const orejaI = (20 - rx - 1.1).toFixed(1);

  return `<svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden="true">`+
    `<rect width="40" height="40" fill="${_FONDO}"/>`+
    `<rect x="16.5" y="24" width="7" height="9" rx="2" fill="${r.piel}"/>`+
    `<rect x="16.5" y="24" width="7" height="9" rx="2" fill="#000" opacity=".18"/>`+
    `<ellipse cx="20" cy="45" rx="16.5" ry="12" fill="${_HOMBROS}"/>`+
    `<ellipse cx="20" cy="${pcy}" rx="${(rx+pdx).toFixed(1)}" ry="${pry}" fill="${r.pelo}"/>`+
    // las orejas van sobre el pelo: si se dibujan antes, la masa de pelo las tapa
    `<ellipse cx="${orejaI}" cy="20" rx="1.7" ry="2.4" fill="${r.piel}"/>`+
    `<ellipse cx="${orejaD}" cy="20" rx="1.7" ry="2.4" fill="${r.piel}"/>`+
    `<ellipse cx="20" cy="${_CARA_CY}" rx="${rx}" ry="${_CARA_RY}" fill="${r.piel}"/>`+
    _adornoPelo(r.peinado, rx, r.pelo, pcy - pry)+
    `<rect x="15.15" y="${cejaY}" width="2.9" height=".85" rx=".42" fill="${r.pelo}" opacity=".92"/>`+
    `<rect x="21.95" y="${cejaY}" width="2.9" height=".85" rx=".42" fill="${r.pelo}" opacity=".92"/>`+
    `<ellipse cx="16.6" cy="19.2" rx="1.15" ry="1.45" fill="#20242b"/>`+
    `<ellipse cx="23.4" cy="19.2" rx="1.15" ry="1.45" fill="#20242b"/>`+
    (r.peinado === 4 ? _barba(rx, r.pelo) : "")+
    `<path d="M17.4 24.6 Q20 26.2 22.6 24.6" stroke="#7a4234" stroke-width=".9" `+
      `fill="none" stroke-linecap="round"/>`+
    `</svg>`;
}

// "t19-p5" -> 5 (o null si el id no tiene el formato esperado)
function _indiceJugador(idJugador){
  const partes = String(idJugador).split("-p");
  if(partes.length !== 2) return null;
  const n = parseInt(partes[1], 10);
  return (n >= 0 && n < _RANURAS.length) ? n : null;
}

// "t19-p5" -> "img/caras/t19-p5.png"
function rutaCaraJugador(idJugador){ return RUTA_CARAS + idJugador + ".png"; }

// "t19-p5" -> "img/caras/def-4.png" (p2..p7 son DEF, así que p5 es el cuarto)
function rutaCaraRanura(idJugador){
  const n = _indiceJugador(idJugador);
  if(n === null) return null;
  const pos = _RANURAS[n];
  return RUTA_CARAS + pos + "-" + (n - _RANURAS.indexOf(pos) + 1) + ".png";
}

function _clubTieneCaras(equipoId){ return EQUIPOS_CON_CARAS.indexOf(equipoId) >= 0; }

// Respaldo en cadena: foto del jugador -> foto de la ranura -> cara procedural
function _falloCara(img){
  if(img.dataset.paso === "0" && img.dataset.alt2){
    img.dataset.paso = "1";
    img.src = img.dataset.alt2;
    return;
  }
  img.outerHTML = caraSVG(img.dataset.sem);
}

function avatarHTML(jugador, equipoId, tam){
  const px = tam || 28;
  const id = jugador && jugador.id ? jugador.id : "?";
  const ranura = rutaCaraRanura(id);
  const cuerpo = _clubTieneCaras(equipoId)
    ? `<img src="${rutaCaraJugador(id)}" alt="" loading="lazy" data-paso="0" `+
      `data-alt2="${ranura || ""}" data-sem="${id}" onerror="_falloCara(this)">`
    : caraSVG(id);
  // el recorte circular lo hace el contenedor, así se evitan clipPath e ids duplicados
  return `<span class="avatar" style="--t:${px}px">${cuerpo}</span>`;
}
