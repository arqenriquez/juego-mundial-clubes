# Simulation audit

## Architecture observed

The application is a static single-page web app: HTML/CSS and global JavaScript files loaded in order. Tournament state is stored in `JUEGO` and persisted with `localStorage`. `engine.js` calculates the tournament result from team ratings, expected goals and a supplied RNG. PixiJS renders the match overlay. The TypeScript source in `match-visual/src/` compiles to `js/match-visual.js` and is the only build step.

The previous 2D path had two separate systems: `engine.js` selected score/scorers first, while `MatchVisual.createMatchTimeline` generated visual actions afterwards. Its normal-play movement was a stateless target calculation at render time. This explained abrupt changes, short possessions, static off-ball players and the lack of tactical pass intent.

## Components retained

- Tournament, squads, roles, fatigue and persistence modules.
- Existing formation selection and Pixi pitch/player renderers.
- Event timeline for verified goals and restart presentation.
- Existing test harness and static deployment model.

## Problems and risks

1. The canonical tournament result still comes from the rating/Poisson engine. The visual simulation is therefore not yet the source of truth for goals.
2. `main.js` owns both tournament orchestration and match-entry flow.
3. The legacy visual timeline is still needed for goal/restart compatibility during migration.
4. Player attributes are not yet passed in full to the tactical core; the initial adapter uses normalized capability defaults.
5. No browser performance profiler or worker exists yet. The current precomputed replay is intentionally bounded and safe for 22 players.

## Implemented foundation

`match-visual/src/simulation.ts` adds a deterministic, fixed-100-ms tactical core. It owns normalized pitch coordinates in metres (105 x 68), a seeded PRNG, independent ball flight, pass decisions, formation anchors, acceleration-limited movement, separation, stamina drain, limited pressing and interpolated replay snapshots. The renderer consumes the replay; it does not make tactical decisions.

## Migration plan

1. **Completed:** audit, tuning, seed, fixed step, replay interpolation and elastic baseline shape.
2. Pass real player attributes and role modifiers through the adapter.
3. Add pass interception, first touch, tackles, turnovers and a richer event bus.
4. Let the tactical core produce the authoritative result; migrate `engine.js` behind an adapter so tournament callers remain compatible.
5. Add rules, telemetry export, headless batch simulation and debug overlay.

## Files changed in this phase

- `match-visual/src/simulation.ts` (new tactical core)
- `match-visual/src/match-visual.ts` (replay integration)
- `tsconfig.json` (compilation order)
- `js/tests.js` (determinism/fixed-step coverage)

## Success metrics

- Same seed + inputs creates equal snapshots and event sequence.
- Fixed-step results do not depend on render frame rate or playback speed.
- At most two direct pressers are selected.
- Players and ball remain inside the 105 x 68 pitch.
- A forward reaches the final third under possession while defenders retain a rest-defence line.
- The test suite and TypeScript build remain clean.
