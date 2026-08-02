# Debugging simulation

The core exposes `snapshot()` and `eventLog()` for inspection. A temporary browser-console workflow is:

```js
const sim = new MatchVisual.TacticalMatchSimulation(inputs, 123);
sim.step(100);
console.log(sim.snapshot(), sim.eventLog());
```

Use a fixed seed to reproduce an issue. The planned visual debug overlay will draw anchors, desired positions, velocity, pressers, phase and pass candidates without mutating simulation state.
