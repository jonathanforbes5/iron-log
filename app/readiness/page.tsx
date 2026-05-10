'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useReadiness, useProfile, useActiveProgram } from '@/lib/store';
import { ReadinessCheckin, MuscleReadinessMap } from '@/lib/types';
import { uid, readinessLabel, readinessBg, overallReadinessScore } from '@/lib/utils';
import { getReadinessFeedback } from '@/lib/ai';
import { Moon, Utensils, Zap, Brain, Loader2, ChevronLeft, CheckCircle2 } from 'lucide-react';

const MUSCLES: { key: keyof MuscleReadinessMap; label: string; emoji: string }[] = [
  { key: 'chest',      label: 'Chest',       emoji: '💪' },
  { key: 'back',       label: 'Back',         emoji: '🔙' },
  { key: 'shoulders',  label: 'Shoulders',    emoji: '🏋️' },
  { key: 'arms',       label: 'Arms',         emoji: '💪' },
  { key: 'quads',      label: 'Quads',        emoji: '🦵' },
  { key: 'hamstrings', label: 'Hamstrings',   emoji: '🦵' },
  { key: 'glutes',     label: 'Glutes',       emoji: '🍑' },
  { key: 'core',       label: 'Core',         emoji: '🎯' },
  { key: 'lowerBack',  label: 'Lower Back',   emoji: '⚡' },
];

const READINESS_LABELS = ['', 'Low', 'Tired', 'Normal', 'Great', 'Extra'];

const defaultMuscles: MuscleReadinessMap = {
  chest: 3, back: 3, shoulders: 3, arms: 3, quads: 3,
  hamstrings: 3, glutes: 3, core: 3, lowerBack: 3,
};

export default function ReadinessPage() {
  const router = useRouter();
  const { todayLog, addCheckin } = useReadiness();
  const { profile } = useProfile();
  const { currentDay } = useActiveProgram();

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
      date: new Date().toISOString().slice(0, 10),
      sleepHours,
      sleepQuality,
      nutrition,
      stress,
      overallEnergy,
      muscleReadiness: muscles,
      notes,
    };

    if (profile?.claudeApiKey && currentDay) {
      setAiLoading(true);
      try {
        const suggestion = await getReadinessFeedback(checkin, currentDay, profile.claudeApiKey);
        checkin.aiSuggestion = suggestion;
        setAiSuggestion(suggestion);
      } catch { /* no key or failed */ }
      setAiLoading(false);
    }

    addCheckin(checkin);
    setSaved(true);
  }

  if (todayLog && !saved) {
    return (
      <div className="px-4 pt-6 space-y-5">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-zinc-500 text-sm">
          <ChevronLeft size={16} /> Back
        </button>
        <h1 className="text-2xl font-black">Readiness</h1>
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
      </div>
    );
  }

  if (saved) {
    const score = overallReadinessScore({ sleepHours, sleepQuality, nutrition, stress, overallEnergy, muscleReadiness: muscles, notes, id: '', date: '', aiSuggestion });
    return (
      <div className="px-4 pt-6 space-y-5">
        <h1 className="text-2xl font-black">Readiness Check-In</h1>
        <div className="bg-zinc-900 border border-green-500/30 rounded-2xl p-5 text-center space-y-3">
          <CheckCircle2 size={32} className="text-green-400 mx-auto" />
          <p className="font-bold">Check-in saved!</p>
          <div className="text-4xl font-black text-orange-500">{score}<span className="text-xl text-zinc-500">/100</span></div>
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
            <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">AI Coach Recommendation</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{aiSuggestion}</p>
          </div>
        )}
        <button onClick={() => router.push('/workout')}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition-colors text-lg">
          Start Today's Workout
        </button>
        <button onClick={() => router.push('/')}
          className="w-full border border-zinc-700 text-zinc-400 font-bold py-3 rounded-2xl hover:bg-zinc-800 transition-colors">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-8 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-zinc-500 hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-2xl font-black">Daily Check-In</h1>
      </div>

      {/* Sleep */}
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

      {/* Nutrition & Stress */}
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

      {/* Energy */}
      <Section icon={<Zap size={16} className="text-yellow-400" />} title="Overall Energy">
        <FiveScale value={overallEnergy} onChange={v => setOverallEnergy(v as 1|2|3|4|5)} labels={['Drained','Low','Normal','Good','Locked in']} />
      </Section>

      {/* Muscle Readiness */}
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

      {/* Notes */}
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
  value: number;
  onChange: (v: number) => void;
  labels: string[];
  colors?: string[];
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
