import React, { useRef, useEffect } from 'react';

const BASE_SPEED = 3;
const MAX_SPEED = 12;
const PADDLE_SPEED = 5;
const PADDLE_MARGIN = 24;

export default function PongCanvas({ shipEvent, session }) {
  const canvasRef = useRef(null);
  const gameRef = useRef({
    ball: { x: 0, y: 0, vx: BASE_SPEED, vy: 1.5, radius: 7 },
    pYou: { y: 0, h: 72, w: 10 },
    pTeam: { y: 0, h: 72, w: 10 },
    scoreYou: 0, scoreTeam: 0,
    particles: [], texts: [],
    speedMul: 1, comboCount: 0,
    lastShipTime: 0, started: false,
  });
  const keysRef = useRef({});
  const lastShipRef = useRef(0);
  const animRef = useRef(null);

  // Ship event handler
  useEffect(() => {
    if (!shipEvent) return;
    const g = gameRef.current;
    const now = Date.now();
    const timeSince = now - lastShipRef.current;
    const isCombo = lastShipRef.current > 0 && timeSince < 180000;

    if (isCombo) {
      g.comboCount++;
      g.speedMul = Math.min(g.speedMul + 0.5, 3.5);
      g.texts.push({ text: `FLOW STATE x${g.comboCount}`, life: 1, color: '#FFD700', size: 32 });
      for (let i = 0; i < 40; i++) {
        g.particles.push({
          x: g.ball.x, y: g.ball.y,
          vx: (Math.random() - 0.5) * 16, vy: (Math.random() - 0.5) * 16,
          life: 1, decay: Math.random() * 0.02 + 0.01,
          color: ['#FFD700', '#FF00AA', '#00FFCC'][Math.floor(Math.random() * 3)],
          size: Math.random() * 5 + 2,
        });
      }
    } else {
      g.speedMul = Math.min(g.speedMul + 0.25, 3);
      g.texts.push({ text: 'SHIPPED!', life: 1, color: '#FF00AA', size: 24 });
      for (let i = 0; i < 20; i++) {
        g.particles.push({
          x: g.ball.x, y: g.ball.y,
          vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10,
          life: 1, decay: Math.random() * 0.03 + 0.02,
          color: Math.random() > 0.5 ? '#00FFCC' : '#FF00AA',
          size: Math.random() * 3 + 1,
        });
      }
    }

    g.started = true;
    g.lastShipTime = now;
    lastShipRef.current = now;

    const angle = Math.atan2(g.ball.vy, g.ball.vx);
    const newSpeed = Math.min(BASE_SPEED * g.speedMul, MAX_SPEED);
    g.ball.vx = Math.cos(angle) * newSpeed;
    g.ball.vy = Math.sin(angle) * newSpeed;
  }, [shipEvent]);

  // Keyboard
  useEffect(() => {
    const down = (e) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      keysRef.current[e.key] = true;
    };
    const up = (e) => { keysRef.current[e.key] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const g = gameRef.current;

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        g.ball.x = canvas.width / 2;
        g.ball.y = canvas.height / 2;
        g.pYou.y = canvas.height / 2 - g.pYou.h / 2;
        g.pTeam.y = canvas.height / 2 - g.pTeam.h / 2;
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);

    const resetBall = () => {
      g.ball.x = canvas.width / 2;
      g.ball.y = canvas.height / 2;
      const angle = (Math.random() - 0.5) * Math.PI * 0.4;
      const dir = Math.random() > 0.5 ? 1 : -1;
      const spd = Math.min(BASE_SPEED * g.speedMul, MAX_SPEED);
      g.ball.vx = Math.cos(angle) * spd * dir;
      g.ball.vy = Math.sin(angle) * spd;
    };

    g.started = true;
    resetBall();

    const animate = () => {
      const W = canvas.width;
      const H = canvas.height;
      if (W === 0 || H === 0) { animRef.current = requestAnimationFrame(animate); return; }

      ctx.clearRect(0, 0, W, H);

      // Center line
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center circle
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 50, 0, Math.PI * 2);
      ctx.stroke();

      // Paddles
      const keys = keysRef.current;
      if (keys['ArrowUp']) g.pYou.y = Math.max(0, g.pYou.y - PADDLE_SPEED);
      if (keys['ArrowDown']) g.pYou.y = Math.min(H - g.pYou.h, g.pYou.y + PADDLE_SPEED);

      // AI
      const target = g.ball.y - g.pTeam.h / 2;
      g.pTeam.y += (target - g.pTeam.y) * 0.035;
      g.pTeam.y = Math.max(0, Math.min(H - g.pTeam.h, g.pTeam.y));

      // Ball
      if (g.started) {
        g.ball.x += g.ball.vx;
        g.ball.y += g.ball.vy;

        // Walls
        if (g.ball.y - g.ball.radius < 0) { g.ball.y = g.ball.radius; g.ball.vy = Math.abs(g.ball.vy); }
        if (g.ball.y + g.ball.radius > H) { g.ball.y = H - g.ball.radius; g.ball.vy = -Math.abs(g.ball.vy); }

        // You paddle
        const pYouX = PADDLE_MARGIN;
        if (g.ball.x - g.ball.radius < pYouX + g.pYou.w &&
            g.ball.x + g.ball.radius > pYouX &&
            g.ball.y > g.pYou.y && g.ball.y < g.pYou.y + g.pYou.h) {
          g.ball.x = pYouX + g.pYou.w + g.ball.radius;
          g.ball.vx = Math.abs(g.ball.vx);
          g.ball.vy += ((g.ball.y - g.pYou.y) / g.pYou.h - 0.5) * 4;
          for (let i = 0; i < 8; i++) {
            g.particles.push({ x: g.ball.x, y: g.ball.y, vx: Math.random() * 4, vy: (Math.random() - 0.5) * 5, life: 1, decay: 0.04, color: '#00FFCC', size: Math.random() * 2 + 1 });
          }
        }

        // Team paddle
        const pTeamX = W - PADDLE_MARGIN - g.pTeam.w;
        if (g.ball.x + g.ball.radius > pTeamX &&
            g.ball.x - g.ball.radius < pTeamX + g.pTeam.w &&
            g.ball.y > g.pTeam.y && g.ball.y < g.pTeam.y + g.pTeam.h) {
          g.ball.x = pTeamX - g.ball.radius;
          g.ball.vx = -Math.abs(g.ball.vx);
          g.ball.vy += ((g.ball.y - g.pTeam.y) / g.pTeam.h - 0.5) * 4;
          for (let i = 0; i < 8; i++) {
            g.particles.push({ x: g.ball.x, y: g.ball.y, vx: -Math.random() * 4, vy: (Math.random() - 0.5) * 5, life: 1, decay: 0.04, color: '#FF00AA', size: Math.random() * 2 + 1 });
          }
        }

        // Score
        if (g.ball.x < -20) { g.scoreTeam++; resetBall(); }
        if (g.ball.x > W + 20) { g.scoreYou++; resetBall(); }
      }

      // Draw paddles
      ctx.save();
      ctx.shadowColor = '#00FFCC';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#00FFCC';
      ctx.beginPath();
      ctx.roundRect(PADDLE_MARGIN, g.pYou.y, g.pYou.w, g.pYou.h, 5);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.shadowColor = '#FF00AA';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#FF00AA';
      ctx.beginPath();
      ctx.roundRect(W - PADDLE_MARGIN - g.pTeam.w, g.pTeam.y, g.pTeam.w, g.pTeam.h, 5);
      ctx.fill();
      ctx.restore();

      // Ball
      ctx.save();
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(g.ball.x, g.ball.y, g.ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Trail
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.arc(g.ball.x - g.ball.vx * 2, g.ball.y - g.ball.vy * 2, g.ball.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Particles
      g.particles = g.particles.filter(p => {
        p.x += p.vx; p.y += p.vy; p.life -= p.decay;
        if (p.life <= 0) return false;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        return true;
      });

      // Score
      ctx.font = '42px Unbounded';
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.textAlign = 'center';
      ctx.fillText(String(g.scoreYou), W / 2 - 50, 55);
      ctx.fillText(String(g.scoreTeam), W / 2 + 50, 55);

      // Labels
      ctx.font = '9px JetBrains Mono';
      ctx.fillStyle = 'rgba(0,255,204,0.4)';
      ctx.textAlign = 'center';
      ctx.fillText('YOU', PADDLE_MARGIN + g.pYou.w / 2, g.pYou.y - 8);
      ctx.fillStyle = 'rgba(255,0,170,0.4)';
      ctx.fillText('TEAM', W - PADDLE_MARGIN - g.pTeam.w / 2, g.pTeam.y - 8);

      // Floating texts
      g.texts = g.texts.filter(t => {
        ctx.globalAlpha = t.life;
        ctx.font = `bold ${t.size}px Unbounded`;
        ctx.fillStyle = t.color;
        ctx.textAlign = 'center';
        ctx.fillText(t.text, W / 2, H / 2 - (1 - t.life) * 40);
        ctx.globalAlpha = 1;
        t.life -= 0.015;
        return t.life > 0;
      });

      // Speed indicator
      ctx.font = '9px JetBrains Mono';
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.textAlign = 'right';
      ctx.fillText(`SPEED x${g.speedMul.toFixed(1)}`, W - 16, H - 16);

      // Controls hint
      ctx.textAlign = 'left';
      ctx.fillText('Arrow keys to move paddle', 16, H - 16);

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className="zenith-pong-canvas" data-testid="pong-canvas" />;
}
