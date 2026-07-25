# ⚽ Mundial de Clubes — Manager

Juego web de simulación tipo "FIFA modo entrenador". Diriges **un club** durante un torneo
estilo Mundial de Clubes: eliges la alineación partido a partido gestionando **cansancio**,
**forma** y **progresión por edad** de tus jugadores, hasta coronar campeón.

**▶ Jugar:** https://arqenriquez.github.io/juego-mundial-clubes/

## Cómo funciona el torneo

- **32 clubes** (uno por ciudad del mundo) → **8 grupos de 4**.
- Todos contra todos en el grupo; pasan los **2 primeros** de cada uno = 16.
- Eliminación directa: **Octavos → Cuartos → Semifinal → Final.**
- Tu club juega 3 partidos de grupo + hasta 4 de eliminatoria (7 como máximo).
- La partida se guarda en el navegador (`localStorage`) para retomarla.

## Ejecutar en local

Es un sitio **estático** sin dependencias ni build. Dos opciones:

- Abrir `index.html` con **Live Server** (extensión de VS Code), o
- Servirlo con cualquier servidor estático, p. ej. `npx http-server`.

Las pruebas de lógica corren en el navegador abriendo `tests.html`.

## Estructura

```
index.html          # shell + carga de scripts + contenedores de vistas
tests.html          # ejecuta las pruebas de lógica en el navegador
css/styles.css      # estilos (modo oscuro), animaciones y avatares
js/
  data.js           # ciudades, nombres, formaciones
  generator.js      # generación de los 32 clubes y sus plantillas
  mechanics.js      # cansancio, forma, progresión
  engine.js         # simulación de partido (contrato entrada→salida)
  tournament.js     # sorteo, fixtures, tabla, bracket
  partido2d.js      # vista 2D del partido
  anim.js           # transiciones de pantalla y cortinilla
  avatar.js         # rostros de jugador (procedurales o por imagen)
  ui.js / main.js   # render de vistas y orquestación del estado
img/caras/          # rostros opcionales (ver LEEME.md)
docs/               # diseño y plan de implementación
```

## Rostros de jugador

Cada jugador tiene un rostro simbólico generado por código (determinista según su id). Se pueden
sustituir por imágenes propias soltando PNG en `img/caras/` — la convención de nombres está en
[`img/caras/LEEME.md`](img/caras/LEEME.md).

## Tecnología

HTML5 + CSS3 + JavaScript vanilla (ES6, sin frameworks ni módulos ESM). Todo corre en el
navegador; compatible con GitHub Pages y Vercel.
