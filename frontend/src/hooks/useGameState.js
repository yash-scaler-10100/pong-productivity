import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function useGameState() {
  const [tasks, setTasks] = useState([]);
  const [session, setSession] = useState(null);
  const [streak, setStreak] = useState({ current: 0, today_ships: 0, today_qualifies: false, ships_needed: 3, streak_at_risk: 0, best_ever: 0, threshold: 3 });
  const [view, setView] = useState('split');
  const [loading, setLoading] = useState(true);
  const [shipEvent, setShipEvent] = useState(null);

  const fetchStreak = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/streak`);
      setStreak(res.data);
    } catch (err) {
      console.error('Streak fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksRes, sessionRes, streakRes] = await Promise.all([
          axios.get(`${API}/tasks`),
          axios.get(`${API}/session`),
          axios.get(`${API}/streak`)
        ]);
        setTasks(tasksRes.data);
        setSession(sessionRes.data);
        setStreak(streakRes.data);
      } catch (err) {
        console.error('Init fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const addTask = useCallback(async (title, taskType) => {
    try {
      const res = await axios.post(`${API}/tasks`, { title, task_type: taskType });
      setTasks(prev => [...prev, res.data]);
      return { success: true, task: res.data };
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to add task';
      toast.error(msg);
      return { success: false, error: msg };
    }
  }, []);

  const deleteTask = useCallback(async (taskId) => {
    try {
      await axios.delete(`${API}/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      toast.error('Failed to delete task');
    }
  }, []);

  const shipTask = useCallback(async (taskId, description = '') => {
    try {
      const res = await axios.post(`${API}/tasks/${taskId}/ship`, { description });
      setTasks(prev => prev.map(t => t.id === taskId ? res.data : t));
      const [sessionRes, streakRes] = await Promise.all([
        axios.get(`${API}/session`),
        axios.get(`${API}/streak`)
      ]);
      setSession(sessionRes.data);
      setStreak(streakRes.data);
      setShipEvent({ taskId, timestamp: Date.now() });
      toast.success('SHIPPED!', {
        description: res.data.title,
        style: { borderColor: '#FF00AA' }
      });
      return { success: true };
    } catch (err) {
      toast.error('Failed to ship task');
      return { success: false };
    }
  }, []);

  const saveDay = useCallback(async () => {
    try {
      const res = await axios.post(`${API}/session/save-day`);
      toast.success('Day saved! Download your poster.');
      return res.data;
    } catch (err) {
      toast.error('Failed to save day');
      return null;
    }
  }, []);

  const activeTasks = tasks.filter(t => !t.shipped);
  const shippedTasks = tasks.filter(t => t.shipped);
  const jarFill = activeTasks.reduce((sum, t) => sum + (t.volume || 0), 0);
  const fuelUsed = shippedTasks.reduce((sum, t) => sum + (t.volume || 0), 0);
  const maxVolume = 100;

  return {
    tasks, activeTasks, shippedTasks,
    session, streak, view, setView, loading,
    addTask, deleteTask, shipTask, saveDay,
    shipEvent, jarFill, fuelUsed, maxVolume,
  };
}
