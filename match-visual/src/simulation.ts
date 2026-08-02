namespace MatchVisual {
  export type SimulationVector = { x: number; y: number };
  export type SimulationTeam = "home" | "away";
  export type SimulationPlayerInput = {
    id: string; team: SimulationTeam; role: string; position: SimulationVector;
    speed: number; passing: number; stamina: number;
  };
  export type SimulationPlayerFrame = { id: string; team: SimulationTeam; position: SimulationVector; velocity: SimulationVector; stamina: number };
  export type SimulationFrame = { time: number; ball: SimulationVector; possession: string | null; phase: MatchPhase; players: readonly SimulationPlayerFrame[] };
  export type SimulationEvent = { type: "POSSESSION_CHANGED" | "PASS_ATTEMPTED" | "PASS_COMPLETED"; time: number; actorId: string; targetId?: string };

  export enum MatchPhase { BUILD_UP = "BUILD_UP", PROGRESSION = "PROGRESSION", FINAL_THIRD = "FINAL_THIRD", DEFENSIVE_TRANSITION = "DEFENSIVE_TRANSITION" }

  // Los valores se concentran aquí para que el ajuste no dependa de números dispersos en el renderer.
  export const simulationTuning = Object.freeze({
    timing: { stepMs: 100, maxStepsPerFrame: 10, decisionIntervalMs: 900 },
    pitch: { length: 105, width: 68 },
    movement: { arrivalRadius: .55, separationMeters: 2.2, separationStrength: .42, maxAcceleration: 24, turnDamping: .72 },
    passing: { minIntervalMs: 850, baseSpeed: 22, maxDistance: 31 },
    tactics: { maxPressers: 2, defensiveCompactness: .34, supportShift: .30 }
  });

  export class SeededRandom {
    private state: number;
    constructor(seed: number) { this.state = (seed >>> 0) || 0x9e3779b9; }
    next(): number {
      let value = this.state += 0x6d2b79f5;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    }
    range(min: number, max: number): number { return min + (max - min) * this.next(); }
  }

  type MovementProfile = { responseMs: number; nextResponseMs: number; depthBias: number; lateralBias: number; phase: number; tempo: number };
  type SimulationPlayerState = SimulationPlayerInput & { anchor: SimulationVector; velocity: SimulationVector; desired: SimulationVector; staminaValue: number; movement: MovementProfile };
  type Flight = { from: SimulationVector; to: SimulationVector; elapsed: number; duration: number; targetId: string };
  const vector = (x: number, y: number): SimulationVector => ({ x, y });
  const interpolateNumber = (from: number, to: number, amount: number): number => from + (to - from) * amount;
  const interpolate = (from: SimulationVector, to: SimulationVector, amount: number): SimulationVector => vector(interpolateNumber(from.x, to.x, amount), interpolateNumber(from.y, to.y, amount));
  const add = (a: SimulationVector, b: SimulationVector): SimulationVector => vector(a.x + b.x, a.y + b.y);
  const subtract = (a: SimulationVector, b: SimulationVector): SimulationVector => vector(a.x - b.x, a.y - b.y);
  const scale = (v: SimulationVector, n: number): SimulationVector => vector(v.x * n, v.y * n);
  const length = (v: SimulationVector): number => Math.hypot(v.x, v.y);
  const normalize = (v: SimulationVector): SimulationVector => { const size = length(v); return size < .0001 ? vector(0, 0) : scale(v, 1 / size); };
  const clampVector = (position: SimulationVector): SimulationVector => vector(
    clamp(position.x, 0, simulationTuning.pitch.length), clamp(position.y, 0, simulationTuning.pitch.width)
  );
  const clampPlayerVector = (position: SimulationVector): SimulationVector => vector(
    clamp(position.x, 2, simulationTuning.pitch.length - 2), clamp(position.y, 2, simulationTuning.pitch.width - 2)
  );
  const hashText = (text: string): number => {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
    return hash >>> 0;
  };

  export class TacticalMatchSimulation {
    private readonly players: SimulationPlayerState[];
    private readonly rng: SeededRandom;
    private readonly events: SimulationEvent[] = [];
    private timeMs = 0;
    private possessionTeam: SimulationTeam = "home";
    private possessorId: string | null;
    private ball: SimulationVector;
    private flight: Flight | null = null;
    private decisionCooldownMs = 450;

    constructor(inputs: readonly SimulationPlayerInput[], seed = 1) {
      this.players = inputs.map(input => {
        // Cada futbolista recibe un perfil estable: no todos ven la jugada ni arrancan al mismo instante.
        const individual = new SeededRandom((seed ^ hashText(input.id)) >>> 0);
        return {
          ...input, position: { ...input.position }, anchor: { ...input.position }, velocity: vector(0, 0), desired: { ...input.position }, staminaValue: clamp(input.stamina, 0, 1),
          movement: {
            responseMs: Math.round(individual.range(260, 760)), nextResponseMs: individual.range(0, 420),
            depthBias: individual.range(-2.4, 2.4), lateralBias: individual.range(-1.8, 1.8),
            phase: individual.range(0, Math.PI * 2), tempo: individual.range(.78, 1.18)
          }
        };
      });
      this.rng = new SeededRandom(seed);
      const firstMidfielder = this.players.find(player => player.team === "home" && player.role === "MED") || this.players.find(player => player.team === "home");
      this.possessorId = firstMidfielder?.id || null;
      this.ball = firstMidfielder ? { ...firstMidfielder.position } : vector(52.5, 34);
    }

    step(stepMs = simulationTuning.timing.stepMs): void {
      const dt = stepMs / 1000;
      this.timeMs += stepMs;
      this.decisionCooldownMs -= stepMs;
      if (this.flight) this.advanceFlight(dt);
      else if (this.decisionCooldownMs <= 0) this.decideOnBall();
      this.updateDesiredPositions();
      this.movePlayers(dt);
      if (!this.flight && this.possessorId) {
        const possessor = this.player(this.possessorId);
        if (possessor) this.ball = add(possessor.position, vector(possessor.team === "home" ? .55 : -.55, 0));
      }
    }

    snapshot(): SimulationFrame {
      return {
        time: this.timeMs / 1000, ball: { ...this.ball }, possession: this.possessorId, phase: this.phase(),
        players: this.players.map(player => ({ id: player.id, team: player.team, position: { ...player.position }, velocity: { ...player.velocity }, stamina: player.staminaValue }))
      };
    }
    eventLog(): readonly SimulationEvent[] { return this.events.slice(); }

    private player(id: string): SimulationPlayerState | undefined { return this.players.find(player => player.id === id); }
    private phase(): MatchPhase {
      const direction = this.possessionTeam === "home" ? 1 : -1;
      const progress = (this.ball.x - 52.5) * direction;
      if (progress > 23) return MatchPhase.FINAL_THIRD;
      if (progress > 2) return MatchPhase.PROGRESSION;
      return MatchPhase.BUILD_UP;
    }
    private advanceFlight(dt: number): void {
      const flight = this.flight as Flight;
      flight.elapsed += dt;
      const progress = clamp(flight.elapsed / flight.duration, 0, 1);
      this.ball = add(flight.from, scale(subtract(flight.to, flight.from), easeInOutCubic(progress)));
      if (progress < 1) return;
      const receiver = this.player(flight.targetId);
      this.flight = null;
      if (receiver) {
        this.possessorId = receiver.id; this.possessionTeam = receiver.team; this.ball = { ...receiver.position };
        this.events.push({ type: "PASS_COMPLETED", time: this.timeMs / 1000, actorId: receiver.id });
      }
      this.decisionCooldownMs = simulationTuning.timing.decisionIntervalMs + this.rng.range(150, 850);
    }
    private decideOnBall(): void {
      const possessor = this.possessorId ? this.player(this.possessorId) : undefined;
      if (!possessor) return;
      const candidates = this.players.filter(player => player.team === possessor.team && player.id !== possessor.id)
        .map(player => ({ player, score: this.passScore(possessor, player) }))
        .filter(candidate => candidate.score > -.5)
        .sort((a, b) => b.score - a.score);
      const selected = candidates[Math.min(candidates.length - 1, Math.floor(this.rng.next() * Math.min(3, candidates.length)))];
      if (!selected || selected.score < .04) { this.decisionCooldownMs = 350; return; }
      const distance = length(subtract(selected.player.position, possessor.position));
      this.flight = { from: { ...this.ball }, to: { ...selected.player.position }, elapsed: 0, duration: clamp(distance / simulationTuning.passing.baseSpeed, .32, 1.25), targetId: selected.player.id };
      this.events.push({ type: "PASS_ATTEMPTED", time: this.timeMs / 1000, actorId: possessor.id, targetId: selected.player.id });
    }
    private passScore(from: SimulationPlayerState, to: SimulationPlayerState): number {
      const direction = from.team === "home" ? 1 : -1;
      const distance = length(subtract(to.position, from.position));
      if (distance > simulationTuning.passing.maxDistance) return -1;
      const progress = (to.position.x - from.position.x) * direction / simulationTuning.pitch.length;
      const nearestOpponent = this.players.filter(player => player.team !== from.team).reduce((nearest, opponent) => Math.min(nearest, length(subtract(opponent.position, to.position))), Infinity);
      const roleBonus = to.role === "DEL" ? .12 : to.role === "MED" ? .08 : .02;
      const technicalQuality = (from.passing - 50) / 180;
      const fatiguePenalty = (1 - from.staminaValue) * .12;
      return progress * .85 + Math.min(nearestOpponent / 18, .26) + roleBonus + technicalQuality - fatiguePenalty - distance / 90 + this.rng.range(-.035, .035);
    }
    private updateDesiredPositions(): void {
      const ballShiftY = (this.ball.y - 34) * simulationTuning.tactics.supportShift;
      const homePlayers = this.players.filter(player => player.team === "home"), awayPlayers = this.players.filter(player => player.team === "away");
      const pressers = this.players.filter(player => player.team !== this.possessionTeam && player.role !== "POR")
        .sort((a, b) => length(subtract(a.position, this.ball)) - length(subtract(b.position, this.ball))).slice(0, simulationTuning.tactics.maxPressers);
      this.players.forEach(player => {
        const direction = player.team === "home" ? 1 : -1;
        const attacking = player.team === this.possessionTeam;
        const teammates = player.team === "home" ? homePlayers : awayPlayers;
        const rolePeers = teammates.filter(peer => peer.role === player.role).sort((a, b) => (b.anchor.x * direction) - (a.anchor.x * direction) || a.anchor.y - b.anchor.y);
        const roleIndex = Math.max(0, rolePeers.indexOf(player));
        const midfielders = teammates.filter(peer => peer.role === "MED").sort((a, b) => (b.anchor.x * direction) - (a.anchor.x * direction));
        const isLeadMidfielder = midfielders[0]?.id === player.id;
        const ballProgress = Math.max(0, (this.ball.x - 52.5) * direction);
        const forwardDepth = [28, 21, 15, 10][Math.min(roleIndex, 3)];
        const depth = attacking
          ? player.role === "DEL" ? forwardDepth + Math.min(10, ballProgress * .35)
            : player.role === "MED" ? (isLeadMidfielder ? 13 : 6) + Math.min(7, ballProgress * (isLeadMidfielder ? .22 : .12))
              : player.role === "DEF" ? 2 + (Math.abs(player.anchor.y - 34) > 20 ? 3 : 0) + Math.min(4, ballProgress * .08) : 0
          : player.role === "DEL" ? -7 : player.role === "MED" ? -8 : -4;
        const linePosition = rolePeers.length > 1 ? roleIndex / (rolePeers.length - 1) - .5 : 0;
        const ballSide = clamp((this.ball.y - 34) / 34, -1, 1);
        const playerSide = clamp((player.anchor.y - 34) / 34, -1, 1);
        // El lateral cercano acompana; el lejano cierra y los centrales guardan distinta profundidad.
        const sideDepth = player.role === "DEF" ? playerSide * ballSide * 2.6 : player.role === "MED" ? playerSide * ballSide * 1.15 : playerSide * ballSide * .7;
        const roleStagger = linePosition * (player.role === "DEF" ? 2.1 : player.role === "MED" ? 1.45 : 1.1);
        const scan = Math.sin(this.timeMs / 1000 * (1.15 + player.movement.tempo * .55) + player.movement.phase);
        const localShift = ballShiftY * (.72 + player.movement.tempo * .14);
        let desired = vector(
          player.anchor.x + direction * (depth + sideDepth + roleStagger + player.movement.depthBias + scan * .65),
          player.anchor.y + localShift + player.movement.lateralBias + scan * (player.role === "DEL" ? 1.35 : 1.0)
        );
        if (!attacking && pressers.some(presser => presser.id === player.id)) desired = add(desired, scale(subtract(this.ball, desired), player.id === pressers[0]?.id ? .42 : .24));
        if (player.role === "POR") desired = vector(player.team === "home" ? 6 : 99, 34 + ballShiftY * .18);
        // Las intenciones se actualizan de manera escalonada; asi una linea nunca salta como una sola pieza.
        if (player.role === "POR" || this.timeMs >= player.movement.nextResponseMs) {
          player.desired = clampPlayerVector(desired);
          player.movement.nextResponseMs = this.timeMs + player.movement.responseMs;
        }
      });
    }
    private movePlayers(dt: number): void {
      this.players.forEach(player => {
        const toTarget = subtract(player.desired, player.position);
        const distance = length(toTarget);
        // El reloj visual comprime 90 minutos: se escala la locomoción para conservar carreras perceptibles.
        const maxSpeed = (8 + player.speed / 10) * (.65 + player.staminaValue * .35) * player.movement.tempo;
        const desiredVelocity = distance < simulationTuning.movement.arrivalRadius ? vector(0, 0) : scale(normalize(toTarget), Math.min(maxSpeed, distance / Math.max(dt, .01)));
        let acceleration = scale(subtract(desiredVelocity, player.velocity), 1 / Math.max(dt, .01));
        if (length(acceleration) > simulationTuning.movement.maxAcceleration) acceleration = scale(normalize(acceleration), simulationTuning.movement.maxAcceleration);
        const separation = this.players.filter(other => other.id !== player.id).reduce((force, other) => {
          const delta = subtract(player.position, other.position), gap = length(delta);
          return gap > 0 && gap < simulationTuning.movement.separationMeters ? add(force, scale(normalize(delta), (simulationTuning.movement.separationMeters - gap) * simulationTuning.movement.separationStrength)) : force;
        }, vector(0, 0));
        player.velocity = add(scale(player.velocity, simulationTuning.movement.turnDamping), scale(add(acceleration, separation), dt));
        if (length(player.velocity) > maxSpeed) player.velocity = scale(normalize(player.velocity), maxSpeed);
        player.position = clampPlayerVector(add(player.position, scale(player.velocity, dt)));
        player.staminaValue = clamp(player.staminaValue - length(player.velocity) * .000018, 0, 1);
      });
    }
  }

  export class SimulationReplay {
    private readonly frames: readonly SimulationFrame[];
    constructor(inputs: readonly SimulationPlayerInput[], durationSeconds: number, seed = 1) {
      const simulation = new TacticalMatchSimulation(inputs, seed), frames: SimulationFrame[] = [simulation.snapshot()];
      const steps = Math.ceil(durationSeconds * 1000 / simulationTuning.timing.stepMs);
      for (let step = 0; step < steps; step++) { simulation.step(); frames.push(simulation.snapshot()); }
      this.frames = frames;
    }
    sample(timeSeconds: number): SimulationFrame {
      const rawIndex = Math.max(0, timeSeconds * 1000 / simulationTuning.timing.stepMs);
      const lowIndex = Math.min(this.frames.length - 1, Math.floor(rawIndex)), highIndex = Math.min(this.frames.length - 1, lowIndex + 1);
      const low = this.frames[lowIndex], high = this.frames[highIndex], alpha = rawIndex - lowIndex;
      const highById = new Map(high.players.map(player => [player.id, player]));
      return {
        time: interpolateNumber(low.time, high.time, alpha), possession: alpha < .5 ? low.possession : high.possession, phase: alpha < .5 ? low.phase : high.phase,
        ball: interpolate(low.ball, high.ball, alpha),
        players: low.players.map(player => {
          const next = highById.get(player.id) || player;
          return { ...player, position: interpolate(player.position, next.position, alpha), velocity: interpolate(player.velocity, next.velocity, alpha), stamina: interpolateNumber(player.stamina, next.stamina, alpha) };
        })
      };
    }
  }
}
