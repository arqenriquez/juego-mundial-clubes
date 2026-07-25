# Rostros de jugador

Suelta aquí tus imágenes y aparecerán solas en la tabla de plantilla del dashboard. No hay que
tocar código para añadirlas. Formato recomendado: **PNG cuadrado, 128×128 px**, encuadre de cara
y hombros, fondo liso. Se recortan en círculo, así que lo importante debe quedar centrado.

## Los dos nombres que reconoce el juego

Para cada jugador se intenta cargar, en este orden:

1. `<idEquipo>-p<N>.png` — foto exclusiva de ese jugador de ese club. Ej. `t19-p5.png`.
2. `<posición>-<n>.png` — foto de la **ranura** genérica, reutilizable por cualquier club.
   Ej. `def-4.png`.
3. Si no existe ninguna, se dibuja un rostro generado por código.

Lo más práctico es empezar por las 18 de ranura: cubren cualquier club que elijas.

## Las 18 ranuras de un club

| Índice | Ranura | Índice | Ranura |
|---|---|---|---|
| `p0`  | `por-1` | `p9`  | `med-2` |
| `p1`  | `por-2` | `p10` | `med-3` |
| `p2`  | `def-1` | `p11` | `med-4` |
| `p3`  | `def-2` | `p12` | `med-5` |
| `p4`  | `def-3` | `p13` | `med-6` |
| `p5`  | `def-4` | `p14` | `del-1` |
| `p6`  | `def-5` | `p15` | `del-2` |
| `p7`  | `def-6` | `p16` | `del-3` |
| `p8`  | `med-1` | `p17` | `del-4` |

## Ampliar a más clubes

Solo los clubes listados en `EQUIPOS_CON_CARAS`, al inicio de `js/avatar.js`, intentan cargar
imágenes; el resto va directo al rostro generado, sin peticiones fallidas en la consola. Para
sumar un club, añade su id a esa lista:

```js
const EQUIPOS_CON_CARAS = ["t19", "t7"];
```

Los ids van de `t0` a `t31` en el mismo orden que la lista `CIUDADES` de `js/data.js`
(`t0` = Tokio … `t19` = Guadalajara … `t31` = Dubái).

## Un detalle a tener en cuenta

Los nombres y edades de los jugadores se generan al azar en cada partida nueva, pero el índice y
la posición de cada ranura son fijos. Es decir, `def-4.png` será siempre un defensa, pero no
siempre el mismo nombre.
