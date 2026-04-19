import React, { useRef, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Flame, Share2 } from 'lucide-react';

export default function ReplayModal({ session, shippedTasks, allTasks, streak, onClose, onSave }) {
  const canvasRef = useRef(null);
  const streakCanvasRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('day'); // 'day' or 'streak'

  useEffect(() => {
    // Dialog portal needs a frame to mount canvas refs
    const timer = setTimeout(() => {
      drawDayPoster();
      drawStreakCard();
    }, 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, shippedTasks, streak]);

  const drawDayPoster = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = 1200;
    const H = 630;
    canvas.width = W;
    canvas.height = H;

    // Background
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, W, H);

    // Glows
    const g1 = ctx.createRadialGradient(0, 0, 0, 0, 0, 500);
    g1.addColorStop(0, 'rgba(0,255,204,0.12)');
    g1.addColorStop(1, 'transparent');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    const g2 = ctx.createRadialGradient(W, H, 0, W, H, 500);
    g2.addColorStop(0, 'rgba(255,0,170,0.12)');
    g2.addColorStop(1, 'transparent');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Title
    ctx.font = 'bold 64px Unbounded, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText('ZENITH', 80, 100);

    // Streak badge next to title
    if (streak.current > 0) {
      ctx.font = 'bold 28px JetBrains Mono, monospace';
      ctx.fillStyle = '#FF6B35';
      const titleWidth = ctx.measureText('ZENITH').width;
      ctx.font = 'bold 64px Unbounded, sans-serif';
      const zw = ctx.measureText('ZENITH').width;
      ctx.font = 'bold 28px JetBrains Mono, monospace';
      ctx.fillText(`${streak.current}-DAY STREAK`, 80 + zw + 20, 100);
    }

    // Tagline
    ctx.font = '16px JetBrains Mono, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('The Weight of Today. The Rush of Now.', 80, 130);

    // Date
    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    ctx.font = '14px JetBrains Mono, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText(dateStr, 80, 155);

    // Separator
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(80, 175);
    ctx.lineTo(W - 80, 175);
    ctx.stroke();

    // Stats
    ctx.font = 'bold 28px JetBrains Mono, monospace';
    ctx.fillStyle = '#00FFCC';
    ctx.fillText(`${shippedTasks.length} SHIPPED`, 80, 220);

    ctx.fillStyle = '#FF00AA';
    ctx.fillText(`SCORE ${session?.score_you || 0} - ${session?.score_teammate || 0}`, 400, 220);

    const fuelLeft = Math.max((session?.fuel_remaining || 100), 0);
    ctx.fillStyle = fuelLeft > 60 ? '#00FFCC' : fuelLeft > 30 ? '#FFD700' : '#FF3B30';
    ctx.fillText(`FUEL ${fuelLeft}%`, 750, 220);

    // Shipped items
    ctx.font = '14px JetBrains Mono, monospace';
    const maxItems = Math.min(shippedTasks.length, 10);
    for (let i = 0; i < maxItems; i++) {
      const task = shippedTasks[i];
      const y = 270 + i * 28;
      const colors = { stone: '#FF00AA', pebble: '#00FFCC', sand: 'rgba(255,255,255,0.5)' };
      ctx.fillStyle = colors[task.task_type] || '#fff';
      ctx.beginPath();
      ctx.arc(92, y - 4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.textAlign = 'left';
      ctx.fillText(task.title, 110, y);
    }

    if (shippedTasks.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillText('No tasks shipped yet. Get building!', 80, 280);
    }

    // Footer
    ctx.font = '12px JetBrains Mono, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.textAlign = 'right';
    ctx.fillText('zenith \u2014 the weight of today, the rush of now', W - 80, H - 30);

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);
  };

  const drawStreakCard = () => {
    const canvas = streakCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const S = 1080;
    canvas.width = S;
    canvas.height = S;

    // Background
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, S, S);

    // Fire glow
    const fireGrad = ctx.createRadialGradient(S / 2, S * 0.38, 0, S / 2, S * 0.38, S * 0.45);
    fireGrad.addColorStop(0, 'rgba(255,107,53,0.18)');
    fireGrad.addColorStop(0.5, 'rgba(255,60,30,0.06)');
    fireGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = fireGrad;
    ctx.fillRect(0, 0, S, S);

    // Subtle grid
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    for (let i = 0; i < S; i += 36) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(S, i); ctx.stroke();
    }

    // ZENITH brand top
    ctx.font = 'bold 32px Unbounded, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'center';
    ctx.fillText('ZENITH', S / 2, 80);

    // Fire symbol (drawn with shapes)
    const cx = S / 2;
    const cy = S * 0.32;
    // Outer flame
    ctx.beginPath();
    ctx.moveTo(cx, cy - 80);
    ctx.bezierCurveTo(cx + 50, cy - 40, cx + 65, cy + 30, cx + 45, cy + 70);
    ctx.bezierCurveTo(cx + 30, cy + 90, cx - 30, cy + 90, cx - 45, cy + 70);
    ctx.bezierCurveTo(cx - 65, cy + 30, cx - 50, cy - 40, cx, cy - 80);
    ctx.closePath();
    ctx.fillStyle = '#FF6B35';
    ctx.shadowColor = '#FF6B35';
    ctx.shadowBlur = 40;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Inner flame
    ctx.beginPath();
    ctx.moveTo(cx, cy - 35);
    ctx.bezierCurveTo(cx + 25, cy - 10, cx + 32, cy + 20, cx + 22, cy + 45);
    ctx.bezierCurveTo(cx + 15, cy + 55, cx - 15, cy + 55, cx - 22, cy + 45);
    ctx.bezierCurveTo(cx - 32, cy + 20, cx - 25, cy - 10, cx, cy - 35);
    ctx.closePath();
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Streak number
    const streakNum = streak.current || 0;
    ctx.font = `bold ${streakNum >= 100 ? 140 : 180}px Unbounded, sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,107,53,0.5)';
    ctx.shadowBlur = 30;
    ctx.fillText(String(streakNum), cx, S * 0.58);
    ctx.shadowBlur = 0;

    // "DAY STREAK" label
    ctx.font = 'bold 36px JetBrains Mono, monospace';
    ctx.fillStyle = '#FF6B35';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(streakNum === 1 ? 'DAY STREAK' : 'DAY STREAK', cx, S * 0.68);

    // Stats line
    ctx.font = '20px JetBrains Mono, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(`${shippedTasks.length} shipped today  \u00B7  best ever: ${streak.best_ever}`, cx, S * 0.76);

    // Date
    const dateStr = new Date().toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
    ctx.font = '18px JetBrains Mono, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillText(dateStr, cx, S * 0.82);

    // Footer
    ctx.font = '16px JetBrains Mono, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillText('zenith \u2014 ship daily, build streaks', cx, S - 50);

    // Border
    ctx.strokeStyle = 'rgba(255,107,53,0.1)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, S - 2, S - 2);
  };

  const handleSaveAndDownload = async () => {
    setSaving(true);
    await onSave();
    setSaved(true);
    setSaving(false);
  };

  const handleDownload = (type) => {
    const canvas = type === 'streak' ? streakCanvasRef.current : canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    const prefix = type === 'streak' ? 'zenith-streak' : 'zenith';
    link.download = `${prefix}-${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-[#0A0A0A] border-white/10" data-testid="replay-modal">
        <DialogHeader>
          <DialogTitle className="font-[Unbounded] tracking-wider text-white">Save the Day</DialogTitle>
          <DialogDescription className="text-white/40 text-xs tracking-wider">
            Download your daily poster or share your streak card on social media.
          </DialogDescription>
        </DialogHeader>

        {/* Tab toggle */}
        <div className="flex gap-1 border border-white/10 w-fit" data-testid="poster-tabs">
          <button
            onClick={() => setActiveTab('day')}
            className={`px-4 py-1.5 text-xs font-bold tracking-wider uppercase transition-all ${activeTab === 'day' ? 'bg-[#00FFCC] text-black' : 'text-white/40 hover:text-white/60'}`}
            data-testid="tab-day-poster"
          >
            Day Poster
          </button>
          <button
            onClick={() => setActiveTab('streak')}
            className={`px-4 py-1.5 text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 ${activeTab === 'streak' ? 'bg-[#FF6B35] text-white' : 'text-white/40 hover:text-white/60'}`}
            data-testid="tab-streak-card"
          >
            <Flame className="w-3 h-3" /> Streak Card
          </button>
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            className={`zenith-poster-preview w-full h-auto rounded ${activeTab !== 'day' ? 'hidden' : ''}`}
            data-testid="poster-canvas"
          />
          <canvas
            ref={streakCanvasRef}
            className={`zenith-poster-preview w-full h-auto rounded ${activeTab !== 'streak' ? 'hidden' : ''}`}
            style={{ maxHeight: '480px', objectFit: 'contain' }}
            data-testid="streak-canvas"
          />
        </div>

        <div className="flex gap-3 justify-end">
          {!saved && (
            <Button
              onClick={handleSaveAndDownload}
              disabled={saving}
              className="bg-[#00FFCC] text-black hover:bg-[#33FFD6] font-bold text-xs tracking-wider"
              data-testid="save-replay-btn"
            >
              {saving ? 'Saving...' : 'Save to History'}
            </Button>
          )}
          {activeTab === 'day' && (
            <Button
              onClick={() => handleDownload('day')}
              variant="outline"
              className="border-[#FF00AA]/50 text-[#FF00AA] hover:bg-[#FF00AA]/10 font-bold text-xs tracking-wider"
              data-testid="download-poster-btn"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download PNG
            </Button>
          )}
          {activeTab === 'streak' && (
            <Button
              onClick={() => handleDownload('streak')}
              variant="outline"
              className="border-[#FF6B35]/50 text-[#FF6B35] hover:bg-[#FF6B35]/10 font-bold text-xs tracking-wider"
              data-testid="download-streak-btn"
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5" />
              Share Streak Card
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
