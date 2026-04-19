import React, { useState } from 'react';
import { useGameState } from '@/hooks/useGameState';
import JarCanvas from '@/components/JarCanvas';
import PongCanvas from '@/components/PongCanvas';
import TaskPanel from '@/components/TaskPanel';
import HUD from '@/components/HUD';
import ReplayModal from '@/components/ReplayModal';

export default function ZenithApp() {
  const state = useGameState();
  const [showReplay, setShowReplay] = useState(false);

  if (state.loading) {
    return (
      <div className="zenith-loading" data-testid="loading-screen">
        <div className="zenith-loading-logo">ZENITH</div>
        <div className="zenith-loading-tagline">The Weight of Today. The Rush of Now.</div>
      </div>
    );
  }

  return (
    <div className="zenith-root" data-testid="zenith-app">
      <HUD
        session={state.session}
        view={state.view}
        setView={state.setView}
        jarFill={state.jarFill}
        fuelUsed={state.fuelUsed}
        maxVolume={state.maxVolume}
        shippedCount={state.shippedTasks.length}
        streak={state.streak}
        onSaveDay={() => setShowReplay(true)}
      />

      <div className="zenith-arena" data-testid="zenith-arena">
        <div className={`zenith-jar-section ${state.view === 'arena' ? 'hidden-section' : ''}`}>
          <div className="zenith-jar-canvas-wrap">
            <JarCanvas
              tasks={state.activeTasks}
              jarFill={state.jarFill}
              maxVolume={state.maxVolume}
            />
          </div>
          <TaskPanel
            activeTasks={state.activeTasks}
            shippedTasks={state.shippedTasks}
            jarFill={state.jarFill}
            maxVolume={state.maxVolume}
            addTask={state.addTask}
            deleteTask={state.deleteTask}
            shipTask={state.shipTask}
          />
        </div>

        <div className={`zenith-pong-section ${state.view === 'planner' ? 'hidden-section' : ''}`}>
          <PongCanvas
            shipEvent={state.shipEvent}
            session={state.session}
          />
        </div>
      </div>

      {showReplay && (
        <ReplayModal
          session={state.session}
          shippedTasks={state.shippedTasks}
          allTasks={state.tasks}
          streak={state.streak}
          onClose={() => setShowReplay(false)}
          onSave={state.saveDay}
        />
      )}
    </div>
  );
}
