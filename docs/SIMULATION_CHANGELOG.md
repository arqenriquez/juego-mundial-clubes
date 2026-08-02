# Simulation changelog

## Foundation phase

- Audited the existing rating-result engine and visual timeline split.
- Added `SeededRandom`, fixed-step tactical state, independent ball flight and replay interpolation.
- Added elastic formation anchors, limited pressing, separation and stamina drain.
- Routed normal visual play through the deterministic replay while preserving existing goal and restart presentation.
- Added automated tests for seed equality, deterministic stepping, pitch bounds, pass events and replay interpolation.

## Remaining migration

The tactical core does not yet determine official tournament goals. That boundary remains intentionally compatible until interception, shot, goalkeeper and rule resolution are implemented.
