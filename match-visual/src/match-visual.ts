/*
 * Simulación visual de partido: el motor crea eventos inmutables y el renderer
 * solamente los reproduce. No depende de equipos, DOM ni del motor de resultados.
 */
declare const PIXI: any;

namespace MatchVisual {
  export type EventType = "MATCH_START" | "POSSESSION_CHANGE" | "PLAYER_MOVE" | "DRIBBLE" |
    "PASS" | "BALL_RECEIVED" | "SHOT" | "SAVE" | "GOAL" | "KICK_OFF" | "BALL_OUT";
  export type Position = { x: number; y: number };
  export type MatchEvent = {
    id: string; type: EventType; startTime: number; duration: number; actorId: string;
    targetId?: string; startPosition?: Position; targetPosition?: Position;
    metadata: Record<string, unknown>;
  };
  export type PlayerDefinition = { id: string; team: "home" | "away"; number: number; name: string; role: string; position: Position };
  export type Frame = { players: Map<string, Position>; ball: Position; possession: string | null };

  export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  export const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;
  export const easeInOutCubic = (value: number) => value < .5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
  const positionLerp = (from: Position, to: Position, amount: number): Position => ({ x: lerp(from.x, to.x, amount), y: lerp(from.y, to.y, amount) });

  export class MatchTimeline {
    readonly events: readonly MatchEvent[];
    readonly duration: number;
    constructor(events: MatchEvent[]) {
      this.events = Object.freeze(events.slice().sort((a, b) => a.startTime - b.startTime || a.id.localeCompare(b.id)));
      this.duration = this.events.reduce((last, event) => Math.max(last, event.startTime + event.duration), 0);
    }
    activeAt(time: number): MatchEvent[] { return this.events.filter(event => time >= event.startTime && time <= event.startTime + event.duration); }
  }

  export class PlaybackClock {
    currentTime = 0;
    speed = 1;
    playing = false;
    constructor(readonly duration: number) {}
    play(): void { this.playing = true; }
    pause(): void { this.playing = false; }
    reset(): void { this.currentTime = 0; }
    tick(deltaTimeMs: number): boolean {
      if (!this.playing) return false;
      this.currentTime = clamp(this.currentTime + deltaTimeMs / 1000 * this.speed, 0, this.duration);
      if (this.currentTime >= this.duration) { this.playing = false; return true; }
      return false;
    }
  }

  // EventPlayer transforma tiempo + eventos en un frame de render, sin dibujar nada.
  export class EventPlayer {
    constructor(private readonly timeline: MatchTimeline, private readonly roster: PlayerDefinition[]) {}
    private tacticalState(time: number): { ball: Position; possession: string | null } {
      // Posesiones breves, con el balón atravesando zonas distintas; son deterministas.
      const phases = [
        { team: "home", x: 32, y: 52 }, { team: "home", x: 46, y: 32 }, { team: "home", x: 60, y: 62 },
        { team: "away", x: 62, y: 38 }, { team: "away", x: 48, y: 67 }, { team: "away", x: 35, y: 45 },
        { team: "home", x: 40, y: 65 }, { team: "home", x: 56, y: 43 }, { team: "away", x: 57, y: 54 },
        { team: "away", x: 42, y: 31 }
      ] as const;
      const phaseLength = 2.15, phase = Math.max(0, Math.floor((time - .75) / phaseLength));
      const progress = clamp((time - .75 - phase * phaseLength) / phaseLength, 0, 1);
      const from = phases[phase % phases.length], to = phases[(phase + 1) % phases.length];
      const owner = progress < .72 ? from.team : to.team;
      const carrier = this.roster.find(player => player.team === owner && player.role === "MED") || this.roster.find(player => player.team === owner) || null;
      return { ball: positionLerp(from, to, easeInOutCubic(progress)), possession: carrier?.id || null };
    }
    private isScriptedAction(time: number): boolean {
      return this.timeline.events.some(event =>
        event.type === "GOAL" && typeof event.metadata.minuto === "number" && time >= event.startTime - 5.1 && time <= event.startTime + .5 ||
        event.type === "BALL_OUT" && time >= event.startTime - .1 && time <= event.startTime + 1.4
      );
    }
    sample(time: number): Frame {
      const players = new Map(this.roster.map(player => [player.id, { ...player.position }]));
      let possession: string | null = null;
      let ball: Position = { x: 50, y: 50 };
      const completed = this.timeline.events.filter(event => time >= event.startTime);
      completed.forEach(event => {
        const progress = event.duration <= 0 ? 1 : clamp((time - event.startTime) / event.duration, 0, 1);
        const eased = easeInOutCubic(progress);
        const actor = players.get(event.actorId);
        if ((event.type === "PLAYER_MOVE" || event.type === "DRIBBLE") && actor && event.targetPosition) {
          players.set(event.actorId, positionLerp(event.startPosition || actor, event.targetPosition, eased));
        }
        if (event.type === "POSSESSION_CHANGE" || event.type === "KICK_OFF" || event.type === "BALL_RECEIVED") {
          if (progress === 1) possession = event.targetId || event.actorId;
        }
      });
      // La última posesión completada fija el balón al jugador, salvo mientras está viajando.
      const possessionEvents = completed.filter(event => (event.type === "POSSESSION_CHANGE" || event.type === "KICK_OFF" || event.type === "BALL_RECEIVED") && (event.duration <= 0 || time >= event.startTime + event.duration));
      if (possessionEvents.length) possession = possessionEvents[possessionEvents.length - 1].targetId || possessionEvents[possessionEvents.length - 1].actorId;
      if (possession && players.has(possession)) ball = { ...players.get(possession)! };
      const flight = this.timeline.activeAt(time).filter(event => event.type === "PASS" || event.type === "SHOT" || event.type === "SAVE").pop();
      if (flight && flight.startPosition && flight.targetPosition) {
        const progress = flight.duration <= 0 ? 1 : clamp((time - flight.startTime) / flight.duration, 0, 1);
        ball = positionLerp(flight.startPosition, flight.targetPosition, easeInOutCubic(progress));
      }
      const terminal = completed.filter(event => event.type === "GOAL" && time >= event.startTime + event.duration).pop();
      if (terminal?.targetPosition) ball = { ...terminal.targetPosition };
      const out = this.timeline.activeAt(time).filter(event => event.type === "BALL_OUT").pop();
      if (out?.targetPosition) ball = { ...out.targetPosition };
      // Entre jugadas decisivas hay posesiones y cambios de zona: el partido nunca queda congelado.
      const isRealMatch = this.timeline.events.some(event => event.metadata.realMatch === true || (event.type === "GOAL" && typeof event.metadata.minuto === "number"));
      if (isRealMatch && !this.isScriptedAction(time) && time >= .75) {
        const tactical = this.tacticalState(time); ball = tactical.ball; possession = tactical.possession;
      }
      // El bloque completo acompaña la acción: ataque ofrece apoyos y defensa bascula/presiona.
      // Parte siempre de la formación base, por lo que cada equipo conserva su lado al inicio.
      const carrier = possession ? this.roster.find(player => player.id === possession) : undefined;
      const possessionTeam = carrier?.team;
      const pressingOrder = this.roster.filter(player => player.team !== possessionTeam && player.role !== "POR")
        .sort((a, b) => Math.hypot(a.position.x - ball.x, a.position.y - ball.y) - Math.hypot(b.position.x - ball.x, b.position.y - ball.y));
      players.forEach((current, id) => {
        const player = this.roster.find(item => item.id === id);
        if (!player || player.role === "POR" || time < .75 || !possessionTeam) return;
        const executingAction = this.timeline.events.some(event => event.actorId === id && (event.type === "PLAYER_MOVE" || event.type === "DRIBBLE") && time >= event.startTime && time <= event.startTime + event.duration + .8);
        if (executingAction) return; // la conducción/carrera principal conserva su trayectoria precisa
        const index = this.roster.indexOf(player);
        const direction = player.team === "home" ? 1 : -1;
        const attacking = player.team === possessionTeam;
        const ballAdvance = (ball.x - 50) * direction;
        const advance = attacking ? 5 + ballAdvance * .22 : -5 + ballAdvance * .14;
        const roleWeight = player.role === "DEF" ? .65 : player.role === "MED" ? 1 : 1.22;
        // Micro-movimientos permanentes: cada jugador ofrece una línea de pase o cierra un espacio.
        const rhythm = time * (3.3 + (index % 3) * .35) + index * 1.7;
        const lateralRun = Math.sin(rhythm) * (player.role === "DEL" ? 3.8 : 2.8);
        const forwardRun = Math.cos(rhythm * .8) * (player.role === "DEL" ? 2 : 1.2);
        let target = {
          x: clamp(player.position.x + direction * (advance * roleWeight + forwardRun), 4, 96),
          y: clamp(player.position.y + (ball.y - player.position.y) * (attacking ? .38 : .30) + lateralRun, 8, 92)
        };
        const pressingRank = pressingOrder.indexOf(player);
        if (!attacking && pressingRank >= 0 && pressingRank < 2) {
          // Uno presiona directamente y un segundo cubre el pase corto.
          target = positionLerp(target, ball, pressingRank === 0 ? .58 : .34);
        }
        players.set(id, positionLerp(current, target, .72));
      });
      return { players, ball, possession };
    }
  }

  export class PitchRenderer {
    readonly container: any;
    constructor() {
      this.container = new PIXI.Container();
      const grass = new PIXI.Graphics();
      grass.beginFill(0x173d25).drawRect(0, 0, 1000, 640).endFill();
      grass.lineStyle(3, 0xddeedd, .62).drawRect(20, 20, 960, 600);
      grass.moveTo(500, 20).lineTo(500, 620); grass.drawCircle(500, 320, 76);
      grass.drawRect(20, 190, 140, 260); grass.drawRect(840, 190, 140, 260);
      this.container.addChild(grass);
    }
  }

  export class PlayerRenderer {
    readonly container: any = new PIXI.Container();
    private readonly sprites = new Map<string, any>();
    constructor(roster: PlayerDefinition[]) {
      roster.forEach(player => {
        const sprite = new PIXI.Graphics();
        sprite.beginFill(player.team === "home" ? 0x4ee5ff : 0xffce4f).lineStyle(2, 0x10202a).drawCircle(0, 0, 15).endFill();
        const label = new PIXI.Text(String(player.number), { fill: 0x07151d, fontSize: 12, fontWeight: "bold" });
        label.anchor.set(.5); sprite.addChild(label); this.container.addChild(sprite); this.sprites.set(player.id, sprite);
      });
    }
    render(players: Map<string, Position>): void { players.forEach((position, id) => { const sprite = this.sprites.get(id); if (sprite) { sprite.x = position.x * 10; sprite.y = position.y * 6.4; } }); }
  }

  export class BallRenderer {
    readonly sprite: any;
    constructor() { this.sprite = new PIXI.Graphics(); this.sprite.beginFill(0xffffff).lineStyle(2, 0x222222).drawCircle(0, 0, 7).endFill(); }
    render(position: Position): void { this.sprite.x = position.x * 10; this.sprite.y = position.y * 6.4; }
  }

  // Renderiza Pixi, pero no conoce los eventos concretos: consume EventPlayer.sample().
  export type VisualCallbacks = {
    onFinished?: () => void;
    onProgress?: (minute: number) => void;
    onGoal?: (event: MatchEvent) => void;
    onOut?: () => void;
    onRestart?: () => void;
  };

  export class VisualMatchPlayer {
    private readonly app: any;
    private readonly clock: PlaybackClock;
    private readonly eventPlayer: EventPlayer;
    private readonly players: PlayerRenderer;
    private readonly ball: BallRenderer;
    private finished = false;
    private readonly announcedGoals = new Set<string>();
    private readonly announcedInterruptions = new Set<string>();
    private pauseUntil = 0;
    constructor(host: HTMLElement, private readonly timeline: MatchTimeline, roster: PlayerDefinition[], private readonly callbacks: VisualCallbacks = {}) {
      this.app = new PIXI.Application({ resizeTo: host, backgroundAlpha: 0, antialias: true });
      host.appendChild(this.app.view); this.clock = new PlaybackClock(timeline.duration); this.eventPlayer = new EventPlayer(timeline, roster);
      const pitch = new PitchRenderer(); this.players = new PlayerRenderer(roster); this.ball = new BallRenderer();
      this.app.stage.addChild(pitch.container, this.players.container, this.ball.sprite);
      this.app.stage.scale.set(Math.min(host.clientWidth / 1000, host.clientHeight / 640));
      this.app.ticker.add(() => this.render(this.app.ticker.deltaMS));
    }
    start(): void { this.clock.play(); }
    setSpeed(speed: number): void { this.clock.speed = Math.max(.25, speed); }
    destroy(): void { this.app.destroy(true, { children: true }); }
    private render(deltaTimeMs: number): void {
      if (performance.now() < this.pauseUntil) return;
      const ended = this.clock.tick(deltaTimeMs), frame = this.eventPlayer.sample(this.clock.currentTime);
      this.players.render(frame.players); this.ball.render(frame.ball);
      this.callbacks.onProgress?.(Math.min(90, Math.floor(this.clock.currentTime / this.clock.duration * 90)));
      this.timeline.events.filter(event => event.type === "GOAL" && timeAfter(event, this.clock.currentTime)).forEach(event => {
        if (!this.announcedGoals.has(event.id)) {
          this.announcedGoals.add(event.id); this.callbacks.onGoal?.(event); this.pauseUntil = performance.now() + 1450;
        }
      });
      this.timeline.events.filter(event => (event.type === "BALL_OUT" || event.type === "KICK_OFF" && event.metadata.restart === true) && timeAfter(event, this.clock.currentTime)).forEach(event => {
        if (this.announcedInterruptions.has(event.id)) return;
        this.announcedInterruptions.add(event.id);
        if (event.type === "BALL_OUT") { this.callbacks.onOut?.(); this.pauseUntil = performance.now() + 850; }
        else this.callbacks.onRestart?.();
      });
      if (ended && !this.finished) { this.finished = true; this.callbacks.onFinished?.(); }
    }
  }

  const timeAfter = (event: MatchEvent, time: number) => time >= event.startTime + event.duration;
  const event = (id: string, type: EventType, startTime: number, duration: number, actorId: string, targetId?: string, startPosition?: Position, targetPosition?: Position, metadata: Record<string, unknown> = {}): MatchEvent => ({ id, type, startTime, duration, actorId, targetId, startPosition, targetPosition, metadata });
  export function createDemoTimeline(): MatchTimeline {
    const h6 = { x: 50, y: 50 }, h8 = { x: 42, y: 58 }, h10 = { x: 60, y: 40 }, h9 = { x: 76, y: 50 }, goal = { x: 98, y: 50 };
    return new MatchTimeline([
      event("start", "MATCH_START", 0, 0, "home-6", undefined, h6, h6, { label: "Inicio" }),
      event("kickoff-possession", "KICK_OFF", .2, .5, "home-6", "home-6", h6, h6, {}),
      event("pass-1", "PASS", .8, .9, "home-6", "home-8", h6, h8, { kind: "short" }),
      event("received-1", "BALL_RECEIVED", 1.7, 0, "home-8", "home-8", h8, h8, {}),
      event("pass-2", "PASS", 2.3, 1, "home-8", "home-10", h8, h10, { kind: "diagonal" }),
      event("received-2", "BALL_RECEIVED", 3.3, 0, "home-10", "home-10", h10, h10, {}),
      event("dribble", "DRIBBLE", 4.1, 2.5, "home-10", undefined, h10, { x: 71, y: 43 }, { touches: 5 }),
      event("pass-3", "PASS", 6.9, 1, "home-10", "home-9", { x: 71, y: 43 }, h9, { kind: "through" }),
      event("received-3", "BALL_RECEIVED", 7.9, 0, "home-9", "home-9", h9, h9, {}),
      event("shot", "SHOT", 9.2, 1, "home-9", undefined, h9, goal, { power: .8 }),
      event("goal", "GOAL", 10.2, .4, "home-9", undefined, goal, goal, { team: "home" }),
      event("away-possession", "POSSESSION_CHANGE", 12, 0, "away-6", "away-6", { x: 50, y: 50 }, { x: 50, y: 50 }, { reason: "kickoff-after-goal" }),
      event("away-kickoff", "KICK_OFF", 12.2, .5, "away-6", "away-6", { x: 50, y: 50 }, { x: 50, y: 50 }, {}),
      event("reset-shape", "PLAYER_MOVE", 13, 2, "away-6", undefined, { x: 50, y: 50 }, { x: 45, y: 50 }, { phase: "reset" })
    ]);
  }
  export function createDemoRoster(): PlayerDefinition[] {
    return [
      { id: "home-6", team: "home", number: 6, name: "6", role: "MED", position: { x: 50, y: 50 } }, { id: "home-8", team: "home", number: 8, name: "8", role: "MED", position: { x: 42, y: 58 } },
      { id: "home-10", team: "home", number: 10, name: "10", role: "MED", position: { x: 60, y: 40 } }, { id: "home-9", team: "home", number: 9, name: "9", role: "DEL", position: { x: 76, y: 50 } },
      { id: "away-4", team: "away", number: 4, name: "4", role: "DEF", position: { x: 68, y: 54 } }, { id: "away-6", team: "away", number: 6, name: "6", role: "MED", position: { x: 50, y: 50 } },
      { id: "away-1", team: "away", number: 1, name: "1", role: "POR", position: { x: 94, y: 50 } }
    ];
  }
  type GamePlayer = { id: string; nombre: string; posicion: string };
  type GameTeam = { id: string; nombre: string; formacion?: string; tactica?: { enfoque?: string; linea?: number }; titulares: string[]; jugadores: GamePlayer[] };
  type Goal = { equipoId: string; jugadorId: string; minuto: number };

  const group = (position: string) => position === "POR" ? "POR" : ["LI", "DFC", "LD", "DEF"].includes(position) ? "DEF" : ["MCD", "MC", "MCO", "MED"].includes(position) ? "MED" : "DEL";
  const slots = (role: string, count: number, home: boolean, line: number, focus: string): Position[] => {
    const shift = (line - 50) / 15 + (focus === "ofensivo" ? 2 : focus === "defensivo" ? -2 : 0);
    // En el saque inicial ningún jugador de campo invade la mitad rival.
    const x = role === "POR" ? 6 : role === "DEF" ? 18 + shift : role === "MED" ? 31 + shift : 43 + shift;
    return Array.from({ length: count }, (_, index) => ({ x: home ? x : 100 - x, y: 18 + (index + 1) * 64 / (count + 1) }));
  };
  const makeRoster = (team: GameTeam, side: "home" | "away"): PlayerDefinition[] => {
    const starters = team.titulares.map(id => team.jugadores.find(player => player.id === id)).filter((player): player is GamePlayer => !!player).slice(0, 11);
    const line = team.tactica?.linea ?? 50, focus = team.tactica?.enfoque ?? "equilibrado";
    const byRole = ["POR", "DEF", "MED", "DEL"].flatMap(role => {
      const players = starters.filter(player => group(player.posicion) === role);
      return players.map((player, index) => ({ id: player.id, team: side, number: starters.indexOf(player) + 1, name: player.nombre, role, position: slots(role, players.length, side === "home", line, focus)[index] }));
    });
    return byRole.length ? byRole : createDemoRoster().filter(player => player.team === side);
  };
  const pos = (roster: PlayerDefinition[], id: string | undefined, fallback: Position) => roster.find(player => player.id === id)?.position || fallback;
  const select = (roster: PlayerDefinition[], roles: string[], fallback: PlayerDefinition) => roster.find(player => roles.includes(player.role)) || fallback;

  export function createMatchTimeline(home: GameTeam, away: GameTeam, goals: Goal[]): { timeline: MatchTimeline; roster: PlayerDefinition[] } {
    const roster = [...makeRoster(home, "home"), ...makeRoster(away, "away")];
    const events: MatchEvent[] = [event("real-match-start", "MATCH_START", 0, 0, roster[0].id, undefined, roster[0].position, roster[0].position, { realMatch: true })];
    let lastEnd = 0;
    goals.slice().sort((a, b) => a.minuto - b.minuto).forEach((goal, index) => {
      const attackingHome = goal.equipoId === home.id, attackers = roster.filter(player => player.team === (attackingHome ? "home" : "away"));
      const defenders = roster.filter(player => player.team !== (attackingHome ? "home" : "away"));
      const scorer = attackers.find(player => player.id === goal.jugadorId) || select(attackers, ["DEL", "MED"], attackers[0]);
      const builder = select(attackers, ["MED", "DEF"], attackers[0]);
      const support = attackers.find(player => player.id !== scorer.id && player.id !== builder.id && (player.role === "MED" || player.role === "DEL")) || builder;
      const goalkeeper = select(defenders, ["POR"], defenders[0]);
      const attackDir = attackingHome ? 1 : -1, start = Math.max(1 + goal.minuto / 90 * 50, lastEnd + 1.2);
      const recovery = { ...builder.position };
      const carry = { x: attackingHome ? 62 : 38, y: support.position.y };
      const finish = { x: attackingHome ? 91 : 9, y: scorer.position.y };
      const net = { x: attackingHome ? 98 : 2, y: 50 };
      const meta = { minuto: goal.minuto, equipoId: goal.equipoId, jugadorId: scorer.id, jugador: scorer.name, team: attackingHome ? "home" : "away" };
      events.push(
        event(`recover-${index}`, "POSSESSION_CHANGE", start, .3, builder.id, builder.id, recovery, recovery, meta),
        event(`pass-a-${index}`, "PASS", start + .5, .8, builder.id, support.id, recovery, carry, meta),
        event(`receive-a-${index}`, "BALL_RECEIVED", start + 1.3, 0, support.id, support.id, carry, carry, meta),
        event(`dribble-${index}`, "DRIBBLE", start + 1.7, 1.35, support.id, undefined, carry, { x: carry.x + attackDir * 8, y: scorer.position.y }, meta),
        event(`pass-b-${index}`, "PASS", start + 3.15, .8, support.id, scorer.id, { x: carry.x + attackDir * 8, y: scorer.position.y }, finish, meta),
        event(`receive-b-${index}`, "BALL_RECEIVED", start + 3.95, 0, scorer.id, scorer.id, finish, finish, meta),
        event(`keeper-${index}`, "PLAYER_MOVE", start + 4.1, .8, goalkeeper.id, undefined, goalkeeper.position, { x: goalkeeper.position.x + attackDir * -2, y: 42 }, meta),
        event(`shot-${index}`, "SHOT", start + 4.15, .85, scorer.id, undefined, finish, net, meta),
        event(`goal-${index}`, "GOAL", start + 5, .25, scorer.id, undefined, net, net, meta),
        event(`restart-run-${index}`, "PLAYER_MOVE", start + 6.05, .35, select(defenders, ["MED"], defenders[0]).id, undefined, select(defenders, ["MED"], defenders[0]).position, { x: 50, y: 50 }, { restart: true }),
        event(`restart-${index}`, "KICK_OFF", start + 6.4, .15, select(defenders, ["MED"], defenders[0]).id, select(defenders, ["MED"], defenders[0]).id, { x: 50, y: 50 }, { x: 50, y: 50 }, { restart: true })
      );
      lastEnd = start + 6.55;
    });
    // Mantiene el movimiento del partido aun cuando no haya goles.
    const duration = Math.max(48, Math.min(88, lastEnd + 6));
    // Interrupciones breves para dar respiración a la simulación, como en una transmisión táctica.
    for (let time = 9, index = 0; time < duration - 3; time += 14, index++) {
      const occupied = events.some(item => item.type === "GOAL" && time >= item.startTime - 5.2 && time <= item.startTime + 2);
      if (occupied) continue;
      const team = index % 2 === 0 ? "home" : "away", teamPlayers = roster.filter(player => player.team === team);
      const thrower = select(teamPlayers, ["DEF", "MED"], teamPlayers[0]);
      const outPosition = { x: 30 + (index % 3) * 20, y: index % 2 ? 104 : -4 };
      events.push(
        event(`out-${index}`, "BALL_OUT", time, .15, thrower.id, undefined, thrower.position, outPosition, { out: true }),
        event(`out-restart-${index}`, "KICK_OFF", time + 1.15, .15, thrower.id, thrower.id, { x: 50, y: 50 }, { x: 50, y: 50 }, { restart: true })
      );
    }
    const homeMid = roster.find(player => player.team === "home" && player.role === "MED"), awayMid = roster.find(player => player.team === "away" && player.role === "MED");
    if (homeMid && awayMid) events.push(event("opening-home", "PLAYER_MOVE", .5, 2.2, homeMid.id, undefined, homeMid.position, { x: homeMid.position.x + 4, y: homeMid.position.y }, {}), event("opening-away", "PLAYER_MOVE", 5, 2.2, awayMid.id, undefined, awayMid.position, { x: awayMid.position.x - 4, y: awayMid.position.y }, {}), event("final-shape", "PLAYER_MOVE", duration - 3, 2, homeMid.id, undefined, homeMid.position, { x: homeMid.position.x + 2, y: homeMid.position.y }, {}));
    return { timeline: new MatchTimeline(events), roster };
  }

  export function playRealMatch(host: HTMLElement, home: GameTeam, away: GameTeam, goals: Goal[], callbacks: VisualCallbacks): VisualMatchPlayer {
    const match = createMatchTimeline(home, away, goals), player = new VisualMatchPlayer(host, match.timeline, match.roster, callbacks);
    player.setSpeed(2.35); player.start(); return player;
  }

  export function playDeterministicDemo(host: HTMLElement, onFinished?: () => void): VisualMatchPlayer {
    const player = new VisualMatchPlayer(host, createDemoTimeline(), createDemoRoster(), { onFinished }); player.start(); return player;
  }
}
