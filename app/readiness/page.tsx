'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useReadiness, useProfile, useActiveProgram, useSupplements } from '@/lib/store';
import { ReadinessCheckin, MuscleReadinessMap } from '@/lib/types';
import { uid, readinessBg, overallReadinessScore, todayISO, formatDateShort } from '@/lib/utils';
import { getReadinessFeedback } from '@/lib/ai';
import { SUPPLEMENT_STACK, TIMING_LABELS, TIMING_EMOJI, TOTAL_CORE, CORE_SUPPLEMENTS, SupplementDef } from '@/lib/supplements';
import { Moon, Utensils, Zap, Brain, Loader2, ChevronLeft, CheckCircle2, Pill, Check } from 'lucide-react';

const MUSCLES: { key: keyof MuscleReadinessMap; label: string }[] = [
  { key: 'chest',      label: 'Chest' },
  { key: 'back',       label: 'Back' },
  { key: 'shoulders',  label: 'Shoulders' },
  { key: 'arms',       label: 'Arms' },
  { key: 'quads',      label: 'Quads' },
  { key: 'hamstrings', label: 'Hamstrings' },
  { key: 'glutes',     label: 'Glutes' },
  { key: 'core',       label: 'Core' },
  { key: 'lowerBack',  label: 'Lower Back' },
];

const READINESS_LABELS = ['', 'Low', 'Tired', 'Normal', 'Great', 'Extra'];

const defaultMuscles: MuscleReadinessMap = {
  chest: 3, back: 3, shoulders: 3, arms: 3, quads: 3,
  hamstrings: 3, glutes: 3, core: 3, lowerBack: 3,
};

const TIMINGS = ['morning', 'breakfast', 'midday', 'evening'] as const;

export default function ReadinessPage() {
  const router = useRouter();
  const { todayLog, addCheckin } = useReadiness();
  const { profile } = useProfile();
  const { currentDay } = useActiveProgram();
  const { supplementLogs, toggle } = useSupplements();

  const [tab, setTab] = useState<'readiness' | 'supplements'>('readiness');

  // Readiness state
  const [sleepHours, setSleepHours] = useState(7.5);
  const [sleepQuality, setSleepQuality] = useState<1|2|3|4|5>(3);
  const [nutrition, setNutrition] = useState<1|2|3|4|5>(3);
  const [stress, setStress] = useState<1|2|3|4|5>(3);
  const [overallEnergy, setOverallEnergy] = useState<1|2|3|4|5>(3);
  const [muscles, setMuscles] = useState<MuscleReadinessMap>(defaultMuscles);
  const [notes, setNotes] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  function cycleMuscle(key: keyof MuscleReadinessMap) {
    setMuscles(m => ({ ...m, [key]: ((m[key] % 5) + 1) as 1|2|3|4|5 }));
  }

  async function handleSave() {
    const checkin: ReadinessCheckin = {
      id: uid(),
      date: todayISO(),
      sleepHours, sleepQuality, nutrition, stress, overallEnergy,
      muscleReadiness: muscles, notes,
    };
    if (profile?.claudeApiKey && currentDay) {
      setAiLoading(true);
      try {
        const suggestion = await getReadinessFeedback(checkin, currentDay, profile.claudeApiKey);
        checkin.aiSuggestion = suggestion;
        setAiSuggestion(suggestion);
      } catch { /* silent */ }
      setAiLoading(false);
    }
    addCheckin(checkin);
    setSaved(true);
  }

  // Today's supplement log
  const today = todayISO();
  const todaySupps = supplementLogs.find(l => l.date === today)?.taken ?? [];
  const coreTaken = todaySupps.filter(id => CORE_SUPPLEMENTS.includes(id)).length;

  // Past 7 days supplement adherence
  const past7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const log = supplementLogs.find(l => l.date === dateStr);
    const taken = log?.taken.filter(id => CORE_SUPPLEMENTS.includes(id)).length ?? 0;
    return { date: dateStr, taken, pct: taken / TOTAL_CORE };
  });

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header + tab switcher */}
      <div className="px-4 pt-6 pb-0">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} className="text-zinc-500 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-2xl font-black flex-1">Daily Check-In</h1>
        </div>
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-0.5 gap-0.5 mb-1">
          <button onClick={() => setTab('readiness')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${tab === 'readiness' ? 'bg-orange-500 text-white' : 'text-zinc-500'}`}>
            <Moon size={12} /> Readiness
          </button>
          <button onClick={() => setTab('supplements')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-colors ${tab === 'supplements' ? 'bg-orange-500 text-white' : 'text-zinc-500'}`}>
            <Pill size={12} />
            Supplements
            {coreTaken > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${coreTaken >= TOTAL_CORE ? 'bg-green-500/30 text-green-400' : 'bg-zinc-700 text-zinc-400'}`}>
                {coreTaken}/{TOTAL_CORE}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── READINESS TAB ── */}
      {tab === 'readiness' && (
        <div className="flex-1 px-4 py-4 space-y-5 pb-8">
          {todayLog && !saved ? (
            <>
              <div className="bg-zinc-900 border border-green-500/30 rounded-2xl p-5 text-center space-y-3">
                <CheckCircle2 size={32} className="text-green-400 mx-auto" />
                <p className="font-bold">Already checked in today</p>
                <ReadinessSummary log={todayLog} />
              </div>
              {todayLog.aiSuggestion && (
                <div className="bg-zinc-900 border border-orange-500/20 rounded-2xl p-4">
                  <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">AI Coach</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{todayLog.aiSuggestion}</p>
                </div>
              )}
            </>
          ) : saved ? (
            <>
              <div className="bg-zinc-900 border border-green-500/30 rounded-2xl p-5 text-center space-y-3">
                <CheckCircle2 size={32} className="text-green-400 mx-auto" />
                <p className="font-bold">Check-in saved!</p>
                <div className="text-4xl font-black text-orange-500">
                  {overallReadinessScore({ sleepHours, sleepQuality, nutrition, stress, overallEnergy, muscleReadiness: muscles, notes, id: '', date: '', aiSuggestion })}
                  <span className="text-xl text-zinc-500">/100</span>
                </div>
                <p className="text-sm text-zinc-500">Readiness Score</p>
              </div>
              {aiLoading && (
                <div className="flex items-center gap-2 text-zinc-500 justify-center">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Getting AI coaching feedback...</span>
                </div>
              )}
              {aiSuggestion && (
                <div className="bg-zinc-900 border border-orange-500/20 rounded-2xl p-4">
                  <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">AI Coach</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{aiSuggestion}</p>
                </div>
              )}
              <button onClick={() => router.push('/workout')}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition-colors text-lg">
                Start Today's Workout
              </button>
            </>
          ) : (
            <>
              <Section icon={<Moon size={16} className="text-blue-400" />} title="Sleep">
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-zinc-500">Hours slept</span>
                      <span className="text-sm font-black text-white">{sleepHours}h</span>
                    </div>
                    <input type="range" min={3} max={12} step={0.5} value={sleepHours}
                      onChange={e => setSleepHours(parseFloat(e.target.value))}
                      className="w-full accent-orange-500" />
                    <div className="flex justify-between text-[10px] text-zinc-600 mt-1"><span>3h</span><span>12h</span></div>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-2">Sleep quality</p>
                    <FiveScale value={sleepQuality} onChange={v => setSleepQuality(v as 1|2|3|4|5)} labels={['Terrible','Poor','Okay','Good','Great']} />
                  </div>
                </div>
              </Section>

              <Section icon={<Utensils size={16} className="text-green-400" />} title="Nutrition & Stress">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-zinc-500 mb-2">How well did you eat yesterday?</p>
                    <FiveScale value={nutrition} onChange={v => setNutrition(v as 1|2|3|4|5)} labels={['Terrible','Poor','Okay','Good','Perfect']} />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-2">Stress level (1 = low stress)</p>
                    <FiveScale value={stress} onChange={v => setStress(v as 1|2|3|4|5)} labels={['Very Low','Low','Moderate','High','Max']} colors={['bg-green-500','bg-green-400','bg-yellow-500','bg-orange-500','bg-red-500']} />
                  </div>
                </div>
              </Section>

              <Section icon={<Zap size={16} className="text-yellow-400" />} title="Overall Energy">
                <FiveScale value={overallEnergy} onChange={v => setOverallEnergy(v as 1|2|3|4|5)} labels={['Drained','Low','Normal','Good','Locked in']} />
              </Section>

              <Section icon={<Brain size={16} className="text-purple-400" />} title="How do your muscles feel?">
                <p className="text-xs text-zinc-500 mb-3">Tap to cycle: Low → Tired → Normal → Great → Extra</p>
                <div className="grid grid-cols-3 gap-2">
                  {MUSCLES.map(({ key, label }) => {
                    const val = muscles[key];
                    return (
                      <button key={key} onClick={() => cycleMuscle(key)}
                        className={`border rounded-xl p-3 text-center transition-all active:scale-95 ${readinessBg(val)}`}>
                        <p className="text-xs font-bold mb-0.5">{label}</p>
                        <p className={`text-[10px] font-semibold ${val === 1 ? 'text-red-400' : val === 2 ? 'text-orange-400' : val === 3 ? 'text-zinc-400' : val === 4 ? 'text-green-400' : 'text-purple-400'}`}>
                          {READINESS_LABELS[val]}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </Section>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder="Anything to note about how you're feeling..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 resize-none placeholder:text-zinc-600" />
              </div>

              <button onClick={handleSave}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition-colors text-lg">
                Save Check-In
              </button>
            </>
          )}
        </div>
      )}

      {/* ── SUPPLEMENTS TAB ── */}
      {tab === 'supplements' && (
        <div className="flex-1 px-4 py-4 space-y-4 pb-8">
          {/* Today's progress */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Today's Stack</span>
              <span className={`text-sm font-black ${coreTaken >= TOTAL_CORE ? 'text-green-400' : 'text-orange-400'}`}>
                {coreTaken} / {TOTAL_CORE} core
              </span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.round((coreTaken / TOTAL_CORE) * 100)}%`, backgroundColor: coreTaken >= TOTAL_CORE ? '#22c55e' : '#f97316' }} />
            </div>
          </div>

          {/* Supplement checklist grouped by timing */}
          {TIMINGS.map(timing => {
            const supps = SUPPLEMENT_STACK.filter(s => s.timing === timing);
            const takenCount = supps.filter(s => todaySupps.includes(s.id)).length;
            return (
              <div key={timing} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
                  <span className="text-base">{TIMING_EMOJI[timing]}</span>
                  <span className="text-sm font-bold flex-1">{TIMING_LABELS[timing]}</span>
                  <span className="text-xs text-zinc-600">{takenCount}/{supps.length}</span>
                </div>
                <div className="divide-y divide-zinc-800/50">
                  {supps.map(supp => {
                    const taken = todaySupps.includes(supp.id);
                    return (
                      <button key={supp.id}
                        onClick={() => toggle(today, supp.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-zinc-800 ${taken ? 'bg-zinc-800/30' : ''}`}>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${taken ? 'bg-orange-500 border-orange-500' : 'border-zinc-600'}`}>
                          {taken && <Check size={12} className="text-white" strokeWidth={3} />}
                        </div>
                        <span className={`text-sm font-semibold flex-1 ${taken ? 'text-zinc-400 line-through decoration-zinc-600' : 'text-zinc-200'}`}>
                          {supp.name}
                        </span>
                        {supp.conditional && (
                          <span className="text-[10px] text-zinc-600 font-medium">optional</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* 7-day history */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-3">This Week</span>
            <div className="flex gap-1.5">
              {past7.map(({ date, taken: cnt, pct }) => {
                const isToday = date === today;
                const bg = cnt === 0 ? 'bg-zinc-800' : pct >= 1 ? 'bg-green-500' : pct >= 0.6 ? 'bg-orange-400' : 'bg-zinc-600';
                const label = new Date(date + 'T12:00').toLocaleDateString('en-US', { weekday: 'narrow' });
                return (
                  <div key={date} className="flex-1 flex flex-col items-center gap-1">
                    <div className={`w-full aspect-square rounded-lg ${bg} ${isToday ? 'ring-2 ring-orange-500 ring-offset-1 ring-offset-zinc-900' : ''} flex items-center justify-center`}>
                      {cnt > 0 && <span className="text-[9px] font-bold text-white/80">{cnt}</span>}
                    </div>
                    <span className="text-[9px] text-zinc-600">{label}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 mt-3 text-[10px] text-zinc-600">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500 inline-block" /> All core taken</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-400 inline-block" /> Partial</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-bold">{title}</span>
      </div>
      {children}
    </div>
  );
}

function FiveScale({ value, onChange, labels, colors }: {
  value: number; onChange: (v: number) => void; labels: string[]; colors?: string[];
}) {
  const defaultColors = ['bg-red-500','bg-orange-500','bg-yellow-500','bg-green-400','bg-green-500'];
  const cls = colors ?? defaultColors;
  return (
    <div className="flex gap-1.5">
      {[1,2,3,4,5].map(v => (
        <button key={v} onClick={() => onChange(v)}
          className={`flex-1 rounded-lg py-2.5 text-xs font-bold transition-all active:scale-95 border ${value === v ? `${cls[v-1]} border-transparent text-white` : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600'}`}>
          <span className="block font-black">{v}</span>
          <span className="block text-[9px] mt-0.5 leading-tight opacity-80">{labels[v-1]}</span>
        </button>
      ))}
    </div>
  );
}

function ReadinessSummary({ log }: { log: ReadinessCheckin }) {
  const score = overallReadinessScore(log);
  const scoreColor = score >= 70 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="space-y-2">
      <div className={`text-3xl font-black ${scoreColor}`}>{score}<span className="text-base text-zinc-500">/100</span></div>
      <div className="flex gap-3 justify-center text-xs text-zinc-500">
        <span>😴 {log.sleepHours}h ({log.sleepQuality}/5)</span>
        <span>⚡ Energy {log.overallEnergy}/5</span>
        <span>🥗 Nutrition {log.nutrition}/5</span>
      </div>
    </div>
  );
}
