# Simulation tuning

`MatchVisual.simulationTuning` centralizes the initial values:

- 100 ms fixed step; maximum ten steps per render frame when a live runner is added.
- 105 x 68 metre pitch.
- Arrival radius, separation and acceleration limits.
- Pass interval, distance and speed.
- Maximum two pressers and support/compactness factors.

The visual match compresses real match time, so locomotion is intentionally scaled for readable movement. Calibrate from telemetry rather than scattering constants through render code.
