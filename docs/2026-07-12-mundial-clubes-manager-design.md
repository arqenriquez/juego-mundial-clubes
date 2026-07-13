# Diseño — Juego Manager: Mundial de Clubes

**Fecha:** 2026-07-12
**Autor:** Jorge Enríquez (con Claude Code)
**Proyecto:** 24. JUEGO MANAGER - MUNDIAL DE CLUBES
**Estado:** Diseño aprobado (Parte 1 y Parte 2) — pendiente plan de implementación

---

## 1. Concepto

Juego web de simulación tipo "FIFA modo entrenador". El jugador dirige **un club** durante un
torneo estilo **Mundial de Clubes**. La diversión central es **elegir la alineación** partido a
partido gestionando el **cansancio**, la **forma (rendimiento)** y la **progresión por edad** de
sus jugadores.

- Plataforma: **web estática vanilla** (HTML + CSS + JavaScript), probada en **Live Server**,
  desplegable en **GitHub Pages**.
- Sin frameworks, sin backend. Todo corre en el navegador.
- Guardado local para retomar el torneo.

## 2. Estructura del torneo

- **32 clubes**, cada uno nombrado por una ciudad del mundo (ej. Club Tokio, Club São Paulo,
  Club El Cairo).
- Formato oficial estilo Mundial de Clubes 2025:
  - **8 grupos de 4 equipos.**
  - Todos contra todos dentro del grupo (3 partidos por equipo).
  - **Avanzan los 2 primeros de cada grupo = 16 equipos.**
  - Eliminación directa: **Octavos (16) → Cuartos (8) → Semis (4) → Final (2).**
- El club del jugador juega **3 partidos de grupo + hasta 4 de eliminación = 7 máximo**.
- Desempates en grupo: puntos → diferencia de goles → goles a favor (aleatorio si persiste).

## 3. Modelo de datos

### Jugador
```
{
  id,
  nombre,                 // generado ficticio
  posicion,               // "POR" | "DEF" | "MED" | "DEL"
  edad,                   // 17-36
  ataque,                 // 40-95
  defensa,                // 40-95
  velocidad,              // 40-95
  resistencia,            // 40-95  (define qué tan rápido se cansa)
  cansancio,              // 0-100  (0 = fresco, 100 = agotado)
  forma,                  // -3 a +3 (racha reciente)
  experiencia            // acumulador; al llegar a un umbral sube un atributo
}
```

### Equipo (Club)
```
{
  id,
  nombre,                 // "Club Tokio"
  ciudad,
  nivel,                  // 1-5 (fuerza base para generar plantilla)
  esHumano,               // true solo para el club del jugador
  jugadores: [ ~18-20 ], // plantilla
  formacion,              // "4-4-2" | "4-3-3" | "3-5-2"
  titulares: [ 11 ids ]   // seleccionados por el jugador (o auto para la CPU)
}
```

### Partido
```
{
  id, ronda, local, visitante,
  golesLocal, golesVisitante,
  jugado,                 // bool
  eventos: [ goleadores... ]  // estadísticas mínimas para el MVP
}
```

## 4. Generación de datos (`generator.js`)

- Lista fija de **32 ciudades** del mundo en `data.js`.
- Tablas de nombres y apellidos ficticios para componer nombres de jugadores.
- Cada club recibe un **nivel (1-5)**; el nivel sesga los atributos generados (clubes fuertes
  tienen medias más altas), para que el torneo tenga favoritos y sorpresas.
- Cada club genera **~18-20 jugadores** con distribución de posiciones válida
  (al menos: 2 POR, 6 DEF, 6 MED, 4 DEL — ajustable) y edades variadas (jóvenes, prime, veteranos).
- El jugador puede **editar el nombre de su club y de sus jugadores** al iniciar.

## 5. Mecánicas centrales (`mechanics.js`)

### Cansancio
- Jugar un partido **sube** el cansancio; la cantidad depende (inversamente) de la `resistencia`.
- No jugar (descansar) **baja** el cansancio (recuperación entre jornadas).
- Un jugador muy cansado **rinde menos** en la simulación (penalización a su aporte de fuerza).

### Forma / rendimiento
- Racha reciente en un rango **-3 a +3**.
- Buen desempeño del equipo/jugador la sube; mal desempeño la baja.
- Aplica un **pequeño bono/penalización** al aporte del jugador.

### Progresión por edad
- Jugar minutos otorga **experiencia**.
- Al alcanzar un umbral, sube un atributo.
- Modulado por edad:
  - **Jóvenes (≤23):** suben rápido.
  - **Prime (24-29):** suben normal.
  - **Veteranos (30+):** suben muy poco; con el tiempo pueden **bajar** (declive).

## 6. Motor de simulación (`engine.js`) — pieza aislada

- **Entrada:** dos alineaciones (11 titulares + formación de cada equipo).
- **Salida:** resultado del partido (goles + estadísticas mínimas).
- MVP: calcula la **fuerza de cada equipo** = suma ponderada de atributos de los titulares
  (según posición y formación), ajustada por **cansancio** y **forma**, más un factor de **azar**;
  de ahí se derivan los goles.
- **Contrato estable:** el resto del juego solo conoce entrada/salida, no el "cómo". Esto permite
  reemplazar internamente la simulación en fases posteriores (relato por minutos, luego vista 2D)
  **sin tocar** el resto del código.

## 7. Interfaz (`ui.js`)

- SPA sencilla: una sola página `index.html` con **vistas** que se muestran/ocultan.
- Vistas principales:
  1. **Inicio / selección de club** (con edición opcional de nombres).
  2. **Sorteo y grupos** (grupos, calendario).
  3. **Dashboard de gestión / alineación**: plantilla con barras de cansancio y forma, selector de
     formación, elección de 11 titulares.
  4. **Resultado de partido**: marcador + estadísticas; resultados del resto de la jornada.
  5. **Bracket de eliminatorias** hasta el campeón.
- **Estilo visual:** dashboard deportivo limpio en **modo oscuro**, con barras de cansancio/forma
  muy visibles.

## 8. Persistencia (`storage.js`)

- **Autosave en `localStorage`** después de cada partido.
- Al abrir, si hay partida guardada, ofrecer **continuar** o **nueva partida**.

## 9. Arquitectura de archivos

```
24. JUEGO MANAGER - MUNDIAL DE CLUBES/
├── index.html
├── css/styles.css
└── js/
    ├── data.js        → 32 ciudades + tablas de nombres
    ├── generator.js   → crea clubes y jugadores balanceados por nivel
    ├── models.js      → estructuras Jugador / Equipo / Partido
    ├── tournament.js  → sorteo, grupos, calendario, bracket, avance
    ├── engine.js      → MOTOR de simulación (aislado)
    ├── mechanics.js   → cansancio, forma, progresión
    ├── ui.js          → render de vistas
    ├── storage.js     → guardar/cargar
    └── main.js        → estado del juego + navegación (orquestador)
```

Cada archivo tiene una responsabilidad única y se comunica por interfaces claras, para poder
entenderse y probarse por separado.

## 10. Roadmap por fases

- **Fase 1 — MVP (lo que se construye ahora):** generación de equipos, sorteo, dashboard,
  alineación con formación, simulación instantánea, cansancio/forma/progresión, avance del torneo
  hasta campeón, guardado. **Juego completo y jugable de punta a punta.**
- **Fase 2:** relato por minutos + cambios en vivo (sustituciones durante el partido).
- **Fase 3:** vista 2D del partido (fichas moviéndose en el campo).
- **Extras futuros:** editor de plantilla, niveles de dificultad, lesiones, fichajes entre
  temporadas.

## 11. Fuera de alcance (para el MVP)

- Vista 2D o relato por minutos (fases posteriores).
- Sustituciones durante el partido.
- Datos reales de equipos/jugadores (por derechos de nombre).
- Lesiones, fichajes, múltiples temporadas.
- Backend, cuentas de usuario, multijugador.

## 12. Criterios de éxito del MVP

1. El jugador puede elegir un club y (opcionalmente) renombrarlo.
2. Se generan 32 clubes con plantillas balanceadas y coherentes.
3. El torneo completo se sortea y se juega hasta coronar un campeón.
4. Antes de cada partido el jugador elige formación y 11 titulares.
5. El cansancio, la forma y la progresión por edad cambian de forma visible entre partidos y
   afectan los resultados.
6. La partida se guarda y se puede retomar.
7. Todo corre en Live Server sin errores en consola.
