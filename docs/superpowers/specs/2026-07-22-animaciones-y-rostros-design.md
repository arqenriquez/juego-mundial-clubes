# Diseño — Animaciones entre pantallas y rostros de jugador

**Fecha:** 2026-07-22
**Autor:** Jorge Enríquez (con Claude Code)
**Proyecto:** 24. JUEGO MANAGER - MUNDIAL DE CLUBES
**Rama:** `fase-1-mvp`
**Estado:** Aprobado

---

## 1. Objetivo

Dar sensación de videojuego a la SPA existente sin tocar la lógica de simulación:

1. **Animaciones** al cambiar de pantalla, micro-animaciones en los elementos clave y una
   cortinilla de "Simulando…" antes de revelar el marcador.
2. **Rostros simbólicos** en la tabla de plantilla del dashboard, con una ranura preparada para
   que Jorge sustituya cada cara por una imagen propia sin tocar código.

Se respetan las restricciones del proyecto: HTML/CSS/JS vanilla, sin frameworks, sin ESM, sin
dependencias, rutas relativas compatibles con Live Server y GitHub Pages.

## 2. Restricciones del código existente que condicionan el diseño

- `renderDashboard()` se re-ejecuta completo en cada clic de checkbox de titular
  (`toggleTitular`) y en cada cambio de formación (`cambiarFormacion`). Cada render llama a
  `mostrarVista()`. Animar la entrada sin más haría parpadear la pantalla en cada clic.
- Las seis funciones de render llaman `mostrarVista(id)` y **después** asignan `innerHTML`, de
  forma síncrona. Eso permite animar la entrada sin modificarlas, porque el navegador pinta el
  primer fotograma cuando la tarea JS ya terminó y el contenido existe.
- Los `id` de jugador son deterministas (`t19-p0` … `t19-p17`) y el reparto de posiciones es fijo
  (`p0`–`p1` POR, `p2`–`p7` DEF, `p8`–`p13` MED, `p14`–`p17` DEL). Los **nombres y edades son
  aleatorios en cada partida nueva**: una cara queda ligada a la *ranura*, no a un jugador con
  nombre fijo.
- El estado se serializa entero a `localStorage`. Nada de lo que se añada debe guardarse ahí.

## 3. Arquitectura

Dos archivos nuevos, ambos sin dependencias del dominio del juego:

| Archivo | Responsabilidad | Depende de |
|---|---|---|
| `js/anim.js` | Reinicio de animaciones CSS, cortinilla, contador de marcador | nada |
| `js/avatar.js` | Rostro procedural SVG y resolución de imagen de jugador | nada |

Orden de carga en `index.html`: `anim.js` y `avatar.js` antes de `ui.js`, que es quien los usa.
`main.js` sigue al final.

`index.html` gana un único nodo nuevo, el overlay `#cortina`, fuera de `#app`.

## 4. Animaciones

### 4.1 Transición entre pantallas

`mostrarVista()` (en `main.js`) pasa a recordar la vista activa y a devolver si hubo cambio real:

```js
let _vistaActual = null;
function mostrarVista(id){
  const cambio = (id !== _vistaActual);
  document.querySelectorAll(".vista").forEach(v=>v.classList.remove("activa"));
  const el = document.getElementById(id);
  el.classList.add("activa");
  if(cambio) reiniciarAnimacion(el, "entra");
  _vistaActual = id;
  _actualizarTopbar();
  return cambio;
}
```

`reiniciarAnimacion` (en `anim.js`) quita la clase, fuerza un reflow con `void el.offsetWidth` y
la vuelve a poner; sin el reflow el navegador no reinicia la animación. La animación es
`fade + translateY(10px)` de 260 ms.

**Ningún render se modifica para esto.** El único cambio dentro de un render es que
`renderDashboard` captura el booleano devuelto para decidir si aplica la cascada de filas.

### 4.2 Cortinilla de simulación

Overlay a pantalla completa con un balón girando y un texto. API:

```js
conCortina(texto, accion, ms)   // ms por defecto 900
```

Muestra la cortina, espera, ejecuta `accion()` por debajo (simulación + render del resultado) y
la retira revelando el marcador. `accion` se ejecuta dentro de `try/finally` para que la cortina
nunca se quede pegada si la acción lanza.

Puntos de conexión, todos en cadenas `onclick` de `ui.js`:

- Grupos: `conCortina('Simulando jornada N…', jugarJornadaDeMiPartido)`
- Eliminatorias: `conCortina('Simulando <ronda>…', jugarEliminatoria)`
- Eliminado: `conCortina('Simulando el resto del torneo…', simularRestoTorneo)`

La lógica de simulación no se toca.

### 4.3 Micro-animaciones

| Dónde | Efecto | Mecanismo |
|---|---|---|
| Plantilla | Filas en cascada, 22 ms por fila | `--i` inline + `animation-delay` |
| Plantilla | Barras de cansancio creciendo desde 0 | `@keyframes` con `from{width:0}` |
| Resultado | Marcador contando 0→N con latido | `contarHasta()` en JS |
| Resultado | Goles apareciendo escalonados tras el marcador | `--i` + retraso base 550 ms |
| Resultado | Otros resultados escalonados | `--i` + 30 ms por tarjeta |
| Inicio | Los 32 clubes entrando escalonados | `--i` + 14 ms por tarjeta |
| Campeón | 🏆 con *pop* de escala | `@keyframes` |

La cascada de filas y las barras se activan solo con la clase `cascada`, que `renderDashboard`
añade a la tabla **únicamente cuando `mostrarVista` reporta cambio de vista**. Marcar titulares o
cambiar formación re-renderiza sin animación.

El contador de marcador arranca 260 ms después del render para no quedar oculto tras la cortina
que se está desvaneciendo.

### 4.4 Accesibilidad

`animacionReducida()` consulta `prefers-reduced-motion: reduce`. Con la preferencia activa:

- `conCortina` ejecuta la acción de inmediato, sin overlay ni espera.
- `contarHasta` escribe el valor final directamente.
- Una regla CSS reduce todas las duraciones y retrasos a ~0.

## 5. Rostros

### 5.1 Capas

```js
caraSVG(semilla)                        // cadena SVG pura, determinista, sin DOM  → testeable
rutaCaraJugador(idJugador)              // "img/caras/t19-p5.png"
rutaCaraRanura(idJugador)               // "img/caras/def-4.png"
avatarHTML(jugador, equipoId, tam)      // <span class="avatar"> con <img> o SVG dentro
```

La separación permite probar la parte determinista en `tests.html`, que corre sin la UI.

### 5.2 Cadena de resolución

1. `img/caras/<equipoId>-p<N>.png` — foto específica de ese jugador de ese club.
2. `img/caras/<ranura>.png` — foto de la ranura genérica (`por-1`, `def-4`, `med-2`, `del-3`),
   reutilizable por cualquier club.
3. Cara procedural SVG en línea.

Los pasos 1→2→3 se encadenan con `onerror`, así basta con soltar archivos en la carpeta. Para no
llenar la consola de 404 en los 31 clubes sin fotos, una constante decide quién intenta cargar
imágenes:

```js
const EQUIPOS_CON_CARAS = ["t19"];   // añadir "t7", "t3"… al subir más
```

Los equipos fuera de la lista van directos al rostro procedural. Ésta es la única línea que hay
que editar para ampliar la cobertura.

La ranura se deriva del índice del `id`: `t19-p5` → índice 5 → `def-4` (los DEF ocupan `p2`–`p7`,
así que `p5` es el cuarto).

### 5.3 Cara procedural

Hash FNV-1a de 32 bits sobre el `id` del jugador. Del entero resultante se derivan por
desplazamiento de bits: tono de piel (5 opciones), color de pelo (4), peinado (6: corto, con
raya, rizado, rapado, con barba, con banda) y ancho de cara (2).

SVG de `viewBox 0 0 40 40`. Técnica de capas para el pelo: se dibuja una elipse de pelo algo mayor
y desplazada hacia arriba, y encima la elipse de la cara; lo que asoma por arriba es el peinado.
Cada variante ajusta centro, radio y adornos. Orden: fondo → cuello → hombros → orejas → masa de
pelo → cara → adornos de pelo → cejas → ojos → boca → barba.

El recorte circular lo hace el contenedor con `border-radius:50%; overflow:hidden`, evitando
`clipPath` y sus colisiones de `id` cuando hay 18 SVG en línea en la misma página.

Determinista y sin estado: el mismo jugador tiene la misma cara entre renders y entre recargas.
No se guarda nada en `localStorage`.

### 5.4 Ubicación

Una columna nueva de 28 px en la tabla del dashboard, entre la casilla XI y la posición, con
encabezado vacío. Nada más.

### 5.5 Carpeta de imágenes

Se crea `img/caras/` con un `LEEME.md` que documenta la convención de nombres y la lista de las
18 ranuras de un club, para que Jorge nombre sus PNG sin consultar el código.

## 6. Pruebas

`tests.html` carga `js/avatar.js` y `js/tests.js` gana una suite:

- `caraSVG` es determinista: dos llamadas con la misma semilla dan la misma cadena.
- Variedad: 100 ids distintos producen al menos 30 caras distintas.
- `rutaCaraJugador` y `rutaCaraRanura` construyen bien las rutas para POR, DEF, MED y DEL,
  incluidos los extremos `p0` y `p17`.
- `caraSVG` devuelve SVG bien formado (abre y cierra `<svg>`).

`anim.js` no se prueba automáticamente: depende del DOM y de CSS. Se verifica a ojo con Live
Server.

## 7. Fuera de alcance

Sin librerías de animación. Sin caras en la lista de goleadores, sin ficha de jugador, sin once
titular gráfico. Sin cambios en `engine.js`, `mechanics.js`, `tournament.js`, `generator.js` ni
en el formato guardado en `localStorage`.
