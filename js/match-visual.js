"use strict";
var MatchVisual;
(function (MatchVisual) {
    let MatchPhase;
    (function (MatchPhase) {
        MatchPhase["BUILD_UP"] = "BUILD_UP";
        MatchPhase["PROGRESSION"] = "PROGRESSION";
        MatchPhase["FINAL_THIRD"] = "FINAL_THIRD";
        MatchPhase["DEFENSIVE_TRANSITION"] = "DEFENSIVE_TRANSITION";
    })(MatchPhase = MatchVisual.MatchPhase || (MatchVisual.MatchPhase = {}));
    // Los valores se concentran aquí para que el ajuste no dependa de números dispersos en el renderer.
    MatchVisual.simulationTuning = Object.freeze({
        timing: { stepMs: 100, maxStepsPerFrame: 10, decisionIntervalMs: 900 },
        pitch: { length: 105, width: 68 },
        movement: { arrivalRadius: .55, separationMeters: 2.2, separationStrength: .42, maxAcceleration: 24, turnDamping: .72 },
        passing: { minIntervalMs: 850, baseSpeed: 22, maxDistance: 31 },
        tactics: { maxPressers: 2, defensiveCompactness: .34, supportShift: .30 }
    });
    class SeededRandom {
        constructor(seed) { this.state = (seed >>> 0) || 0x9e3779b9; }
        next() {
            let value = this.state += 0x6d2b79f5;
            value = Math.imul(value ^ value >>> 15, value | 1);
            value ^= value + Math.imul(value ^ value >>> 7, value | 61);
            return ((value ^ value >>> 14) >>> 0) / 4294967296;
        }
        range(min, max) { return min + (max - min) * this.next(); }
    }
    MatchVisual.SeededRandom = SeededRandom;
    const vector = (x, y) => ({ x, y });
    const interpolateNumber = (from, to, amount) => from + (to - from) * amount;
    const interpolate = (from, to, amount) => vector(interpolateNumber(from.x, to.x, amount), interpolateNumber(from.y, to.y, amount));
    const add = (a, b) => vector(a.x + b.x, a.y + b.y);
    const subtract = (a, b) => vector(a.x - b.x, a.y - b.y);
    const scale = (v, n) => vector(v.x * n, v.y * n);
    const length = (v) => Math.hypot(v.x, v.y);
    const normalize = (v) => { const size = length(v); return size < .0001 ? vector(0, 0) : scale(v, 1 / size); };
    const clampVector = (position) => vector(MatchVisual.clamp(position.x, 0, MatchVisual.simulationTuning.pitch.length), MatchVisual.clamp(position.y, 0, MatchVisual.simulationTuning.pitch.width));
    const clampPlayerVector = (position) => vector(MatchVisual.clamp(position.x, 2, MatchVisual.simulationTuning.pitch.length - 2), MatchVisual.clamp(position.y, 2, MatchVisual.simulationTuning.pitch.width - 2));
    const hashText = (text) => {
        let hash = 2166136261;
        for (let index = 0; index < text.length; index++)
            hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
        return hash >>> 0;
    };
    class TacticalMatchSimulation {
        constructor(inputs, seed = 1) {
            this.events = [];
            this.timeMs = 0;
            this.possessionTeam = "home";
            this.flight = null;
            this.decisionCooldownMs = 450;
            this.players = inputs.map(input => {
                // Cada futbolista recibe un perfil estable: no todos ven la jugada ni arrancan al mismo instante.
                const individual = new SeededRandom((seed ^ hashText(input.id)) >>> 0);
                return {
                    ...input, position: { ...input.position }, anchor: { ...input.position }, velocity: vector(0, 0), desired: { ...input.position }, staminaValue: MatchVisual.clamp(input.stamina, 0, 1),
                    movement: {
                        responseMs: Math.round(individual.range(260, 760)), nextResponseMs: individual.range(0, 420),
                        depthBias: individual.range(-2.4, 2.4), lateralBias: individual.range(-1.8, 1.8),
                        phase: individual.range(0, Math.PI * 2), tempo: individual.range(.78, 1.18)
                    }
                };
            });
            this.rng = new SeededRandom(seed);
            const firstMidfielder = this.players.find(player => player.team === "home" && player.role === "MED") || this.players.find(player => player.team === "home");
            this.possessorId = (firstMidfielder === null || firstMidfielder === void 0 ? void 0 : firstMidfielder.id) || null;
            this.ball = firstMidfielder ? { ...firstMidfielder.position } : vector(52.5, 34);
        }
        step(stepMs = MatchVisual.simulationTuning.timing.stepMs) {
            const dt = stepMs / 1000;
            this.timeMs += stepMs;
            this.decisionCooldownMs -= stepMs;
            if (this.flight)
                this.advanceFlight(dt);
            else if (this.decisionCooldownMs <= 0)
                this.decideOnBall();
            this.updateDesiredPositions();
            this.movePlayers(dt);
            if (!this.flight && this.possessorId) {
                const possessor = this.player(this.possessorId);
                if (possessor)
                    this.ball = add(possessor.position, vector(possessor.team === "home" ? .55 : -.55, 0));
            }
        }
        snapshot() {
            return {
                time: this.timeMs / 1000, ball: { ...this.ball }, possession: this.possessorId, phase: this.phase(),
                players: this.players.map(player => ({ id: player.id, team: player.team, position: { ...player.position }, velocity: { ...player.velocity }, stamina: player.staminaValue }))
            };
        }
        eventLog() { return this.events.slice(); }
        player(id) { return this.players.find(player => player.id === id); }
        phase() {
            const direction = this.possessionTeam === "home" ? 1 : -1;
            const progress = (this.ball.x - 52.5) * direction;
            if (progress > 23)
                return MatchPhase.FINAL_THIRD;
            if (progress > 2)
                return MatchPhase.PROGRESSION;
            return MatchPhase.BUILD_UP;
        }
        advanceFlight(dt) {
            const flight = this.flight;
            flight.elapsed += dt;
            const progress = MatchVisual.clamp(flight.elapsed / flight.duration, 0, 1);
            this.ball = add(flight.from, scale(subtract(flight.to, flight.from), MatchVisual.easeInOutCubic(progress)));
            if (progress < 1)
                return;
            const receiver = this.player(flight.targetId);
            this.flight = null;
            if (receiver) {
                this.possessorId = receiver.id;
                this.possessionTeam = receiver.team;
                this.ball = { ...receiver.position };
                this.events.push({ type: "PASS_COMPLETED", time: this.timeMs / 1000, actorId: receiver.id });
            }
            this.decisionCooldownMs = MatchVisual.simulationTuning.timing.decisionIntervalMs + this.rng.range(150, 850);
        }
        decideOnBall() {
            const possessor = this.possessorId ? this.player(this.possessorId) : undefined;
            if (!possessor)
                return;
            const candidates = this.players.filter(player => player.team === possessor.team && player.id !== possessor.id)
                .map(player => ({ player, score: this.passScore(possessor, player) }))
                .filter(candidate => candidate.score > -.5)
                .sort((a, b) => b.score - a.score);
            const selected = candidates[Math.min(candidates.length - 1, Math.floor(this.rng.next() * Math.min(3, candidates.length)))];
            if (!selected || selected.score < .04) {
                this.decisionCooldownMs = 350;
                return;
            }
            const distance = length(subtract(selected.player.position, possessor.position));
            this.flight = { from: { ...this.ball }, to: { ...selected.player.position }, elapsed: 0, duration: MatchVisual.clamp(distance / MatchVisual.simulationTuning.passing.baseSpeed, .32, 1.25), targetId: selected.player.id };
            this.events.push({ type: "PASS_ATTEMPTED", time: this.timeMs / 1000, actorId: possessor.id, targetId: selected.player.id });
        }
        passScore(from, to) {
            const direction = from.team === "home" ? 1 : -1;
            const distance = length(subtract(to.position, from.position));
            if (distance > MatchVisual.simulationTuning.passing.maxDistance)
                return -1;
            const progress = (to.position.x - from.position.x) * direction / MatchVisual.simulationTuning.pitch.length;
            const nearestOpponent = this.players.filter(player => player.team !== from.team).reduce((nearest, opponent) => Math.min(nearest, length(subtract(opponent.position, to.position))), Infinity);
            const roleBonus = to.role === "DEL" ? .12 : to.role === "MED" ? .08 : .02;
            const technicalQuality = (from.passing - 50) / 180;
            const fatiguePenalty = (1 - from.staminaValue) * .12;
            return progress * .85 + Math.min(nearestOpponent / 18, .26) + roleBonus + technicalQuality - fatiguePenalty - distance / 90 + this.rng.range(-.035, .035);
        }
        updateDesiredPositions() {
            const ballShiftY = (this.ball.y - 34) * MatchVisual.simulationTuning.tactics.supportShift;
            const homePlayers = this.players.filter(player => player.team === "home"), awayPlayers = this.players.filter(player => player.team === "away");
            const pressers = this.players.filter(player => player.team !== this.possessionTeam && player.role !== "POR")
                .sort((a, b) => length(subtract(a.position, this.ball)) - length(subtract(b.position, this.ball))).slice(0, MatchVisual.simulationTuning.tactics.maxPressers);
            this.players.forEach(player => {
                var _a, _b;
                const direction = player.team === "home" ? 1 : -1;
                const attacking = player.team === this.possessionTeam;
                const teammates = player.team === "home" ? homePlayers : awayPlayers;
                const rolePeers = teammates.filter(peer => peer.role === player.role).sort((a, b) => (b.anchor.x * direction) - (a.anchor.x * direction) || a.anchor.y - b.anchor.y);
                const roleIndex = Math.max(0, rolePeers.indexOf(player));
                const midfielders = teammates.filter(peer => peer.role === "MED").sort((a, b) => (b.anchor.x * direction) - (a.anchor.x * direction));
                const isLeadMidfielder = ((_a = midfielders[0]) === null || _a === void 0 ? void 0 : _a.id) === player.id;
                const ballProgress = Math.max(0, (this.ball.x - 52.5) * direction);
                const forwardDepth = [28, 21, 15, 10][Math.min(roleIndex, 3)];
                const depth = attacking
                    ? player.role === "DEL" ? forwardDepth + Math.min(10, ballProgress * .35)
                        : player.role === "MED" ? (isLeadMidfielder ? 13 : 6) + Math.min(7, ballProgress * (isLeadMidfielder ? .22 : .12))
                            : player.role === "DEF" ? 2 + (Math.abs(player.anchor.y - 34) > 20 ? 3 : 0) + Math.min(4, ballProgress * .08) : 0
                    : player.role === "DEL" ? -7 : player.role === "MED" ? -8 : -4;
                const linePosition = rolePeers.length > 1 ? roleIndex / (rolePeers.length - 1) - .5 : 0;
                const ballSide = MatchVisual.clamp((this.ball.y - 34) / 34, -1, 1);
                const playerSide = MatchVisual.clamp((player.anchor.y - 34) / 34, -1, 1);
                // El lateral cercano acompana; el lejano cierra y los centrales guardan distinta profundidad.
                const sideDepth = player.role === "DEF" ? playerSide * ballSide * 2.6 : player.role === "MED" ? playerSide * ballSide * 1.15 : playerSide * ballSide * .7;
                const roleStagger = linePosition * (player.role === "DEF" ? 2.1 : player.role === "MED" ? 1.45 : 1.1);
                const scan = Math.sin(this.timeMs / 1000 * (1.15 + player.movement.tempo * .55) + player.movement.phase);
                const localShift = ballShiftY * (.72 + player.movement.tempo * .14);
                let desired = vector(player.anchor.x + direction * (depth + sideDepth + roleStagger + player.movement.depthBias + scan * .65), player.anchor.y + localShift + player.movement.lateralBias + scan * (player.role === "DEL" ? 1.35 : 1.0));
                if (!attacking && pressers.some(presser => presser.id === player.id))
                    desired = add(desired, scale(subtract(this.ball, desired), player.id === ((_b = pressers[0]) === null || _b === void 0 ? void 0 : _b.id) ? .42 : .24));
                if (player.role === "POR")
                    desired = vector(player.team === "home" ? 6 : 99, 34 + ballShiftY * .18);
                // Las intenciones se actualizan de manera escalonada; asi una linea nunca salta como una sola pieza.
                if (player.role === "POR" || this.timeMs >= player.movement.nextResponseMs) {
                    player.desired = clampPlayerVector(desired);
                    player.movement.nextResponseMs = this.timeMs + player.movement.responseMs;
                }
            });
        }
        movePlayers(dt) {
            this.players.forEach(player => {
                const toTarget = subtract(player.desired, player.position);
                const distance = length(toTarget);
                // El reloj visual comprime 90 minutos: se escala la locomoción para conservar carreras perceptibles.
                const maxSpeed = (8 + player.speed / 10) * (.65 + player.staminaValue * .35) * player.movement.tempo;
                const desiredVelocity = distance < MatchVisual.simulationTuning.movement.arrivalRadius ? vector(0, 0) : scale(normalize(toTarget), Math.min(maxSpeed, distance / Math.max(dt, .01)));
                let acceleration = scale(subtract(desiredVelocity, player.velocity), 1 / Math.max(dt, .01));
                if (length(acceleration) > MatchVisual.simulationTuning.movement.maxAcceleration)
                    acceleration = scale(normalize(acceleration), MatchVisual.simulationTuning.movement.maxAcceleration);
                const separation = this.players.filter(other => other.id !== player.id).reduce((force, other) => {
                    const delta = subtract(player.position, other.position), gap = length(delta);
                    return gap > 0 && gap < MatchVisual.simulationTuning.movement.separationMeters ? add(force, scale(normalize(delta), (MatchVisual.simulationTuning.movement.separationMeters - gap) * MatchVisual.simulationTuning.movement.separationStrength)) : force;
                }, vector(0, 0));
                player.velocity = add(scale(player.velocity, MatchVisual.simulationTuning.movement.turnDamping), scale(add(acceleration, separation), dt));
                if (length(player.velocity) > maxSpeed)
                    player.velocity = scale(normalize(player.velocity), maxSpeed);
                player.position = clampPlayerVector(add(player.position, scale(player.velocity, dt)));
                player.staminaValue = MatchVisual.clamp(player.staminaValue - length(player.velocity) * .000018, 0, 1);
            });
        }
    }
    MatchVisual.TacticalMatchSimulation = TacticalMatchSimulation;
    class SimulationReplay {
        constructor(inputs, durationSeconds, seed = 1) {
            const simulation = new TacticalMatchSimulation(inputs, seed), frames = [simulation.snapshot()];
            const steps = Math.ceil(durationSeconds * 1000 / MatchVisual.simulationTuning.timing.stepMs);
            for (let step = 0; step < steps; step++) {
                simulation.step();
                frames.push(simulation.snapshot());
            }
            this.frames = frames;
        }
        sample(timeSeconds) {
            const rawIndex = Math.max(0, timeSeconds * 1000 / MatchVisual.simulationTuning.timing.stepMs);
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
    MatchVisual.SimulationReplay = SimulationReplay;
})(MatchVisual || (MatchVisual = {}));
var MatchVisual;
(function (MatchVisual) {
    MatchVisual.clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    MatchVisual.lerp = (from, to, amount) => from + (to - from) * amount;
    MatchVisual.easeInOutCubic = (value) => value < .5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
    const positionLerp = (from, to, amount) => ({ x: MatchVisual.lerp(from.x, to.x, amount), y: MatchVisual.lerp(from.y, to.y, amount) });
    class MatchTimeline {
        constructor(events) {
            this.events = Object.freeze(events.slice().sort((a, b) => a.startTime - b.startTime || a.id.localeCompare(b.id)));
            this.duration = this.events.reduce((last, event) => Math.max(last, event.startTime + event.duration), 0);
        }
        activeAt(time) { return this.events.filter(event => time >= event.startTime && time <= event.startTime + event.duration); }
    }
    MatchVisual.MatchTimeline = MatchTimeline;
    class PlaybackClock {
        constructor(duration) {
            this.duration = duration;
            this.currentTime = 0;
            this.speed = 1;
            this.playing = false;
        }
        play() { this.playing = true; }
        pause() { this.playing = false; }
        reset() { this.currentTime = 0; }
        tick(deltaTimeMs) {
            if (!this.playing)
                return false;
            this.currentTime = MatchVisual.clamp(this.currentTime + deltaTimeMs / 1000 * this.speed, 0, this.duration);
            if (this.currentTime >= this.duration) {
                this.playing = false;
                return true;
            }
            return false;
        }
    }
    MatchVisual.PlaybackClock = PlaybackClock;
    // EventPlayer transforma tiempo + eventos en un frame de render, sin dibujar nada.
    class EventPlayer {
        constructor(timeline, roster) {
            this.timeline = timeline;
            this.roster = roster;
            const inputs = roster.map(player => {
                var _a, _b, _c;
                return ({
                    id: player.id, team: player.team, role: player.role, position: { x: player.position.x * 1.05, y: player.position.y * .68 },
                    speed: (_a = player.speed) !== null && _a !== void 0 ? _a : 68, passing: (_b = player.passing) !== null && _b !== void 0 ? _b : 68, stamina: (_c = player.stamina) !== null && _c !== void 0 ? _c : .94
                });
            });
            const seed = roster.reduce((total, player) => {
                for (let index = 0; index < player.id.length; index++)
                    total = ((total * 31) + player.id.charCodeAt(index)) >>> 0;
                return total;
            }, 2166136261);
            this.tacticalReplay = new MatchVisual.SimulationReplay(inputs, Math.max(1, timeline.duration), seed);
        }
        tacticalState(time) {
            // Posesiones breves, con el balón atravesando zonas distintas; son deterministas.
            const phases = [
                { team: "home", x: 32, y: 52 }, { team: "home", x: 46, y: 32 }, { team: "home", x: 60, y: 62 },
                { team: "away", x: 62, y: 38 }, { team: "away", x: 48, y: 67 }, { team: "away", x: 35, y: 45 },
                { team: "home", x: 40, y: 65 }, { team: "home", x: 56, y: 43 }, { team: "away", x: 57, y: 54 },
                { team: "away", x: 42, y: 31 }
            ];
            const phaseLength = 2.15, phase = Math.max(0, Math.floor((time - .75) / phaseLength));
            const progress = MatchVisual.clamp((time - .75 - phase * phaseLength) / phaseLength, 0, 1);
            const from = phases[phase % phases.length], to = phases[(phase + 1) % phases.length];
            const owner = progress < .72 ? from.team : to.team;
            const carrier = this.roster.find(player => player.team === owner && player.role === "MED") || this.roster.find(player => player.team === owner) || null;
            return { ball: positionLerp(from, to, MatchVisual.easeInOutCubic(progress)), possession: (carrier === null || carrier === void 0 ? void 0 : carrier.id) || null };
        }
        isScriptedAction(time) {
            return this.timeline.events.some(event => (event.type === "GOAL" && typeof event.metadata.minuto === "number" && time >= event.startTime - 5.1 && time <= event.startTime + .5) ||
                (event.metadata.setPiece === true && time >= event.startTime - .1 && time <= event.startTime + event.duration + .1));
        }
        sample(time) {
            let players = new Map(this.roster.map(player => [player.id, { ...player.position }]));
            let possession = null;
            let ball = { x: 50, y: 50 };
            const completed = this.timeline.events.filter(event => time >= event.startTime);
            completed.forEach(event => {
                const progress = event.duration <= 0 ? 1 : MatchVisual.clamp((time - event.startTime) / event.duration, 0, 1);
                const eased = MatchVisual.easeInOutCubic(progress);
                const actor = players.get(event.actorId);
                if ((event.type === "PLAYER_MOVE" || event.type === "DRIBBLE") && actor && event.targetPosition) {
                    players.set(event.actorId, positionLerp(event.startPosition || actor, event.targetPosition, eased));
                }
                if (event.type === "POSSESSION_CHANGE" || event.type === "KICK_OFF" || event.type === "BALL_RECEIVED" || event.type === "THROW_IN" || event.type === "GOAL_KICK" || event.type === "CORNER_KICK") {
                    if (progress === 1)
                        possession = event.targetId || event.actorId;
                }
            });
            // La última posesión completada fija el balón al jugador, salvo mientras está viajando.
            const possessionEvents = completed.filter(event => (event.type === "POSSESSION_CHANGE" || event.type === "KICK_OFF" || event.type === "BALL_RECEIVED" || event.type === "THROW_IN" || event.type === "GOAL_KICK" || event.type === "CORNER_KICK") && (event.duration <= 0 || time >= event.startTime + event.duration));
            if (possessionEvents.length)
                possession = possessionEvents[possessionEvents.length - 1].targetId || possessionEvents[possessionEvents.length - 1].actorId;
            const lastPossessionEvent = possessionEvents[possessionEvents.length - 1];
            if (lastPossessionEvent === null || lastPossessionEvent === void 0 ? void 0 : lastPossessionEvent.targetPosition)
                ball = { ...lastPossessionEvent.targetPosition };
            else if (possession && players.has(possession))
                ball = { ...players.get(possession) };
            const flight = this.timeline.activeAt(time).filter(event => event.type === "PASS" || event.type === "SHOT" || event.type === "SAVE").pop();
            if (flight && flight.startPosition && flight.targetPosition) {
                const progress = flight.duration <= 0 ? 1 : MatchVisual.clamp((time - flight.startTime) / flight.duration, 0, 1);
                ball = positionLerp(flight.startPosition, flight.targetPosition, MatchVisual.easeInOutCubic(progress));
            }
            const terminal = completed.filter(event => event.type === "GOAL" && time >= event.startTime + event.duration).pop();
            if (terminal === null || terminal === void 0 ? void 0 : terminal.targetPosition)
                ball = { ...terminal.targetPosition };
            const out = completed.filter(event => event.type === "BALL_OUT").pop();
            const followingRestart = out && this.timeline.events.find(event => event.metadata.setPiece === true && ["THROW_IN", "GOAL_KICK", "CORNER_KICK"].includes(event.type) && event.startTime > out.startTime);
            if ((out === null || out === void 0 ? void 0 : out.targetPosition) && (!followingRestart || time < followingRestart.startTime))
                ball = { ...out.targetPosition };
            // Entre jugadas decisivas hay posesiones y cambios de zona: el partido nunca queda congelado.
            const isRealMatch = this.timeline.events.some(event => event.metadata.realMatch === true || (event.type === "GOAL" && typeof event.metadata.minuto === "number"));
            const usingTacticalReplay = isRealMatch && !this.isScriptedAction(time) && time >= .75;
            if (usingTacticalReplay) {
                const tactical = this.tacticalReplay.sample(time);
                players = new Map(tactical.players.map(player => [player.id, { x: player.position.x / 1.05, y: player.position.y / .68 }]));
                ball = { x: tactical.ball.x / 1.05, y: tactical.ball.y / .68 };
                possession = tactical.possession;
            }
            // El bloque completo acompaña la acción: ataque ofrece apoyos y defensa bascula/presiona.
            // Parte siempre de la formación base, por lo que cada equipo conserva su lado al inicio.
            const carrier = possession ? this.roster.find(player => player.id === possession) : undefined;
            const possessionTeam = carrier === null || carrier === void 0 ? void 0 : carrier.team;
            const pressingOrder = this.roster.filter(player => player.team !== possessionTeam && player.role !== "POR")
                .sort((a, b) => Math.hypot(a.position.x - ball.x, a.position.y - ball.y) - Math.hypot(b.position.x - ball.x, b.position.y - ball.y));
            players.forEach((current, id) => {
                const player = this.roster.find(item => item.id === id);
                if (!player || player.role === "POR" || time < .75 || !possessionTeam || usingTacticalReplay)
                    return;
                const executingAction = this.timeline.events.some(event => event.actorId === id && (event.type === "PLAYER_MOVE" || event.type === "DRIBBLE") && time >= event.startTime && time <= event.startTime + event.duration + .8);
                if (executingAction)
                    return; // la conducción/carrera principal conserva su trayectoria precisa
                const index = this.roster.indexOf(player);
                const direction = player.team === "home" ? 1 : -1;
                const attacking = player.team === possessionTeam;
                const ballAdvance = (ball.x - 50) * direction;
                // En ataque los delanteros atacan el último tercio; medios llegan a la frontal y defensas sostienen.
                const positiveAdvance = Math.max(0, ballAdvance);
                const advance = attacking
                    ? player.role === "DEL" ? 32 + positiveAdvance * .8 + Math.min(0, ballAdvance) * .12
                        : player.role === "MED" ? 16 + positiveAdvance * .38 + Math.min(0, ballAdvance) * .1
                            : 7 + positiveAdvance * .16
                    : -6 + ballAdvance * .14;
                const roleWeight = attacking ? 1 : (player.role === "DEF" ? .65 : player.role === "MED" ? 1 : 1.22);
                // Micro-movimientos permanentes: cada jugador ofrece una línea de pase o cierra un espacio.
                const rhythm = time * (3.3 + (index % 3) * .35) + index * 1.7;
                const lateralRun = Math.sin(rhythm) * (player.role === "DEL" ? 3.8 : 2.8);
                const forwardRun = Math.cos(rhythm * .8) * (player.role === "DEL" ? 2 : 1.2);
                let target = {
                    x: MatchVisual.clamp(player.position.x + direction * (advance * roleWeight + forwardRun), 4, 96),
                    y: MatchVisual.clamp(player.position.y + (ball.y - player.position.y) * (attacking ? .38 : .30) + lateralRun, 8, 92)
                };
                const pressingRank = pressingOrder.indexOf(player);
                if (!attacking && pressingRank >= 0 && pressingRank < 2) {
                    // Uno presiona directamente y un segundo cubre el pase corto.
                    target = positionLerp(target, ball, pressingRank === 0 ? .58 : .34);
                }
                players.set(id, positionLerp(current, target, .88));
            });
            return { players, ball, possession };
        }
    }
    MatchVisual.EventPlayer = EventPlayer;
    class PitchRenderer {
        constructor() {
            this.container = new PIXI.Container();
            const grass = new PIXI.Graphics();
            grass.beginFill(0x173d25).drawRect(0, 0, 1000, 640).endFill();
            grass.lineStyle(3, 0xddeedd, .62).drawRect(20, 20, 960, 600);
            grass.moveTo(500, 20).lineTo(500, 620);
            grass.drawCircle(500, 320, 76);
            grass.drawRect(20, 190, 140, 260);
            grass.drawRect(840, 190, 140, 260);
            this.container.addChild(grass);
        }
    }
    MatchVisual.PitchRenderer = PitchRenderer;
    class PlayerRenderer {
        constructor(roster) {
            this.container = new PIXI.Container();
            this.sprites = new Map();
            this.goalMarks = new Map();
            roster.forEach(player => {
                const sprite = new PIXI.Graphics();
                sprite.beginFill(player.team === "home" ? 0x4ee5ff : 0xffce4f).lineStyle(2, 0x10202a).drawCircle(0, 0, 15).endFill();
                const label = new PIXI.Text(String(player.number), { fill: 0x07151d, fontSize: 12, fontWeight: "bold" });
                label.anchor.set(.5);
                sprite.addChild(label);
                this.container.addChild(sprite);
                this.sprites.set(player.id, sprite);
            });
        }
        render(players) { players.forEach((position, id) => { const sprite = this.sprites.get(id); if (sprite) {
            sprite.x = position.x * 10;
            sprite.y = position.y * 6.4;
        } }); }
        celebrateGoal(playerId) {
            const sprite = this.sprites.get(playerId);
            if (!sprite)
                return;
            const existing = this.goalMarks.get(playerId);
            if (existing) {
                sprite.removeChild(existing.mark);
                existing.mark.destroy();
            }
            const mark = new PIXI.Text("⚽", { fontSize: 22, dropShadow: true, dropShadowDistance: 1, dropShadowAlpha: .65 });
            mark.anchor.set(.5);
            mark.y = -28;
            sprite.addChild(mark);
            this.goalMarks.set(playerId, { mark, expiresAt: performance.now() + 2600 });
        }
        updateGoalMarks() {
            const now = performance.now();
            this.goalMarks.forEach((entry, id) => {
                const remaining = entry.expiresAt - now;
                if (remaining <= 0) {
                    const sprite = this.sprites.get(id);
                    if (sprite)
                        sprite.removeChild(entry.mark);
                    entry.mark.destroy();
                    this.goalMarks.delete(id);
                }
                else {
                    entry.mark.alpha = Math.min(1, remaining / 450);
                    entry.mark.y = -28 - Math.sin(remaining / 130) * 2;
                }
            });
        }
    }
    MatchVisual.PlayerRenderer = PlayerRenderer;
    class BallRenderer {
        constructor() { this.sprite = new PIXI.Graphics(); this.sprite.beginFill(0xffffff).lineStyle(2, 0x222222).drawCircle(0, 0, 7).endFill(); }
        render(position) { this.sprite.x = position.x * 10; this.sprite.y = position.y * 6.4; }
    }
    MatchVisual.BallRenderer = BallRenderer;
    class VisualMatchPlayer {
        constructor(host, timeline, roster, callbacks = {}) {
            this.timeline = timeline;
            this.callbacks = callbacks;
            this.finished = false;
            this.announcedGoals = new Set();
            this.announcedInterruptions = new Set();
            this.announcedSetPieces = new Set();
            this.pauseUntil = 0;
            this.app = new PIXI.Application({ resizeTo: host, backgroundAlpha: 0, antialias: true });
            host.appendChild(this.app.view);
            this.clock = new PlaybackClock(timeline.duration);
            this.eventPlayer = new EventPlayer(timeline, roster);
            const pitch = new PitchRenderer();
            this.players = new PlayerRenderer(roster);
            this.ball = new BallRenderer();
            this.app.stage.addChild(pitch.container, this.players.container, this.ball.sprite);
            // Conserva la proporción del campo para que no se vea estirado en pantallas anchas.
            this.app.stage.scale.set(Math.min(host.clientWidth / 1000, host.clientHeight / 640));
            this.app.ticker.add(() => this.render(this.app.ticker.deltaMS));
        }
        start() { this.clock.play(); }
        setSpeed(speed) { this.clock.speed = Math.max(.25, speed); }
        destroy() { this.app.destroy(true, { children: true }); }
        render(deltaTimeMs) {
            var _a, _b, _c, _d;
            if (performance.now() < this.pauseUntil)
                return;
            const ended = this.clock.tick(deltaTimeMs), frame = this.eventPlayer.sample(this.clock.currentTime);
            this.players.render(frame.players);
            this.players.updateGoalMarks();
            this.ball.render(frame.ball);
            (_b = (_a = this.callbacks).onProgress) === null || _b === void 0 ? void 0 : _b.call(_a, Math.min(90, Math.floor(this.clock.currentTime / this.clock.duration * 90)));
            this.timeline.events.filter(event => event.type === "GOAL" && timeAfter(event, this.clock.currentTime)).forEach(event => {
                var _a, _b;
                if (!this.announcedGoals.has(event.id)) {
                    this.announcedGoals.add(event.id);
                    (_b = (_a = this.callbacks).onGoal) === null || _b === void 0 ? void 0 : _b.call(_a, event);
                    this.pauseUntil = performance.now() + 1450;
                }
            });
            this.timeline.events.filter(event => (event.type === "BALL_OUT" || event.type === "KICK_OFF" && event.metadata.restart === true) && timeAfter(event, this.clock.currentTime)).forEach(event => {
                var _a, _b, _c, _d;
                if (this.announcedInterruptions.has(event.id))
                    return;
                this.announcedInterruptions.add(event.id);
                if (event.type === "BALL_OUT") {
                    (_b = (_a = this.callbacks).onOut) === null || _b === void 0 ? void 0 : _b.call(_a, event);
                    this.pauseUntil = performance.now() + 850;
                }
                else
                    (_d = (_c = this.callbacks).onRestart) === null || _d === void 0 ? void 0 : _d.call(_c);
            });
            this.timeline.events.filter(event => ["THROW_IN", "GOAL_KICK", "CORNER_KICK"].includes(event.type) && timeAfter(event, this.clock.currentTime)).forEach(event => {
                var _a, _b;
                if (!this.announcedSetPieces.has(event.id)) {
                    this.announcedSetPieces.add(event.id);
                    (_b = (_a = this.callbacks).onSetPiece) === null || _b === void 0 ? void 0 : _b.call(_a, event);
                }
            });
            if (ended && !this.finished) {
                this.finished = true;
                (_d = (_c = this.callbacks).onFinished) === null || _d === void 0 ? void 0 : _d.call(_c);
            }
        }
    }
    MatchVisual.VisualMatchPlayer = VisualMatchPlayer;
    const timeAfter = (event, time) => time >= event.startTime + event.duration;
    const event = (id, type, startTime, duration, actorId, targetId, startPosition, targetPosition, metadata = {}) => ({ id, type, startTime, duration, actorId, targetId, startPosition, targetPosition, metadata });
    function createDemoTimeline() {
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
    MatchVisual.createDemoTimeline = createDemoTimeline;
    function createDemoRoster() {
        return [
            { id: "home-6", team: "home", number: 6, name: "6", role: "MED", position: { x: 50, y: 50 } }, { id: "home-8", team: "home", number: 8, name: "8", role: "MED", position: { x: 42, y: 58 } },
            { id: "home-10", team: "home", number: 10, name: "10", role: "MED", position: { x: 60, y: 40 } }, { id: "home-9", team: "home", number: 9, name: "9", role: "DEL", position: { x: 76, y: 50 } },
            { id: "away-4", team: "away", number: 4, name: "4", role: "DEF", position: { x: 68, y: 54 } }, { id: "away-6", team: "away", number: 6, name: "6", role: "MED", position: { x: 50, y: 50 } },
            { id: "away-1", team: "away", number: 1, name: "1", role: "POR", position: { x: 94, y: 50 } }
        ];
    }
    MatchVisual.createDemoRoster = createDemoRoster;
    const group = (position) => position === "POR" ? "POR" : ["LI", "DFC", "LD", "DEF"].includes(position) ? "DEF" : ["MCD", "MC", "MCO", "MED"].includes(position) ? "MED" : "DEL";
    const slots = (role, count, home, line, focus) => {
        const shift = (line - 50) / 15 + (focus === "ofensivo" ? 2 : focus === "defensivo" ? -2 : 0);
        // En el saque inicial ningún jugador de campo invade la mitad rival.
        const x = role === "POR" ? 6 : role === "DEF" ? 18 + shift : role === "MED" ? 31 + shift : 43 + shift;
        return Array.from({ length: count }, (_, index) => ({ x: home ? x : 100 - x, y: 18 + (index + 1) * 64 / (count + 1) }));
    };
    const makeRoster = (team, side) => {
        var _a, _b, _c, _d;
        const starters = team.titulares.map(id => team.jugadores.find(player => player.id === id)).filter((player) => !!player).slice(0, 11);
        const line = (_b = (_a = team.tactica) === null || _a === void 0 ? void 0 : _a.linea) !== null && _b !== void 0 ? _b : 50, focus = (_d = (_c = team.tactica) === null || _c === void 0 ? void 0 : _c.enfoque) !== null && _d !== void 0 ? _d : "equilibrado";
        const byRole = ["POR", "DEF", "MED", "DEL"].flatMap(role => {
            const players = starters.filter(player => group(player.posicion) === role);
            return players.map((player, index) => { var _a, _b, _c; return ({ id: player.id, team: side, number: starters.indexOf(player) + 1, name: player.nombre, role, position: slots(role, players.length, side === "home", line, focus)[index], speed: (_a = player.velocidad) !== null && _a !== void 0 ? _a : 68, passing: (_b = player.pase) !== null && _b !== void 0 ? _b : 68, stamina: Math.max(0, 1 - ((_c = player.cansancio) !== null && _c !== void 0 ? _c : 0) / 100) }); });
        });
        return byRole.length ? byRole : createDemoRoster().filter(player => player.team === side);
    };
    const pos = (roster, id, fallback) => { var _a; return ((_a = roster.find(player => player.id === id)) === null || _a === void 0 ? void 0 : _a.position) || fallback; };
    const select = (roster, roles, fallback) => roster.find(player => roles.includes(player.role)) || fallback;
    function createMatchTimeline(home, away, goals) {
        const roster = [...makeRoster(home, "home"), ...makeRoster(away, "away")];
        const events = [event("real-match-start", "MATCH_START", 0, 0, roster[0].id, undefined, roster[0].position, roster[0].position, { realMatch: true })];
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
            events.push(event(`recover-${index}`, "POSSESSION_CHANGE", start, .3, builder.id, builder.id, recovery, recovery, meta), event(`pass-a-${index}`, "PASS", start + .5, .8, builder.id, support.id, recovery, carry, meta), event(`receive-a-${index}`, "BALL_RECEIVED", start + 1.3, 0, support.id, support.id, carry, carry, meta), event(`dribble-${index}`, "DRIBBLE", start + 1.7, 1.35, support.id, undefined, carry, { x: carry.x + attackDir * 8, y: scorer.position.y }, meta), event(`pass-b-${index}`, "PASS", start + 3.15, .8, support.id, scorer.id, { x: carry.x + attackDir * 8, y: scorer.position.y }, finish, meta), event(`receive-b-${index}`, "BALL_RECEIVED", start + 3.95, 0, scorer.id, scorer.id, finish, finish, meta), event(`keeper-${index}`, "PLAYER_MOVE", start + 4.1, .8, goalkeeper.id, undefined, goalkeeper.position, { x: goalkeeper.position.x + attackDir * -2, y: 42 }, meta), event(`shot-${index}`, "SHOT", start + 4.15, .85, scorer.id, undefined, finish, net, meta), event(`goal-${index}`, "GOAL", start + 5, .25, scorer.id, undefined, net, net, meta), event(`restart-run-${index}`, "PLAYER_MOVE", start + 6.05, .35, select(defenders, ["MED"], defenders[0]).id, undefined, select(defenders, ["MED"], defenders[0]).position, { x: 50, y: 50 }, { restart: true }), event(`restart-${index}`, "KICK_OFF", start + 6.4, .15, select(defenders, ["MED"], defenders[0]).id, select(defenders, ["MED"], defenders[0]).id, { x: 50, y: 50 }, { x: 50, y: 50 }, { restart: true }));
            lastEnd = start + 6.55;
        });
        // Mantiene el movimiento del partido aun cuando no haya goles.
        const duration = Math.max(48, Math.min(88, lastEnd + 6));
        // Interrupciones breves para dar respiración a la simulación, como en una transmisión táctica.
        const agregarReanudacion = (time, index, type) => {
            const team = index % 2 === 0 ? "home" : "away";
            const attackers = roster.filter(player => player.team === team), defenders = roster.filter(player => player.team !== team);
            const direction = team === "home" ? 1 : -1;
            const taker = select(attackers, type === "GOAL_KICK" ? ["POR"] : ["DEF", "MED"], attackers[0]);
            const receiver = select(attackers.filter(player => player.id !== taker.id), type === "CORNER_KICK" ? ["DEL", "MED"] : ["MED", "DEF", "DEL"], attackers[0]);
            const marker = select(defenders, ["DEF", "MED"], defenders[0]);
            const pressure = select(defenders, ["DEL", "MED"], defenders[0]);
            const label = type === "THROW_IN" ? "Saque de banda" : type === "GOAL_KICK" ? "Saque de meta" : "Tiro de esquina";
            const meta = { setPiece: true, type, label, team };
            const mover = (id, from, to, offset) => {
                // Tambien en las reanudaciones cada jugador arranca y llega con un ritmo distinto.
                const signature = id.split("").reduce((total, character) => total + character.charCodeAt(0), 0);
                const delayedOffset = offset + (signature % 6) * .026;
                const duration = .34 + ((signature >>> 3) % 7) * .045;
                return event(`set-move-${type}-${index}-${id}`, "PLAYER_MOVE", time + delayedOffset, duration, id, undefined, from, to, meta);
            };
            events.push(event(`set-window-${index}`, "MATCH_START", time, 2.45, taker.id, undefined, taker.position, taker.position, meta));
            if (type === "THROW_IN") {
                const sideline = index % 2 ? 97 : 3, edge = { x: 30 + (index % 3) * 18, y: sideline };
                const target = { x: MatchVisual.clamp(edge.x + direction * 12, 12, 88), y: sideline < 50 ? 14 : 86 };
                const out = { x: edge.x, y: sideline < 50 ? -4 : 104 };
                events.push(event(`out-${index}`, "BALL_OUT", time, .15, taker.id, undefined, taker.position, out, meta), mover(taker.id, taker.position, edge, .18), mover(receiver.id, receiver.position, target, .22), mover(pressure.id, pressure.position, { x: target.x - direction * 4, y: target.y }, .28), event(`throw-${index}`, "THROW_IN", time + 1.05, .16, taker.id, taker.id, edge, edge, meta), event(`throw-pass-${index}`, "PASS", time + 1.28, .58, taker.id, receiver.id, edge, target, meta), event(`throw-receive-${index}`, "BALL_RECEIVED", time + 1.86, 0, receiver.id, receiver.id, target, target, meta));
            }
            else if (type === "GOAL_KICK") {
                const goalSpot = { x: team === "home" ? 7 : 93, y: 50 }, out = { x: team === "home" ? -4 : 104, y: index % 2 ? 27 : 73 };
                const target = { x: team === "home" ? 23 : 77, y: index % 2 ? 37 : 63 };
                const cover = { x: team === "home" ? 18 : 82, y: index % 2 ? 68 : 32 };
                events.push(event(`out-${index}`, "BALL_OUT", time, .15, taker.id, undefined, taker.position, out, meta), mover(taker.id, taker.position, goalSpot, .18), mover(receiver.id, receiver.position, target, .22), mover(marker.id, marker.position, cover, .25), mover(pressure.id, pressure.position, { x: target.x + direction * 10, y: target.y }, .3), event(`goal-kick-${index}`, "GOAL_KICK", time + 1.05, .16, taker.id, taker.id, goalSpot, goalSpot, meta), event(`goal-kick-pass-${index}`, "PASS", time + 1.3, .78, taker.id, receiver.id, goalSpot, target, meta), event(`goal-kick-receive-${index}`, "BALL_RECEIVED", time + 2.08, 0, receiver.id, receiver.id, target, target, meta));
            }
            else {
                const cornerY = index % 2 ? 97 : 3, corner = { x: team === "home" ? 98 : 2, y: cornerY };
                const out = { x: team === "home" ? 103 : -3, y: cornerY < 50 ? 0 : 100 };
                const target = { x: team === "home" ? 87 : 13, y: cornerY < 50 ? 45 : 55 };
                // En un córner, todos los jugadores de campo se cargan al área rival o la protegen.
                // Los porteros se mantienen en sus porterías y el cobrador queda junto al banderín.
                const attackingField = attackers.filter(player => player.role !== "POR" && player.id !== taker.id);
                const defendingField = defenders.filter(player => player.role !== "POR");
                const boxYs = [43, 51, 59, 34, 67, 26, 74, 48, 57];
                const attackingXs = [87, 91, 84, 88, 80, 83, 78, 89, 85];
                const defendingXs = [92, 88, 90, 85, 94, 82, 87, 91, 86, 80];
                const attackMoves = attackingField.map((player, playerIndex) => {
                    const x = player.id === receiver.id ? target.x : (team === "home" ? attackingXs[playerIndex % attackingXs.length] : 100 - attackingXs[playerIndex % attackingXs.length]);
                    const y = player.id === receiver.id ? target.y : boxYs[playerIndex % boxYs.length];
                    return mover(player.id, player.position, { x, y }, .2 + (playerIndex % 4) * .035);
                });
                const defenseMoves = defendingField.map((player, playerIndex) => mover(player.id, player.position, {
                    x: team === "home" ? defendingXs[playerIndex % defendingXs.length] : 100 - defendingXs[playerIndex % defendingXs.length],
                    y: boxYs[(playerIndex + 1) % boxYs.length]
                }, .24 + (playerIndex % 4) * .035));
                events.push(event(`out-${index}`, "BALL_OUT", time, .15, taker.id, undefined, taker.position, out, meta), mover(taker.id, taker.position, corner, .18), ...attackMoves, ...defenseMoves, event(`corner-${index}`, "CORNER_KICK", time + 1.05, .16, taker.id, taker.id, corner, corner, meta), event(`corner-cross-${index}`, "PASS", time + 1.26, .78, taker.id, receiver.id, corner, target, meta), event(`corner-receive-${index}`, "BALL_RECEIVED", time + 2.04, 0, receiver.id, receiver.id, target, target, meta));
            }
        };
        const setPieces = ["THROW_IN", "GOAL_KICK", "CORNER_KICK"];
        for (let time = 9, index = 0; time < duration - 3; time += 14, index++) {
            const occupied = events.some(item => item.type === "GOAL" && time >= item.startTime - 5.2 && time <= item.startTime + 2);
            if (!occupied)
                agregarReanudacion(time, index, setPieces[index % setPieces.length]);
        }
        const homeMid = roster.find(player => player.team === "home" && player.role === "MED"), awayMid = roster.find(player => player.team === "away" && player.role === "MED");
        if (homeMid && awayMid)
            events.push(event("opening-home", "PLAYER_MOVE", .5, 2.2, homeMid.id, undefined, homeMid.position, { x: homeMid.position.x + 4, y: homeMid.position.y }, {}), event("opening-away", "PLAYER_MOVE", 5, 2.2, awayMid.id, undefined, awayMid.position, { x: awayMid.position.x - 4, y: awayMid.position.y }, {}), event("final-shape", "PLAYER_MOVE", duration - 3, 2, homeMid.id, undefined, homeMid.position, { x: homeMid.position.x + 2, y: homeMid.position.y }, {}));
        return { timeline: new MatchTimeline(events), roster };
    }
    MatchVisual.createMatchTimeline = createMatchTimeline;
    function playRealMatch(host, home, away, goals, callbacks) {
        const match = createMatchTimeline(home, away, goals), player = new VisualMatchPlayer(host, match.timeline, match.roster, callbacks);
        player.setSpeed(2.35);
        player.start();
        return player;
    }
    MatchVisual.playRealMatch = playRealMatch;
    function playDeterministicDemo(host, onFinished) {
        const player = new VisualMatchPlayer(host, createDemoTimeline(), createDemoRoster(), { onFinished });
        player.start();
        return player;
    }
    MatchVisual.playDeterministicDemo = playDeterministicDemo;
})(MatchVisual || (MatchVisual = {}));
