/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { 
  Plus, 
  Check, 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Trash2, 
  ChevronRight,
  Settings,
  Heart,
  User,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

// --- Types ---

type EventStatus = 'backlog' | 'approved' | 'discarded' | 'fixed';
type EnergyLevel = 'High' | 'Low';

interface SyncEvent {
  id: string;
  name: string;
  location: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  status: EventStatus;
  energyLevel: EnergyLevel;
  isSolo: boolean;
  approvedBy: string[]; // Track which users approved
  createdAt: number;
}

interface AppState {
  events: SyncEvent[];
  dayStartTime: string; // HH:mm
  dayEndTime: string;   // HH:mm
  energyMode: 'Busy' | 'Light';
  currentUser: 'L' | 'I';
}

// --- Utils ---

const STORAGE_KEY = 'syncstep_data_v3';

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const getDuration = (start: string, end: string) => {
  return timeToMinutes(end) - timeToMinutes(start);
};

// --- Components ---

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`glass overflow-hidden ${className}`}>
    {children}
  </div>
);

interface SwipeCardProps {
  event: SyncEvent;
  onSwipe: (direction: 'left' | 'right') => void;
  isTop: boolean;
}

const SwipeCard: React.FC<SwipeCardProps> = ({ 
  event, 
  onSwipe, 
  isTop 
}) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  
  // Dynamic background color based on swipe direction
  const backgroundColor = useTransform(
    x,
    [-150, 0, 150],
    ['#FED7D7', '#FFFFFF', '#C6F6D5']
  );

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 100) onSwipe('right');
    else if (info.offset.x < -100) onSwipe('left');
  };

  return (
    <motion.div
      style={{ x, rotate, opacity, zIndex: isTop ? 10 : 0 }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
    >
      <motion.div 
        style={{ backgroundColor }}
        className="glass h-full flex flex-col p-8 justify-between relative group shadow-xl"
      >
        <div>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center border border-orange-200">
              <Calendar className="text-orange-500 w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">Backlog Item</span>
              <div className="flex gap-1 mt-1">
                <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase ${event.energyLevel === 'High' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {event.energyLevel} Energy
                </span>
                {event.isSolo && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-600 font-black uppercase">
                    Solo
                  </span>
                )}
              </div>
            </div>
          </div>
          <h3 className="text-3xl font-bold text-slate-800 mb-2 leading-tight">{event.name}</h3>
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <MapPin size={14} />
            <span>{event.location || 'No location'}</span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-3">
              <Clock className="text-slate-400" size={18} />
              <span className="text-slate-700 font-medium">{event.startTime} - {event.endTime}</span>
            </div>
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
              {getDuration(event.startTime, event.endTime)} mins
            </span>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={() => onSwipe('left')}
              className="flex-1 h-16 rounded-2xl border border-slate-200 flex items-center justify-center hover:bg-rose-50 transition-colors group/btn"
            >
              <X className="text-slate-400 group-hover/btn:text-rose-500 transition-colors" />
            </button>
            <button 
              onClick={() => onSwipe('right')}
              className="flex-1 h-16 rounded-2xl bg-slate-800 text-white flex items-center justify-center hover:bg-emerald-500 transition-colors shadow-lg shadow-slate-200"
            >
              <Check />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const MatchOverlay = ({ show, onComplete }: { show: boolean; onComplete: () => void }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onAnimationComplete={() => {
            if (show) {
              setTimeout(onComplete, 3000);
            }
          }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-white/40 backdrop-blur-xl"
        >
          <motion.div
            initial={{ scale: 0.5, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200 }}
            className="text-center"
          >
            <div className="w-32 h-32 bg-coral rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-coral/40">
              <Sparkles className="text-white w-16 h-16" />
            </div>
            <h2 className="text-5xl font-black text-slate-800 mb-2 italic tracking-tighter">It's a Date!</h2>
            <p className="text-slate-500 font-medium">Both of you approved this item</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {
      events: [],
      dayStartTime: '08:00',
      dayEndTime: '20:00',
      energyMode: 'Busy',
      currentUser: 'L'
    };
  });

  const [view, setView] = useState<'backlog' | 'swipe' | 'schedule'>('schedule');
  const [showForm, setShowForm] = useState(false);
  const [showMatch, setShowMatch] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const addEvent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newEvent: SyncEvent = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.get('name') as string,
      location: formData.get('location') as string,
      startTime: formData.get('startTime') as string,
      endTime: formData.get('endTime') as string,
      status: (formData.get('isPriority') === 'on' ? 'fixed' : 'backlog') as EventStatus,
      energyLevel: (formData.get('energyLevel') || 'Low') as EnergyLevel,
      isSolo: formData.get('isSolo') === 'on',
      approvedBy: [],
      createdAt: Date.now()
    };
    setState(prev => ({ ...prev, events: [...prev.events, newEvent] }));
    setShowForm(false);
    setIsAdding(false);
  };

  const handleSwipe = (id: string, direction: 'left' | 'right') => {
    if (direction === 'left') {
      setState(prev => ({
        ...prev,
        events: prev.events.map(e => e.id === id ? { ...e, status: 'discarded' } : e)
      }));
    } else {
      setState(prev => {
        const event = prev.events.find(e => e.id === id);
        if (!event) return prev;

        const alreadyApprovedByOther = event.approvedBy.length > 0 && !event.approvedBy.includes(prev.currentUser);
        const newApprovedBy = Array.from(new Set([...event.approvedBy, prev.currentUser]));
        
        if (alreadyApprovedByOther) {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FF8E8E', '#FFCF71', '#C6F6D5', '#71C9FF']
          });
          setShowMatch(true);
        }

        return {
          ...prev,
          events: prev.events.map(e => e.id === id ? { 
            ...e, 
            status: newApprovedBy.length >= 2 ? 'approved' : 'backlog',
            approvedBy: newApprovedBy
          } : e)
        };
      });
    }
  };

  const deleteEvent = (id: string) => {
    setState(prev => ({
      ...prev,
      events: prev.events.filter(e => e.id !== id)
    }));
  };

  const generateSchedule = () => {
    const totalMinutes = timeToMinutes(state.dayEndTime) - timeToMinutes(state.dayStartTime);
    const targetSharedMinutes = totalMinutes * (state.energyMode === 'Busy' ? 0.8 : 0.4);
    const targetSoloMinutes = state.energyMode === 'Light' ? totalMinutes * 0.4 : 0;

    // 1. Get fixed events
    const fixedEvents = state.events.filter(e => e.status === 'fixed');
    
    // 2. Get candidates from backlog
    const backlog = state.events.filter(e => e.status === 'backlog');
    
    let currentSharedMinutes = fixedEvents.reduce((acc, e) => acc + getDuration(e.startTime, e.endTime), 0);
    let currentSoloMinutes = 0;

    // Sort backlog based on energy level
    const sharedCandidates = backlog.filter(e => !e.isSolo)
      .sort((a, b) => {
        if (state.energyMode === 'Busy') {
          // Prioritize High Energy for Busy mode
          if (a.energyLevel === 'High' && b.energyLevel === 'Low') return -1;
          if (a.energyLevel === 'Low' && b.energyLevel === 'High') return 1;
        } else {
          // Only Low Energy for Light mode shared tasks
          if (a.energyLevel === 'High') return 1;
          if (b.energyLevel === 'High') return -1;
        }
        return 0;
      });

    const soloCandidates = backlog.filter(e => e.isSolo);

    const newEvents = state.events.map(e => {
      if (e.status === 'approved') return { ...e, status: 'backlog' as EventStatus, approvedBy: [] };
      return e;
    });

    // Helper to find gaps
    const getGaps = (events: SyncEvent[]) => {
      const sorted = [...events].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
      const gaps: { start: number; end: number }[] = [];
      let lastEnd = timeToMinutes(state.dayStartTime);

      for (const e of sorted) {
        const start = timeToMinutes(e.startTime);
        if (start > lastEnd) {
          gaps.push({ start: lastEnd, end: start });
        }
        lastEnd = Math.max(lastEnd, timeToMinutes(e.endTime));
      }

      const dayEnd = timeToMinutes(state.dayEndTime);
      if (dayEnd > lastEnd) {
        gaps.push({ start: lastEnd, end: dayEnd });
      }
      return gaps;
    };

    let currentEvents = [...fixedEvents];
    
    // Fill shared
    for (const item of sharedCandidates) {
      if (state.energyMode === 'Light' && item.energyLevel === 'High') continue;
      if (currentSharedMinutes >= targetSharedMinutes) break;

      const duration = getDuration(item.startTime, item.endTime);
      const gaps = getGaps(currentEvents);
      const gap = gaps.find(g => (g.end - g.start) >= duration);

      if (gap) {
        const updatedItem = {
          ...item,
          status: 'approved' as EventStatus,
          startTime: minutesToTime(gap.start),
          endTime: minutesToTime(gap.start + duration),
          approvedBy: ['L', 'I'] // Auto-approved by both for sync
        };
        currentEvents.push(updatedItem);
        currentSharedMinutes += duration;
        
        const idx = newEvents.findIndex(e => e.id === item.id);
        newEvents[idx] = updatedItem;
      }
    }

    // Fill solo (only in Light mode)
    if (state.energyMode === 'Light') {
      for (const item of soloCandidates) {
        if (currentSoloMinutes >= targetSoloMinutes) break;

        const duration = getDuration(item.startTime, item.endTime);
        const gaps = getGaps(currentEvents);
        const gap = gaps.find(g => (g.end - g.start) >= duration);

        if (gap) {
          const updatedItem = {
            ...item,
            status: 'approved' as EventStatus,
            startTime: minutesToTime(gap.start),
            endTime: minutesToTime(gap.start + duration),
            approvedBy: [state.currentUser] // Solo is approved by current user
          };
          currentEvents.push(updatedItem);
          currentSoloMinutes += duration;

          const idx = newEvents.findIndex(e => e.id === item.id);
          newEvents[idx] = updatedItem;
        }
      }
    }

    setState(prev => ({ ...prev, events: newEvents }));
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FF8E8E', '#FFCF71']
    });
  };

  const backlogEvents = state.events.filter(e => e.status === 'backlog' && !e.approvedBy.includes(state.currentUser));
  
  // --- Scheduler Logic ---
  const scheduledEvents = useMemo(() => {
    const fixed = state.events
      .filter(e => e.status === 'fixed')
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    
    const approved = state.events
      .filter(e => e.status === 'approved')
      .sort((a, b) => a.createdAt - b.createdAt);

    let currentTime = timeToMinutes(state.dayStartTime);
    const finalSchedule: (SyncEvent & { actualStart?: string; actualEnd?: string })[] = [];
    
    const sortedFixed = [...fixed];
    const pendingApproved = [...approved];

    while (pendingApproved.length > 0 || sortedFixed.length > 0) {
      const nextFixed = sortedFixed[0];
      
      if (nextFixed && timeToMinutes(nextFixed.startTime) <= currentTime) {
        finalSchedule.push({
          ...nextFixed,
          actualStart: nextFixed.startTime,
          actualEnd: nextFixed.endTime
        });
        currentTime = Math.max(currentTime, timeToMinutes(nextFixed.endTime));
        sortedFixed.shift();
      } else if (pendingApproved.length > 0) {
        const item = pendingApproved[0];
        const duration = getDuration(item.startTime, item.endTime);
        
        if (!nextFixed || currentTime + duration <= timeToMinutes(nextFixed.startTime)) {
          finalSchedule.push({
            ...item,
            actualStart: minutesToTime(currentTime),
            actualEnd: minutesToTime(currentTime + duration)
          });
          currentTime += duration;
          pendingApproved.shift();
        } else {
          currentTime = timeToMinutes(nextFixed.startTime);
        }
      } else if (nextFixed) {
        currentTime = timeToMinutes(nextFixed.startTime);
      } else {
        break;
      }
    }

    return finalSchedule;
  }, [state.events, state.dayStartTime]);

  return (
    <div className="min-h-screen font-sans selection:bg-coral/30">
      <MatchOverlay show={showMatch} onComplete={() => setShowMatch(false)} />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-6 flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2.5">
          <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-coral/10 border border-white">
            <Heart className="text-coral w-5 h-5 fill-coral" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter text-slate-800 italic">SyncStep</h1>
            <div className="flex gap-1 mt-0.5">
              <div 
                onClick={() => setState(p => ({ ...p, currentUser: 'L' }))}
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all ${state.currentUser === 'L' ? 'bg-coral text-white scale-110 shadow-lg shadow-coral/30' : 'bg-slate-200 text-slate-400'}`}
              >
                L
                {isAdding && state.currentUser === 'L' && (
                  <div className="absolute inset-0 rounded-full border-2 border-coral animate-ping" />
                )}
              </div>
              <div 
                onClick={() => setState(p => ({ ...p, currentUser: 'I' }))}
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all ${state.currentUser === 'I' ? 'bg-sky text-white scale-110 shadow-lg shadow-sky/30' : 'bg-slate-200 text-slate-400'}`}
              >
                I
                {isAdding && state.currentUser === 'I' && (
                  <div className="absolute inset-0 rounded-full border-2 border-sky animate-ping" />
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 pointer-events-auto">
          <button 
            onClick={() => setView(view === 'schedule' ? 'backlog' : 'schedule')}
            className="w-12 h-12 rounded-2xl bg-white border border-white flex items-center justify-center shadow-lg shadow-coral/10 hover:scale-105 transition-all"
          >
            {view === 'schedule' ? <Calendar size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-36 pb-32 px-6 max-w-lg mx-auto min-h-screen flex flex-col">
        
        {view === 'schedule' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Daily Flow</p>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tighter italic">The Schedule</h2>
                </div>
                <button 
                  onClick={() => setView('swipe')}
                  className="px-4 py-2 rounded-xl bg-white border border-white text-slate-600 text-[10px] font-bold hover:shadow-lg transition-all shadow-md shadow-coral/5"
                >
                  Swipe ({backlogEvents.length})
                </button>
              </div>

              {/* Energy Toggle */}
              <div className="flex gap-1.5 p-1 bg-white/50 backdrop-blur-sm rounded-xl border border-white/40 shadow-sm">
                <button 
                  onClick={() => setState(prev => ({ ...prev, energyMode: 'Busy' }))}
                  className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${state.energyMode === 'Busy' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  High Energy
                </button>
                <button 
                  onClick={() => setState(prev => ({ ...prev, energyMode: 'Light' }))}
                  className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${state.energyMode === 'Light' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Low Energy
                </button>
              </div>

              {/* Frictionless Sync Button */}
              <button 
                onClick={generateSchedule}
                className="w-full py-3 rounded-xl bg-white border border-white text-coral text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-coral/5"
              >
                <Sparkles size={16} />
                Frictionless Sync
              </button>
            </div>

            <div className="space-y-6 relative">
              {scheduledEvents.length === 0 && (
                <div className="py-20 text-center">
                  <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-coral/5">
                    <Sparkles className="text-coral/20 w-10 h-10" />
                  </div>
                  <p className="text-slate-300 font-medium italic">Your day is a blank canvas.</p>
                </div>
              )}

              {scheduledEvents.map((event, idx) => (
                <motion.div 
                  key={event.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <GlassCard className={`p-6 ${
                    event.status === 'fixed' ? 'border-coral/20 bg-coral/5' : 
                    state.energyMode === 'Light' && event.isSolo ? 'border-sky/40 border-2 bg-white' :
                    state.energyMode === 'Light' && event.energyLevel === 'Low' ? 'bg-white/40 border-white/20' :
                    'bg-white'
                  }`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <Clock size={12} className="text-slate-300" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{event.actualStart} — {event.actualEnd}</span>
                      </div>
                      <div className="flex gap-1">
                        {event.isSolo && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-sky text-white font-black uppercase tracking-tighter">Solo</span>
                        )}
                        {event.energyLevel === 'Low' && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 font-black uppercase tracking-tighter">Low Energy</span>
                        )}
                        {event.status === 'fixed' && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-coral text-white font-black uppercase tracking-tighter">Priority</span>
                        )}
                      </div>
                    </div>
                    <h4 className="text-xl font-bold text-slate-800 tracking-tight">{event.name}</h4>
                    <div className="flex items-center gap-2 mt-3 text-slate-400 text-xs font-medium">
                      <MapPin size={12} />
                      <span>{event.location}</span>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {view === 'backlog' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-end">
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Shared Pool</p>
                <h2 className="text-4xl font-black text-slate-800 tracking-tighter italic">Backlog</h2>
              </div>
            </div>

            <div className="grid gap-4">
              {state.events.filter(e => e.status !== 'discarded').map(event => (
                <div key={event.id} className="group relative">
                  <GlassCard className={`p-5 flex items-center justify-between transition-all ${event.status === 'approved' ? 'border-emerald-200 bg-emerald-50/50' : ''}`}>
                    <div>
                      <h4 className="font-bold text-slate-800">{event.name}</h4>
                      <div className="flex gap-2 mt-1 items-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{event.startTime} - {event.endTime}</p>
                        <div className="flex gap-1">
                          <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase ${event.energyLevel === 'High' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {event.energyLevel}
                          </span>
                          {event.isSolo && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-600 font-black uppercase">
                              Solo
                            </span>
                          )}
                        </div>
                        <div className="flex gap-0.5">
                          {event.approvedBy.map(u => (
                            <div key={u} className={`w-3 h-3 rounded-full ${u === 'L' ? 'bg-coral' : 'bg-sky'}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteEvent(event.id)}
                      className="p-2 text-slate-200 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </GlassCard>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {view === 'swipe' && (
          <div className="flex-1 flex flex-col">
            <div className="mb-8">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Decision Time</p>
              <h2 className="text-4xl font-black text-slate-800 tracking-tighter italic">Swipe Items</h2>
            </div>
            
            <div className="relative flex-1 min-h-[450px]">
              <AnimatePresence>
                {backlogEvents.length > 0 ? (
                  backlogEvents.slice(0, 2).reverse().map((event, idx) => (
                    <SwipeCard 
                      key={event.id}
                      event={event}
                      isTop={idx === (backlogEvents.length > 1 ? 1 : 0)}
                      onSwipe={(dir) => handleSwipe(event.id, dir)}
                    />
                  ))
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center text-center"
                  >
                    <div className="w-24 h-24 rounded-[2.5rem] bg-white flex items-center justify-center mb-6 shadow-xl shadow-coral/5">
                      <Check className="text-coral/20 w-12 h-12" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tighter italic">All Caught Up!</h3>
                    <p className="text-slate-400 font-medium mt-2">Check the schedule to see your day.</p>
                    <button 
                      onClick={() => setView('schedule')}
                      className="mt-8 px-8 py-4 rounded-2xl bg-slate-800 text-white font-bold text-sm shadow-xl shadow-slate-200 hover:scale-105 transition-all"
                    >
                      View Schedule
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

      </main>

      {/* FAB */}
      <button 
        onClick={() => {
          setShowForm(true);
          setIsAdding(true);
        }}
        className="fixed bottom-32 right-6 w-16 h-16 rounded-[2rem] fab-gradient text-white flex items-center justify-center shadow-2xl shadow-coral/40 hover:scale-110 active:scale-95 transition-all z-50"
      >
        <Plus size={32} strokeWidth={3} />
      </button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-6 pt-2 bg-gradient-to-t from-brand-bg-via to-transparent">
        <div className="glass flex items-center p-1.5 gap-1.5 bg-white/70 backdrop-blur-lg shadow-2xl shadow-coral/10 max-w-xs mx-auto">
          <button 
            onClick={() => setView('schedule')}
            className={`flex-1 py-3 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all ${view === 'schedule' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Day
          </button>
          <button 
            onClick={() => setView('backlog')}
            className={`flex-1 py-3 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all ${view === 'backlog' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Pool
          </button>
          <button 
            onClick={() => setView('swipe')}
            className={`flex-1 py-3 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all ${view === 'swipe' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Swipe
          </button>
        </div>
      </nav>

      {/* Add Event Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowForm(false);
                setIsAdding(false);
              }}
              className="absolute inset-0 bg-white/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md"
            >
              <GlassCard className="p-6 bg-white shadow-2xl shadow-coral/20 rounded-[2.5rem]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-slate-800 tracking-tighter italic">New Sync Item</h3>
                  <button onClick={() => {
                    setShowForm(false);
                    setIsAdding(false);
                  }} className="text-slate-300 hover:text-slate-800">
                    <X size={24} />
                  </button>
                </div>
                
                <form onSubmit={addEvent} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Event Name</label>
                    <input 
                      required
                      name="name"
                      placeholder="e.g. Dinner Date"
                      className="w-full bg-slate-50 border-none rounded-xl px-4 h-12 text-slate-800 font-bold placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-coral/20 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Location</label>
                    <input 
                      name="location"
                      placeholder="e.g. The Rooftop"
                      className="w-full bg-slate-50 border-none rounded-xl px-4 h-12 text-slate-800 font-bold placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-coral/20 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Start</label>
                      <input 
                        required
                        type="time"
                        name="startTime"
                        defaultValue="18:00"
                        className="w-full bg-slate-50 border-none rounded-xl px-4 h-12 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-coral/20 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">End</label>
                      <input 
                        required
                        type="time"
                        name="endTime"
                        defaultValue="19:30"
                        className="w-full bg-slate-50 border-none rounded-xl px-4 h-12 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-coral/20 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Energy Level</label>
                      <select 
                        name="energyLevel"
                        className="w-full bg-slate-50 border-none rounded-xl px-4 h-12 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-coral/20 transition-all appearance-none"
                      >
                        <option value="High">High</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Type</label>
                      <div className="flex items-center gap-2 h-12 bg-slate-50 rounded-xl px-4">
                        <input 
                          type="checkbox" 
                          name="isSolo" 
                          id="isSolo"
                          className="w-5 h-5 rounded-md border-slate-200 bg-white text-sky focus:ring-0"
                        />
                        <label htmlFor="isSolo" className="text-[10px] font-bold text-slate-500 select-none">Solo Task</label>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <input 
                      type="checkbox" 
                      name="isPriority" 
                      id="isPriority"
                      className="w-5 h-5 rounded-md border-slate-200 bg-white text-coral focus:ring-0"
                    />
                    <label htmlFor="isPriority" className="text-[10px] font-bold text-slate-500 select-none">Mark as Priority</label>
                  </div>

                  <button 
                    type="submit"
                    className="w-full h-14 fab-gradient text-white rounded-2xl font-black text-base hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-coral/30"
                  >
                    Add to Backlog
                  </button>
                </form>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Settings */}
      <div className="fixed top-8 right-8 pointer-events-none">
        <div className="pointer-events-auto group relative">
          <button className="w-12 h-12 rounded-2xl bg-white border border-white flex items-center justify-center shadow-lg shadow-coral/10 hover:scale-105 transition-all">
            <Settings size={20} className="text-slate-400 group-hover:text-slate-800" />
          </button>
          <div className="absolute top-full right-0 mt-3 w-56 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
            <GlassCard className="p-6 bg-white shadow-2xl">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Day Start Time</label>
              <input 
                type="time" 
                value={state.dayStartTime}
                onChange={(e) => setState(prev => ({ ...prev, dayStartTime: e.target.value }))}
                className="w-full bg-transparent border-none text-slate-800 font-bold focus:ring-0 p-0 mt-2 text-xl"
              />
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-4 block">Day End Time</label>
              <input 
                type="time" 
                value={state.dayEndTime}
                onChange={(e) => setState(prev => ({ ...prev, dayEndTime: e.target.value }))}
                className="w-full bg-transparent border-none text-slate-800 font-bold focus:ring-0 p-0 mt-2 text-xl"
              />
              <div className="mt-6 pt-6 border-t border-slate-100">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Switch User</label>
                <div className="flex gap-2 mt-3">
                  <button 
                    onClick={() => setState(p => ({ ...p, currentUser: 'L' }))}
                    className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all ${state.currentUser === 'L' ? 'bg-coral text-white' : 'bg-slate-100 text-slate-400'}`}
                  >
                    Lilly
                  </button>
                  <button 
                    onClick={() => setState(p => ({ ...p, currentUser: 'I' }))}
                    className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all ${state.currentUser === 'I' ? 'bg-sky text-white' : 'bg-slate-100 text-slate-400'}`}
                  >
                    Ian
                  </button>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
