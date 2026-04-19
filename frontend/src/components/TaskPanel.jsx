import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Rocket } from 'lucide-react';

const TYPE_META = {
  stone: { label: 'Stone', vol: 30, color: '#FF00AA' },
  pebble: { label: 'Pebble', vol: 15, color: '#00FFCC' },
  sand: { label: 'Sand', vol: 5, color: 'rgba(255,255,255,0.5)' },
};

export default function TaskPanel({ activeTasks, shippedTasks, jarFill, maxVolume, addTask, deleteTask, shipTask }) {
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState('pebble');
  const [adding, setAdding] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim() || adding) return;
    setAdding(true);
    const result = await addTask(title.trim(), taskType);
    if (result.success) setTitle('');
    setAdding(false);
  };

  const fillPercent = Math.min((jarFill / maxVolume) * 100, 100);
  const barColor = fillPercent > 80 ? '#FF3B30' : fillPercent > 60 ? '#FFD700' : '#00FFCC';

  return (
    <div className="zenith-task-panel" data-testid="task-panel">
      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-3" data-testid="add-task-form">
        <Select value={taskType} onValueChange={setTaskType} data-testid="task-type-select">
          <SelectTrigger className="w-[100px] h-8 text-xs bg-transparent border-white/10" data-testid="task-type-trigger">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stone" data-testid="type-stone">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FF00AA]" />Stone
              </span>
            </SelectItem>
            <SelectItem value="pebble" data-testid="type-pebble">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00FFCC]" />Pebble
              </span>
            </SelectItem>
            <SelectItem value="sand" data-testid="type-sand">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white/40" />Sand
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to happen today?"
          className="flex-1 h-8 text-xs bg-transparent border-white/10 placeholder:text-white/20"
          data-testid="task-input"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!title.trim() || adding}
          className="h-8 px-3 bg-[#00FFCC] text-black hover:bg-[#33FFD6] font-bold text-xs"
          data-testid="add-task-btn"
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </form>

      {/* Volume meter */}
      <div className="mb-3" data-testid="volume-meter">
        <div className="flex justify-between text-[10px] mb-1 tracking-wider uppercase">
          <span className="text-white/40">Jar Capacity</span>
          <span style={{ color: barColor }}>{jarFill}/{maxVolume}</span>
        </div>
        <div className="zenith-volume-bar">
          <div
            className="zenith-volume-fill"
            style={{ width: `${fillPercent}%`, backgroundColor: barColor }}
          />
        </div>
      </div>

      {/* Task list */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="zenith-task-list pr-2" data-testid="task-list">
          {activeTasks.length === 0 && (
            <div className="zenith-empty" data-testid="empty-tasks">
              <Rocket className="w-5 h-5 opacity-30" />
              <span>Add your first stone to the jar</span>
            </div>
          )}
          {activeTasks.map((task) => {
            const meta = TYPE_META[task.task_type] || TYPE_META.pebble;
            return (
              <div key={task.id} className="zenith-task-item animate-slide-up" data-testid={`task-item-${task.id}`}>
                <div className={`zenith-task-type-dot ${task.task_type}`} />
                <span className="flex-1 text-xs truncate text-white/80">{task.title}</span>
                <span className="text-[9px] text-white/25 tabular-nums">{task.volume}</span>
                <button
                  onClick={() => shipTask(task.id)}
                  className="zenith-ship-btn"
                  data-testid={`ship-btn-${task.id}`}
                >
                  SHIP IT!
                </button>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-white/20 hover:text-[#FF3B30] transition-colors"
                  data-testid={`delete-btn-${task.id}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {shippedTasks.length > 0 && (
            <div className="mt-4">
              <div className="text-[9px] text-white/30 tracking-widest uppercase mb-2">
                Shipped Today ({shippedTasks.length})
              </div>
              {shippedTasks.map((task) => (
                <div key={task.id} className="zenith-task-item zenith-task-shipped" data-testid={`shipped-${task.id}`}>
                  <div className={`zenith-task-type-dot ${task.task_type}`} />
                  <span className="flex-1 text-xs truncate">{task.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
