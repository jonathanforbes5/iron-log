'use client';

import { useState } from 'react';
import { useLogs } from '@/lib/store';
import { EXERCISES } from '@/lib/exercises';
import { getProgressData, calcE1RM, formatDateShort, getPreviousBest, totalVolume } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Trophy, Dumbbell } from 'lucide-react';

const MAIN_LIFTS = ['squat', 'bench', 'deadlift', 'ohp'];

export default function ProgressPage() {
  const logs = useLogs();
  const [selectedExercise, setSelectedExercise] = useState('squat');

  // Exercises that have been logged
  const loggedExerciseIds = Array.from(new Set(logs.flatMap(l => l.sets.map(s => s.exerciseId))));
  const availableExercises = EXERCISES.filter(e => loggedExerciseIds.includes(e.id));

  const progressData = getProgressData(logs, selectedExercise);
  const allTimePR = getPreviousBest(logs, selectedExercise);

  // Volume by week (last 8 weeks)
  const volumeByWeek = getWeeklyVolume(logs, 8);

  // Bodyweight data from workout logs
  const bwData = logs
    .filter(l => l.bodyweight)
    .map(l => ({ date: l.date, weight: l.bodyweight! }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (logs.length === 0) {
    return (
      <div className="px-4 pt-6">
        <h1 className="text-2xl font-black tracking-tight mb-8">Progress</h1>
        <div className="text-center py-16 space-y-3">
          <TrendingUp size={40} className="mx-auto text-zinc-700" />
          <p className="text-zinc-500">Log some workouts to see your progress.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 space-y-6">
      <h1 className="text-2xl font-black tracking-tight">Progress</h1>

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
          <h2 className="text-sm font-bold text-zinc-300 mb-4">Bodyweight (lbs)</h2>
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
