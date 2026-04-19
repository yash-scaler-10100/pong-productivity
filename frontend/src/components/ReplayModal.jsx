import React, { useRef, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

export default function ReplayModal({ session, shippedTasks, allTasks, onClose, onSave }) {
  const canvasRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    drawPoster();
  }, [session, shippedTasks]);

  const drawPoster = () => {
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

  const handleSaveAndDownload = async () => {
    setSaving(true);
    await onSave();
    setSaved(true);
    setSaving(false);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `zenith-${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-[#0A0A0A] border-white/10" data-testid="replay-modal">
        <DialogHeader>
          <DialogTitle className="font-[Unbounded] tracking-wider text-white">Save the Day</DialogTitle>
          <DialogDescription className="text-white/40 text-xs tracking-wider">
            Your daily replay poster. Download and share your productivity glory.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <canvas
            ref={canvasRef}
            className="zenith-poster-preview w-full h-auto rounded"
            data-testid="poster-canvas"
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
          <Button
            onClick={handleDownload}
            variant="outline"
            className="border-[#FF00AA]/50 text-[#FF00AA] hover:bg-[#FF00AA]/10 font-bold text-xs tracking-wider"
            data-testid="download-poster-btn"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Download PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
