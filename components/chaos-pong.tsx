"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Copy, RadioTower, Sparkles, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReplayPoster } from "@/components/replay-poster";
import type { MatchData, PlayerId } from "@/lib/types";
import { cn } from "@/lib/utils";

type Ball = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: number;
  trail: { x: number; y: number; hue: number; age: number }[];
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  sad?: boolean;
};

type TextParticle = {
  text: string;
  x: number;
  y: number;
  vy: number;
  life: number;
  color: string;
};

type Shockwave = {
  x: number;
  y: number;
  radius: number;
  life: number;
  rainbow: boolean;
};

type Paddle = {
  y: number;
  target: number;
};

type GameState = {
  balls: Ball[];
  particles: Particle[];
  textParticles: TextParticle[];
  shockwaves: Shockwave[];
  paddles: Record<PlayerId, Paddle>;
  keys: Set<string>;
  pointerPlayer: PlayerId | null;
  lastTime: number;
  width: number;
  height: number;
  chaos: number;
  shake: number;
  flash: number;
  godUntil: number;
  sadPulse: number;
  nextId: number;
};

const PADDLE_W = 18;
const INACTIVITY_MS = 15 * 60 * 1000;

const initialMatch = (): MatchData => {
  const now = new Date().toISOString();
  return {
    title: "ChaosPong Live Match",
    createdAt: now,
    updatedAt: now,
    ships: [],
    combos: 0,
    score: {
      you: 0,
      teammate: 0,
      rallies: 0,
      chaos: 0,
    },
  };
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function playerLabel(player: PlayerId) {
  return player === "you" ? "You" : "Teammate";
}

function playerColor(player: PlayerId) {
  return player === "you" ? "#00ffcc" : "#ff00aa";
}

function shortId() {
  return Math.random().toString(36).slice(2, 10);
}

function ballColor(speed: number, hue: number) {
  if (speed < 650) {
    return "#00ffcc";
  }
  if (speed < 900) {
    return "#ff00aa";
  }
  return `hsl(${hue}, 100%, 62%)`;
}

function createGame(): GameState {
  return {
    balls: [],
    particles: [],
    textParticles: [],
    shockwaves: [],
    paddles: {
      you: { y: 260, target: 260 },
      teammate: { y: 260, target: 260 },
    },
    keys: new Set<string>(),
    pointerPlayer: null,
    lastTime: performance.now(),
    width: 960,
    height: 620,
    chaos: 0,
    shake: 0,
    flash: 0,
    godUntil: 0,
    sadPulse: 0,
    nextId: 1,
  };
}

function addExplosion(game: GameState, x: number, y: number, color: string, amount: number, sad = false) {
  for (let i = 0; i < amount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = sad ? 35 + Math.random() * 75 : 120 + Math.random() * (360 + game.chaos * 20);
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed + (sad ? 80 : 0),
      life: sad ? 1.8 : 0.7 + Math.random() * 0.7,
      maxLife: sad ? 1.8 : 0.9,
      size: sad ? 2 + Math.random() * 3 : 2 + Math.random() * 6,
      color,
      sad,
    });
  }
}

function addText(game: GameState, text: string, x: number, y: number, color: string) {
  game.textParticles.push({
    text,
    x,
    y,
    vy: -34 - Math.random() * 32,
    life: 1.6,
    color,
  });
}

function launchBall(game: GameState, player: PlayerId, chaosBoost = 0, yOffset = 0) {
  const fromLeft = player === "you";
  const x = fromLeft ? 72 : game.width - 72;
  const paddle = game.paddles[player];
  const speed = 430 + game.chaos * 32 + chaosBoost;
  const ball: Ball = {
    id: game.nextId,
    x,
    y: paddle.y + yOffset,
    vx: (fromLeft ? 1 : -1) * speed,
    vy: (Math.random() - 0.5) * (230 + game.chaos * 12),
    r: 9,
    hue: fromLeft ? 174 : 320,
    trail: [],
  };

  game.nextId += 1;
  game.balls.push(ball);
  game.shake = Math.max(game.shake, 10 + game.chaos * 0.5);
  game.flash = Math.max(game.flash, 0.26);
  addExplosion(game, x, ball.y, playerColor(player), 34 + game.chaos * 2);
}

function drawElectricPaddle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  color: string,
  t: number,
) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 24 + Math.sin(t / 120) * 8;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(x - 8, y - h / 2 - 10, PADDLE_W + 16, h + 20);
  const gradient = ctx.createLinearGradient(x, y - h / 2, x, y + h / 2);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.22, color);
  gradient.addColorStop(1, "#111111");
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y - h / 2, PADDLE_W, h);
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.strokeRect(x - 2, y - h / 2 - 2, PADDLE_W + 4, h + 4);

  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const ay = y - h / 2 + Math.random() * h;
    const dir = Math.random() > 0.5 ? 1 : -1;
    ctx.moveTo(x + PADDLE_W / 2, ay);
    ctx.lineTo(x + PADDLE_W / 2 + dir * (12 + Math.random() * 20), ay + (Math.random() - 0.5) * 24);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.88)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

function renderGame(
  ctx: CanvasRenderingContext2D,
  game: GameState,
  dt: number,
  now: number,
  lastShipAt: number,
  onRally: (player: PlayerId) => void,
  onPoint: (player: PlayerId) => void,
) {
  const { width: w, height: h } = game;
  const inactive = now - lastShipAt > INACTIVITY_MS;
  const step = inactive ? dt * 0.28 : dt;
  const paddleH = clamp(h * 0.2 - game.chaos * 2.5, 76, 142);
  const leftX = 42;
  const rightX = w - 60;

  game.chaos = clamp(game.chaos, 0, 40);
  game.shake = Math.max(0, game.shake - dt * 22);
  game.flash = Math.max(0, game.flash - dt * 1.7);

  const sx = (Math.random() - 0.5) * game.shake;
  const sy = (Math.random() - 0.5) * game.shake;

  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.translate(sx, sy);

  ctx.fillStyle = inactive ? "rgba(4,4,5,0.42)" : "rgba(4,4,5,0.18)";
  ctx.fillRect(-20, -20, w + 40, h + 40);

  ctx.save();
  ctx.globalAlpha = 0.18 + game.chaos * 0.006;
  ctx.strokeStyle = "#00ffcc";
  ctx.lineWidth = 1;
  const grid = 44;
  const offset = (now * 0.045) % grid;
  for (let x = -grid; x < w + grid; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x + offset, 0);
    ctx.lineTo(x - 100 + offset, h);
    ctx.stroke();
  }
  ctx.strokeStyle = "#ff00aa";
  for (let y = -grid; y < h + grid; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y + offset);
    ctx.lineTo(w, y + offset);
    ctx.stroke();
  }
  ctx.restore();

  const nearestLeft = game.balls.find((ball) => ball.vx < 0) ?? game.balls[0];
  const nearestRight = game.balls.find((ball) => ball.vx > 0) ?? game.balls[0];
  if (nearestLeft && !game.keys.has("w") && !game.keys.has("s") && game.pointerPlayer !== "you") {
    game.paddles.you.target = nearestLeft.y;
  }
  if (
    nearestRight &&
    !game.keys.has("arrowup") &&
    !game.keys.has("arrowdown") &&
    game.pointerPlayer !== "teammate"
  ) {
    game.paddles.teammate.target = nearestRight.y;
  }

  if (game.keys.has("w")) game.paddles.you.target -= 520 * step;
  if (game.keys.has("s")) game.paddles.you.target += 520 * step;
  if (game.keys.has("arrowup")) game.paddles.teammate.target -= 520 * step;
  if (game.keys.has("arrowdown")) game.paddles.teammate.target += 520 * step;

  for (const paddle of Object.values(game.paddles)) {
    paddle.target = clamp(paddle.target, paddleH / 2 + 18, h - paddleH / 2 - 18);
    paddle.y += (paddle.target - paddle.y) * clamp(step * 13, 0, 1);
  }

  ctx.save();
  ctx.setLineDash([10, 18]);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w / 2, 24);
  ctx.lineTo(w / 2, h - 24);
  ctx.stroke();
  ctx.restore();

  drawElectricPaddle(ctx, leftX, game.paddles.you.y, paddleH, "#00ffcc", now);
  drawElectricPaddle(ctx, rightX, game.paddles.teammate.y, paddleH, "#ff00aa", now);

  for (const ball of game.balls) {
    ball.x += ball.vx * step;
    ball.y += ball.vy * step;
    ball.hue = (ball.hue + step * (90 + game.chaos * 7)) % 360;
    ball.trail.unshift({ x: ball.x, y: ball.y, hue: ball.hue, age: 0 });
    ball.trail = ball.trail.slice(0, 32 + game.chaos);
    for (const point of ball.trail) {
      point.age += step;
    }

    if (ball.y - ball.r < 12 || ball.y + ball.r > h - 12) {
      ball.y = clamp(ball.y, 12 + ball.r, h - 12 - ball.r);
      ball.vy *= -1;
      game.shake = Math.max(game.shake, 4);
      addExplosion(game, ball.x, ball.y, "#ffffff", 8);
    }

    const hitLeft =
      ball.vx < 0 &&
      ball.x - ball.r <= leftX + PADDLE_W &&
      ball.x + ball.r >= leftX &&
      Math.abs(ball.y - game.paddles.you.y) <= paddleH / 2 + ball.r;
    const hitRight =
      ball.vx > 0 &&
      ball.x + ball.r >= rightX &&
      ball.x - ball.r <= rightX + PADDLE_W &&
      Math.abs(ball.y - game.paddles.teammate.y) <= paddleH / 2 + ball.r;

    if (hitLeft || hitRight) {
      const player: PlayerId = hitLeft ? "you" : "teammate";
      const paddle = game.paddles[player];
      const offsetHit = (ball.y - paddle.y) / (paddleH / 2);
      const baseSpeed = Math.hypot(ball.vx, ball.vy) * 1.055 + 18;
      ball.vx = (hitLeft ? 1 : -1) * clamp(baseSpeed, 420, 1380);
      ball.vy = clamp(ball.vy + offsetHit * 220, -860, 860);
      ball.x = hitLeft ? leftX + PADDLE_W + ball.r + 1 : rightX - ball.r - 1;
      game.shake = Math.max(game.shake, 8 + game.chaos * 0.2);
      addExplosion(game, ball.x, ball.y, playerColor(player), 22 + game.chaos);
      addText(game, "RALLY+", ball.x, ball.y - 18, playerColor(player));
      game.shockwaves.push({ x: ball.x, y: ball.y, radius: 12, life: 0.58, rainbow: game.chaos > 12 });
      onRally(player);
    }

    if (ball.x < -70) {
      ball.x = w / 2;
      ball.y = h / 2;
      ball.vx = Math.abs(ball.vx) * 0.82;
      onPoint("teammate");
    }
    if (ball.x > w + 70) {
      ball.x = w / 2;
      ball.y = h / 2;
      ball.vx = -Math.abs(ball.vx) * 0.82;
      onPoint("you");
    }

    const speed = Math.hypot(ball.vx, ball.vy);
    ball.trail.forEach((point, index) => {
      const alpha = (1 - index / ball.trail.length) * 0.55;
      ctx.beginPath();
      ctx.fillStyle = `hsla(${point.hue}, 100%, 62%, ${alpha})`;
      ctx.shadowColor = `hsl(${point.hue}, 100%, 62%)`;
      ctx.shadowBlur = 18;
      ctx.arc(point.x, point.y, ball.r * (1 - index / (ball.trail.length * 1.15)), 0, Math.PI * 2);
      ctx.fill();
    });

    const color = ballColor(speed, ball.hue);
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = speed > 900 ? 34 : 24;
    ctx.arc(ball.x, ball.y, ball.r + Math.sin(now / 80) * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.arc(ball.x - 2, ball.y - 2, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = game.shockwaves.length - 1; i >= 0; i -= 1) {
    const wave = game.shockwaves[i];
    wave.radius += step * (280 + game.chaos * 18);
    wave.life -= step;
    if (wave.life <= 0) {
      game.shockwaves.splice(i, 1);
      continue;
    }
    ctx.beginPath();
    ctx.lineWidth = wave.rainbow ? 8 : 4;
    ctx.strokeStyle = wave.rainbow
      ? `hsla(${(now / 7) % 360}, 100%, 62%, ${wave.life})`
      : `rgba(0,255,204,${wave.life})`;
    ctx.shadowColor = wave.rainbow ? "#fff200" : "#00ffcc";
    ctx.shadowBlur = 18;
    ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = game.particles.length - 1; i >= 0; i -= 1) {
    const p = game.particles[i];
    p.life -= step;
    if (p.life <= 0) {
      game.particles.splice(i, 1);
      continue;
    }
    p.vy += (p.sad ? 72 : 18) * step;
    p.x += p.vx * step;
    p.y += p.vy * step;
    const alpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = p.sad ? 3 : 12;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.globalAlpha = 1;
  }

  for (let i = game.textParticles.length - 1; i >= 0; i -= 1) {
    const text = game.textParticles[i];
    text.life -= step;
    if (text.life <= 0) {
      game.textParticles.splice(i, 1);
      continue;
    }
    text.y += text.vy * step;
    ctx.globalAlpha = clamp(text.life / 1.6, 0, 1);
    ctx.font = "900 18px Courier New";
    ctx.fillStyle = text.color;
    ctx.shadowColor = text.color;
    ctx.shadowBlur = 18;
    ctx.fillText(text.text, text.x - 38, text.y);
    ctx.globalAlpha = 1;
  }

  if (inactive) {
    game.sadPulse -= step;
    if (game.sadPulse <= 0) {
      game.sadPulse = 0.18;
      addExplosion(game, Math.random() * w, -10, "rgba(130,160,255,0.65)", 2, true);
    }
    ctx.fillStyle = "rgba(0,0,0,0.46)";
    ctx.fillRect(-20, -20, w + 40, h + 40);
    ctx.font = "900 28px Courier New";
    ctx.fillStyle = "rgba(180,210,255,0.86)";
    ctx.shadowColor = "#94a3ff";
    ctx.shadowBlur = 18;
    ctx.textAlign = "center";
    ctx.fillText("INACTIVITY WARNING: SHIP SOMETHING", w / 2, h / 2);
    ctx.textAlign = "start";
  }

  if (game.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${game.flash})`;
    ctx.fillRect(-20, -20, w + 40, h + 40);
  }

  ctx.restore();
}

function PlayerStation({
  player,
  value,
  setValue,
  onShip,
  disabled,
}: {
  player: PlayerId;
  value: string;
  setValue: (value: string) => void;
  onShip: (player: PlayerId) => void;
  disabled: boolean;
}) {
  const color = playerColor(player);
  const accentClass = player === "you" ? "text-cyan-200" : "text-fuchsia-200";

  return (
    <div className="arcade-panel rounded-[8px] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase text-white/55">Player station</p>
          <h2 className={cn("font-arcade text-2xl uppercase tracking-[0]", accentClass)}>
            {playerLabel(player)}
          </h2>
        </div>
        <Zap className={accentClass} size={30} />
      </div>
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value.slice(0, 54))}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onShip(player);
          }
        }}
        maxLength={54}
        placeholder="Short ship note"
        aria-label={`${playerLabel(player)} ship note`}
      />
      <Button
        className="mt-3 h-16 w-full text-xl shadow-[0_0_28px_var(--ship-glow)]"
        style={{ "--ship-glow": color } as CSSProperties}
        variant={player === "you" ? "default" : "secondary"}
        size="lg"
        disabled={disabled}
        onClick={() => onShip(player)}
      >
        Ship It!
      </Button>
    </div>
  );
}

export function ChaosPong() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<GameState>(createGame());
  const matchRef = useRef<MatchData>(initialMatch());
  const rallyLockRef = useRef(0);
  const pointLockRef = useRef(0);
  const [match, setMatch] = useState<MatchData>(matchRef.current);
  const [inputs, setInputs] = useState<Record<PlayerId, string>>({
    you: "",
    teammate: "",
  });
  const [shareUrl, setShareUrl] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [ended, setEnded] = useState(false);
  const [isGod, setIsGod] = useState(false);
  const [inactive, setInactive] = useState(false);
  const [comboText, setComboText] = useState("");

  const lastShipAt = useMemo(() => {
    const last = match.ships.at(-1);
    return last ? new Date(last.timestamp).getTime() : new Date(match.createdAt).getTime();
  }, [match.createdAt, match.ships]);

  const commitMatch = useCallback((updater: (current: MatchData) => MatchData) => {
    setMatch((current) => {
      const next = updater(current);
      matchRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    matchRef.current = match;
    localStorage.setItem("chaospong-current-match", JSON.stringify(match));
  }, [match]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setInactive(Date.now() - lastShipAt > INACTIVITY_MS);
      setIsGod(performance.now() < gameRef.current.godUntil);
    }, 600);
    return () => window.clearInterval(interval);
  }, [lastShipAt]);

  const onRally = useCallback(
    () => {
      const now = performance.now();
      if (now - rallyLockRef.current < 80) return;
      rallyLockRef.current = now;
      commitMatch((current) => ({
        ...current,
        updatedAt: new Date().toISOString(),
        score: {
          ...current.score,
          rallies: current.score.rallies + 1,
        },
      }));
    },
    [commitMatch],
  );

  const onPoint = useCallback(
    (player: PlayerId) => {
      const now = performance.now();
      if (now - pointLockRef.current < 500) return;
      pointLockRef.current = now;
      commitMatch((current) => ({
        ...current,
        updatedAt: new Date().toISOString(),
        score: {
          ...current.score,
          [player]: current.score[player] + 1,
        },
      }));
    },
    [commitMatch],
  );

  const handleShip = useCallback(
    (player: PlayerId) => {
      const text = inputs[player].trim();
      if (!text) return;

      const nowDate = new Date();
      const timestamp = nowDate.toISOString();
      const game = gameRef.current;
      const opposite: PlayerId = player === "you" ? "teammate" : "you";
      const oppositeRecent = matchRef.current.ships
        .filter((ship) => ship.player === opposite)
        .some((ship) => nowDate.getTime() - new Date(ship.timestamp).getTime() <= 3 * 60 * 1000);
      const combo = oppositeRecent;
      const color = playerColor(player);

      game.chaos = clamp(game.chaos + (combo ? 4 : 1), 0, 40);
      launchBall(game, player);
      addText(game, text.toUpperCase(), player === "you" ? 96 : game.width - 260, game.paddles[player].y - 30, color);

      if (combo) {
        launchBall(game, player, 120, -42);
        launchBall(game, player, 120, 42);
        game.godUntil = performance.now() + 12000;
        game.flash = 0.88;
        game.shake = 30;
        game.shockwaves.push({
          x: game.width / 2,
          y: game.height / 2,
          radius: 20,
          life: 1.5,
          rainbow: true,
        });
        setIsGod(true);
        setComboText("GOD MODE COMBO: TRIPLE BALLS");
        window.setTimeout(() => setComboText(""), 2600);
      }

      commitMatch((current) => ({
        ...current,
        updatedAt: timestamp,
        ships: [
          ...current.ships,
          {
            id: shortId(),
            player,
            text,
            timestamp,
          },
        ],
        combos: current.combos + (combo ? 1 : 0),
        score: {
          ...current.score,
          [player]: current.score[player] + 1,
          chaos: clamp(current.score.chaos + (combo ? 4 : 1), 0, 99),
        },
      }));

      setInputs((current) => ({ ...current, [player]: "" }));
      setEnded(false);
    },
    [commitMatch, inputs],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const game = gameRef.current;
    let frame = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * ratio);
      canvas.height = Math.floor(rect.height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      game.width = rect.width;
      game.height = rect.height;
      game.paddles.you.y = clamp(game.paddles.you.y, 90, rect.height - 90);
      game.paddles.teammate.y = clamp(game.paddles.teammate.y, 90, rect.height - 90);
      if (game.balls.length === 0) {
        game.paddles.you.y = rect.height / 2;
        game.paddles.teammate.y = rect.height / 2;
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const player: PlayerId = x < rect.width / 2 ? "you" : "teammate";
      game.pointerPlayer = player;
      game.paddles[player].target = y;
    };
    const onPointerLeave = () => {
      game.pointerPlayer = null;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      game.keys.add(event.key.toLowerCase());
    };
    const onKeyUp = (event: KeyboardEvent) => {
      game.keys.delete(event.key.toLowerCase());
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const tick = (now: number) => {
      const dt = clamp((now - game.lastTime) / 1000, 0, 0.032);
      game.lastTime = now;
      renderGame(ctx, game, dt, now, lastShipAt, onRally, onPoint);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [lastShipAt, onPoint, onRally]);

  const publishMatch = useCallback(async () => {
    setPublishing(true);
    setShareUrl("");
    try {
      const response = await fetch("/api/save-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(matchRef.current),
      });
      if (!response.ok) {
        throw new Error("Save failed");
      }
      const result = (await response.json()) as { id: string; shareUrl: string; match: MatchData };
      matchRef.current = result.match;
      setMatch(result.match);
      localStorage.setItem(`chaospong-match-${result.id}`, JSON.stringify(result.match));
      setShareUrl(result.shareUrl);
    } catch {
      const id = `local-${Date.now().toString(36)}`;
      const fallback: MatchData = { ...matchRef.current, id };
      localStorage.setItem(`chaospong-match-${id}`, JSON.stringify(fallback));
      setShareUrl(`${window.location.origin}/match/${id}`);
    } finally {
      setPublishing(false);
    }
  }, []);

  const copyShareUrl = useCallback(async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
  }, [shareUrl]);

  const scoreLine = `${match.score.you.toString().padStart(2, "0")} : ${match.score.teammate
    .toString()
    .padStart(2, "0")}`;

  return (
    <main className={cn("chaos-shell text-white", isGod && "god-mode")}>
      <div className="lightning" />
      <div className="relative z-10 grid min-h-screen min-h-dvh grid-cols-1 gap-3 p-3 lg:grid-cols-[280px_1fr_280px]">
        <aside className="order-2 flex flex-col gap-3 lg:order-1">
          <PlayerStation
            player="you"
            value={inputs.you}
            setValue={(value) => setInputs((current) => ({ ...current, you: value }))}
            onShip={handleShip}
            disabled={publishing}
          />

          <div className="arcade-panel rounded-[8px] p-4 font-mono text-sm text-white/75">
            <p className="mb-2 text-xs uppercase text-cyan-200">Controls</p>
            <p>Left paddle: W / S or pointer on left half.</p>
            <p>Right paddle: Arrow keys or pointer on right half.</p>
            <p className="mt-3 text-cyan-100">Ship notes launch balls from that player.</p>
          </div>
        </aside>

        <section className="order-1 flex min-h-[620px] flex-col overflow-hidden rounded-[8px] border border-white/10 bg-black/35 lg:order-2">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/55 px-4 py-3">
            <div>
              <p className="font-mono text-xs uppercase text-white/50">Two-player productivity arcade</p>
              <h1 className="neon-title chromatic font-arcade text-3xl uppercase tracking-[0] md:text-5xl">
                ChaosPong
              </h1>
            </div>
            <div className="text-center">
              <p className="font-mono text-xs uppercase text-white/50">Live score</p>
              <p className="animate-score-pop font-arcade text-4xl text-cyan-100 md:text-6xl">
                {scoreLine}
              </p>
            </div>
            <div className="grid min-w-32 gap-1 text-right font-mono text-xs uppercase text-white/65">
              <span>Rallies {match.score.rallies}</span>
              <span>Chaos {match.score.chaos}</span>
              <span>Combos {match.combos}</span>
            </div>
          </header>

          <div className="relative min-h-0 flex-1">
            <canvas
              ref={canvasRef}
              className="block h-full min-h-[500px] w-full cursor-crosshair"
              aria-label="ChaosPong canvas game arena"
            />
            {comboText ? (
              <div className="pointer-events-none absolute inset-x-4 top-10 text-center">
                <div className="inline-flex rounded-[8px] border border-yellow-200 bg-black/70 px-5 py-3 font-arcade text-2xl uppercase text-yellow-100 shadow-[0_0_48px_rgba(255,242,0,0.5)]">
                  {comboText}
                </div>
              </div>
            ) : null}
            {inactive ? (
              <div className="pointer-events-none absolute bottom-5 left-1/2 w-[min(520px,calc(100%-2rem))] -translate-x-1/2 rounded-[8px] border border-indigo-200/30 bg-black/70 px-4 py-3 text-center font-mono text-sm text-indigo-100">
                Fifteen minutes without a ship. The arena is sulking in slow motion.
              </div>
            ) : null}
          </div>
        </section>

        <aside className="order-3 flex flex-col gap-3">
          <PlayerStation
            player="teammate"
            value={inputs.teammate}
            setValue={(value) => setInputs((current) => ({ ...current, teammate: value }))}
            onShip={handleShip}
            disabled={publishing}
          />

          <div className="arcade-panel rounded-[8px] p-4">
            <div className="mb-3 flex items-center gap-2">
              <RadioTower className="text-yellow-200" size={22} />
              <h2 className="font-arcade text-xl uppercase tracking-[0] text-yellow-100">Broadcast</h2>
            </div>
            <Button className="w-full" variant="outline" onClick={publishMatch} disabled={publishing}>
              {publishing ? "Publishing..." : "Publish Match"}
            </Button>
            {shareUrl ? (
              <div className="mt-3 rounded-[8px] border border-white/15 bg-black/45 p-3">
                <p className="mb-2 break-all font-mono text-xs text-cyan-100">{shareUrl}</p>
                <Button className="w-full" size="sm" variant="ghost" onClick={copyShareUrl}>
                  <Copy className="mr-2" size={16} />
                  Copy Link
                </Button>
              </div>
            ) : null}
          </div>

          <div className="arcade-panel rounded-[8px] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Trophy className="text-cyan-200" size={22} />
              <h2 className="font-arcade text-xl uppercase tracking-[0] text-cyan-100">Replay</h2>
            </div>
            <Button className="w-full" variant="secondary" onClick={() => setEnded((value) => !value)}>
              <Sparkles className="mr-2" size={18} />
              {ended ? "Hide Poster" : "End Match"}
            </Button>
            <div className="mt-3 max-h-56 space-y-2 overflow-auto pr-1 font-mono text-xs">
              {match.ships.length === 0 ? (
                <p className="text-white/45">No ships yet. The machine is waiting.</p>
              ) : (
                match.ships
                  .slice()
                  .reverse()
                  .slice(0, 8)
                  .map((ship) => (
                    <div key={ship.id} className="rounded-[8px] border border-white/10 bg-white/[0.04] p-2">
                      <p className={ship.player === "you" ? "text-cyan-200" : "text-fuchsia-200"}>
                        {playerLabel(ship.player)}
                      </p>
                      <p className="text-white/80">{ship.text}</p>
                    </div>
                  ))
              )}
            </div>
          </div>
        </aside>
      </div>

      {ended ? (
        <div className="relative z-10 mx-auto max-w-6xl px-3 pb-6">
          <ReplayPoster match={match} />
        </div>
      ) : null}
    </main>
  );
}
