import React, { useState, useEffect } from 'react';
import { Clock, Battery, Rocket, Download, Flame } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

export default function HUD({ session, view, setView, jarFill, fuelUsed, maxVolume, shippedCount, streak, onSaveDay }) {
  const [timer, setTimer] = useState(getTimeToMidnight());

  useEffect(() => {
    const interval = setInterval(() => setTimer(getTimeToMidnight()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fuelRemaining = Math.max(maxVolume - fuelUsed, 0);
  const fuelPercent = (fuelRemaining / maxVolume) * 100;
  const fuelColor = fuelPercent > 60 ? '#00FFCC' : fuelPercent > 30 ? '#FFD700' : '#FF3B30';

  const streakActive = streak.current > 0;
  const streakAtRisk = !streak.today_qualifies && streak.streak_at_risk > 0;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="zenith-hud" data-testid="hud-bar">
        {/* Brand */}
        <div className="zenith-hud-brand" data-testid="hud-brand">ZENITH</div>

        {/* Stats */}
        <div className="zenith-hud-stats">
          {/* Streak */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`zenith-hud-stat zenith-streak-stat ${streakActive ? 'streak-active' : ''} ${streakAtRisk ? 'streak-at-risk' : ''}`} data-testid="streak-display">
                <Flame className={`w-3.5 h-3.5 ${streakActive ? 'zenith-fire-icon' : 'opacity-30'}`} />
                <span className={`zenith-hud-stat-value ${streakActive ? 'zenith-fire-text' : ''}`}>
                  {streak.current}
                </span>
                {streakAtRisk && (
                  <span className="zenith-streak-nudge" data-testid="streak-nudge">
                    ship {streak.ships_needed} more!
                  </span>
                )}
                {streakActive && !streakAtRisk && streak.ships_needed > 0 && (
                  <span className="zenith-streak-progress" data-testid="streak-progress">
                    {streak.today_ships}/{streak.threshold}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-[#1A1A1A] border-white/10 text-white text-xs">
              <div className="space-y-1">
                <p className="font-bold">
                  {streakActive
                    ? `${streak.current}-day shipping streak!`
                    : 'Ship 3+ tasks daily to build a streak'}
                </p>
                {streak.best_ever > 0 && (
                  <p className="text-white/50">Best ever: {streak.best_ever} {streak.best_ever === 1 ? 'day' : 'days'}</p>
                )}
                {streakAtRisk && (
                  <p className="text-[#FFD700]">
                    {streak.streak_at_risk}-day streak at risk! Ship {streak.ships_needed} more to keep it alive.
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>

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
    </TooltipProvider>
  );
}
