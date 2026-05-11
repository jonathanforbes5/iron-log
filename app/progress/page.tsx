'use client';

import { useState, useEffect, useRef } from 'react';
import { useLogs, useWeightLog, useProgressPhotos } from '@/lib/store';
import { todayISO, uid } from '@/lib/utils';
import { EXERCISES } from '@/lib/exercises';
import { getProgressData, calcE1RM, formatDate, formatDateShort, getPreviousBest, totalVolume, workingSetCount, formatDuration } from '@/lib/utils';
import { WorkoutLog, ProgressPhoto } from '@/lib/types';
import { savePhotoData, loadPhotoData, deletePhotoData, compressImage } from '@/lib/photoStorage';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Trophy, Dumbbell, History, BarChart3, Clock, ChevronDown, ChevronUp, Camera, Trash2, X, GitCompareArrows, Plus } from 'lucide-react';

const MAIN_LIFTS = ['squat', 'bench', 'deadlift', 'ohp'];

const MUSCLE_MEV: Record<string, { mev: number; mav: number; label: string }> = {
  chest:      { mev: 8,  mav: 16, label: 'Chest' },
  back:       { mev: 10, mav: 20, label: 'Back' },
  shoulders:  { mev: 8,  mav: 20, label: 'Shoulders' },
  biceps:     { mev: 6,  mav: 14, label: 'Biceps' },
  triceps:    { mev: 6,  mav: 14, label: 'Triceps' },
  quads:      { mev: 8,  mav: 16, label: 'Quads' },
  hamstrings: { mev: 6,  mav: 12, label: 'Hamstrings' },
  glutes:     { mev: 4,  mav: 12, label: 'Glutes' },
  core:       { mev: 0,  mav: 16, label: 'Core' },
};

export default function ProgressPage() {
  const logs = useLogs();
  const { weightLogs } = useWeightLog();
  const { progressPhotos } = useProgressPhotos();
  const [selectedExercise, setSelectedExercise] = useState('squat');
  const [view, setView] = useState<'charts' | 'history' | 'photos'>('charts');

  // Exercises that have been logged
  const loggedExerciseIds = Array.from(new Set(logs.flatMap(l => l.sets.map(s => s.exerciseId))));
  const availableExercises = EXERCISES.filter(e => loggedExerciseIds.includes(e.id));

  const progressData = getProgressData(logs, selectedExercise);
  const allTimePR = getPreviousBest(logs, selectedExercise);

  // Volume by week (last 8 weeks)
  const volumeByWeek = getWeeklyVolume(logs, 8);

  // Bodyweight data: dedicated weight logs + fallback from workout logs
  const bwMap = new Map<string, number>();
  logs.filter(l => l.bodyweight).forEach(l => bwMap.set(l.date, l.bodyweight!));
  weightLogs.forEach(l => bwMap.set(l.date, l.weight)); // dedicated logs take priority
  const bwData = Array.from(bwMap.entries())
    .map(([date, weight]) => ({ date, weight }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Weight trend
  const today = todayISO();
  const recentBw = bwData.filter(l => l.date <= today).slice(-7);
  const priorBw = bwData.filter(l => l.date < (recentBw[0]?.date ?? today)).slice(-7);
  let bwTrend: string | null = null;
  if (recentBw.length >= 3 && priorBw.length >= 3) {
    const avgR = recentBw.reduce((s, l) => s + l.weight, 0) / recentBw.length;
    const avgP = priorBw.reduce((s, l) => s + l.weight, 0) / priorBw.length;
    const diff = avgR - avgP;
    bwTrend = diff > 0.5 ? `↑ +${diff.toFixed(1)} lbs` : diff < -0.5 ? `↓ ${diff.toFixed(1)} lbs` : '→ stable';
  }

  // Weekly sets per muscle group
  const weekStart = new Date();
  const _dow = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (_dow === 0 ? 6 : _dow - 1)); // anchor Monday
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekSets = logs.flatMap(l => l.date >= weekStartStr ? l.sets.filter(s => !s.isWarmup) : []);
  const muscleSetMap: Record<string, number> = {};
  for (const set of weekSets) {
    const ex = EXERCISES.find(e => e.id === set.exerciseId);
    for (const mg of (ex?.muscleGroups ?? [])) {
      const key = mg.toLowerCase().replace(' ', '');
      muscleSetMap[key] = (muscleSetMap[key] ?? 0) + 1;
    }
  }

  if (logs.length === 0 && view !== 'photos') {
    return (
      <div className="px-4 pt-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tight">Progress</h1>
          <button onClick={() => setView('photos')} className="text-xs font-bold text-orange-400 border border-orange-500/30 px-3 py-1.5 rounded-xl">Photos</button>
        </div>
        <div className="text-center py-16 space-y-3">
          <TrendingUp size={40} className="mx-auto text-zinc-700" />
          <p className="text-zinc-500">Log some workouts to see your progress.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 space-y-5">
      {/* Header + tab switcher */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight">Progress</h1>
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-0.5 gap-0.5">
          <button onClick={() => setView('charts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${view === 'charts' ? 'bg-orange-500 text-white' : 'text-zinc-500'}`}>
            <BarChart3 size={12} /> Charts
          </button>
          <button onClick={() => setView('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${view === 'history' ? 'bg-orange-500 text-white' : 'text-zinc-500'}`}>
            <History size={12} /> History
          </button>
          <button onClick={() => setView('photos')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${view === 'photos' ? 'bg-orange-500 text-white' : 'text-zinc-500'}`}>
            <Camera size={12} /> Photos
          </button>
        </div>
      </div>

      {/* Photos view */}
      {view === 'photos' && (
        <PhotosView photos={progressPhotos} />
      )}

      {/* History view */}
      {view === 'history' && (
        <HistoryList logs={logs} />
      )}

      {view === 'charts' && <>

      {/* PRs for main lifts */}
      <div>
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">All-Time PRs</h2>
        <div className="grid grid-cols-2 gap-3">
          {MAIN_LIFTS.map(id => {
            const pr = getPreviousBest(logs, id);
            const ex = EXERCISES.find(e => e.id === id);
            return (
              <button
                key={id}
                onClick={() => setSelectedExercise(id)}
                className={`bg-zinc-900 border rounded-xl p-3 text-left transition-colors ${
                  selectedExercise === id ? 'border-orange-500/50' : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Trophy size={11} className="text-yellow-500" />
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{ex?.name.split(' ').slice(-1)[0]}</span>
                </div>
                {pr ? (
                  <>
                    <p className="text-lg font-black">{pr.e1rm} lbs</p>
                    <p className="text-xs text-zinc-500">{pr.weight} × {pr.reps} · e1RM</p>
                  </>
                ) : (
                  <p className="text-sm text-zinc-600">No data</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Strength Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-zinc-300">e1RM Over Time</h2>
          <select
            value={selectedExercise}
            onChange={e => setSelectedExercise(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-orange-500"
          >
            {availableExercises.length > 0 ? (
              availableExercises.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))
            ) : (
              EXERCISES.filter(e => MAIN_LIFTS.includes(e.id)).map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))
            )}
          </select>
        </div>

        {progressData.length > 1 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={progressData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#71717a', fontSize: 10 }}
                tickFormatter={formatDateShort}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fill: '#71717a', fontSize: 10 }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                labelStyle={{ color: '#a1a1aa', fontSize: '11px' }}
                formatter={(value: number) => [`${value} lbs`, 'e1RM']}
                labelFormatter={formatDateShort}
              />
              <Line
                type="monotone"
                dataKey="e1rm"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ fill: '#f97316', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : progressData.length === 1 ? (
          <div className="h-[200px] flex flex-col items-center justify-center text-zinc-600 space-y-1">
            <p className="text-sm">Only one data point so far.</p>
            <p className="text-xs">Log more workouts to see trends.</p>
            <p className="text-2xl font-black text-orange-500 mt-2">{progressData[0].e1rm} lbs</p>
            <p className="text-xs text-zinc-500">Current e1RM</p>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-zinc-600 text-sm">
            No data for this exercise yet.
          </div>
        )}

        {allTimePR && selectedExercise === selectedExercise && (
          <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
            <span>All-time PR: <span className="text-orange-400 font-bold">{allTimePR.weight} × {allTimePR.reps}</span></span>
            <span>e1RM: <span className="text-orange-400 font-bold">{allTimePR.e1rm} lbs</span></span>
          </div>
        )}
      </div>

      {/* Weekly Volume Chart */}
      {volumeByWeek.length > 1 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <h2 className="text-sm font-bold text-zinc-300 mb-4">Weekly Volume (lbs)</h2>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={volumeByWeek} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="week" tick={{ fill: '#71717a', fontSize: 10 }} />
              <YAxis tick={{ fill: '#71717a', fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                formatter={(value: number) => [`${(value / 1000).toFixed(1)}k lbs`, 'Volume']}
              />
              <Line type="monotone" dataKey="volume" stroke="#a78bfa" strokeWidth={2} dot={{ fill: '#a78bfa', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bodyweight Chart */}
      {bwData.length > 1 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-zinc-300">Bodyweight (lbs)</h2>
            {bwTrend && <span className="text-xs font-bold text-green-400">{bwTrend}</span>}
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={bwData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#71717a', fontSize: 10 }}
                tickFormatter={formatDateShort}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fill: '#71717a', fontSize: 10 }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                formatter={(value: number) => [`${value} lbs`, 'Bodyweight']}
                labelFormatter={formatDateShort}
              />
              <Line type="monotone" dataKey="weight" stroke="#34d399" strokeWidth={2} dot={{ fill: '#34d399', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Workout frequency last 30 days */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <h2 className="text-sm font-bold text-zinc-300 mb-3">Last 30 Days</h2>
        <CalendarGrid logs={logs} />
      </div>

      {/* Weekly muscle volume vs MEV/MAV */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-zinc-300">This Week — Sets per Muscle</h2>
          <span className="text-[10px] text-zinc-600">MEV / MAV targets</span>
        </div>
        <div className="space-y-2.5">
          {Object.entries(MUSCLE_MEV).map(([key, { mev, mav, label }]) => {
            const sets = muscleSetMap[key] ?? 0;
            const pct = Math.min(sets / mav, 1);
            const color = sets === 0 ? '#3f3f46' : sets < mev ? '#ef4444' : sets <= mav ? '#f97316' : '#22c55e';
            return (
              <div key={key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-zinc-400">{label}</span>
                  <span className="font-bold" style={{ color }}>{sets} sets</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full relative overflow-visible">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
                  {/* MEV marker */}
                  <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-zinc-600 rounded"
                    style={{ left: `${(mev / mav) * 100}%` }} />
                </div>
                <div className="flex justify-between text-[9px] text-zinc-700 mt-0.5">
                  <span>MEV {mev}</span><span>MAV {mav}</span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[9px] text-zinc-700 mt-3">MEV = minimum effective volume · MAV = maximum adaptive volume</p>
      </div>
      </>}
    </div>
  );
}

// ── History list ──────────────────────────────────────────────────────────────
function HistoryList({ logs }: { logs: WorkoutLog[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="space-y-3 pb-4">
      <p className="text-sm text-zinc-500">{logs.length} session{logs.length !== 1 ? 's' : ''}</p>
      {logs.map(log => {
        const isOpen = expanded === log.id;
        const vol = totalVolume(log.sets);
        const sets = workingSetCount(log.sets);
        const exercises = Array.from(new Set(log.sets.map(s => s.exerciseId)));
        const grouped = exercises.map(id => {
          const exSets = log.sets.filter(s => s.exerciseId === id);
          return { id, name: exSets[0].exerciseName, sets: exSets };
        });
        return (
          <div key={log.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <button onClick={() => setExpanded(isOpen ? null : log.id)} className="w-full p-4 text-left">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-black">{log.dayName}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{formatDate(log.date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {log.rating && (
                    <span className="text-xs text-orange-400">{'★'.repeat(log.rating)}<span className="text-zinc-700">{'★'.repeat(5 - log.rating)}</span></span>
                  )}
                  {isOpen ? <ChevronUp size={14} className="text-zinc-600" /> : <ChevronDown size={14} className="text-zinc-600" />}
                </div>
              </div>
              <div className="flex gap-3 mt-2 text-xs text-zinc-500">
                {log.durationMinutes && <span className="flex items-center gap-1"><Clock size={10} />{formatDuration(log.durationMinutes)}</span>}
                <span className="flex items-center gap-1"><Dumbbell size={10} />{exercises.length} exercises</span>
                <span className="flex items-center gap-1"><BarChart3 size={10} />{sets} sets</span>
                {vol > 0 && <span>{(vol / 1000).toFixed(0)}k lbs</span>}
              </div>
            </button>
            {isOpen && (
              <div className="border-t border-zinc-800">
                {grouped.map(({ id, name, sets: exSets }) => (
                  <div key={id} className="px-4 py-3 border-b border-zinc-800/50 last:border-0">
                    <div className="flex justify-between mb-1">
                      <p className="text-sm font-bold">{name}</p>
                      <span className="text-xs text-zinc-600">{exSets.filter(s => !s.isWarmup).length} sets</span>
                    </div>
                    {log.exerciseNotes?.[id] && (
                      <p className="text-[10px] text-orange-400/70 italic mb-1.5">— {log.exerciseNotes[id]}</p>
                    )}
                    <div className="space-y-1">
                      {exSets.map((set, i) => (
                        <div key={set.id} className={`text-xs ${set.isWarmup ? 'text-zinc-600' : 'text-zinc-400'}`}>
                          <div className="flex gap-3">
                            <span className="w-4 text-right text-zinc-600">{set.isWarmup ? 'W' : i + 1 - exSets.filter((s, j) => s.isWarmup && j < i).length}</span>
                            <span className="font-bold text-zinc-200">{set.weight} lbs</span>
                            <span>× {set.reps}</span>
                            {set.rpe && <span className="text-zinc-600">@ {set.rpe}</span>}
                            <span className="ml-auto text-zinc-700">{calcE1RM(set.weight, set.reps)} e1RM</span>
                          </div>
                          {set.note && (
                            <p className="pl-7 text-[10px] text-zinc-600 italic mt-0.5">— {set.note}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {log.notes && <div className="px-4 py-3 bg-zinc-800/20"><p className="text-xs text-zinc-500 italic">"{log.notes}"</p></div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CalendarGrid({ logs }: { logs: ReturnType<typeof useLogs> }) {
  const logDates = new Set(logs.map(l => l.date));
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });

  return (
    <div className="grid grid-cols-10 gap-1.5">
      {days.map(date => (
        <div
          key={date}
          title={date}
          className={`aspect-square rounded-sm ${logDates.has(date) ? 'bg-orange-500' : 'bg-zinc-800'}`}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Photos View
// ─────────────────────────────────────────────────────────────────────────────
function PhotosView({ photos }: { photos: ProgressPhoto[] }) {
  const { addPhoto, deletePhoto } = useProgressPhotos();
  const { todayWeight } = useWeightLog();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  // Load all photo data URLs from localStorage
  useEffect(() => {
    const urls: Record<string, string> = {};
    for (const p of photos) {
      const data = loadPhotoData(p.id);
      if (data) urls[p.id] = data;
    }
    setPhotoUrls(urls);
  }, [photos]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await compressImage(file);
      const id = uid();
      savePhotoData(id, dataUrl);
      const photo: ProgressPhoto = {
        id,
        date: todayISO(),
        caption: caption.trim() || undefined,
        bodyweight: todayWeight ?? undefined,
      };
      addPhoto(photo);
      setPhotoUrls(prev => ({ ...prev, [id]: dataUrl }));
      setShowAdd(false);
      setCaption('');
    } catch { /* ignore */ }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleDelete(id: string) {
    deletePhotoData(id);
    deletePhoto(id);
    setPhotoUrls(prev => { const n = { ...prev }; delete n[id]; return n; });
    if (compareA === id) setCompareA(null);
    if (compareB === id) setCompareB(null);
    if (viewPhoto === id) setViewPhoto(null);
  }

  const sorted = [...photos].sort((a, b) => b.date.localeCompare(a.date));

  // Fullscreen viewer
  if (viewPhoto) {
    const p = photos.find(x => x.id === viewPhoto);
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setViewPhoto(null)} className="text-zinc-400 hover:text-white">
            <X size={22} />
          </button>
          <div className="text-center">
            <p className="text-sm font-bold">{p ? formatDate(p.date) : ''}</p>
            {p?.bodyweight && <p className="text-xs text-zinc-500">{p.bodyweight} lbs</p>}
          </div>
          <button onClick={() => p && handleDelete(p.id)} className="text-red-400 hover:text-red-300">
            <Trash2 size={18} />
          </button>
        </div>
        {photoUrls[viewPhoto] && (
          <div className="flex-1 flex items-center justify-center px-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrls[viewPhoto]} alt="" className="max-w-full max-h-full rounded-2xl object-contain" />
          </div>
        )}
        {p?.caption && <p className="text-center text-sm text-zinc-400 px-4 py-3 italic">{p.caption}</p>}
      </div>
    );
  }

  // Compare view
  if (compareA && compareB) {
    const pA = photos.find(x => x.id === compareA);
    const pB = photos.find(x => x.id === compareB);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-lg">Comparison</h2>
          <button onClick={() => { setCompareA(null); setCompareB(null); }} className="text-xs font-bold text-zinc-500 border border-zinc-700 px-3 py-1.5 rounded-xl">Done</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[{ id: compareA, p: pA }, { id: compareB, p: pB }].map(({ id, p }) => (
            <div key={id} className="space-y-1">
              <div className="bg-zinc-900 rounded-2xl overflow-hidden aspect-[3/4]">
                {photoUrls[id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrls[id]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                    <Camera size={24} className="text-zinc-600" />
                  </div>
                )}
              </div>
              <p className="text-xs text-zinc-400 text-center font-semibold">{p ? formatDateShort(p.date) : ''}</p>
              {p?.bodyweight && <p className="text-[10px] text-zinc-600 text-center">{p.bodyweight} lbs</p>}
            </div>
          ))}
        </div>
        {pA && pB && pA.bodyweight && pB.bodyweight && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
            <p className="text-xs text-zinc-500 mb-1">Weight change</p>
            <p className={`text-2xl font-black ${pB.bodyweight > pA.bodyweight ? 'text-orange-400' : 'text-blue-400'}`}>
              {pB.bodyweight > pA.bodyweight ? '+' : ''}{(pB.bodyweight - pA.bodyweight).toFixed(1)} lbs
            </p>
            <p className="text-xs text-zinc-600 mt-0.5">{formatDateShort(pA.date)} → {formatDateShort(pB.date)}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{sorted.length} photo{sorted.length !== 1 ? 's' : ''}</p>
        <div className="flex gap-2">
          {sorted.length >= 2 && !compareA && (
            <button
              onClick={() => { setCompareA(sorted[sorted.length - 1].id); setCompareB(sorted[0].id); }}
              className="flex items-center gap-1.5 text-xs font-bold border border-zinc-700 text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-xl transition-colors"
            >
              <GitCompareArrows size={13} /> Compare
            </button>
          )}
          <button
            onClick={() => setShowAdd(s => !s)}
            className="flex items-center gap-1.5 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-xl transition-colors"
          >
            <Camera size={13} /> Add Photo
          </button>
        </div>
      </div>

      {/* Add photo panel */}
      {showAdd && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold">Add Progress Photo</p>
          <input
            type="text"
            placeholder="Caption (optional)"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            maxLength={80}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500 placeholder:text-zinc-600"
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleFile}
            className="hidden"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { if (fileRef.current) { fileRef.current.removeAttribute('capture'); fileRef.current.click(); } }}
              disabled={uploading}
              className="flex flex-col items-center gap-2 py-5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition-colors disabled:opacity-50"
            >
              <Camera size={22} className="text-zinc-400" />
              <span className="text-xs text-zinc-400 font-semibold">From Gallery</span>
            </button>
            <button
              onClick={() => { if (fileRef.current) { fileRef.current.setAttribute('capture', 'environment'); fileRef.current.click(); } }}
              disabled={uploading}
              className="flex flex-col items-center gap-2 py-5 bg-zinc-800 hover:bg-zinc-700 border border-dashed border-orange-500/40 rounded-xl transition-colors disabled:opacity-50"
            >
              <Camera size={22} className="text-orange-400" />
              <span className="text-xs text-orange-400 font-semibold">Take Photo</span>
            </button>
          </div>
          {uploading && <p className="text-xs text-zinc-500 text-center">Saving…</p>}
          <button onClick={() => setShowAdd(false)} className="w-full text-xs text-zinc-600 py-1">Cancel</button>
        </div>
      )}

      {/* Gallery grid */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Camera size={40} className="mx-auto text-zinc-700" />
          <p className="text-zinc-500 text-sm">No progress photos yet.</p>
          <p className="text-xs text-zinc-600">Take a weekly fit pic to track your physique over time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {sorted.map(photo => (
            <button
              key={photo.id}
              onClick={() => setViewPhoto(photo.id)}
              className="relative aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors"
            >
              {photoUrls[photo.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrls[photo.id]} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera size={18} className="text-zinc-600" />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1.5">
                <p className="text-[9px] text-white font-bold leading-tight">{formatDateShort(photo.date)}</p>
                {photo.bodyweight && <p className="text-[8px] text-zinc-300">{photo.bodyweight} lbs</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function getWeeklyVolume(logs: ReturnType<typeof useLogs>, weeks: number) {
  const result: { week: string; volume: number }[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const start = new Date();
    start.setDate(start.getDate() - start.getDay() - w * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    const weekLogs = logs.filter(l => l.date >= startStr && l.date <= endStr);
    const volume = weekLogs.reduce((t, l) => t + totalVolume(l.sets), 0);
    if (volume > 0 || result.length > 0) {
      result.push({
        week: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        volume,
      });
    }
  }
  return result;
}
