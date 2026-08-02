# Utility AI

The first utility layer evaluates teammates rather than choosing a random pass. Its score combines forward progress, receiver separation from opponents, role preference, distance cost and bounded seeded noise. It selects among the best three valid candidates, avoiding deterministic loops without using `Math.random()`.

Future candidates: carry, hold, shoot, cross, clear, tackle, intercept and save. Every candidate will expose its score and factors through the event/telemetry API so a debug overlay can explain the selected action.
