import React, { useState, useEffect } from 'react';
import { Clock, Battery, Rocket, Download } from 'lucide-react';

function getTimeToMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight - now;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function HUD({ session, view, setView, jarFill, fuelUsed, maxVolume, shippedCount, onSaveDay }) {
  const [timer, setTimer] = useState(getTimeToMidnight());

  useEffect(() => {
    const interval = setInterval(() => setTimer(getTimeToMidnight()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fuelRemaining = Math.max(maxVolume - fuelUsed, 0);
  const fuelPercent = (fuelRemaining / maxVolume) * 100;
  const fuelColor = fuelPercent > 60 ? '#00FFCC' : fuelPercent > 30 ? '#FFD700' : '#FF3B30';

  return (
    <div className="zenith-hud" data-testid="hud-bar">
      {/* Brand */}
      <div className="zenith-hud-brand" data-testid="hud-brand">ZENITH</div>

      {/* Stats */}
      <div className="zenith-hud-stats">
        <div className="zenith-hud-stat" data-testid="shipped-count">
          <Rocket className="w-3 h-3" />
          <span className="zenith-hud-stat-value">{shippedCount}</span>
          <span>shipped</span>
        </div>

        <div className="zenith-hud-stat" data-testid="timer-display">
          <Clock className="w-3 h-3" />
          <span className={`zenith-hud-stat-value ${timer.startsWith('00') ? 'danger' : ''}`}>
            {timer}
          </span>
          <span>to reset</span>
        </div>

        <div className="zenith-hud-stat" data-testid="fuel-meter">
          <Battery className="w-3 h-3" />
          <div className="zenith-fuel-bar">
            <div
              className="zenith-fuel-fill"
              style={{ width: `${fuelPercent}%`, backgroundColor: fuelColor }}
            />
          </div>
          <span className="zenith-hud-stat-value" style={{ color: fuelColor }}>
            {Math.round(fuelPercent)}%
          </span>
        </div>

        <div className="zenith-hud-stat" data-testid="score-display">
          <span className="text-[#00FFCC] font-bold">{session?.score_you || 0}</span>
          <span className="text-white/20">vs</span>
          <span className="text-[#FF00AA] font-bold">{session?.score_teammate || 0}</span>
        </div>
      </div>

      {/* View Toggle */}
      <div className="zenith-view-toggle" data-testid="view-toggle">
        {['planner', 'split', 'arena'].map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`zenith-view-btn ${view === v ? 'active' : ''}`}
            data-testid={`view-toggle-${v}`}
          >
            {v === 'planner' ? 'JAR' : v.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Save */}
      <button
        onClick={onSaveDay}
        className="zenith-save-btn flex items-center gap-1.5"
        data-testid="save-day-btn"
      >
        <Download className="w-3 h-3" />
        Save the Day
      </button>
    </div>
  );
}
