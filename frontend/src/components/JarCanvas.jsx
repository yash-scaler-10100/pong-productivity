import React, { useRef, useEffect } from 'react';

const COLORS = { stone: '#FF00AA', pebble: '#00FFCC', sand: 'rgba(255,255,255,0.5)' };
const RADII = { stone: 28, pebble: 19, sand: 10 };
const GRAVITY = 0.35;
const DAMPING = 0.45;
const FRICTION = 0.97;

export default function JarCanvas({ tasks, jarFill, maxVolume }) {
  const canvasRef = useRef(null);
  const stonesRef = useRef([]);
  const particlesRef = useRef([]);
  const prevIdsRef = useRef(new Set());
  const animRef = useRef(null);

  useEffect(() => {
    const currentIds = new Set(tasks.map(t => t.id));
    const stoneIds = new Set(stonesRef.current.map(s => s.taskId));
    const canvas = canvasRef.current;
    if (!canvas) return;

    tasks.forEach(task => {
      if (!stoneIds.has(task.id)) {
        const x = canvas.width * 0.2 + Math.random() * canvas.width * 0.6;
        stonesRef.current.push({
          taskId: task.id, x, y: -20,
          vx: (Math.random() - 0.5) * 2, vy: 0,
          type: task.task_type, title: task.title,
          radius: RADII[task.task_type] || 19, settled: false,
        });
      }
    });

    stonesRef.current = stonesRef.current.filter(s => {
      if (!currentIds.has(s.taskId)) {
        const color = COLORS[s.type] || '#fff';
        for (let i = 0; i < 25; i++) {
          particlesRef.current.push({
            x: s.x, y: s.y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10 - 3,
            life: 1, decay: Math.random() * 0.025 + 0.015,
            color, size: Math.random() * 4 + 1,
          });
        }
        return false;
      }
      return true;
    });

    prevIdsRef.current = currentIds;
  }, [tasks]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);

    const PAD = 30;

    const animate = () => {
      const W = canvas.width;
      const H = canvas.height;
      if (W === 0 || H === 0) { animRef.current = requestAnimationFrame(animate); return; }

      const jarLeft = PAD;
      const jarRight = W - PAD;
      const jarTop = 40;
      const jarBottom = H - 16;

      ctx.clearRect(0, 0, W, H);

      // Jar glass
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(jarLeft + 8, jarTop);
      ctx.lineTo(jarLeft - 2, jarBottom);
      ctx.lineTo(jarRight + 2, jarBottom);
      ctx.lineTo(jarRight - 8, jarTop);
      ctx.stroke();

      // Jar fill glow
      const fillRatio = jarFill / maxVolume;
      if (fillRatio > 0) {
        const fillTop = jarBottom - (jarBottom - jarTop) * Math.min(fillRatio, 1);
        const grad = ctx.createLinearGradient(0, jarBottom, 0, fillTop);
        grad.addColorStop(0, 'rgba(0,255,204,0.07)');
        grad.addColorStop(1, 'rgba(0,255,204,0.01)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(jarLeft + 4, fillTop);
        ctx.lineTo(jarLeft - 2, jarBottom);
        ctx.lineTo(jarRight + 2, jarBottom);
        ctx.lineTo(jarRight - 4, fillTop);
        ctx.closePath();
        ctx.fill();
      }

      // Capacity warning
      if (fillRatio > 0.8) {
        ctx.fillStyle = `rgba(255,59,48,${0.4 + Math.sin(Date.now() * 0.004) * 0.25})`;
        ctx.font = '10px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText('JAR NEARLY FULL', W / 2, jarTop - 8);
      }

      // Empty state
      if (stonesRef.current.length === 0 && particlesRef.current.length === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.font = '11px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText('ADD TASKS TO FILL THE JAR', W / 2, H / 2);
      }

      // Physics update
      const stones = stonesRef.current;
      for (let i = 0; i < stones.length; i++) {
        const s = stones[i];
        if (s.settled) { s.vy += GRAVITY * 0.05; s.settled = false; }
        s.vy += GRAVITY;
        s.vx *= FRICTION;
        s.x += s.vx;
        s.y += s.vy;

        // Wall collision
        if (s.x - s.radius < jarLeft) { s.x = jarLeft + s.radius; s.vx = Math.abs(s.vx) * DAMPING; }
        if (s.x + s.radius > jarRight) { s.x = jarRight - s.radius; s.vx = -Math.abs(s.vx) * DAMPING; }
        if (s.y + s.radius > jarBottom) { s.y = jarBottom - s.radius; s.vy = -Math.abs(s.vy) * DAMPING; if (Math.abs(s.vy) < 1) { s.vy = 0; s.settled = true; } }
        if (s.y - s.radius < jarTop) { s.y = jarTop + s.radius; s.vy = Math.abs(s.vy) * DAMPING; }

        // Stone-stone collision
        for (let j = i + 1; j < stones.length; j++) {
          const o = stones[j];
          const dx = o.x - s.x;
          const dy = o.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = s.radius + o.radius;
          if (dist < minDist && dist > 0.01) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = (minDist - dist) * 0.5;
            s.x -= nx * overlap;
            s.y -= ny * overlap;
            o.x += nx * overlap;
            o.y += ny * overlap;
            const relVx = s.vx - o.vx;
            const relVy = s.vy - o.vy;
            const impulse = (relVx * nx + relVy * ny) * 0.5;
            s.vx -= impulse * nx;
            s.vy -= impulse * ny;
            o.vx += impulse * nx;
            o.vy += impulse * ny;
            s.settled = false;
            o.settled = false;
          }
        }

        // Draw stone
        const color = COLORS[s.type] || '#fff';
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = s.type === 'sand' ? 5 : 12;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Label
        if (s.type !== 'sand') {
          ctx.fillStyle = s.type === 'pebble' ? '#000' : '#fff';
          ctx.font = `${s.radius > 22 ? 9 : 7}px JetBrains Mono`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const label = s.title.length > 7 ? s.title.substring(0, 6) + '..' : s.title;
          ctx.fillText(label, s.x, s.y);
        }
      }

      // Particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.life -= p.decay;
        if (p.life <= 0) return false;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        return true;
      });

      // Volume bar
      const barY = H - 8;
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(PAD, barY, W - PAD * 2, 3);
      const barColor = fillRatio > 0.8 ? '#FF3B30' : fillRatio > 0.6 ? '#FFD700' : '#00FFCC';
      ctx.fillStyle = barColor;
      ctx.fillRect(PAD, barY, (W - PAD * 2) * Math.min(fillRatio, 1), 3);

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(animRef.current);
    };
  }, [jarFill, maxVolume]);

  return <canvas ref={canvasRef} className="zenith-jar-canvas" data-testid="jar-canvas" />;
}
