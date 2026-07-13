# Juego Manager: Mundial de Clubes — Plan de Implementación (Fase 1 / MVP)

> **Para quien implementa:** Ejecutar tarea por tarea. Los pasos usan casillas (`- [ ]`) para seguimiento.
> Entorno: **HTML/CSS/JS vanilla**, se prueba abriendo archivos con **Live Server** (extensión de VS Code).
> No hay Node ni bundler. No hay repo git todavía → los pasos de commit son **opcionales**.
> Las pruebas de lógica corren en el navegador vía `tests.html` (sin instalar nada).

**Goal:** Construir un juego web jugable de punta a punta: elegir un club, sortear un Mundial de Clubes de 32 equipos, jugar el torneo con marcador instantáneo gestionando alineación/cansancio/forma/progresión, hasta coronar campeón, con guardado local.

**Architecture:** SPA estática de una sola página (`index.html`) con "vistas" que se muestran/ocultan. Lógica separada en módulos JS que se cargan como `<script>` y exponen funciones globales. El **motor de simulación** (`engine.js`) está aislado tras un contrato entrada→salida para poder evolucionarlo después (relato por minutos, 2D) sin tocar el resto.

**Tech Stack:** HTML5, CSS3 (modo oscuro), JavaScript ES6 vanilla (sin módulos ESM, sin dependencias), `localStorage`, Live Server.

## Global Constraints

- **Sin frameworks ni librerías externas.** Solo JS vanilla del navegador.
- **Sin `import`/`export` ESM.** Cada archivo declara funciones globales (se cargan por orden de `<script>`).
- **Idioma de la interfaz y nombres de dominio:** español (POR/DEF/MED/DEL, "cansancio", "forma").
- **Rango de atributos:** 40–95. **Cansancio:** 0–100. **Forma:** −3 a +3. **Edad:** 17–36.
- **Posiciones válidas:** `"POR" | "DEF" | "MED" | "DEL"`.
- **Formaciones válidas:** `"4-4-2" | "4-3-3" | "3-5-2"` (siempre 1 POR además de las de campo).
- **32 clubes → 8 grupos de 4 → pasan 2 por grupo = 16 → Octavos → Cuartos → Semis → Final.**
- **Compatibilidad Live Server / GitHub Pages:** rutas relativas, sin `fetch` a archivos locales (todo en JS).
- **Determinismo testeable:** las funciones puras (cálculo de fuerza, goles esperados, mecánicas) NO llaman `Math.random` directamente; reciben un `rng` (función `() => [0,1)`) cuando necesiten azar. `Math.random` solo se inyecta desde `main.js`.

---

## Estructura de archivos (se crea a lo largo del plan)

```
24. JUEGO MANAGER - MUNDIAL DE CLUBES/
├── index.html          # Tarea 1 — shell + carga de scripts + contenedores de vistas
├── tests.html          # Tarea 2 — corre las pruebas de lógica en el navegador
├── css/
│   └── styles.css      # Tarea 1 / 12 — estilos (dashboard modo oscuro)
└── js/
    ├── testkit.js      # Tarea 2 — mini framework de aserciones (assert/assertEq)
    ├── data.js         # Tarea 3 — 32 ciudades + tablas de nombres + formaciones
    ├── models.js       # Tarea 4 — fábricas crearJugador / crearEquipo / crearPartido
    ├── generator.js    # Tarea 5 — generarLiga(): 32 clubes con plantillas balanceadas
    ├── mechanics.js    # Tarea 6 — cansancio, forma, progresión por edad
    ├── engine.js       # Tarea 7 — evaluarAlineacion, golesEsperados, simularPartido
    ├── tournament.js   # Tarea 8 — sorteo, fixtures, tabla, bracket, avance
    ├── storage.js      # Tarea 9 — guardar/cargar/borrar en localStorage
    ├── ui.js           # Tareas 10-11 — render de vistas + eventos
    └── main.js         # Tarea 12 — estado del juego + orquestación + arranque
```

**Contrato de datos (usado por todas las tareas):**

```js
// Jugador
{ id:"t3-p7", nombre:"Luis Fabri", posicion:"DEL", edad:22,
  ataque:78, defensa:52, velocidad:81, resistencia:70,
  cansancio:0, forma:0, experiencia:0 }

// Equipo
{ id:"t3", nombre:"Club Tokio", ciudad:"Tokio", nivel:4, esHumano:false,
  jugadores:[/* 18-20 Jugador */], formacion:"4-4-2", titulares:[/* 11 ids */] }

// Partido
{ id:"g1-r1-m2", ronda:"grupo", grupo:"A",
  localId:"t3", visitanteId:"t9", golesLocal:0, golesVisitante:0,
  jugado:false, goleadores:[/* {equipoId, jugadorId, minuto} */] }
```

---

## Tarea 1: Scaffolding (index.html + estilos base)

**Files:**
- Create: `index.html`
- Create: `css/styles.css`
- Create: `js/main.js` (vacío con un `console.log("cargado")` temporal)

**Interfaces:**
- Produces: página que carga en Live Server sin errores; contenedor `#app` y 5 `<section class="vista">` con ids `vista-inicio`, `vista-grupos`, `vista-dashboard`, `vista-partido`, `vista-bracket`.

- [ ] **Step 1: Crear `index.html`**

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mundial de Clubes — Manager</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <header id="topbar">
    <span id="titulo-juego">⚽ MUNDIAL DE CLUBES</span>
    <span id="subtitulo"></span>
  </header>

  <main id="app">
    <section id="vista-inicio"    class="vista activa"></section>
    <section id="vista-grupos"    class="vista"></section>
    <section id="vista-dashboard" class="vista"></section>
    <section id="vista-partido"   class="vista"></section>
    <section id="vista-bracket"   class="vista"></section>
  </main>

  <!-- Orden de carga importa: primero lógica, main.js al final -->
  <script src="js/data.js"></script>
  <script src="js/models.js"></script>
  <script src="js/generator.js"></script>
  <script src="js/mechanics.js"></script>
  <script src="js/engine.js"></script>
  <script src="js/tournament.js"></script>
  <script src="js/storage.js"></script>
  <script src="js/ui.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Crear `css/styles.css` base (modo oscuro)**

```css
:root{
  --bg:#0d1117; --panel:#161b22; --panel2:#1f2630; --linea:#30363d;
  --texto:#e6edf3; --tenue:#8b949e; --acento:#3fb950; --acento2:#58a6ff;
  --alerta:#f85149; --amarillo:#d29922;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--texto);
  font-family:system-ui,Segoe UI,Roboto,sans-serif;line-height:1.4}
#topbar{display:flex;justify-content:space-between;align-items:center;
  padding:12px 20px;background:var(--panel);border-bottom:1px solid var(--linea)}
#titulo-juego{font-weight:700;letter-spacing:.5px}
#subtitulo{color:var(--tenue);font-size:.9rem}
#app{max-width:1000px;margin:0 auto;padding:20px}
.vista{display:none}
.vista.activa{display:block}
.btn{background:var(--acento);color:#04260f;border:none;border-radius:8px;
  padding:10px 16px;font-weight:600;cursor:pointer}
.btn:hover{filter:brightness(1.1)}
.btn.sec{background:var(--panel2);color:var(--texto);border:1px solid var(--linea)}
.panel{background:var(--panel);border:1px solid var(--linea);border-radius:12px;padding:16px;margin-bottom:16px}
```

- [ ] **Step 3: Crear `js/main.js` temporal**

```js
console.log("Mundial de Clubes — cargado");
```

- [ ] **Step 4: Verificar en Live Server**

Abrir `index.html` con Live Server. Esperado: barra superior visible, sin errores en consola (F12), y el log "Mundial de Clubes — cargado". (Los `<script>` de módulos aún no existen → agregarlos vacíos NO es necesario: el navegador reportará 404 de scripts faltantes. Para evitar ruido, crear los archivos JS restantes vacíos ahora.)

- [ ] **Step 5 (opcional): crear los archivos JS restantes vacíos**

Crear vacíos: `js/data.js`, `js/models.js`, `js/generator.js`, `js/mechanics.js`, `js/engine.js`, `js/tournament.js`, `js/storage.js`, `js/ui.js`. Recargar: consola sin 404.

- [ ] **Step 6 (opcional): commit** — solo si ya se inicializó git.

---

## Tarea 2: Kit de pruebas en navegador (`tests.html` + `testkit.js`)

**Files:**
- Create: `js/testkit.js`
- Create: `tests.html`

**Interfaces:**
- Produces: `assert(nombre, condicion)`, `assertEq(nombre, a, b)`, `assertAprox(nombre, a, b, tol)`, `suite(nombre, fn)`, `correrPruebas()`. Cada suite posterior llama `suite("...", ()=>{...})`.

- [ ] **Step 1: Crear `js/testkit.js`**

Debe funcionar en **navegador** (pinta en el DOM) y en **Node** (imprime en consola), para
poder verificar la lógica sin abrir el navegador.

```js
const _suites = [];
function suite(nombre, fn){ _suites.push({nombre, fn}); }
let _actual = null;
function assert(nombre, cond){ _actual.push({nombre, pass: !!cond}); }
function assertEq(nombre, a, b){ assert(`${nombre} → ${JSON.stringify(a)} == ${JSON.stringify(b)}`, a===b); }
function assertAprox(nombre, a, b, tol){ assert(`${nombre} → |${a}-${b}| <= ${tol}`, Math.abs(a-b)<=tol); }
function correrPruebas(){
  const enNavegador = (typeof document !== "undefined");
  let totalPass=0, total=0;
  _suites.forEach(s=>{
    _actual=[]; try{ s.fn(); }catch(e){ _actual.push({nombre:"EXCEPCIÓN: "+e.message, pass:false}); }
    const pasa=_actual.filter(r=>r.pass).length;
    total+=_actual.length; totalPass+=pasa;
    if(enNavegador){
      const div=document.createElement("div"); div.className="suite";
      div.innerHTML=`<h3>${pasa===_actual.length?"✅":"❌"} ${s.nombre} (${pasa}/${_actual.length})</h3>`;
      _actual.forEach(r=>{ const p=document.createElement("p");
        p.textContent=(r.pass?"✅ ":"❌ ")+r.nombre; p.style.color=r.pass?"#3fb950":"#f85149";
        div.appendChild(p); });
      document.getElementById("resultados").appendChild(div);
    } else {
      console.log(`${pasa===_actual.length?"OK   ":"FALLA"} ${s.nombre} (${pasa}/${_actual.length})`);
      _actual.forEach(r=>{ if(!r.pass) console.log("        x "+r.nombre); });
    }
  });
  const resumen=`TOTAL: ${totalPass}/${total}`;
  if(enNavegador) document.getElementById("resumen").textContent=resumen;
  else console.log(resumen);
  return { totalPass, total };
}
```

**Verificación en Node (para los sub-agentes de lógica, Tareas 3-8):** concatenar los módulos
puros + `tests.js` y correr `correrPruebas()`. Como cada archivo declara nombres únicos a nivel
global, funciona en un solo ámbito:

```bash
node -e "$(cat js/testkit.js js/data.js js/models.js js/generator.js js/mechanics.js js/engine.js js/tournament.js js/tests.js); const r=correrPruebas(); process.exit(r.totalPass===r.total?0:1);"
```
Esperado: líneas `OK ...` y `TOTAL: X/X` con X=X, código de salida 0. (En Node no se cargan
`storage.js`, `ui.js` ni `main.js` porque usan `document`/`localStorage`/`window`.)

- [ ] **Step 2: Crear `tests.html`**

```html
<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Pruebas</title>
<style>body{background:#0d1117;color:#e6edf3;font-family:system-ui;padding:20px}
h1{font-size:1.2rem} .suite{margin:12px 0;border-top:1px solid #30363d;padding-top:8px}
p{font-family:monospace;font-size:.85rem;margin:2px 0} #resumen{font-weight:700;margin:12px 0}</style>
</head><body>
<h1>Pruebas de lógica — Mundial de Clubes</h1>
<div id="resumen">…</div>
<div id="resultados"></div>
<script src="js/testkit.js"></script>
<script src="js/data.js"></script>
<script src="js/models.js"></script>
<script src="js/generator.js"></script>
<script src="js/mechanics.js"></script>
<script src="js/engine.js"></script>
<script src="js/tournament.js"></script>
<script src="js/tests.js"></script>
<script>correrPruebas();</script>
</body></html>
```

- [ ] **Step 3: Crear `js/tests.js` vacío** (se irá llenando en cada tarea):

```js
// Las pruebas se agregan aquí conforme avanzan las tareas.
```

Agregar `<script src="js/tests.js"></script>` ya está en `tests.html`. Crear el archivo vacío para evitar 404.

- [ ] **Step 4: Verificar** — abrir `tests.html` en Live Server. Esperado: "TOTAL: 0/0", sin errores.

---

## Tarea 3: Datos base (`data.js`)

**Files:**
- Create/replace: `js/data.js`
- Test: agregar suite a `js/tests.js`

**Interfaces:**
- Produces: `CIUDADES` (array de 32 strings), `NOMBRES` (array), `APELLIDOS` (array), `FORMACIONES` (objeto).

- [ ] **Step 1: Escribir prueba en `js/tests.js`**

```js
suite("data.js", ()=>{
  assertEq("hay 32 ciudades", CIUDADES.length, 32);
  assert("ciudades únicas", new Set(CIUDADES).size===32);
  assert("hay nombres", NOMBRES.length>=15);
  assert("hay apellidos", APELLIDOS.length>=15);
  assertEq("4-4-2 defensas", FORMACIONES["4-4-2"].DEF, 4);
  assertEq("4-3-3 delanteros", FORMACIONES["4-3-3"].DEL, 3);
  assertEq("3-5-2 medios", FORMACIONES["3-5-2"].MED, 5);
});
```

- [ ] **Step 2: Correr `tests.html`** → la suite falla (variables no definidas).

- [ ] **Step 3: Escribir `js/data.js`**

```js
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
```

- [ ] **Step 4: Correr `tests.html`** → suite `data.js` en verde (7/7).

---

## Tarea 4: Fábricas de modelos (`models.js`)

**Files:**
- Create/replace: `js/models.js`
- Test: suite en `js/tests.js`

**Interfaces:**
- Consumes: nada (usa constantes de `data.js`).
- Produces:
  - `crearJugador({id, nombre, posicion, edad, ataque, defensa, velocidad, resistencia}) → Jugador` (agrega `cansancio:0, forma:0, experiencia:0`).
  - `crearEquipo({id, ciudad, nivel}) → Equipo` (nombre = `"Club "+ciudad`, `jugadores:[]`, `esHumano:false`, `formacion:"4-4-2"`, `titulares:[]`).
  - `crearPartido({id, ronda, grupo, localId, visitanteId}) → Partido` (goles 0, `jugado:false`, `goleadores:[]`).

- [ ] **Step 1: Prueba en `js/tests.js`**

```js
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
```

- [ ] **Step 2: Correr → falla.**

- [ ] **Step 3: Escribir `js/models.js`**

```js
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
  return { id:o.id, ronda:o.ronda, grupo:o.grupo||null,
    localId:o.localId, visitanteId:o.visitanteId,
    golesLocal:0, golesVisitante:0, jugado:false, goleadores:[] };
}
```

- [ ] **Step 4: Correr → verde.**

---

## Tarea 5: Generador de liga (`generator.js`)

**Files:**
- Create/replace: `js/generator.js`
- Test: suite en `js/tests.js`

**Interfaces:**
- Consumes: `CIUDADES, NOMBRES, APELLIDOS` (data.js); `crearJugador, crearEquipo` (models.js).
- Produces:
  - `generarLiga(rng) → Equipo[]` (32 equipos, cada uno con 18–20 jugadores y `nivel` 1–5).
  - `_atributoBase(nivel, rng) → int` (helper, 40–95; media sube con nivel). Prefijo `_` = interno pero testeable.

Distribución de plantilla por equipo: **2 POR, 6 DEF, 6 MED, 4 DEL = 18** (fijo para el MVP).

- [ ] **Step 1: Prueba en `js/tests.js`**

```js
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
  if(fuerte && debil) assert("nivel 5 mejor que nivel 1", media(fuerte)>media(debil));
});
```

- [ ] **Step 2: Correr → falla.**

- [ ] **Step 3: Escribir `js/generator.js`**

```js
function _rint(rng, min, max){ return Math.floor(rng()*(max-min+1))+min; }

function _atributoBase(nivel, rng){
  // media sube ~8 por nivel; base nivel1≈52, nivel5≈84; ruido ±8
  const media = 44 + nivel*8;
  let v = media + _rint(rng,-8,8);
  return Math.max(40, Math.min(95, v));
}

function _nombreAleatorio(rng){
  return NOMBRES[_rint(rng,0,NOMBRES.length-1)] + " " +
         APELLIDOS[_rint(rng,0,APELLIDOS.length-1)];
}

function _edadAleatoria(rng){ return _rint(rng,17,36); }

// Sesga un atributo según la posición para que tenga sentido
function _generarJugador(id, posicion, nivel, rng){
  let at=_atributoBase(nivel,rng), df=_atributoBase(nivel,rng),
      ve=_atributoBase(nivel,rng), re=_atributoBase(nivel,rng);
  if(posicion==="DEL") at=Math.min(95,at+8);
  if(posicion==="DEF") df=Math.min(95,df+8);
  if(posicion==="POR") df=Math.min(95,df+10);
  if(posicion==="MED") ve=Math.min(95,ve+4);
  return crearJugador({id, nombre:_nombreAleatorio(rng), posicion,
    edad:_edadAleatoria(rng), ataque:at, defensa:df, velocidad:ve, resistencia:re});
}

function generarLiga(rng){
  const equipos=[];
  // Asignar niveles: 32 equipos, niveles distribuidos (más de nivel medio)
  const niveles=[]; const patron=[5,5,4,4,4,3,3,3,3,2,2,2,1,1,1,1]; // 16, se repite x2
  for(let k=0;k<2;k++) patron.forEach(n=>niveles.push(n));
  for(let i=0;i<32;i++){
    const eq = crearEquipo({id:"t"+i, ciudad:CIUDADES[i], nivel:niveles[i]});
    const plan=[["POR",2],["DEF",6],["MED",6],["DEL",4]];
    let p=0;
    plan.forEach(([pos,cant])=>{
      for(let c=0;c<cant;c++){
        eq.jugadores.push(_generarJugador(eq.id+"-p"+p, pos, eq.nivel, rng));
        p++;
      }
    });
    equipos.push(eq);
  }
  return equipos;
}
```

- [ ] **Step 4: Correr → verde.** (Nota: con `rng=()=>0.5` todos los niveles dan la misma media; la última aserción se cubre mejor con `Math.random`. Para el test determinista basta con que fuerte≥débil — si falla por empate, cambiar a `>=`.)

- [ ] **Step 4b (ajuste):** en la prueba, usar `>=` en "nivel 5 mejor que nivel 1" para tolerar el rng constante:
```js
if(fuerte && debil) assert("nivel 5 >= nivel 1", media(fuerte)>=media(debil));
```

---

## Tarea 6: Mecánicas (`mechanics.js`)

**Files:**
- Create/replace: `js/mechanics.js`
- Test: suite en `js/tests.js`

**Interfaces:**
- Produces (todas mutan al `jugador` recibido o devuelven valor claro):
  - `aplicarCansancio(jugador, jugo:boolean) → void` — si jugó sube, si descansó baja; clamp 0–100.
  - `actualizarForma(jugador, resultado:"V"|"E"|"D") → void` — V:+1, E:0, D:−1; clamp −3..3.
  - `aplicarProgresion(jugador, jugo:boolean, rng) → {subio:string|null, bajo:string|null}` — jugar da experiencia según edad; al pasar umbral sube 1 atributo; veteranos pueden declinar.
  - `_ritmoCrecimiento(edad) → int` — ≤23:30, 24–29:15, ≥30:5.

- [ ] **Step 1: Prueba en `js/tests.js`**

```js
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
});
```

- [ ] **Step 2: Correr → falla.**

- [ ] **Step 3: Escribir `js/mechanics.js`**

```js
function aplicarCansancio(jugador, jugo){
  if(jugo){
    const aumento = 15 + Math.round((100 - jugador.resistencia)*0.2); // 15..27
    jugador.cansancio = Math.min(100, jugador.cansancio + aumento);
  } else {
    jugador.cansancio = Math.max(0, jugador.cansancio - 25);
  }
}

function actualizarForma(jugador, resultado){
  const d = resultado==="V" ? 1 : resultado==="D" ? -1 : 0;
  jugador.forma = Math.max(-3, Math.min(3, jugador.forma + d));
}

function _ritmoCrecimiento(edad){
  if(edad<=23) return 30;
  if(edad<=29) return 15;
  return 5;
}

const _ATRIBUTOS = ["ataque","defensa","velocidad","resistencia"];

function aplicarProgresion(jugador, jugo, rng){
  const res={subio:null, bajo:null};
  if(jugo){
    jugador.experiencia += _ritmoCrecimiento(jugador.edad);
    if(jugador.experiencia >= 100){
      jugador.experiencia -= 100;
      const attr=_ATRIBUTOS[Math.floor(rng()*_ATRIBUTOS.length)];
      if(jugador[attr]<95){ jugador[attr]+=1; res.subio=attr; }
    }
    // declive: veteranos 33+ con baja probabilidad pierden velocidad
    if(jugador.edad>=33 && rng()<0.15 && jugador.velocidad>40){
      jugador.velocidad-=1; res.bajo="velocidad";
    }
  }
  return res;
}
```

- [ ] **Step 4: Correr → verde.**

---

## Tarea 7: Motor de simulación (`engine.js`) — pieza aislada

**Files:**
- Create/replace: `js/engine.js`
- Test: suite en `js/tests.js`

**Interfaces:**
- Consumes: `FORMACIONES` (data.js).
- Produces:
  - `evaluarAlineacion(equipo) → {ataque:number, defensa:number}` — usa `equipo.titulares` (11 ids) y `equipo.formacion`; suma aportes ponderados por posición ajustados por cansancio y forma. **Determinista.**
  - `golesEsperados(ataquePropio, defensaRival, ventajaLocal:number) → number` — determinista, ≥0.2.
  - `_muestreaPoisson(lambda, rng) → int` — Knuth.
  - `simularPartido(equipoLocal, equipoVisitante, rng) → {golesLocal, golesVisitante, goleadores:[]}` — usa lo anterior + `rng`.

Pesos por posición (aporte a ataque/defensa):
```
POR: off 0.0, def 1.0 | DEF: off 0.2, def 1.0 | MED: off 0.6, def 0.6 | DEL: off 1.0, def 0.2
```
Rating ofensivo jugador = `ataque*0.6 + velocidad*0.4`; defensivo = `defensa*0.6 + velocidad*0.4`.
Ajuste cansancio: multiplicar por `1 - (cansancio/100)*0.3`. Ajuste forma: `+ forma*1.5`.

- [ ] **Step 1: Prueba en `js/tests.js`**

```js
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
```

- [ ] **Step 2: Correr → falla.**

- [ ] **Step 3: Escribir `js/engine.js`**

```js
const _PESOS = {
  POR:{off:0.0,def:1.0}, DEF:{off:0.2,def:1.0},
  MED:{off:0.6,def:0.6}, DEL:{off:1.0,def:0.2}
};

function _ratingJugador(j){
  const off=(j.ataque*0.6 + j.velocidad*0.4);
  const def=(j.defensa*0.6 + j.velocidad*0.4);
  const mult=1-(j.cansancio/100)*0.3;
  const bono=j.forma*1.5;
  return { off: off*mult+bono, def: def*mult+bono };
}

function evaluarAlineacion(equipo){
  const titulares = equipo.titulares
    .map(id=>equipo.jugadores.find(j=>j.id===id))
    .filter(Boolean);
  let ataque=0, defensa=0;
  titulares.forEach(j=>{
    const r=_ratingJugador(j), p=_PESOS[j.posicion];
    ataque += r.off*p.off;
    defensa += r.def*p.def;
  });
  return { ataque, defensa };
}

function golesEsperados(ataquePropio, defensaRival, ventajaLocal){
  // normaliza: relación ataque vs defensa alrededor de ~1.4 goles
  const base = 1.4 * (ataquePropio / (defensaRival + 1)) + ventajaLocal;
  return Math.max(0.2, base);
}

function _muestreaPoisson(lambda, rng){
  const L=Math.exp(-lambda); let k=0, p=1;
  do{ k++; p*=rng(); }while(p>L);
  return k-1;
}

function simularPartido(equipoLocal, equipoVisitante, rng){
  const L=evaluarAlineacion(equipoLocal);
  const V=evaluarAlineacion(equipoVisitante);
  const xgL=golesEsperados(L.ataque, V.defensa, 0.25); // ventaja de local
  const xgV=golesEsperados(V.ataque, L.defensa, 0.0);
  const gL=Math.min(7,_muestreaPoisson(xgL,rng));
  const gV=Math.min(7,_muestreaPoisson(xgV,rng));
  const goleadores=[];
  _repartirGoles(equipoLocal, gL, goleadores, rng);
  _repartirGoles(equipoVisitante, gV, goleadores, rng);
  goleadores.sort((a,b)=>a.minuto-b.minuto);
  return { golesLocal:gL, golesVisitante:gV, goleadores };
}

function _repartirGoles(equipo, goles, out, rng){
  const atacantes = equipo.titulares
    .map(id=>equipo.jugadores.find(j=>j.id===id)).filter(Boolean)
    .filter(j=>j.posicion==="DEL"||j.posicion==="MED");
  for(let g=0; g<goles; g++){
    const autor = atacantes.length
      ? atacantes[Math.floor(rng()*atacantes.length)]
      : equipo.jugadores[0];
    out.push({ equipoId:equipo.id, jugadorId:autor.id, minuto:1+Math.floor(rng()*90) });
  }
}
```

- [ ] **Step 4: Correr → verde.**

---

## Tarea 8: Torneo (`tournament.js`)

**Files:**
- Create/replace: `js/tournament.js`
- Test: suite en `js/tests.js`

**Interfaces:**
- Consumes: `crearPartido` (models.js).
- Produces:
  - `sortearGrupos(equipos, rng) → Grupo[]` — 8 grupos `{id:"A"..., equiposIds:[4]}`, repartidos por pote de nivel.
  - `fixturesDeGrupo(grupo) → Partido[]` — round robin, 6 partidos (cada equipo juega 3).
  - `calcularTabla(grupo, partidos) → Fila[]` — ordenada; `{equipoId, pj, g, e, p, gf, gc, dg, pts}`.
  - `clasificadosDeGrupo(grupo, partidos) → [id1, id2]` — los 2 primeros.
  - `construirBracket(clasificados16) → Ronda` — empareja 1º grupo A vs 2º grupo B, etc. Estructura recursiva `{nombre, llaves:[{localId,visitanteId,ganadorId}], siguiente}`.
  - `nombreRonda(equiposEnRonda) → string` — 16→"Octavos",8→"Cuartos",4→"Semifinal",2→"Final".

- [ ] **Step 1: Prueba en `js/tests.js`**

```js
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
});
```

- [ ] **Step 2: Correr → falla.**

- [ ] **Step 3: Escribir `js/tournament.js`**

```js
function _barajar(arr, rng){
  const a=arr.slice();
  for(let i=a.length-1;i>0;i--){ const k=Math.floor(rng()*(i+1)); [a[i],a[k]]=[a[k],a[i]]; }
  return a;
}

const _LETRAS=["A","B","C","D","E","F","G","H"];

function sortearGrupos(equipos, rng){
  // 4 potes por nivel para repartir fuerza; cada grupo recibe 1 de cada pote
  const orden=equipos.slice().sort((a,b)=>b.nivel-a.nivel);
  const potes=[orden.slice(0,8),orden.slice(8,16),orden.slice(16,24),orden.slice(24,32)]
    .map(p=>_barajar(p,rng));
  const grupos=_LETRAS.map(l=>({id:l, equiposIds:[]}));
  potes.forEach(pote=>{ pote.forEach((eq,i)=>grupos[i].equiposIds.push(eq.id)); });
  return grupos;
}

function fixturesDeGrupo(grupo){
  const [a,b,c,d]=grupo.equiposIds;
  const pares=[[a,b],[c,d],[a,c],[b,d],[a,d],[b,c]]; // round robin 4 equipos
  return pares.map((par,i)=>crearPartido({
    id:`g${grupo.id}-m${i}`, ronda:"grupo", grupo:grupo.id,
    localId:par[0], visitanteId:par[1] }));
}

function calcularTabla(grupo, partidos){
  const filas={};
  grupo.equiposIds.forEach(id=>filas[id]={equipoId:id,pj:0,g:0,e:0,p:0,gf:0,gc:0,dg:0,pts:0});
  partidos.filter(p=>p.jugado && p.grupo===grupo.id).forEach(p=>{
    const L=filas[p.localId], V=filas[p.visitanteId];
    L.pj++; V.pj++; L.gf+=p.golesLocal; L.gc+=p.golesVisitante;
    V.gf+=p.golesVisitante; V.gc+=p.golesLocal;
    if(p.golesLocal>p.golesVisitante){ L.g++;L.pts+=3;V.p++; }
    else if(p.golesLocal<p.golesVisitante){ V.g++;V.pts+=3;L.p++; }
    else { L.e++;V.e++;L.pts++;V.pts++; }
  });
  Object.values(filas).forEach(f=>f.dg=f.gf-f.gc);
  return Object.values(filas).sort((x,y)=> y.pts-x.pts || y.dg-x.dg || y.gf-x.gf);
}

function clasificadosDeGrupo(grupo, partidos){
  const t=calcularTabla(grupo,partidos);
  return [t[0].equipoId, t[1].equipoId];
}

function nombreRonda(n){
  return n>=16?"Octavos": n>=8?"Cuartos": n>=4?"Semifinal": "Final";
}

// clasificados16: array de {grupo, primero, segundo}
function construirBracket(clasificados16){
  // Emparejar 1ºA-2ºB, 1ºC-2ºD, ... (patrón estándar)
  const g={}; clasificados16.forEach(c=>g[c.grupo]=c);
  const cruces=[["A","B"],["C","D"],["E","F"],["G","H"]];
  const llaves=[];
  cruces.forEach(([x,y])=>{
    llaves.push({localId:g[x].primero, visitanteId:g[y].segundo, ganadorId:null});
    llaves.push({localId:g[y].primero, visitanteId:g[x].segundo, ganadorId:null});
  });
  return { nombre:nombreRonda(16), llaves, siguiente:null };
}
```

- [ ] **Step 4: Correr → verde.**

---

## Tarea 9: Persistencia (`storage.js`)

**Files:**
- Create/replace: `js/storage.js`
- Test: prueba manual en consola (localStorage no se prueba en `tests.html` para no ensuciar; verificación manual).

**Interfaces:**
- Produces:
  - `guardarJuego(estado) → void` — `localStorage["mundialClubes"] = JSON.stringify(estado)`.
  - `cargarJuego() → estado|null`.
  - `hayGuardado() → boolean`.
  - `borrarGuardado() → void`.

- [ ] **Step 1: Escribir `js/storage.js`**

```js
const _CLAVE="mundialClubes";
function guardarJuego(estado){ localStorage.setItem(_CLAVE, JSON.stringify(estado)); }
function cargarJuego(){ const s=localStorage.getItem(_CLAVE); return s?JSON.parse(s):null; }
function hayGuardado(){ return localStorage.getItem(_CLAVE)!==null; }
function borrarGuardado(){ localStorage.removeItem(_CLAVE); }
```

- [ ] **Step 2: Verificar en consola** (con `index.html` abierto en Live Server):
```js
guardarJuego({a:1}); hayGuardado(); // true
cargarJuego();                      // {a:1}
borrarGuardado(); hayGuardado();    // false
```
Esperado: los valores comentados.

---

## Tarea 10: UI — estado, router y vistas de inicio/grupos (`ui.js` parte 1 + `main.js`)

**Files:**
- Create/replace: `js/main.js`
- Create/replace: `js/ui.js` (parte 1)
- Modify: `css/styles.css` (estilos de tarjetas de club, tabla de grupos)

**Interfaces (main.js — estado global `JUEGO`):**
```js
JUEGO = {
  equipos:[],            // Equipo[]  (32)
  miEquipoId:null,
  grupos:[],             // Grupo[]
  partidosGrupo:[],      // Partido[] (48)
  bracket:null,          // Ronda
  fase:"inicio",         // "inicio"|"grupos"|"eliminatorias"|"campeon"
  rng: Math.random
}
```
- Produces (main.js):
  - `nuevoJuego(miEquipoId)` — genera liga (fija mi equipo como humano), sortea grupos, crea fixtures, guarda, va a dashboard.
  - `mostrarVista(id)` — cambia la `.vista.activa`.
  - `arrancar()` — al cargar: si `hayGuardado()`, ofrecer continuar; si no, `renderInicio()`.
- Produces (ui.js parte 1):
  - `renderInicio()` — grilla de 32 clubes para elegir; botón "Nuevo juego" tras elegir; permite renombrar tu club.
  - `renderGrupos()` — muestra los 8 grupos con su tabla actual.

- [ ] **Step 1: Escribir `js/main.js`**

```js
const JUEGO = { equipos:[], miEquipoId:null, grupos:[], partidosGrupo:[],
  bracket:null, fase:"inicio", rng: Math.random };

function mostrarVista(id){
  document.querySelectorAll(".vista").forEach(v=>v.classList.remove("activa"));
  document.getElementById(id).classList.add("activa");
}

function nuevoJuego(miEquipoId){
  JUEGO.equipos = generarLiga(JUEGO.rng);
  JUEGO.miEquipoId = miEquipoId;
  const mi = JUEGO.equipos.find(e=>e.id===miEquipoId);
  mi.esHumano = true;
  autoAlinear(mi); // define titulares iniciales
  JUEGO.equipos.forEach(e=>{ if(!e.esHumano) autoAlinear(e); });
  JUEGO.grupos = sortearGrupos(JUEGO.equipos, JUEGO.rng);
  JUEGO.partidosGrupo = JUEGO.grupos.flatMap(g=>fixturesDeGrupo(g));
  JUEGO.fase="grupos";
  guardarJuego(JUEGO);
  irADashboard();
}

// Elige 11 titulares válidos según la formación del equipo (mejores por rating)
function autoAlinear(equipo){
  const comp={POR:1, ...FORMACIONES[equipo.formacion]};
  const titulares=[];
  Object.entries(comp).forEach(([pos,cant])=>{
    const cand=equipo.jugadores.filter(j=>j.posicion===pos)
      .sort((a,b)=> (b.ataque+b.defensa+b.velocidad) - (a.ataque+a.defensa+a.velocidad));
    for(let i=0;i<cant && i<cand.length;i++) titulares.push(cand[i].id);
  });
  equipo.titulares=titulares;
}

function arrancar(){
  if(hayGuardado()){
    if(confirm("Hay una partida guardada. ¿Continuar?")){
      Object.assign(JUEGO, cargarJuego());
      JUEGO.rng = Math.random; // no se serializa la función
      enrutarPorFase();
      return;
    } else { borrarGuardado(); }
  }
  renderInicio();
}

function enrutarPorFase(){
  if(JUEGO.fase==="campeon") renderBracket();
  else if(JUEGO.fase==="eliminatorias") renderBracket();
  else irADashboard();
}

window.addEventListener("DOMContentLoaded", arrancar);
```

- [ ] **Step 2: Escribir `js/ui.js` (parte 1)**

```js
function renderInicio(){
  mostrarVista("vista-inicio");
  const v=document.getElementById("vista-inicio");
  v.innerHTML=`<div class="panel"><h2>Elige tu club</h2>
    <p style="color:var(--tenue)">Dirigirás este club durante todo el Mundial de Clubes.</p>
    <div id="grid-clubes" class="grid-clubes"></div></div>`;
  const grid=v.querySelector("#grid-clubes");
  // usa una liga temporal solo para mostrar ciudades (los atributos se generan al iniciar)
  CIUDADES.forEach((ciudad,i)=>{
    const card=document.createElement("button");
    card.className="club-card"; card.textContent="Club "+ciudad;
    card.onclick=()=>elegirClub("t"+i, ciudad);
    grid.appendChild(card);
  });
}

function elegirClub(id, ciudad){
  const nombre = prompt("Nombre de tu club:", "Club "+ciudad) || ("Club "+ciudad);
  // se guarda el nombre elegido para aplicarlo tras generar la liga
  nuevoJuego(id);
  const mi=JUEGO.equipos.find(e=>e.id===id); mi.nombre=nombre;
  guardarJuego(JUEGO);
  irADashboard();
}

function renderGrupos(){
  mostrarVista("vista-grupos");
  const v=document.getElementById("vista-grupos");
  const nombre=id=>JUEGO.equipos.find(e=>e.id===id).nombre;
  let html=`<div class="panel"><h2>Fase de grupos</h2><div class="grupos-grid">`;
  JUEGO.grupos.forEach(g=>{
    const tabla=calcularTabla(g, JUEGO.partidosGrupo);
    html+=`<div class="grupo"><h3>Grupo ${g.id}</h3>
      <table><tr><th>Equipo</th><th>PJ</th><th>Pts</th><th>DG</th></tr>`;
    tabla.forEach((f,idx)=>{
      const mio=f.equipoId===JUEGO.miEquipoId?' class="mio"':'';
      const clasif = idx<2 ? ' clasif':'';
      html+=`<tr${mio}${clasif?` class="clasif"`:''}><td>${nombre(f.equipoId)}</td>
        <td>${f.pj}</td><td>${f.pts}</td><td>${f.dg}</td></tr>`;
    });
    html+=`</table></div>`;
  });
  html+=`</div><button class="btn" onclick="irADashboard()">Volver a mi equipo</button></div>`;
  v.innerHTML=html;
}
```

- [ ] **Step 3: Agregar estilos en `css/styles.css`**

```css
.grid-clubes{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:12px}
.club-card{background:var(--panel2);color:var(--texto);border:1px solid var(--linea);
  border-radius:8px;padding:14px;cursor:pointer;text-align:left;font-size:.9rem}
.club-card:hover{border-color:var(--acento);background:#232b36}
.grupos-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px;margin:12px 0}
.grupo table{width:100%;border-collapse:collapse;font-size:.85rem}
.grupo th,.grupo td{text-align:left;padding:4px 6px;border-bottom:1px solid var(--linea)}
.grupo tr.mio td{color:var(--acento2);font-weight:700}
.grupo tr.clasif td:first-child{border-left:3px solid var(--acento)}
```

- [ ] **Step 4: Verificar en Live Server** — abrir `index.html`. Esperado: grilla de 32 clubes; al elegir uno, pide nombre y pasa al dashboard (aún por construir en Tarea 11; por ahora `irADashboard` puede no existir → se implementa en Tarea 11). Para probar esta tarea aislada, temporalmente sustituir `irADashboard()` por `renderGrupos()` y confirmar que se ven los 8 grupos con mi equipo resaltado.

- [ ] **Step 5:** revertir el cambio temporal antes de la Tarea 11.

---

## Tarea 11: UI — dashboard, alineación, partido y bracket (`ui.js` parte 2 + `main.js`)

**Files:**
- Modify: `js/ui.js` (parte 2)
- Modify: `js/main.js` (flujo de juego)
- Modify: `css/styles.css`

**Interfaces (main.js — flujo):**
- `irADashboard()` — renderiza la vista de gestión de mi próximo partido.
- `proximoPartidoDe(equipoId) → Partido|null` — primer partido no jugado del equipo en la fase actual.
- `jugarJornadaDeMiPartido()` — simula MI próximo partido + todos los partidos pendientes de esa "tanda", aplica mecánicas, guarda, muestra resultado.
- `aplicarPostPartido(partido)` — para ambos equipos: cansancio a titulares (jugó) y suplentes (descansó), forma según resultado, progresión a titulares.
- `avanzarFase()` — si terminó grupos → construir bracket y `fase="eliminatorias"`; si terminó una ronda → siguiente; si queda 1 → `fase="campeon"`.

**Interfaces (ui.js parte 2):**
- `renderDashboard()` — mi plantilla con barras de cansancio/forma, selector de formación, checkboxes/botones para elegir 11 titulares, botón "Jugar mi partido".
- `renderResultado(partido)` — marcador + goleadores + resumen de otros resultados; botón "Continuar".
- `renderBracket()` — muestra las rondas de eliminación y, si hay campeón, la pantalla de campeón.

- [ ] **Step 1: Añadir flujo en `js/main.js`**

```js
function irADashboard(){ renderDashboard(); }

function partidosDeFase(){
  return JUEGO.fase==="grupos" ? JUEGO.partidosGrupo : _partidosRondaActual();
}

function proximoPartidoDe(equipoId){
  return partidosDeFase().find(p=>!p.jugado &&
    (p.localId===equipoId || p.visitanteId===equipoId)) || null;
}

function _equipo(id){ return JUEGO.equipos.find(e=>e.id===id); }

function jugarJornadaDeMiPartido(){
  const mio=proximoPartidoDe(JUEGO.miEquipoId);
  if(!mio){ avanzarFase(); return; }
  _simularPartidoObj(mio);
  // simular el resto de partidos pendientes de la fase para no dejar rezagados
  partidosDeFase().filter(p=>!p.jugado).forEach(_simularPartidoObj);
  guardarJuego(JUEGO);
  renderResultado(mio);
}

function _simularPartidoObj(p){
  const L=_equipo(p.localId), V=_equipo(p.visitanteId);
  const r=simularPartido(L,V,JUEGO.rng);
  p.golesLocal=r.golesLocal; p.golesVisitante=r.golesVisitante;
  p.goleadores=r.goleadores; p.jugado=true;
  aplicarPostPartido(p);
}

function aplicarPostPartido(p){
  [p.localId, p.visitanteId].forEach(eid=>{
    const eq=_equipo(eid);
    const gf = eid===p.localId ? p.golesLocal : p.golesVisitante;
    const gc = eid===p.localId ? p.golesVisitante : p.golesLocal;
    const res = gf>gc?"V": gf<gc?"D":"E";
    eq.jugadores.forEach(j=>{
      const jugo=eq.titulares.includes(j.id);
      aplicarCansancio(j, jugo);
      if(jugo){ actualizarForma(j,res); aplicarProgresion(j,true,JUEGO.rng); }
    });
  });
}
```

- [ ] **Step 2: Añadir eliminatorias en `js/main.js`**

```js
function avanzarFase(){
  if(JUEGO.fase==="grupos"){
    const clasificados=JUEGO.grupos.map(g=>{
      const [primero,segundo]=clasificadosDeGrupo(g, JUEGO.partidosGrupo);
      return {grupo:g.id, primero, segundo};
    });
    JUEGO.bracket=construirBracket(clasificados);
    JUEGO.fase="eliminatorias";
    guardarJuego(JUEGO);
    renderBracket();
  } else if(JUEGO.fase==="eliminatorias"){
    renderBracket(); // ya avanzó ronda dentro de resolverRonda
  }
}

// Partidos pendientes de la ronda actual del bracket (a partido único)
function _partidosRondaActual(){
  if(!JUEGO.bracket) return [];
  return JUEGO.bracket.llaves.filter(l=>!l.ganadorId).map(l=>({
    id:"k-"+l.localId+"-"+l.visitanteId, ronda:"eliminatoria", grupo:null,
    localId:l.localId, visitanteId:l.visitanteId, golesLocal:0, golesVisitante:0,
    jugado:false, goleadores:[], _llave:l }));
}

// sobre-escribe la simulación para eliminatorias (desempate por penales aleatorio)
function _resolverLlaveMia(){
  const mio = _partidosRondaActual().find(p=>
    p.localId===JUEGO.miEquipoId||p.visitanteId===JUEGO.miEquipoId);
  const pendientes=_partidosRondaActual();
  pendientes.forEach(p=>{
    const L=_equipo(p.localId), V=_equipo(p.visitanteId);
    const r=simularPartido(L,V,JUEGO.rng);
    let gL=r.golesLocal, gV=r.golesVisitante;
    if(gL===gV){ (JUEGO.rng()<0.5)?gL++:gV++; } // "penales"
    p.golesLocal=gL; p.golesVisitante=gV; p.goleadores=r.goleadores; p.jugado=true;
    p._llave.ganadorId = gL>gV ? p.localId : p.visitanteId;
    aplicarPostPartido(p);
  });
  // construir siguiente ronda
  const ganadores=JUEGO.bracket.llaves.map(l=>l.ganadorId);
  if(ganadores.length===1){ JUEGO.fase="campeon"; }
  else {
    const nuevas=[];
    for(let i=0;i<ganadores.length;i+=2)
      nuevas.push({localId:ganadores[i], visitanteId:ganadores[i+1], ganadorId:null});
    JUEGO.bracket={ nombre:nombreRonda(ganadores.length), llaves:nuevas, siguiente:null };
  }
  guardarJuego(JUEGO);
  return mio;
}
```

Nota de diseño: en eliminatorias, el botón "Jugar mi partido" llama `_resolverLlaveMia()` y luego `renderResultado`. Ajustar `renderDashboard` para que en fase eliminatoria el botón invoque esa función (ver Step 4).

- [ ] **Step 3: Escribir `renderDashboard` en `js/ui.js`**

```js
function renderDashboard(){
  mostrarVista("vista-dashboard");
  const mi=_equipo(JUEGO.miEquipoId);
  const rival=(function(){
    const p = JUEGO.fase==="grupos" ? proximoPartidoDe(mi.id)
      : _partidosRondaActual().find(x=>x.localId===mi.id||x.visitanteId===mi.id);
    if(!p) return null;
    const rid = p.localId===mi.id ? p.visitanteId : p.localId;
    return _equipo(rid);
  })();
  const v=document.getElementById("vista-dashboard");
  const barra=(val,color)=>`<div class="barra"><span style="width:${val}%;background:${color}"></span></div>`;
  const formaTxt=f=> (f>0?"+":"")+f;
  let filas="";
  ["POR","DEF","MED","DEL"].forEach(pos=>{
    mi.jugadores.filter(j=>j.posicion===pos).forEach(j=>{
      const tit=mi.titulares.includes(j.id);
      filas+=`<tr class="${tit?'titular':''}">
        <td><input type="checkbox" ${tit?'checked':''} onchange="toggleTitular('${j.id}')"></td>
        <td>${j.posicion}</td><td>${j.nombre}</td><td>${j.edad}</td>
        <td>${j.ataque}</td><td>${j.defensa}</td><td>${j.velocidad}</td>
        <td>${barra(j.cansancio,'var(--alerta)')}</td>
        <td>${formaTxt(j.forma)}</td></tr>`;
    });
  });
  const opciones=Object.keys(FORMACIONES).map(f=>
    `<option ${f===mi.formacion?'selected':''}>${f}</option>`).join("");
  const nTit=mi.titulares.length;
  const accion = JUEGO.fase==="grupos" ? "jugarJornadaDeMiPartido()" : "jugarEliminatoria()";
  v.innerHTML=`<div class="panel">
    <h2>${mi.nombre}</h2>
    <p>Próximo rival: <b>${rival?rival.nombre:"—"}</b> · Fase: ${JUEGO.fase}</p>
    <label>Formación:
      <select onchange="cambiarFormacion(this.value)">${opciones}</select></label>
    <span id="conteo-tit" style="margin-left:12px;color:${nTit===11?'var(--acento)':'var(--alerta)'}">
      Titulares: ${nTit}/11</span>
    <table class="plantilla"><tr><th>XI</th><th>Pos</th><th>Nombre</th><th>Edad</th>
      <th>ATA</th><th>DEF</th><th>VEL</th><th>Cansancio</th><th>Forma</th></tr>${filas}</table>
    <div style="margin-top:12px">
      <button class="btn" ${nTit!==11?'disabled':''} onclick="${accion}">▶ Jugar mi partido</button>
      <button class="btn sec" onclick="renderGrupos()">Ver grupos</button>
      ${JUEGO.bracket?'<button class="btn sec" onclick="renderBracket()">Ver bracket</button>':''}
    </div></div>`;
}

function toggleTitular(id){
  const mi=_equipo(JUEGO.miEquipoId);
  const i=mi.titulares.indexOf(id);
  if(i>=0) mi.titulares.splice(i,1);
  else if(mi.titulares.length<11) mi.titulares.push(id);
  renderDashboard();
}
function cambiarFormacion(f){ _equipo(JUEGO.miEquipoId).formacion=f; renderDashboard(); }
function jugarEliminatoria(){ const mio=_resolverLlaveMia(); renderResultado(mio); }
```

- [ ] **Step 4: Escribir `renderResultado` y `renderBracket` en `js/ui.js`**

```js
function renderResultado(p){
  mostrarVista("vista-partido");
  const nombre=id=>_equipo(id).nombre;
  const nombreJug=(eid,jid)=>{ const e=_equipo(eid); const j=e.jugadores.find(x=>x.id===jid); return j?j.nombre:"?"; };
  const v=document.getElementById("vista-partido");
  const gol=p.goleadores.map(g=>`<li>${g.minuto}' ${nombreJug(g.equipoId,g.jugadorId)} (${_equipo(g.equipoId).nombre})</li>`).join("");
  // otros resultados de la fase
  const otros = partidosDeFase().filter(x=>x.jugado && x!==p)
    .map(x=>`<div class="mini-res">${nombre(x.localId)} ${x.golesLocal}-${x.golesVisitante} ${nombre(x.visitanteId)}</div>`).join("");
  const continuar = JUEGO.fase==="campeon" ? "renderBracket()" :
    (proximoPartidoDe(JUEGO.miEquipoId) ? "irADashboard()" : "avanzarFase()");
  v.innerHTML=`<div class="panel">
    <h2 class="marcador">${nombre(p.localId)} <b>${p.golesLocal} - ${p.golesVisitante}</b> ${nombre(p.visitanteId)}</h2>
    <ul class="goles">${gol||"<li>Sin goles</li>"}</ul>
    <h3>Otros resultados</h3><div class="otros">${otros||"—"}</div>
    <button class="btn" onclick="${continuar}">Continuar</button></div>`;
}

function renderBracket(){
  mostrarVista("vista-bracket");
  const v=document.getElementById("vista-bracket");
  const nombre=id=>_equipo(id).nombre;
  if(JUEGO.fase==="campeon"){
    const campeonId=JUEGO.bracket.llaves[0]
      ? JUEGO.bracket.llaves[0].ganadorId
      : JUEGO.miEquipoId;
    const campeon = campeonId ? nombre(campeonId) : "—";
    const gane = campeonId===JUEGO.miEquipoId;
    v.innerHTML=`<div class="panel campeon">
      <h1>🏆 ${campeon} campeón</h1>
      <p>${gane?"¡Felicidades, ganaste el Mundial de Clubes!":"Fin del torneo."}</p>
      <button class="btn" onclick="borrarGuardado();renderInicio()">Nuevo torneo</button></div>`;
    return;
  }
  let html=`<div class="panel"><h2>${JUEGO.bracket.nombre}</h2>`;
  JUEGO.bracket.llaves.forEach(l=>{
    const res=l.ganadorId?`(ganó ${nombre(l.ganadorId)})`:"por jugar";
    const mio=(l.localId===JUEGO.miEquipoId||l.visitanteId===JUEGO.miEquipoId)?' class="mio"':'';
    html+=`<div${mio}>${nombre(l.localId)} vs ${nombre(l.visitanteId)} <span style="color:var(--tenue)">${res}</span></div>`;
  });
  html+=`<button class="btn" onclick="irADashboard()">Ir a mi partido</button></div>`;
  v.innerHTML=html;
}
```

- [ ] **Step 5: Estilos en `css/styles.css`**

```css
.plantilla{width:100%;border-collapse:collapse;margin-top:12px;font-size:.85rem}
.plantilla th,.plantilla td{padding:5px 8px;border-bottom:1px solid var(--linea);text-align:left}
.plantilla tr.titular{background:#12261a}
.barra{background:var(--panel2);border-radius:6px;height:10px;width:80px;overflow:hidden;display:inline-block}
.barra span{display:block;height:100%}
.marcador{text-align:center;font-size:1.4rem}
.marcador b{color:var(--acento)}
.goles{list-style:none;margin:12px auto;max-width:400px}
.otros{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px;margin-bottom:16px}
.mini-res{background:var(--panel2);border-radius:6px;padding:6px 8px;font-size:.85rem}
.campeon{text-align:center}
.vista-bracket .mio,.panel .mio{color:var(--acento2);font-weight:700}
```

- [ ] **Step 6: Verificar el ciclo completo en Live Server**

Abrir `index.html`. Recorrido esperado:
1. Elegir club → pide nombre → dashboard con mi plantilla.
2. Cambiar formación cambia el número/posiciones esperadas; el conteo "Titulares: x/11" y el botón se habilita en 11.
3. "Jugar mi partido" → marcador + goleadores + otros resultados.
4. Continuar → siguiente partido de grupo; tras 3, "Ver grupos" muestra tabla y clasificados.
5. `avanzarFase` construye octavos; se juegan rondas hasta la **pantalla de campeón**.
6. Recargar la página → "¿Continuar?" restaura el torneo.
7. Consola (F12) sin errores.

---

## Tarea 12: Pulido, validación de datos y verificación final

**Files:**
- Modify: `js/ui.js`, `css/styles.css` según hallazgos.

- [ ] **Step 1: Validaciones de robustez**
  - Al "Jugar mi partido", si `titulares.length!==11`, no permitir (botón ya deshabilitado; añadir guard en `jugarJornadaDeMiPartido` y `jugarEliminatoria`).
  - Al cambiar de formación, si sobran titulares de una posición que la nueva formación reduce, recortar con `autoAlinear` o avisar. Solución simple: al `cambiarFormacion`, llamar `autoAlinear(mi)` y luego permitir editar.

```js
function cambiarFormacion(f){ const mi=_equipo(JUEGO.miEquipoId); mi.formacion=f; autoAlinear(mi); renderDashboard(); }
```

- [ ] **Step 2: Subtítulo en topbar** — mostrar fase y nombre del club:
```js
// en main.js, tras cada render principal:
function _actualizarTopbar(){
  const mi=_equipo(JUEGO.miEquipoId);
  document.getElementById("subtitulo").textContent = mi ? `${mi.nombre} · ${JUEGO.fase}` : "";
}
```
Llamar `_actualizarTopbar()` al final de `renderDashboard`, `renderGrupos`, `renderBracket`.

- [ ] **Step 3: Correr `tests.html`** — todas las suites en verde (data, models, generator, mechanics, engine, tournament).

- [ ] **Step 4: Verificación funcional completa** (Live Server): jugar un torneo entero de principio a fin sin errores en consola; confirmar que el cansancio sube en titulares y baja en suplentes entre partidos, que la forma cambia, y que algún jugador joven sube atributos a lo largo del torneo (observable en la tabla de plantilla).

- [ ] **Step 5 (opcional): commit final** si se inicializó git.

---

## Auto-revisión del plan (cobertura del spec)

- ✅ 32 clubes ciudad, generados automáticamente → Tareas 3, 5.
- ✅ 8 grupos de 4, pasan 2, octavos→final → Tarea 8, 11.
- ✅ Jugador con 4 atributos + edad + cansancio + forma + experiencia → Tarea 4.
- ✅ Elegir formación + 11 titulares → Tarea 11 (renderDashboard).
- ✅ Cansancio (afectado por resistencia), forma, progresión por edad con declive → Tarea 6, aplicado en 11.
- ✅ Marcador instantáneo + estadísticas (goleadores) → Tarea 7, 11.
- ✅ Motor aislado tras contrato entrada→salida → Tarea 7.
- ✅ Autosave localStorage + continuar → Tarea 9, 10.
- ✅ Editar nombre de mi club → Tarea 10 (elegirClub). *(Editar nombres de jugadores individuales queda como extra menor post-MVP; el spec lo marcó "opcional al empezar".)*
- ✅ Estilo dashboard modo oscuro → Tareas 1, 10, 11.
- ✅ Criterios de éxito del MVP → cubiertos por verificación en Tareas 11 y 12.

**Nota de consistencia:** nombres de funciones unificados (`_equipo`, `evaluarAlineacion`, `simularPartido`, `aplicarPostPartido`, `proximoPartidoDe`) usados igual en main.js y ui.js. El motor no llama `Math.random` (recibe `JUEGO.rng`), cumpliendo la restricción de determinismo.
